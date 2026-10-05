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

async function unpublish(id, actor) {
  const m = await Marks.findById(id).populate('subjectId');
  if (!m) throw ApiError.notFound('Marks not found');
  if (m.status === 'LOCKED') throw ApiError.forbidden('Locked marks cannot be unpublished. Contact admin.');
  if (m.status !== 'PUBLISHED') throw ApiError.badRequest('Marks are not published.');

  if (actor.role === 'FACULTY') {
    const subject = m.subjectId;
    if (!subject || String(subject.facultyId) !== String(actor.facultyId)) {
      throw ApiError.forbidden('You are not assigned to this subject.');
    }
  }

  m.status = 'DRAFT';
  m.publishedAt = null;
  m.updatedBy = actor?.userId;
  await m.save();

  await auditLog.log({
    actor, action: 'MARKS_UNPUBLISH', entityType: 'Marks', entityId: m._id,
    description: `Marks unpublished for subject ${m.subjectId?.subjectCode || ''}`,
  });
  return m;
}

/**
 * importPreview — parse an uploaded file and match roll numbers against
 * students in the selected class.  Returns a preview rows array but does NOT
 * write anything to the database.
 *
 * @param {Buffer}  fileBuffer      Raw file bytes from multer memoryStorage
 * @param {string}  originalName    File name (used to detect extension)
 * @param {object}  opts            { subjectId, year, section, midKey }
 * @param {object}  actor           req.user
 * @returns {{ rows, matched, unmatched, fileRows }}
 */
async function importPreview(fileBuffer, originalName, { subjectId, year, section, midKey }, actor) {
  const { parseMarksFile } = require('../utils/marksImportParser');

  // 1. Authorisation — faculty must own the subject
  const subject = await assertFacultyCanEditSubject(actor, subjectId);

  // 2. Parse the file into raw rows
  const fileRows = await parseMarksFile(fileBuffer, originalName);

  // 3. Load all students for the selected year + section
  const students = await Student.find({
    year: Number(year),
    section: String(section).toUpperCase(),
  }).select('rollNumber name year _id');

  // Build a lookup map: rollNumber (uppercase) → student doc
  const studentMap = new Map(students.map((s) => [String(s.rollNumber).toUpperCase(), s]));

  // 4. Validate the midKey
  const validMidKeys = ['mid1', 'mid2'];
  if (!validMidKeys.includes(midKey)) {
    throw ApiError.badRequest('midKey must be "mid1" or "mid2".');
  }

  // 5. Build preview rows
  const WRITTEN_MAX    = 30;
  const ONLINE_MAX     = 10;
  const ASSIGNMENT_MAX = 5;

  const seenRolls = new Set();
  const rows = fileRows.map((fr) => {
    const roll = String(fr.rollNumber || '').toUpperCase();
    const student = studentMap.get(roll);

    const rowErrors = [];

    // Duplicate roll number in the uploaded file
    if (seenRolls.has(roll)) rowErrors.push('Duplicate roll number in file');
    seenRolls.add(roll);

    // Student not found in the selected class
    if (!student) {
      rowErrors.push(`Roll number ${roll} not found in Year ${year} Section ${section}`);
    }

    // Missing marks
    if (fr.written === null)    rowErrors.push('Missing Written marks');
    if (fr.online === null)     rowErrors.push('Missing Online marks');
    if (fr.assignment === null) rowErrors.push('Missing Assignment marks');

    // Range validation
    if (fr.written    !== null && (fr.written    < 0 || fr.written    > WRITTEN_MAX))    rowErrors.push(`Written must be 0–${WRITTEN_MAX} (got ${fr.written})`);
    if (fr.online     !== null && (fr.online     < 0 || fr.online     > ONLINE_MAX))     rowErrors.push(`Online must be 0–${ONLINE_MAX} (got ${fr.online})`);
    if (fr.assignment !== null && (fr.assignment < 0 || fr.assignment > ASSIGNMENT_MAX)) rowErrors.push(`Assignment must be 0–${ASSIGNMENT_MAX} (got ${fr.assignment})`);

    // Year mismatch (student found but wrong year — shouldn't happen with proper filter, safety net)
    if (student && student.year !== Number(year)) {
      rowErrors.push(`Student belongs to Year ${student.year}, not Year ${year}`);
    }

    const status = rowErrors.length > 0 ? 'ERROR' : 'MATCHED';

    return {
      rollNumber:   roll,
      name:         student?.name || null,
      studentId:    student?._id  || null,
      written:      fr.written,
      online:       fr.online,
      assignment:   fr.assignment,
      status,
      errors:       rowErrors,
    };
  });

  const matched   = rows.filter((r) => r.status === 'MATCHED').length;
  const unmatched = rows.length - matched;

  return {
    subjectName: subject.subjectName,
    subjectCode: subject.subjectCode,
    midKey,
    totalInFile: fileRows.length,
    matched,
    unmatched,
    rows,
  };
}

module.exports = {
  upsertMarks, bulkUpsertMarks, importPreview, listForFaculty, listMy, getById,
  publish, unpublish, lock, unlock, remove,
};