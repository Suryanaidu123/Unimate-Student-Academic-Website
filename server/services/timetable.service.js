const Timetable = require('../models/Timetable.model');
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
  if (user.role === 'FACULTY') query.facultyId = user.facultyId;
  return Timetable.find(query).populate('subjectId', 'subjectName subjectCode').populate('facultyId', 'name').sort({ day: 1, startTime: 1 });
}

async function create(data, actor) {
  const t = await Timetable.create(data);
  await auditLog.log({ actor, action: 'TIMETABLE_CREATE', entityType: 'Timetable', entityId: t._id });
  return t;
}

async function update(id, data, actor) {
  const t = await Timetable.findByIdAndUpdate(id, data, { new: true });
  if (!t) throw ApiError.notFound('Timetable not found');
  await auditLog.log({ actor, action: 'TIMETABLE_UPDATE', entityType: 'Timetable', entityId: t._id });
  return t;
}

async function remove(id, actor) {
  const t = await Timetable.findByIdAndDelete(id);
  if (!t) throw ApiError.notFound('Timetable not found');
  await auditLog.log({ actor, action: 'TIMETABLE_DELETE', entityType: 'Timetable', entityId: id });
  return { ok: true };
}

module.exports = { listForUser, create, update, remove };