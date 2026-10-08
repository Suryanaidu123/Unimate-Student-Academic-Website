const { StudentDocument, ALLOWED_MIME } = require('../models/StudentDocument.model');
const Student  = require('../models/Student.model');
const Faculty  = require('../models/Faculty.model');
const ApiError = require('../utils/ApiError');
const storage  = require('../utils/storage');
const auditLog = require('./auditLog.service');

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

// ── Upload ────────────────────────────────────────────────────────────────────
async function upload({ docType, title, description }, file, actor) {
  if (actor.role !== 'STUDENT') throw ApiError.forbidden('Only students can upload documents.');

  if (!file) throw ApiError.badRequest('No file uploaded.');
  if (!ALLOWED_MIME.includes(file.mimetype)) {
    throw ApiError.badRequest('Only PDF, JPG, or PNG files are allowed.');
  }
  if (file.size > MAX_SIZE) {
    throw ApiError.badRequest('File size must not exceed 10 MB.');
  }
  if (!docType) throw ApiError.badRequest('Document type is required.');
  if (!title?.trim()) throw ApiError.badRequest('Title is required.');

  const student = await Student.findById(actor.studentId).select('year').lean();
  if (!student) throw ApiError.notFound('Student not found.');

  // Upload to B2
  const ext     = file.originalname.split('.').pop().toLowerCase();
  const key     = `student-docs/${actor.studentId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
  const env     = require('../config/env');
  const s3      = new S3Client({
    region: env.B2_REGION,
    endpoint: env.B2_ENDPOINT,
    credentials: { accessKeyId: env.B2_KEY_ID, secretAccessKey: env.B2_APPLICATION_KEY },
    forcePathStyle: true,
  });
  await s3.send(new PutObjectCommand({
    Bucket: env.B2_BUCKET,
    Key: key,
    Body: file.buffer,
    ContentType: file.mimetype,
  }));

  const doc = await StudentDocument.create({
    studentId:   actor.studentId,
    year:        student.year,
    docType,
    title:       title.trim(),
    description: (description || '').trim(),
    fileKey:     key,
    fileName:    file.originalname,
    fileSize:    file.size,
    mimeType:    file.mimetype,
    uploadedBy:  actor.userId,
  });

  await auditLog.log({
    actor, action: 'STUDENT_DOC_UPLOAD', entityType: 'StudentDocument', entityId: doc._id,
    description: `Uploaded ${docType}: ${doc.title}`,
  });
  return doc;
}

// ── List own documents ────────────────────────────────────────────────────────
async function listMine(actor) {
  if (actor.role !== 'STUDENT') throw ApiError.forbidden();
  return StudentDocument.find({ studentId: actor.studentId, status: 'ACTIVE' })
    .sort({ createdAt: -1 }).lean();
}

// ── Download URL ──────────────────────────────────────────────────────────────
async function getDownloadUrl(docId, actor) {
  const doc = await StudentDocument.findOne({ _id: docId, status: 'ACTIVE' })
    .populate('studentId', 'year').lean();
  if (!doc) throw ApiError.notFound('Document not found.');

  // Access control
  if (actor.role === 'STUDENT') {
    if (String(doc.studentId._id) !== String(actor.studentId)) {
      throw ApiError.forbidden('You can only access your own documents.');
    }
  } else if (actor.role === 'FACULTY') {
    const faculty = await Faculty.findById(actor.facultyId).select('documentVisibilityYears').lean();
    const allowed = faculty?.documentVisibilityYears || [];
    if (!allowed.includes(doc.studentId.year)) {
      throw ApiError.forbidden('You do not have permission to view documents for this student\'s year.');
    }
  }
  // ADMIN — always allowed

  const url = await storage.getSignedDownloadUrl(doc.fileKey, doc.fileName, 'inline');
  return { url, fileName: doc.fileName, mimeType: doc.mimeType };
}

// ── Delete own document ───────────────────────────────────────────────────────
async function deleteOwn(docId, actor) {
  if (actor.role !== 'STUDENT') throw ApiError.forbidden();
  const doc = await StudentDocument.findOne({ _id: docId, studentId: actor.studentId, status: 'ACTIVE' });
  if (!doc) throw ApiError.notFound('Document not found.');
  doc.status = 'DELETED';
  await doc.save();
  // Optionally delete from B2 (comment out to keep files)
  // await storage.deleteFile(doc.fileKey);
  return { ok: true };
}

// ── Admin: list documents by year (and optional student) ─────────────────────
async function adminList({ year, studentId, docType, page = 1, limit = 100 }) {
  const q = { status: 'ACTIVE' };
  if (year)      q.year = Number(year);
  if (studentId) q.studentId = studentId;
  if (docType)   q.docType = docType;

  const [items, total] = await Promise.all([
    StudentDocument.find(q)
      .populate('studentId', 'rollNumber name year email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    StudentDocument.countDocuments(q),
  ]);
  return { items, total, page, limit };
}

// ── Faculty: list documents for their allowed years ───────────────────────────
async function facultyList({ year, docType }, actor) {
  if (actor.role !== 'FACULTY') throw ApiError.forbidden();
  const faculty = await Faculty.findById(actor.facultyId).select('documentVisibilityYears').lean();
  const allowed = faculty?.documentVisibilityYears || [];
  if (allowed.length === 0) throw ApiError.forbidden('You have not been granted document visibility for any year.');

  const requestedYear = year ? Number(year) : null;
  if (requestedYear && !allowed.includes(requestedYear)) {
    throw ApiError.forbidden(`You do not have visibility for Year ${requestedYear}.`);
  }

  const q = { status: 'ACTIVE', year: { $in: requestedYear ? [requestedYear] : allowed } };
  if (docType) q.docType = docType;

  const [items, total] = await Promise.all([
    StudentDocument.find(q)
      .populate('studentId', 'rollNumber name year email')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean(),
    StudentDocument.countDocuments(q),
  ]);
  return { items, total, allowedYears: allowed };
}

// ── Admin: set faculty document visibility years ──────────────────────────────
async function setFacultyVisibility(facultyId, years, actor) {
  if (actor.role !== 'ADMIN') throw ApiError.forbidden('Only admin can set faculty visibility.');
  const validYears = (years || []).map(Number).filter((y) => [2, 3, 4].includes(y));
  const fac = await Faculty.findByIdAndUpdate(
    facultyId,
    { documentVisibilityYears: validYears },
    { new: true }
  );
  if (!fac) throw ApiError.notFound('Faculty not found.');
  await auditLog.log({
    actor, action: 'FACULTY_DOC_VISIBILITY', entityType: 'Faculty', entityId: facultyId,
    description: `Set doc visibility for ${fac.employeeId}: years [${validYears.join(', ')}]`,
  });
  return fac;
}

module.exports = { upload, listMine, getDownloadUrl, deleteOwn, adminList, facultyList, setFacultyVisibility };
