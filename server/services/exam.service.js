const Exam = require('../models/Exam.model');
const Student = require('../models/Student.model');
const ApiError = require('../utils/ApiError');
const auditLog = require('./auditLog.service');

async function listForUser(user, filter = {}) {
  const query = { ...filter };
  if (user.role === 'STUDENT') {
    const student = await Student.findById(user.studentId);
    query.year = student.year;
    query.section = student.section;
  }
  return Exam.find(query).populate('subjectId', 'subjectName subjectCode').sort({ date: 1 });
}

async function create(data, actor) {
  const e = await Exam.create(data);
  await auditLog.log({ actor, action: 'EXAM_CREATE', entityType: 'Exam', entityId: e._id });
  return e;
}

async function update(id, data, actor) {
  const e = await Exam.findByIdAndUpdate(id, data, { new: true });
  if (!e) throw ApiError.notFound('Exam not found');
  await auditLog.log({ actor, action: 'EXAM_UPDATE', entityType: 'Exam', entityId: e._id });
  return e;
}

async function remove(id, actor) {
  const e = await Exam.findByIdAndDelete(id);
  if (!e) throw ApiError.notFound('Exam not found');
  await auditLog.log({ actor, action: 'EXAM_DELETE', entityType: 'Exam', entityId: id });
  return { ok: true };
}

module.exports = { listForUser, create, update, remove };