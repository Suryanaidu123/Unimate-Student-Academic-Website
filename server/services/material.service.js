const Material = require('../models/Material.model');
const Subject = require('../models/Subject.model');
const Student = require('../models/Student.model');
const User = require('../models/User.model');
const ApiError = require('../utils/ApiError');
const auditLog = require('./auditLog.service');
const notification = require('./notification.service');
const storage = require('../utils/storage');

const THEORY_SECTIONS = ['UNIT_1', 'UNIT_2', 'UNIT_3', 'UNIT_4', 'UNIT_5', 'COMPLETE'];
const LAB_SECTIONS = ['EXP_1', 'EXP_2'];

async function listForUser(user, { subjectId, year, semester, section, q, page = 1, limit = 100 }) {
  const query = { status: 'PUBLISHED' };

  if (user.role === 'STUDENT') {
    const student = await Student.findById(user.studentId);
    query.year = student.year;
    query.semester = student.currentSemester || student.semester;
  } else if (user.role === 'FACULTY') {
    // Faculty can only see materials for their own subjects (all semesters)
    const subjects = await Subject.find({ facultyId: user.facultyId }).select('_id');
    const allowedIds = subjects.map((s) => String(s._id));

    if (subjectId && !allowedIds.includes(String(subjectId))) {
      return { items: [], total: 0, page, limit };
    }
    query.subjectId = subjectId
      ? subjectId
      : { $in: subjects.map((s) => s._id) };

    if (year) query.year = Number(year);
    if (semester) query.semester = Number(semester);
  } else {
    if (year) query.year = Number(year);
    if (semester) query.semester = Number(semester);
    if (subjectId) query.subjectId = subjectId;
  }

  if (section) query.section = section;
  if (q) query.title = new RegExp(q, 'i');

  const [items, total] = await Promise.all([
    Material.find(query)
      .populate('subjectId', 'subjectName subjectCode type semester')
      .populate('uploadedBy', 'email role')
      .sort({ semester: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Material.countDocuments(query),
  ]);

  return { items, total, page, limit };
}

async function create({ title, description, subjectId, section, file }, actor) {
  if (!file) throw ApiError.badRequest('PDF file is required');
  if (!subjectId) throw ApiError.badRequest('Subject is required');
  if (!section) throw ApiError.badRequest('Section is required');

  const subject = await Subject.findById(subjectId);
  if (!subject) throw ApiError.notFound('Subject not found');

  // Faculty: verify assignment for THIS subject AND its semester
  if (actor.role === 'FACULTY') {
    if (!subject.facultyId || String(subject.facultyId) !== String(actor.facultyId)) {
      throw ApiError.forbidden('You are not assigned to this subject for this semester.');
    }
  }

  const allowed = subject.type === 'LAB' ? LAB_SECTIONS : THEORY_SECTIONS;
  if (!allowed.includes(section)) {
    throw ApiError.badRequest(
      `${subject.type === 'LAB' ? 'Lab' : 'Theory'} subjects accept: ${allowed.join(', ')}`
    );
  }

  const displayTitle = title || sectionLabel(section);

  const { key } = await storage.uploadPdf(file.buffer, file.originalname);

  const material = await Material.create({
    title: displayTitle,
    description: description || '',
    subjectId,
    year: subject.year,
    semester: subject.semester,
    section,
    fileKey: key,
    fileName: file.originalname,
    fileSize: file.size,
    mimeType: file.mimetype,
    uploadedBy: actor.userId,
    uploaderRole: actor.role,
    status: 'PUBLISHED',
  });

  await auditLog.log({
    actor, action: 'MATERIAL_UPLOAD', entityType: 'Material', entityId: material._id,
    description: `Uploaded ${displayTitle} PDF for ${subject.subjectCode}`,
  });

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

    for (const u of users) {
      await notification.fanOut({
        title: `New material: ${subject.subjectCode} — ${displayTitle}`,
        message: `${subject.subjectName}`,
        type: 'NEW_NOTES_PUBLISHED',
        recipientType: 'USER',
        filter: { userId: u._id },
        createdBy: actor.userId,
        relatedEntity: 'Material',
        relatedEntityId: material._id,
      });
    }
  } catch (err) {
    console.error('Notification fan-out failed:', err.message);
  }

  return material;
}

async function remove(id, actor) {
  const m = await Material.findById(id);
  if (!m) throw ApiError.notFound('Material not found');

  if (actor.role === 'FACULTY') {
    if (String(m.uploadedBy) !== String(actor.userId)) {
      throw ApiError.forbidden('You can only delete materials you uploaded.');
    }
  }

  await storage.deleteFile(m.fileKey);
  await m.deleteOne();
  await auditLog.log({ actor, action: 'MATERIAL_DELETE', entityType: 'Material', entityId: id });
  return { ok: true };
}

async function getByIdForUser(id, user) {
  const m = await Material.findById(id).populate('subjectId', 'subjectName subjectCode year semester facultyId');
  if (!m) throw ApiError.notFound('Material not found');

  if (user.role === 'STUDENT') {
    const student = await Student.findById(user.studentId);
    const studentSem = student?.currentSemester || student?.semester;
    if (m.year !== student.year || m.semester !== studentSem) {
      throw ApiError.forbidden('Not your material');
    }
  } else if (user.role === 'FACULTY') {
    const subFac = m.subjectId?.facultyId;
    if (!subFac || String(subFac) !== String(user.facultyId)) {
      throw ApiError.forbidden('You are not assigned to this subject for this semester.');
    }
  }
  return m;
}

/**
 * Faculty-only: list distinct semesters in which they have assigned subjects.
 * Returns [{ year, semester, subjectCount }]
 */
async function myAssignedSemesters(facultyId) {
  const subjects = await Subject.find({ facultyId, status: 'ACTIVE' }).select('year semester');
  const map = {};
  subjects.forEach((s) => {
    const key = `${s.year}-${s.semester}`;
    map[key] = map[key] || { year: s.year, semester: s.semester, subjectCount: 0 };
    map[key].subjectCount++;
  });
  return Object.values(map).sort((a, b) => a.semester - b.semester);
}

/**
 * Faculty-only: list subjects assigned to them for a specific (year, semester).
 */
async function mySubjectsForSemester(facultyId, year, semester) {
  return Subject.find({
    facultyId,
    year: Number(year),
    semester: Number(semester),
    status: 'ACTIVE',
  })
    .populate('facultyId', 'name employeeId')
    .sort({ subjectCode: 1 });
}

function sectionLabel(section) {
  const labels = {
    UNIT_1: 'Unit 1', UNIT_2: 'Unit 2', UNIT_3: 'Unit 3',
    UNIT_4: 'Unit 4', UNIT_5: 'Unit 5', COMPLETE: 'Complete Material',
    EXP_1: 'Experiment 1', EXP_2: 'Experiment 2',
  };
  return labels[section] || section;
}

module.exports = {
  listForUser, create, remove, getByIdForUser,
  myAssignedSemesters, mySubjectsForSemester,
  THEORY_SECTIONS, LAB_SECTIONS, sectionLabel,
};