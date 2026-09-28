const Assignment = require('../models/Assignment.model');
const Subject = require('../models/Subject.model');
const Student = require('../models/Student.model');
const User = require('../models/User.model');
const ApiError = require('../utils/ApiError');
const auditLog = require('./auditLog.service');
const notification = require('./notification.service');

async function listForUser(user, { q, subjectId, status, page = 1, limit = 20 }) {
  const query = {};
  if (user.role === 'STUDENT') {
    query.status = 'PUBLISHED';
    const student = await Student.findById(user.studentId);
    query.section = student.section;
    const subjects = await Subject.find({ year: student.year }).select('_id');
    query.subjectId = { $in: subjects.map((s) => s._id) };
  }
  if (user.role === 'FACULTY') query.facultyId = user.facultyId;
  if (subjectId) query.subjectId = subjectId;
  if (status) query.status = status;
  if (q) query.title = new RegExp(q, 'i');

  const [items, total] = await Promise.all([
    Assignment.find(query).populate('subjectId', 'subjectName subjectCode').sort({ dueDate: -1 }).skip((page - 1) * limit).limit(limit),
    Assignment.countDocuments(query),
  ]);
  return { items, total, page, limit };
}

async function create(data, actor) {
  const a = await Assignment.create({ ...data, facultyId: data.facultyId || actor.facultyId, maximumMarks: data.maximumMarks || 5 });
  await auditLog.log({ actor, action: 'ASSIGNMENT_CREATE', entityType: 'Assignment', entityId: a._id });
  return a;
}

async function update(id, data, actor) {
  const a = await Assignment.findByIdAndUpdate(id, data, { new: true });
  if (!a) throw ApiError.notFound('Assignment not found');
  await auditLog.log({ actor, action: 'ASSIGNMENT_UPDATE', entityType: 'Assignment', entityId: a._id });
  return a;
}

async function remove(id, actor) {
  const a = await Assignment.findByIdAndDelete(id);
  if (!a) throw ApiError.notFound('Assignment not found');
  await auditLog.log({ actor, action: 'ASSIGNMENT_DELETE', entityType: 'Assignment', entityId: id });
  return { ok: true };
}

async function publish(id, actor) {
  const a = await Assignment.findByIdAndUpdate(id, { status: 'PUBLISHED' }, { new: true }).populate('subjectId');
  if (!a) throw ApiError.notFound('Assignment not found');

  const subject = a.subjectId;
  const students = await Student.find({ year: subject.year, section: a.section }).select('_id');
  const users = await User.find({ role: 'STUDENT', studentId: { $in: students.map((s) => s._id) } }).select('_id');

  for (const u of users) {
    await notification.fanOut({
      title: 'New Assignment',
      message: `${a.title} — due ${new Date(a.dueDate).toDateString()}`,
      type: 'ASSIGNMENT_CREATED',
      recipientType: 'USER',
      filter: { userId: u._id },
      createdBy: actor?.userId,
      relatedEntity: 'Assignment',
      relatedEntityId: a._id,
    });
  }

  await auditLog.log({ actor, action: 'ASSIGNMENT_PUBLISH', entityType: 'Assignment', entityId: a._id });
  return a;
}

module.exports = { listForUser, create, update, remove, publish };