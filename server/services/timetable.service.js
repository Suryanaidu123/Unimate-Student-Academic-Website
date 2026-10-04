const Timetable = require('../models/Timetable.model');
const Subject = require('../models/Subject.model');
const Student = require('../models/Student.model');
const User = require('../models/User.model');
const ApiError = require('../utils/ApiError');
const auditLog = require('./auditLog.service');
const notification = require('./notification.service');

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

  // Normalise periodIndices
  const periodIndices = Array.isArray(data.periodIndices)
    ? [...new Set(data.periodIndices.map((n) => Number(n)).filter((n) => !Number.isNaN(n)))].sort((a, b) => a - b)
    : [];
  const span = Number(data.span || periodIndices.length || 1);

  // ---- BREAK / LUNCH ----
  if (periodType !== 'CLASS') {
    const clash = await Timetable.findOne({
      year,
      semester,
      section: data.section,
      day: data.day,
      startTime: data.startTime,
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
      isBreak: true,
      periodIndices,
      span: Math.max(1, span),
    };

    const t = await Timetable.create(payload);
    await auditLog.log({
      actor,
      action: 'TIMETABLE_CREATE',
      entityType: 'Timetable',
      entityId: t._id,
      description: `Created ${periodType} slot for ${year}-${semester} Sec ${t.section}`,
    });
    return t;
  }

  // ---- CLASS ----
  if (!data.subjectId) throw ApiError.badRequest('Subject is required for class periods');

  const subject = await Subject.findById(data.subjectId);
  if (!subject) throw ApiError.notFound('Subject not found');
  if (Number(subject.year) !== year || Number(subject.semester) !== semester) {
    throw ApiError.badRequest('Selected subject does not belong to this year/semester.');
  }

  // Faculty auto-match
  if (!subject.facultyId) {
    throw ApiError.badRequest(
      'Faculty not assigned to this subject. Please assign a faculty in the Subjects section first.'
    );
  }
  if (data.facultyId && String(data.facultyId) !== String(subject.facultyId)) {
    throw ApiError.badRequest(
      'Selected faculty does not match the faculty assigned to this subject.'
    );
  }

  // Prevent clashing with an existing CLASS slot on the same day + section
  // (spanning slots occupy multiple indices — we check overlaps by startTime)
  const clash = await Timetable.findOne({
    year,
    semester,
    section: data.section,
    day: data.day,
    startTime: data.startTime,
  });
  if (clash) {
    throw ApiError.conflict(
      `A slot already exists on ${data.day} at ${data.startTime} for ${year}-${semester} Sec ${data.section}.`
    );
  }

  // Also prevent overlaps with spanning slots: any existing slot that covers
  // one of our target indices should be deleted by the caller first.
  if (periodIndices.length > 1) {
    const overlapping = await Timetable.find({
      year,
      semester,
      section: data.section,
      day: data.day,
      $or: [
        { periodIndices: { $in: periodIndices } },
        // legacy slots without periodIndices: compare by startTime
      ],
    });
    // We do NOT block on overlap; the caller (client) deletes conflicting slots
    // before creating the combined slot.
  }

  const payload = {
    year,
    semester,
    section: data.section,
    day: data.day,
    startTime: data.startTime,
    endTime: data.endTime,
    periodType: 'CLASS',
    isBreak: false,
    subjectId: subject._id,
    facultyId: subject.facultyId,
    periodIndices,
    span: Math.max(1, span),
  };

  const t = await Timetable.create(payload);

  await auditLog.log({
    actor,
    action: 'TIMETABLE_CREATE',
    entityType: 'Timetable',
    entityId: t._id,
    description: `Created CLASS slot for ${subject.subjectCode} (Periods ${periodIndices.map((i) => i + 1).join('+') || '1'})`,
  });

  // Notify students
  try {
    const students = await Student.find({
      year,
      semester,
      section: data.section,
      status: 'ACTIVE',
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

  // Normalise periodIndices if present
  if (Array.isArray(patch.periodIndices)) {
    patch.periodIndices = [...new Set(patch.periodIndices.map((n) => Number(n)).filter((n) => !Number.isNaN(n)))].sort(
      (a, b) => a - b
    );
    patch.span = Number(patch.span || patch.periodIndices.length || 1);
  }

  const updated = await Timetable.findByIdAndUpdate(id, patch, { new: true, runValidators: true });
  await auditLog.log({
    actor,
    action: 'TIMETABLE_UPDATE',
    entityType: 'Timetable',
    entityId: updated._id,
    description: `Updated slot on ${updated.day} at ${updated.startTime}`,
  });
  return updated;
}

async function remove(id, actor) {
  const t = await Timetable.findByIdAndDelete(id);
  if (!t) throw ApiError.notFound('Timetable not found');
  await auditLog.log({
    actor,
    action: 'TIMETABLE_DELETE',
    entityType: 'Timetable',
    entityId: id,
    description: `Deleted slot on ${t.day} at ${t.startTime}`,
  });
  return { ok: true };
}

async function reset({ year, semester, section }, actor) {
  const query = {};
  if (year) query.year = Number(year);
  if (semester) query.semester = Number(semester);
  if (section) query.section = section;

  if (!query.year && !query.semester && !query.section) {
    throw ApiError.badRequest('Provide year, semester or section');
  }

  const result = await Timetable.deleteMany(query);

  await auditLog.log({
    actor,
    action: 'TIMETABLE_RESET',
    entityType: 'Timetable',
    description: `Reset timetable: deleted ${result.deletedCount} slots`,
    metadata: { ...query, deleted: result.deletedCount },
  });

  return { deleted: result.deletedCount };
}

module.exports = { listForUser, create, update, remove, reset };