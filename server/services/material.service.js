const fs = require('fs');
const path = require('path');
const Material = require('../models/Material.model');
const Subject = require('../models/Subject.model');
const Student = require('../models/Student.model');
const ApiError = require('../utils/ApiError');
const auditLog = require('./auditLog.service');
const notification = require('./notification.service');

async function listForUser(user, { subjectId, year, q, page = 1, limit = 50 }) {
  const query = { status: 'PUBLISHED' };

  if (user.role === 'STUDENT') {
    const student = await Student.findById(user.studentId);
    query.year = student.year;
  } else if (year) {
    query.year = Number(year);
  }

  if (subjectId) query.subjectId = subjectId;
  if (q) query.title = new RegExp(q, 'i');

  const [items, total] = await Promise.all([
    Material.find(query)
     .populate('subjectId', 'subjectName subjectCode type')
      .populate('uploadedBy', 'email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Material.countDocuments(query),
  ]);

  return { items, total, page, limit };
}

async function create({ title, description, subjectId, file }, actor) {
  if (!file) throw ApiError.badRequest('PDF file is required');

  const subject = await Subject.findById(subjectId);
  if (!subject) throw ApiError.notFound('Subject not found');

  const material = await Material.create({
    title,
    description,
    subjectId,
    year: subject.year,
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
    description: `Uploaded PDF "${title}" for ${subject.subjectCode}`,
  });

  // Notify students of that year
  const students = await Student.find({ year: subject.year }).select('_id');
  const User = require('../models/User.model');
  const users = await User.find({ role: 'STUDENT', studentId: { $in: students.map((s) => s._id) } }).select('_id');
  for (const u of users) {
    await notification.fanOut({
      title: 'New Academic Material',
      message: `${title} — ${subject.subjectName}`,
      type: 'NEW_NOTES_PUBLISHED',
      recipientType: 'USER',
      filter: { userId: u._id },
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

  // Only the uploader or admin can delete
  if (actor.role !== 'ADMIN' && String(m.uploadedBy) !== String(actor.userId)) {
    throw ApiError.forbidden('You can only delete materials you uploaded');
  }

  // Remove the file from disk (best-effort)
  const filePath = path.join(__dirname, '..', m.fileUrl);
  fs.unlink(filePath, () => {});

  await m.deleteOne();
  await auditLog.log({ actor, action: 'MATERIAL_DELETE', entityType: 'Material', entityId: id });
  return { ok: true };
}

async function getByIdForUser(id, user) {
  const m = await Material.findById(id).populate('subjectId', 'subjectName subjectCode year');
  if (!m) throw ApiError.notFound('Material not found');
  if (user.role === 'STUDENT') {
    const student = await Student.findById(user.studentId);
    if (m.year !== student.year) throw ApiError.forbidden('Not your material');
  }
  return m;
}

module.exports = { listForUser, create, remove, getByIdForUser };