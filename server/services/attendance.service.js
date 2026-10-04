const Attendance = require('../models/Attendance.model');
const AttendanceSession = require('../models/AttendanceSession.model');
const Student = require('../models/Student.model');
const Subject = require('../models/Subject.model');
const Timetable = require('../models/Timetable.model');
const ApiError = require('../utils/ApiError');
const auditLog = require('./auditLog.service');
const settings = require('./settings.service');

/**
 * Conduct a timetable period for a class.
 * - Inserts one AttendanceSession (unique per year+sem+section+date+period).
 * - Creates one Attendance record per active student in that class.
 * - Held count increments by `periodsCount` for EVERY student (present or absent).
 * - Attended increments by periodsCount ONLY for students marked PRESENT.
 */
async function conductSession({
  year, semester, section, subjectId, date, periodStart, periodEnd,
  periodsCount = 1, presentStudentIds = [], notes = '',
}, actor) {
  // 1. Freeze guard
  if (await settings.isFrozen()) {
    throw ApiError.forbidden('Attendance is currently frozen. Please resume before recording.');
  }

  // 2. Validate date + timetable day
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) throw ApiError.badRequest('Invalid date.');
  const dayKey = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.getDay()];
  if (dayKey === 'SUN') throw ApiError.badRequest('Sunday is not a working day.');

  // 3. Verify subject
  const subject = await Subject.findById(subjectId);
  if (!subject) throw ApiError.notFound('Subject not found');

  // 4. Verify timetable slot exists
  const slot = await Timetable.findOne({
    year: Number(year), semester: Number(semester), section,
    day: dayKey, startTime: periodStart,
  });
  if (!slot) {
    throw ApiError.badRequest(
      `No timetable slot found for ${dayKey} at ${periodStart} in ${year}-${semester} Section ${section}.`
    );
  }

  // 5. Duplicate guard
  const existing = await AttendanceSession.findOne({
    year: Number(year), semester: Number(semester), section, date: d, periodStart,
  });
  if (existing) {
    throw ApiError.conflict(
      `Attendance for ${dayKey} ${periodStart} on ${d.toDateString()} has already been recorded.`
    );
  }

  // 6. Create session
  const session = await AttendanceSession.create({
    year: Number(year), semester: Number(semester), section,
    subjectId, date: d, day: dayKey,
    periodStart, periodEnd,
    periodsCount: Number(periodsCount),
    facultyId: slot.facultyId,
    markedBy: actor.userId,
    locked: true,
    notes,
  });

  // 7. Fetch all active students in that class
  const students = await Student.find({
    year: Number(year), currentSemester: Number(semester), section,
    status: 'ACTIVE',
  }).select('_id');

  const presentSet = new Set(presentStudentIds.map((id) => String(id)));

  // 8. Build + insert attendance records
  const records = students.map((s) => ({
    sessionId: session._id,
    studentId: s._id,
    status: presentSet.has(String(s._id)) ? 'PRESENT' : 'ABSENT',
    year: Number(year), semester: Number(semester), section,
    subjectId, date: d,
    periodsCount: Number(periodsCount),
  }));

  await Attendance.insertMany(records, { ordered: false });

  await auditLog.log({
    actor,
    action: 'ATTENDANCE_SESSION_CREATE',
    entityType: 'AttendanceSession',
    entityId: session._id,
    description: `Marked ${subject.subjectCode} ${periodStart} on ${d.toDateString()} (${presentSet.size}/${students.length} present)`,
  });

  return {
    session,
    totalStudents: students.length,
    present: presentSet.size,
    absent: students.length - presentSet.size,
  };
}

/**
 * Bulk conduct — same as conduct but for multiple periods in one request.
 * rows = [{ periodStart, periodEnd, subjectId, periodsCount, presentStudentIds }]
 */
async function conductBulk({ year, semester, section, date, rows }, actor) {
  const results = [];
  for (const row of rows) {
    try {
      const r = await conductSession({
        year, semester, section,
        subjectId: row.subjectId,
        date,
        periodStart: row.periodStart,
        periodEnd: row.periodEnd,
        periodsCount: row.periodsCount || 1,
        presentStudentIds: row.presentStudentIds || [],
        notes: row.notes || '',
      }, actor);
      results.push({ ok: true, ...r });
    } catch (e) {
      results.push({ ok: false, error: e.message, period: row.periodStart });
    }
  }
  return results;
}

/**
 * Student's own summary.
 */
