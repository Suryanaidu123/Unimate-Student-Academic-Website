const Student = require('../models/Student.model');
const User = require('../models/User.model');
const Marks = require('../models/Marks.model');
const OtpRequest = require('../models/OtpRequest.model');
const ApiError = require('../utils/ApiError');
const auditLog = require('./auditLog.service');

const BATCH_MAP = {
  2: { batch: '2025-2029', admissionYear: 2025 },
  3: { batch: '2024-2028', admissionYear: 2024 },
  4: { batch: '2023-2027', admissionYear: 2023 },
};

async function list({ q, year, semester, section, batch, status, page = 1, limit = 500 }) {
  const query = {};

  if (year) query.year = Number(year);
  if (semester) query.currentSemester = Number(semester);
  if (section) query.section = section;
  if (batch) query.batch = batch;
  if (status) query.status = status;

  if (q) {
    query.$or = [
      { rollNumber: new RegExp(q, 'i') },
      { name: new RegExp(q, 'i') },
      { email: new RegExp(q, 'i') },
    ];
  }

  const [items, total] = await Promise.all([
    Student.find(query).skip((page - 1) * limit).limit(limit),
    Student.countDocuments(query),
  ]);

  // Natural sort: year → semester → roll number (numeric-aware)
  items.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    const sa = a.currentSemester || a.semester || 0;
    const sb = b.currentSemester || b.semester || 0;
    if (sa !== sb) return sa - sb;
    return String(a.rollNumber || '').localeCompare(
      String(b.rollNumber || ''),
      undefined,
      { numeric: true, sensitivity: 'base' }
    );
  });

  return { items, total, page, limit };
}

async function getById(id) {
  const s = await Student.findById(id);
  if (!s) throw ApiError.notFound('Student not found');
  return s;
}

async function create(data, actor) {
  const year = Number(data.academicYear);
  const meta = BATCH_MAP[year];
  if (!meta) throw ApiError.badRequest('Academic year must be 2, 3 or 4');

  const dup = await Student.findOne({
    $or: [{ rollNumber: data.rollNumber }, { email: data.email }],
  });
  if (dup) throw ApiError.conflict('Student with same roll number or email already exists');

  const firstSem = 2 * year - 1;

  const payload = {
    rollNumber: data.rollNumber.trim(),
    email: data.email.trim().toLowerCase(),
    name: '',
    academicYear: year,
    year,
    currentSemester: firstSem,
    semester: firstSem,
    section: 'A',
    batch: meta.batch,
    admissionYear: meta.admissionYear,
    department: 'AI & ML',
    course: 'B.Tech AI & ML',
    status: 'ACTIVE',
  };

  const s = await Student.create(payload);
  await auditLog.log({
    actor, action: 'STUDENT_CREATE', entityType: 'Student', entityId: s._id,
    description: `Created student ${s.rollNumber} (Year ${s.year} Sem ${s.currentSemester})`,
    newValue: payload,
  });
  return s;
}

async function update(id, data, actor) {
  const old = await Student.findById(id);
  if (!old) throw ApiError.notFound('Student not found');

  const patch = {};

  if (data.email !== undefined) {
    const email = String(data.email).trim().toLowerCase();
    if (email) {
      const dup = await Student.findOne({ email, _id: { $ne: id } });
      if (dup) throw ApiError.conflict('Another student already uses this email');
      patch.email = email;
      await User.updateOne({ studentId: id }, { $set: { email } });
    }
  }

  if (data.name !== undefined) patch.name = String(data.name).trim();

  if (data.year !== undefined) {
    const y = Number(data.year);
    const meta = BATCH_MAP[y];
    if (meta) {
      patch.year = y;
      patch.academicYear = y;
      patch.batch = meta.batch;
      patch.admissionYear = meta.admissionYear;
      if (old.year !== y) {
        patch.currentSemester = 2 * y - 1;
        patch.semester = 2 * y - 1;
      }
    }
  }

  if (data.currentSemester !== undefined) {
    const sem = Number(data.currentSemester);
    patch.currentSemester = sem;
    patch.semester = sem;
  }

  if (data.status !== undefined) patch.status = data.status;

  const s = await Student.findByIdAndUpdate(id, patch, { new: true, runValidators: true });

  await auditLog.log({
    actor, action: 'STUDENT_UPDATE', entityType: 'Student', entityId: s._id,
    description: `Updated student ${s.rollNumber}`,
    oldValue: old.toObject(), newValue: patch,
  });
  return s;
}

async function setStatus(id, status, actor) {
  const s = await Student.findByIdAndUpdate(id, { status }, { new: true });
  if (!s) throw ApiError.notFound('Student not found');
  await User.updateOne({ studentId: s._id }, { status });
  await auditLog.log({
    actor, action: 'STUDENT_STATUS', entityType: 'Student', entityId: s._id,
    description: `Set status ${status}`,
  });
  return s;
}

async function remove(id, actor) {
  const s = await Student.findById(id);
  if (!s) throw ApiError.notFound('Student not found');

  await Promise.all([
    User.deleteMany({ studentId: s._id }),
    Marks.deleteMany({ studentId: s._id }),
    OtpRequest.deleteMany({ rollNumber: s.rollNumber }),
  ]);

  await s.deleteOne();

  await auditLog.log({
    actor, action: 'STUDENT_DELETE', entityType: 'Student', entityId: id,
    description: `Deleted student ${s.rollNumber}`,
    oldValue: s.toObject(),
  });
  return { ok: true };
}

async function bulkImport(rows, actor) {
  const summary = { total: rows.length, success: 0, failed: 0, errors: [] };
  for (const [i, row] of rows.entries()) {
    try {
      const exists = await Student.findOne({
        $or: [{ rollNumber: row.rollNumber }, { email: row.email }],
      });
      if (exists) throw new Error('Duplicate roll number or email');
      await Student.create(row);
      summary.success++;
    } catch (e) {
      summary.failed++;
      summary.errors.push({ row: i + 1, rollNumber: row.rollNumber, message: e.message });
    }
  }
  await auditLog.log({
    actor, action: 'STUDENT_BULK_IMPORT', entityType: 'Student',
    description: `Imported ${summary.success}/${summary.total}`,
  });
  return summary;
}

module.exports = { list, getById, create, update, setStatus, remove, bulkImport };