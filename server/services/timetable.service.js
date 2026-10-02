const Timetable = require('../models/Timetable.model');
const Subject = require('../models/Subject.model');
const Student = require('../models/Student.model');
const ApiError = require('../utils/ApiError');
const auditLog = require('./auditLog.service');
const notification = require('./notification.service');
const User = require('../models/User.model');

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
    query.semester = student.currentSemester || student.semester;
    query.section = student.section;
  }
  if (user.role === 'FACULTY') {
    query.facultyId = user.facultyId;
  }

  return Timetable.find(query)
    .populate('subjectId', 'subjectName subjectCode type')
    .populate('facultyId', 'name employeeId')
    .sort({ year: 1, semester: 1, day: 1, startTime: 1 });
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

  // Break/Lunch — no subject or faculty required
  if (periodType !== 'CLASS') {
    const clash = await Timetable.findOne({
      year, semester, section: data.section, day: data.day, startTime: data.startTime,
    });
    if (clash) throw ApiError.conflict(`A slot already exists on ${data.day} at ${data.startTime}.`);

    const payload = {
      year, semester, section: data.section,
      day: data.day, startTime: data.startTime, endTime: data.endTime,
      periodType,
      isBreak: true,
    };
    const t = await Timetable.create(payload);
    await auditLog.log({
      actor, action: 'TIMETABLE_CREATE', entityType: 'Timetable', entityId: t._id,
      description: `Created ${periodType} slot for ${year}-${semester} Sec ${t.section}`,
    });
    return t;
  }

  // CLASS — subject required, faculty auto-derived
  if (!data.subjectId) throw ApiError.badRequest('Subject is required for class periods');

  const subject = await Subject.findById(data.subjectId);
  if (!subject) throw ApiError.notFound('Subject not found');
  if (Number(subject.year) !== year || Number(subject.semester) !== semester) {
    throw ApiError.badRequest('Selected subject does not belong to this year/semester.');
  }

  // Auto-match faculty from the subject
  if (!subject.facultyId) {
    throw ApiError.badRequest(
      'Faculty not assigned to this subject. Please assign a faculty in the Subjects section first.'
    );
  }

  // If admin passed a facultyId, it must match the subject's faculty
  if (data.facultyId && String(data.facultyId) !== String(subject.facultyId)) {
    throw ApiError.badRequest(
      'Selected faculty does not match the faculty assigned to this subject.'
    );
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
    year, semester, section: data.section,
    day: data.day, startTime: data.startTime, endTime: data.endTime,
    periodType: 'CLASS',
    isBreak: false,
    subjectId: subject._id,
    facultyId: subject.facultyId,
  };

  const t = await Timetable.create(payload);
  await auditLog.log({
    actor, action: 'TIMETABLE_CREATE', entityType: 'Timetable', entityId: t._id,
    description: `Created CLASS slot for ${subject.subjectCode} (auto-matched faculty)`,
  });

  // Notify students
  try {
    const students = await Student.find({
      year, semester, section: data.section, status: 'ACTIVE',
    }).select('_id');
    const users = await User.find({
      role: 'STUDENT',
      studentId: { $in: students.map((s) => s._id) },
    }).select('_id');

    for (const u of users) {
      await notification.fanOut({
        title: 'Timetable Updated',
        message: `A new slot was added: ${subject.subjectName} on ${data.day} at ${data.startTime}.`,
        type: 'TIMETABLE_UPDATED',
        recipientType: 'USER',
        filter: { userId: u._id },
        createdBy: actor.userId,
        relatedEntity: 'Timetable',
        relatedEntityId: t._id,
      });
    }
  } catch (err) {
    console.error('Timetable notification fan-out failed:', err.message);
  }

  return t;
}

async function update(id, data, actor) {
  const t = await Timetable.findById(id);
  if (!t) throw ApiError.notFound('Timetable not found');

  const patch = { ...data };

  // If subject changed on a CLASS slot, re-derive faculty
  if (data.subjectId && (data.periodType || t.periodType) === 'CLASS') {
    const subject = await Subject.findById(data.subjectId);
    if (!subject) throw ApiError.notFound('Subject not found');
    if (!subject.facultyId) {
      throw ApiError.badRequest('Faculty not assigned to this subject.');
    }
    patch.facultyId = subject.facultyId;
    patch.year = subject.year;
    patch.semester = subject.semester;
  }

  const updated = await Timetable.findByIdAndUpdate(id, patch, { new: true, runValidators: true });
  await auditLog.log({
    actor, action: 'TIMETABLE_UPDATE', entityType: 'Timetable', entityId: updated._id,
  });
  return updated;
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