async function studentSummary(studentId, subjectId) {
  const student = await Student.findById(studentId);
  if (!student) throw ApiError.notFound('Student not found');

  const query = { studentId };
  if (subjectId) query.subjectId = subjectId;

  const records = await Attendance.find(query)
    .populate('subjectId', 'subjectName subjectCode type')
    .sort({ date: -1 });

  const bySubject = {};
  let totalHeld = 0, totalAttended = 0;

  records.forEach((r) => {
    const sid = String(r.subjectId?._id || r.subjectId);
    if (!bySubject[sid]) {
      bySubject[sid] = {
        subjectId: r.subjectId?._id || r.subjectId,
        subjectName: r.subjectId?.subjectName || '',
        subjectCode: r.subjectId?.subjectCode || '',
        held: 0,
        attended: 0,
      };
    }
    bySubject[sid].held += r.periodsCount;
    if (r.status === 'PRESENT') bySubject[sid].attended += r.periodsCount;
    totalHeld += r.periodsCount;
    if (r.status === 'PRESENT') totalAttended += r.periodsCount;
  });

  const pct = (a, h) => (h > 0 ? Math.round((a / h) * 1000) / 10 : 0);

  return {
    overall: {
      held: totalHeld,
      attended: totalAttended,
      percentage: pct(totalAttended, totalHeld),
      belowThreshold: totalHeld > 0 && pct(totalAttended, totalHeld) < 75,
    },
    subjects: Object.values(bySubject).map((s) => ({
      ...s,
      percentage: pct(s.attended, s.held),
      belowThreshold: s.held > 0 && pct(s.attended, s.held) < 75,
    })),
    recent: records.slice(0, 30),
  };
}

/**
 * Admin/Staff: attendance summary for a whole year.
 */
async function yearSummary({ year, semester, section }) {
  const query = { year: Number(year) };
  if (semester) query.semester = Number(semester);
  if (section) query.section = section;

  const students = await Student.find({
    year: Number(year),
    ...(semester ? { currentSemester: Number(semester) } : {}),
    ...(section ? { section } : {}),
    status: 'ACTIVE',
  }).select('rollNumber name section currentSemester');

  const records = await Attendance.find(query);

  const byStudent = {};
  records.forEach((r) => {
    const sid = String(r.studentId);
    byStudent[sid] = byStudent[sid] || { held: 0, attended: 0 };
    byStudent[sid].held += r.periodsCount;
    if (r.status === 'PRESENT') byStudent[sid].attended += r.periodsCount;
  });

  const pct = (a, h) => (h > 0 ? Math.round((a / h) * 1000) / 10 : 0);

  return students.map((s) => {
    const d = byStudent[String(s._id)] || { held: 0, attended: 0 };
    return {
      studentId: s._id,
      rollNumber: s.rollNumber,
      name: s.name,
      section: s.section,
      semester: s.currentSemester,
      held: d.held,
      attended: d.attended,
      percentage: pct(d.attended, d.held),
      belowThreshold: d.held > 0 && pct(d.attended, d.held) < 75,
    };
  }).sort((a, b) => String(a.rollNumber).localeCompare(String(b.rollNumber), undefined, { numeric: true }));
}

async function listSessions({ year, semester, section, date }) {
  const query = {};
  if (year) query.year = Number(year);
  if (semester) query.semester = Number(semester);
  if (section) query.section = section;
  if (date) query.date = new Date(date);

  return AttendanceSession.find(query)
    .populate('subjectId', 'subjectName subjectCode type')
    .populate('markedBy', 'email')
    .sort({ date: -1, periodStart: 1 });
}

async function getSessionDetail(id) {
  const session = await AttendanceSession.findById(id)
    .populate('subjectId', 'subjectName subjectCode type');
  if (!session) throw ApiError.notFound('Session not found');

  const records = await Attendance.find({ sessionId: id })
    .populate('studentId', 'rollNumber name section');

  records.sort((a, b) =>
    String(a.studentId?.rollNumber || '').localeCompare(
      String(b.studentId?.rollNumber || ''), undefined, { numeric: true }
    )
  );

  return { session, records };
}

/**
 * Admin: delete a session and its records (unlock for correction).
 */
async function deleteSession(id, actor) {
  const session = await AttendanceSession.findById(id);
  if (!session) throw ApiError.notFound('Session not found');

  await Attendance.deleteMany({ sessionId: id });
  await session.deleteOne();

  await auditLog.log({
    actor,
    action: 'ATTENDANCE_SESSION_DELETE',
    entityType: 'AttendanceSession',
    entityId: id,
    description: `Deleted session on ${session.date?.toDateString?.() || session.date} ${session.periodStart}`,
  });
  return { ok: true };
}

module.exports = {
  conductSession, conductBulk,
  studentSummary, yearSummary,
  listSessions, getSessionDetail, deleteSession,
};