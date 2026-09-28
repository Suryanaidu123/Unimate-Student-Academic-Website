const Marks = require('../models/Marks.model');
const Subject = require('../models/Subject.model');
const Student = require('../models/Student.model');
const User = require('../models/User.model');
const ApiError = require('../utils/ApiError');
const { computeMid, computeInternal } = require('../utils/marksCalculator');
const auditLog = require('./auditLog.service');
const notification = require('./notification.service');

async function upsertMarks({ studentId, subjectId, mid1, mid2, academicYearId, semesterId }, actor) {
  const subject = await Subject.findById(subjectId);
  if (!subject) throw ApiError.notFound('Subject not found');

  const student = await Student.findById(studentId);
  if (!student) throw ApiError.notFound('Student not found');

  // ---- RESTRICTION CHECKS ----
  if (student.year !== subject.year) {
    throw ApiError.forbidden(
      `Student is in Year ${student.year}, but this subject is for Year ${subject.year}.`
    );
  }
  if (actor.role === 'FACULTY') {
    if (!subject.facultyId || String(subject.facultyId) !== String(actor.facultyId)) {
      throw ApiError.forbidden('You are not assigned to teach this subject.');
    }
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

async function listForFaculty(facultyId, { subjectId, section, status, page = 1, limit = 100 }) {
  const subjects = await Subject.find({ facultyId }).select('_id');
  const allowedSubjectIds = subjects.map((s) => String(s._id));

  const query = { subjectId: { $in: subjects.map((s) => s._id) } };
  if (subjectId) {
    if (!allowedSubjectIds.includes(String(subjectId))) {
      return { items: [], total: 0, page, limit };
    }
    query.subjectId = subjectId;
  }
  if (status) query.status = status;

  const items = await Marks.find(query)
    .populate('studentId', 'rollNumber name section year semester')
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

async function getById(id) {
  const m = await Marks.findById(id)
    .populate('studentId', 'rollNumber name')
    .populate('subjectId', 'subjectName subjectCode type');
  if (!m) throw ApiError.notFound('Marks not found');
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
    actor,
    action: 'MARKS_DELETE',
    entityType: 'Marks',
    entityId: id,
    description: `Deleted marks for subject ${m.subjectId?.subjectCode || ''}`,
  });
  return { ok: true };
}

module.exports = {
  upsertMarks,
  listForFaculty,
  listMy,
  getById,
  publish,
  lock,
  unlock,
  remove,
};