const Exam = require('../models/Exam.model');
const Subject = require('../models/Subject.model');
const Student = require('../models/Student.model');
const User = require('../models/User.model');
const ApiError = require('../utils/ApiError');
const auditLog = require('./auditLog.service');
const notification = require('./notification.service');

function to12h(t) {
  if (!t) return '';
  const [hh, mm] = String(t).split(':').map(Number);
  const suffix = hh >= 12 ? 'PM' : 'AM';
  const h12 = hh % 12 || 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${suffix}`;
}

async function listForUser(user, filter = {}) {
  const query = {};

  if (filter.year) query.year = Number(filter.year);
  if (filter.semester) query.semester = Number(filter.semester);
  if (filter.subjectId) query.subjectId = filter.subjectId;
  if (filter.examType) query.examType = filter.examType;

  if (user.role === 'STUDENT') {
    const student = await Student.findById(user.studentId);
    query.year = student.year;
    query.semester = student.currentSemester || student.semester;
  }

  if (user.role === 'FACULTY') {
    // Faculty only see exams for subjects they own
    const subjects = await Subject.find({ facultyId: user.facultyId }).select('_id');
    const allowed = subjects.map((s) => String(s._id));
    if (filter.subjectId && !allowed.includes(String(filter.subjectId))) {
      return [];
    }
    query.subjectId = filter.subjectId
      ? filter.subjectId
      : { $in: subjects.map((s) => s._id) };
  }

  return Exam.find(query)
    .populate('subjectId', 'subjectName subjectCode type year semester facultyId')
    .sort({ date: 1, startTime: 1 });
}

async function create(data, actor) {
  const subject = await Subject.findById(data.subjectId);
  if (!subject) throw ApiError.notFound('Subject not found');

  // Faculty can only schedule exams for their own subjects
  if (actor.role === 'FACULTY') {
    if (!subject.facultyId || String(subject.facultyId) !== String(actor.facultyId)) {
      throw ApiError.forbidden('You are not assigned to this subject.');
    }
  }

  const payload = {
    examName: data.examName,
    subjectId: data.subjectId,
    examType: data.examType,
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
    year: subject.year,
    semester: subject.semester,
    syllabus: data.syllabus || '',
    status: data.status || 'SCHEDULED',
  };

  const e = await Exam.create(payload);
  await auditLog.log({
    actor, action: 'EXAM_CREATE', entityType: 'Exam', entityId: e._id,
    description: `Scheduled ${e.examName} for ${subject.subjectCode} (Sem ${subject.semester})`,
  });

  // Notify students in this semester
  try {
    const students = await Student.find({
      year: subject.year,
      currentSemester: subject.semester,
      status: 'ACTIVE',
    }).select('_id');

    const users = await User.find({
      role: 'STUDENT',
      studentId: { $in: students.map((s) => s._id) },
    }).select('_id');

    const dateStr = new Date(e.date).toLocaleDateString(undefined, {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });
    const timeStr = `${to12h(e.startTime)} – ${to12h(e.endTime)}`;

    const message =
      `Subject: ${subject.subjectName} (${subject.subjectCode})\n` +
      `Semester: ${subject.semester}\n` +
      `Date: ${dateStr}\n` +
      `Time: ${timeStr}` +
      (e.syllabus ? `\nSyllabus: ${e.syllabus}` : '');

    for (const u of users) {
      await notification.fanOut({
        title: `New Exam Scheduled: ${e.examName}`,
        message,
        type: 'EXAM_SCHEDULED',
        recipientType: 'USER',
        filter: { userId: u._id },
        createdBy: actor.userId,
        relatedEntity: 'Exam',
        relatedEntityId: e._id,
      });
    }

    console.log(`[exams] notified ${users.length} students for ${e.examName}`);
  } catch (err) {
    console.error('Exam notification fan-out failed:', err.message);
  }

  return e;
}

async function update(id, data, actor) {
  const e0 = await Exam.findById(id);
  if (!e0) throw ApiError.notFound('Exam not found');

  if (actor.role === 'FACULTY') {
    const sub = await Subject.findById(e0.subjectId);
    if (!sub || String(sub.facultyId) !== String(actor.facultyId)) {
      throw ApiError.forbidden('You are not assigned to this subject.');
    }
  }

  const patch = { ...data };
  if (data.subjectId) {
    const subject = await Subject.findById(data.subjectId);
    if (!subject) throw ApiError.notFound('Subject not found');
    if (actor.role === 'FACULTY' && String(subject.facultyId) !== String(actor.facultyId)) {
      throw ApiError.forbidden('You are not assigned to this subject.');
    }
    patch.year = subject.year;
    patch.semester = subject.semester;
  }

  const e = await Exam.findByIdAndUpdate(id, patch, { new: true, runValidators: true });
  await auditLog.log({ actor, action: 'EXAM_UPDATE', entityType: 'Exam', entityId: e._id });
  return e;
}

async function remove(id, actor) {
  const e0 = await Exam.findById(id);
  if (!e0) throw ApiError.notFound('Exam not found');

  if (actor.role === 'FACULTY') {
    const sub = await Subject.findById(e0.subjectId);
    if (!sub || String(sub.facultyId) !== String(actor.facultyId)) {
      throw ApiError.forbidden('You are not assigned to this subject.');
    }
  }

  await e0.deleteOne();
  await auditLog.log({ actor, action: 'EXAM_DELETE', entityType: 'Exam', entityId: id });
  return { ok: true };
}

module.exports = { listForUser, create, update, remove };