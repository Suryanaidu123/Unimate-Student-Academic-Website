const Timetable = require('../models/Timetable.model');
const Student = require('../models/Student.model');
const ApiError = require('../utils/ApiError');
const auditLog = require('./auditLog.service');

async function listForUser(user, filter = {}) {
  const query = {};

  if (filter.year) query.year = Number(filter.year);
  if (filter.semester) query.semester = Number(filter.semester);
  if (filter.section) query.section = filter.section;
  if (filter.subjectId) query.subjectId = filter.subjectId;
  if (filter.day) query.day = filter.day;

  if (user.role === 'STUDENT') {
    const student = await Student.findById(user.studentId);
    query.year = student.year;
    query.semester = student.currentSemester;
    query.section = student.section;
  }
  if (user.role === 'FACULTY') {
    query.facultyId = user.facultyId;
  }

  return Timetable.find(query)
    .populate('subjectId', 'subjectName subjectCode type')
    .populate('facultyId', 'name employeeId')
    .sort({ day: 1, startTime: 1 });
}

async function create(data, actor) {
  const periodType = data.periodType || 'CLASS';
  const year = Number(data.year);
  const semester = Number(data.semester);

  if (![2, 3, 4].includes(year)) throw ApiError.badRequest('Year must be 2, 3 or 4');
  const validSems = [2 * year - 1, 2 * year];
  if (!validSems.includes(semester)) {
    throw ApiError.badRequest(`Semester for Year ${year} must be ${validSems[0]} or ${validSems[1]}`);
  }

  if (periodType === 'CLASS') {
    if (!data.subjectId) throw ApiError.badRequest('Subject is required for class periods');
    if (!data.facultyId) throw ApiError.badRequest('Faculty is required for class periods');
  }

  const clash = await Timetable.findOne({
    year, semester, section: data.section, day: data.day, startTime: data.startTime,
  });
  if (clash) {
    throw ApiError.conflict(
      `A slot already exists on ${data.day} at ${data.startTime} for ${year}-${semester} Sec ${data.section}.`
    );
  }

  const payload = {
    year,
    semester,
    section: data.section,
    day: data.day,
    startTime: data.startTime,
    endTime: data.endTime,
    periodType,
    isBreak: periodType === 'BREAK' || periodType === 'LUNCH',
  };
  if (periodType === 'CLASS') {
    payload.subjectId = data.subjectId;
    payload.facultyId = data.facultyId;
  }
  if (data.semesterId) payload.semesterId = data.semesterId;

  const t = await Timetable.create(payload);
  await auditLog.log({
    actor, action: 'TIMETABLE_CREATE', entityType: 'Timetable', entityId: t._id,
    description: `Created ${periodType} slot for ${year}-${semester} Sec ${t.section}`,
  });
  return t;
}

async function update(id, data, actor) {
  const t = await Timetable.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!t) throw ApiError.notFound('Timetable not found');
  await auditLog.log({
    actor, action: 'TIMETABLE_UPDATE', entityType: 'Timetable', entityId: t._id,
  });
  return t;
}

async function remove(id, actor) {
  const t = await Timetable.findByIdAndDelete(id);
  if (!t) throw ApiError.notFound('Timetable not found');
  await auditLog.log({
    actor, action: 'TIMETABLE_DELETE', entityType: 'Timetable', entityId: id,
  });
  return { ok: true };
}

module.exports = { listForUser, create, update, remove };