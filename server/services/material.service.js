const fs = require('fs');
const path = require('path');
const Material = require('../models/Material.model');
const Subject = require('../models/Subject.model');
const Student = require('../models/Student.model');
const User = require('../models/User.model');
const ApiError = require('../utils/ApiError');
const auditLog = require('./auditLog.service');
const notification = require('./notification.service');

async function listForUser(user, { subjectId, year, semester, unit, q, page = 1, limit = 100 }) {
  const query = { status: 'PUBLISHED' };

  if (user.role === 'STUDENT') {
    const student = await Student.findById(user.studentId);
    query.year = student.year;
    query.semester = student.currentSemester;
  } else {
    if (year) query.year = Number(year);
    if (semester) query.semester = Number(semester);
  }

  if (subjectId) query.subjectId = subjectId;
  if (unit) query.unit = Number(unit);
  if (q) query.title = new RegExp(q, 'i');

  const [items, total] = await Promise.all([
    Material.find(query)
      .populate('subjectId', 'subjectName subjectCode type semester')
      .populate('uploadedBy', 'email role')
      .sort({ semester: 1, unit: 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Material.countDocuments(query),
  ]);

  return { items, total, page, limit };
}

async function create({ title, description, subjectId, unit, file }, actor) {
  if (!file) throw ApiError.badRequest('PDF file is required');
  if (!subjectId) throw ApiError.badRequest('Subject is required');

  const u = Number(unit);
  if (![1, 2, 3, 4, 5].includes(u)) {
    throw ApiError.badRequest('Unit must be 1, 2, 3, 4 or 5');
  }

  const subject = await Subject.findById(subjectId);
  if (!subject) throw ApiError.notFound('Subject not found');

  const material = await Material.create({
    title: title || `Unit ${u}`,
    description: description || '',
    subjectId,
    year: subject.year,
    semester: subject.semester,
    unit: u,
    fileUrl: `/uploads/materials/${file.filename}`,
    fileName: file.originalname,
    fileSize: file.size,
    mimeType: file.mimetype,
    uploadedBy: actor.userId,
    uploaderRole: actor.role,
  });

  await auditLog.log({
    actor,
    action: 'MATERIAL_UPLOAD',
    entityType: 'Material',
    entityId: material._id,
    description: `Uploaded Unit ${u} PDF for ${subject.subjectCode}`,
  });

  // Notify students in the same semester
  const students = await Student.find({
    year: subject.year,
    currentSemester: subject.semester,
    status: 'ACTIVE',
  }).select('_id');
  const users = await User.find({
    role: 'STUDENT',
    studentId: { $in: students.map((s) => s._id) },
  }).select('_id');

  for (const u2 of users) {
    await notification.fanOut({
      title: `New material: ${subject.subjectCode} Unit ${u}`,
      message: `${title || `Unit ${u}`} — ${subject.subjectName}`,
      type: 'NEW_NOTES_PUBLISHED',
      recipientType: 'USER',
      filter: { userId: u2._id },
      createdBy: actor.userId,
      relatedEntity: 'Material',
      relatedEntityId: material._id,
    });
  }

  return material;
}

async function remove(id, actor) {
  const m = await Material.findById(id);
  if (!m) throw ApiError.notFound('Material not found');

  if (actor.role !== 'ADMIN' && String(m.uploadedBy) !== String(actor.userId)) {
    throw ApiError.forbidden('You can only delete materials you uploaded');
  }

  const filePath = path.join(__dirname, '..', m.fileUrl);
  fs.unlink(filePath, () => {});

  await m.deleteOne();
  await auditLog.log({ actor, action: 'MATERIAL_DELETE', entityType: 'Material', entityId: id });
  return { ok: true };
}

async function getByIdForUser(id, user) {
  const m = await Material.findById(id).populate('subjectId', 'subjectName subjectCode year semester');
  if (!m) throw ApiError.notFound('Material not found');
  if (user.role === 'STUDENT') {
    const student = await Student.findById(user.studentId);
    if (m.year !== student.year || m.semester !== student.currentSemester) {
      throw ApiError.forbidden('Not your material');
    }
  }
  return m;
}

module.exports = { listForUser, create, remove, getByIdForUser };