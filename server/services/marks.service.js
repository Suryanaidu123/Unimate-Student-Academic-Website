const Marks = require('../models/Marks.model');
const Subject = require('../models/Subject.model');
const Student = require('../models/Student.model');
const User = require('../models/User.model');
const ApiError = require('../utils/ApiError');
const { computeMid, computeInternal } = require('../utils/marksCalculator');
const auditLog = require('./auditLog.service');
const notification = require('./notification.service');

/**
 * Verify a faculty member is allowed to act on the given subject.
 * Admin is always allowed.
 */
async function assertFacultyCanEditSubject(actor, subjectId) {
  const subject = await Subject.findById(subjectId);
  if (!subject) throw ApiError.notFound('Subject not found');

  if (actor.role === 'FACULTY') {
    if (!subject.facultyId || String(subject.facultyId) !== String(actor.facultyId)) {
      throw ApiError.forbidden(
        'You are not assigned to this subject. Marks entry is not available for this subject.'
      );
    }
  }
  return subject;
}

async function upsertMarks({ studentId, subjectId, mid1, mid2, academicYearId, semesterId }, actor) {
  const subject = await assertFacultyCanEditSubject(actor, subjectId);

  const student = await Student.findById(studentId);
  if (!student) throw ApiError.notFound('Student not found');

  if (student.year !== subject.year) {
    throw ApiError.forbidden(
      `Student is in Year ${student.year}, but this subject is for Year ${subject.year}.`
    );
  }

  const existing = await Marks.findOne({ studentId, subjectId });
  if (existing && existing.status === 'LOCKED') {
    throw ApiError.forbidden('Marks are locked. Contact admin.');
  }

  let computedMid1 = existing?.mid1 || {};
  let computedMid2 = existing?.mid2 || {};

  if (mid1) computedMid1 = computeMid(mid1.written, mid1.online, mid1.assignment);
  if (mid2) computedMid2 = computeMid(mid2.written, mid2.online, mid2.assignment);

  const internalMarks = computeInternal(computedMid1.total, computedMid2.total);

  const update = {
    studentId, subjectId, academicYearId, semesterId,
    mid1: computedMid1, mid2: computedMid2, internalMarks,
    updatedBy: actor?.userId,
  };

  const result = await Marks.findOneAndUpdate(
    { studentId, subjectId },
    { $set: update, $setOnInsert: { createdBy: actor?.userId, status: 'DRAFT' } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  await auditLog.log({
    actor, action: 'MARKS_UPSERT', entityType: 'Marks', entityId: result._id,
    description: `Marks updated (internal=${internalMarks})`,
    newValue: { mid1: computedMid1, mid2: computedMid2, internalMarks },
  });

  return result;
}

async function bulkUpsertMarks({ subjectId, rows }, actor) {
  if (!subjectId) throw ApiError.badRequest('subjectId is required');
  if (!Array.isArray(rows)) throw ApiError.badRequest('rows must be an array');

  const subject = await assertFacultyCanEditSubject(actor, subjectId);

  const saved = [];
  const errors = [];

  for (const [i, row] of rows.entries()) {
    try {
      const studentId = row.studentId;
      if (!studentId) throw new Error('Missing studentId');

      const student = await Student.findById(studentId);
      if (!student) throw new Error('Student not found');
      if (student.year !== subject.year) {
        throw new Error(`Student is in Year ${student.year}, subject is for Year ${subject.year}`);
      }

      const existing = await Marks.findOne({ studentId, subjectId });
      if (existing && existing.status === 'LOCKED') {
        throw new Error('Marks are locked. Contact admin.');
      }

      let computedMid1 = existing?.mid1 || {};
      let computedMid2 = existing?.mid2 || {};

      if (row.mid1) computedMid1 = computeMid(row.mid1.written, row.mid1.online, row.mid1.assignment);
      if (row.mid2) computedMid2 = computeMid(row.mid2.written, row.mid2.online, row.mid2.assignment);

      const internalMarks = computeInternal(computedMid1.total, computedMid2.total);

      const update = {
        studentId, subjectId,
        mid1: computedMid1, mid2: computedMid2, internalMarks,
        updatedBy: actor?.userId,
      };

      const result = await Marks.findOneAndUpdate(
        { studentId, subjectId },
        { $set: update, $setOnInsert: { createdBy: actor?.userId, status: 'DRAFT' } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      saved.push(result._id);
    } catch (e) {
      errors.push({ row: i + 1, studentId: row.studentId, message: e.message });
    }
  }

  await auditLog.log({
    actor,
    action: 'MARKS_BULK_UPSERT',
    entityType: 'Marks',
    description: `Bulk saved ${saved.length} marks for ${subject.subjectCode} (${errors.length} errors)`,
    metadata: { subjectId, saved: saved.length, errors: errors.length },
  });

  return { saved: saved.length, errors };
}

async function listForFaculty(facultyId, { subjectId, section, status, page = 1, limit = 100 }) {
  const subjects = await Subject.find({ facultyId }).select('_id');
  const allowedIds = subjects.map((s) => String(s._id));

  // If faculty requests a subject they don't own, return empty
  if (subjectId && !allowedIds.includes(String(subjectId))) {
    return { items: [], total: 0, page, limit };
  }

  const query = { subjectId: { $in: subjects.map((s) => s._id) } };
  if (subjectId) query.subjectId = subjectId;
  if (status) query.status = status;

  const items = await Marks.find(query)
    .populate('studentId', 'rollNumber name section year currentSemester')
    .populate('subjectId', 'subjectName subjectCode type')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const filtered = section ? items.filter((i) => i.studentId?.section === section) : items;
  const total = await Marks.countDocuments(query);
  return { items: filtered, total, page, limit };
}

async function listMy(studentId) {
  return Marks.find({ studentId, status: { $in: ['PUBLISHED', 'LOCKED'] } })
    .populate('subjectId', 'subjectName subjectCode credits type')
    .sort({ createdAt: -1 });
}

async function getById(id, actor) {
  const m = await Marks.findById(id)
    .populate('studentId', 'rollNumber name')
    .populate('subjectId', 'subjectName subjectCode type facultyId');
  if (!m) throw ApiError.notFound('Marks not found');

  if (actor?.role === 'FACULTY') {
    const subFac = m.subjectId?.facultyId;
    if (!subFac || String(subFac) !== String(actor.facultyId)) {
      throw ApiError.forbidden('You are not assigned to this subject.');
    }
  }
  return m;
}

async function publish(id, actor) {
  const m = await Marks.findById(id).populate('subjectId');
  if (!m) throw ApiError.notFound('Marks not found');
  if (m.status === 'LOCKED') throw ApiError.forbidden('Locked marks cannot be published');

  if (actor.role === 'FACULTY') {
    const subject = m.subjectId;
    if (!subject || String(subject.facultyId) !== String(actor.facultyId)) {
      throw ApiError.forbidden('You are not assigned to this subject.');
    }
  }

  m.status = 'PUBLISHED';
  m.publishedAt = new Date();
  m.updatedBy = actor?.userId;
  await m.save();

  await auditLog.log({ actor, action: 'MARKS_PUBLISH', entityType: 'Marks', entityId: m._id });

  const userDoc = await User.findOne({ studentId: m.studentId });
  if (userDoc) {
    await notification.fanOut({
      title: 'Marks Published',
      message: 'Your internal marks have been published.',
      type: 'MARKS_PUBLISHED',
      recipientType: 'USER',
      filter: { userId: userDoc._id },
      createdBy: actor?.userId,
      relatedEntity: 'Marks',
      relatedEntityId: m._id,
    });
  }

  return m;
}

async function lock(id, actor) {
  const m = await Marks.findByIdAndUpdate(
    id,
    { status: 'LOCKED', lockedAt: new Date(), updatedBy: actor?.userId },
    { new: true }
  );
  if (!m) throw ApiError.notFound('Marks not found');
  await auditLog.log({ actor, action: 'MARKS_LOCK', entityType: 'Marks', entityId: m._id });
  return m;
}

async function unlock(id, actor) {
  const m = await Marks.findByIdAndUpdate(
    id,
    { status: 'PUBLISHED', lockedAt: null, updatedBy: actor?.userId },
    { new: true }
  );
  if (!m) throw ApiError.notFound('Marks not found');
  await auditLog.log({ actor, action: 'MARKS_UNLOCK', entityType: 'Marks', entityId: m._id });
  return m;
}

async function remove(id, actor) {
  const m = await Marks.findById(id).populate('subjectId');
  if (!m) throw ApiError.notFound('Marks not found');

  if (m.status === 'LOCKED') {
    throw ApiError.forbidden('Locked marks cannot be deleted. Contact admin.');
  }
  if (actor.role === 'FACULTY') {
    const subject = m.subjectId;
    if (!subject || String(subject.facultyId) !== String(actor.facultyId)) {
      throw ApiError.forbidden('You are not assigned to this subject.');
    }
  }

  await m.deleteOne();
  await auditLog.log({
    actor, action: 'MARKS_DELETE', entityType: 'Marks', entityId: id,
    description: `Deleted marks for subject ${m.subjectId?.subjectCode || ''}`,
  });
  return { ok: true };
}

module.exports = {
  upsertMarks, bulkUpsertMarks, listForFaculty, listMy, getById,
  publish, lock, unlock, remove,
};