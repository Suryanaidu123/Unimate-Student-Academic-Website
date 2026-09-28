const Note = require('../models/Note.model');
const Subject = require('../models/Subject.model');
const Student = require('../models/Student.model');
const User = require('../models/User.model');
const ApiError = require('../utils/ApiError');
const auditLog = require('./auditLog.service');
const notification = require('./notification.service');

async function listForUser(user, { q, subjectId, page = 1, limit = 20 }) {
  const query = {};
  if (user.role === 'STUDENT') {
    query.status = 'PUBLISHED';
    const student = await Student.findById(user.studentId);
    const subjects = await Subject.find({ year: student.year, semesterId: { $exists: true } }).select('_id');
    query.subjectId = { $in: subjects.map((s) => s._id) };
  }
  if (subjectId) query.subjectId = subjectId;
  if (q) query.$or = [{ title: new RegExp(q, 'i') }, { content: new RegExp(q, 'i') }];

  const [items, total] = await Promise.all([
    Note.find(query).populate('subjectId', 'subjectName subjectCode').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Note.countDocuments(query),
  ]);
  return { items, total, page, limit };
}

async function create(data, actor) {
  const note = await Note.create({ ...data, creatorId: actor.userId });
  await auditLog.log({ actor, action: 'NOTE_CREATE', entityType: 'Note', entityId: note._id });
  return note;
}

async function update(id, data, actor) {
  const note = await Note.findByIdAndUpdate(id, data, { new: true });
  if (!note) throw ApiError.notFound('Note not found');
  await auditLog.log({ actor, action: 'NOTE_UPDATE', entityType: 'Note', entityId: note._id });
  return note;
}

async function remove(id, actor) {
  const note = await Note.findByIdAndDelete(id);
  if (!note) throw ApiError.notFound('Note not found');
  await auditLog.log({ actor, action: 'NOTE_DELETE', entityType: 'Note', entityId: id });
  return { ok: true };
}

async function publish(id, actor) {
  const note = await Note.findByIdAndUpdate(id, { status: 'PUBLISHED', publishedAt: new Date() }, { new: true }).populate('subjectId');
  if (!note) throw ApiError.notFound('Note not found');

  // notify students of subject year+semester
  const subject = note.subjectId;
  const students = await Student.find({ year: subject.year }).select('_id');
  const users = await User.find({ role: 'STUDENT', studentId: { $in: students.map((s) => s._id) } }).select('_id');
  for (const u of users) {
    await notification.fanOut({
      title: 'New Notes Published',
      message: `New notes: "${note.title}" for ${subject.subjectName}`,
      type: 'NEW_NOTES_PUBLISHED',
      recipientType: 'USER',
      filter: { userId: u._id },
      createdBy: actor?.userId,
      relatedEntity: 'Note',
      relatedEntityId: note._id,
    });
  }

  await auditLog.log({ actor, action: 'NOTE_PUBLISH', entityType: 'Note', entityId: note._id });
  return note;
}

module.exports = { listForUser, create, update, remove, publish };