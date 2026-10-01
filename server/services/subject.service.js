const mongoose = require('mongoose');
const Subject = require('../models/Subject.model');
const Department = require('../models/Department.model');
const Course = require('../models/Course.model');
const ApiError = require('../utils/ApiError');
const auditLog = require('./auditLog.service');

const isValidObjectId = (v) => v && mongoose.Types.ObjectId.isValid(v);

async function ensureDefaultDepartment() {
  let dep = await Department.findOne({ code: 'AIML' });
  if (!dep) dep = await Department.create({ code: 'AIML', name: 'AI & ML' });
  return dep;
}

async function ensureDefaultCourse(departmentId) {
  let course = await Course.findOne({ code: 'BTECH-AIML' });
  if (!course) course = await Course.create({
    code: 'BTECH-AIML',
    name: 'B.Tech AI & ML',
    departmentId,
  });
  return course;
}

async function list({ q, year, type, semester, semesterId, facultyId, status, page = 1, limit = 50 }) {
  const query = {};
  if (year) query.year = Number(year);
  if (type) query.type = type;
  if (semester) query.semester = Number(semester);
  if (semesterId) query.semesterId = semesterId;
  if (facultyId) query.facultyId = facultyId;
  if (status) query.status = status;
  if (q) {
    query.$or = [
      { subjectName: new RegExp(q, 'i') },
      { subjectCode: new RegExp(q, 'i') },
    ];
  }

  const [items, total] = await Promise.all([
    Subject.find(query)
      .populate('facultyId', 'name employeeId')
      .sort({ subjectCode: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Subject.countDocuments(query),
  ]);

  // Theory first, then Lab
  items.sort((a, b) => {
    const rank = (s) => (s.type === 'LAB' ? 1 : 0);
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    return String(a.subjectCode).localeCompare(String(b.subjectCode));
  });

  return { items, total, page, limit };
}

async function getById(id) {
  const s = await Subject.findById(id).populate('facultyId', 'name employeeId');
  if (!s) throw ApiError.notFound('Subject not found');
  return s;
}

async function create(data, actor) {
  const dep = isValidObjectId(data.departmentId)
    ? await Department.findById(data.departmentId)
    : await ensureDefaultDepartment();
  if (!dep) throw ApiError.badRequest('Invalid department');

  const course = isValidObjectId(data.courseId)
    ? await Course.findById(data.courseId)
    : await ensureDefaultCourse(dep._id);
  if (!course) throw ApiError.badRequest('Invalid course');

  const year = Number(data.year);
  if (![2, 3, 4].includes(year)) throw ApiError.badRequest('Year must be 2, 3 or 4');

  // Default semester to the first semester of the year
  const semester = data.semester ? Number(data.semester) : 2 * year - 1;
  const validSems = [2 * year - 1, 2 * year];
  if (!validSems.includes(semester)) {
    throw ApiError.badRequest(`Semester for Year ${year} must be ${validSems[0]} or ${validSems[1]}`);
  }

  const payload = {
    subjectName: data.subjectName.trim(),
    subjectCode: data.subjectCode.trim().toUpperCase(),
    type: data.type || 'THEORY',
    credits: data.credits,
    year,
    semester,
    departmentId: dep._id,
    courseId: course._id,
    status: data.status || 'ACTIVE',
  };
  if (isValidObjectId(data.semesterId)) payload.semesterId = data.semesterId;
  if (isValidObjectId(data.facultyId)) payload.facultyId = data.facultyId;

  const dup = await Subject.findOne({ subjectCode: payload.subjectCode });
  if (dup) throw ApiError.conflict('Subject code already exists');

  const s = await Subject.create(payload);
  await auditLog.log({
    actor, action: 'SUBJECT_CREATE', entityType: 'Subject', entityId: s._id,
    description: `Created ${s.type} ${s.subjectCode} for Year ${year} Sem ${semester}`,
    newValue: payload,
  });
  return s;
}

async function update(id, data, actor) {
  const old = await Subject.findById(id);
  if (!old) throw ApiError.notFound('Subject not found');

  const patch = {};

  if (data.subjectName !== undefined) patch.subjectName = data.subjectName.trim();
  if (data.subjectCode !== undefined) {
    const code = data.subjectCode.trim().toUpperCase();
    const dup = await Subject.findOne({ subjectCode: code, _id: { $ne: id } });
    if (dup) throw ApiError.conflict('Another subject already uses this code');
    patch.subjectCode = code;
  }
  if (data.type !== undefined) patch.type = data.type;
  if (data.credits !== undefined) patch.credits = data.credits;
  if (data.year !== undefined) patch.year = Number(data.year);
  if (data.semester !== undefined) patch.semester = Number(data.semester);

  if (data.facultyId !== undefined) {
    if (data.facultyId === null || data.facultyId === '') {
      patch.facultyId = null;
    } else if (isValidObjectId(data.facultyId)) {
      patch.facultyId = data.facultyId;
    } else {
      throw ApiError.badRequest('Invalid facultyId');
    }
  }

  if (data.status !== undefined) patch.status = data.status;

  const s = await Subject.findByIdAndUpdate(id, patch, { new: true, runValidators: true });
  await auditLog.log({
    actor, action: 'SUBJECT_UPDATE', entityType: 'Subject', entityId: s._id,
    description: `Updated ${s.subjectCode}`,
    oldValue: old.toObject(), newValue: patch,
  });
  return s;
}

async function remove(id, actor) {
  const s = await Subject.findById(id);
  if (!s) throw ApiError.notFound('Subject not found');

  const Marks = require('../models/Marks.model');
  const marksCount = await Marks.countDocuments({ subjectId: id });
  if (marksCount > 0) {
    throw ApiError.conflict(
      `Cannot delete — this subject has ${marksCount} marks record(s). Deactivate it instead.`
    );
  }

  await s.deleteOne();
  await auditLog.log({
    actor, action: 'SUBJECT_DELETE', entityType: 'Subject', entityId: id,
    description: `Deleted subject ${s.subjectCode}`,
  });
  return { ok: true };
}

module.exports = { list, getById, create, update, remove };