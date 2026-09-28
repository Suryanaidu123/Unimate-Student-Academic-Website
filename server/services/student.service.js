const Student = require('../models/Student.model');
const User = require('../models/User.model');
const ApiError = require('../utils/ApiError');
const auditLog = require('./auditLog.service');

async function list({ q, year, semester, section, batch, status, page = 1, limit = 20 }) {
  const query = {};
  if (year) query.year = Number(year);
  if (semester) query.semester = Number(semester);
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
    Student.find(query)
      .sort({ year: 1, section: 1, rollNumber: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Student.countDocuments(query),
  ]);

  return { items, total, page, limit };
}

async function getById(id) {
  const s = await Student.findById(id);
  if (!s) throw ApiError.notFound('Student not found');
  return s;
}

const BATCH_MAP = {
  2: { batch: '2025-2029', admissionYear: 2025 },
  3: { batch: '2024-2028', admissionYear: 2024 },
  4: { batch: '2023-2027', admissionYear: 2023 },
};

async function create(data, actor) {
  const year = Number(data.academicYear);
  const meta = BATCH_MAP[year];
  if (!meta) throw ApiError.badRequest('Academic year must be 2, 3 or 4');

  const dup = await Student.findOne({
    $or: [{ rollNumber: data.rollNumber }, { email: data.email }],
  });
  if (dup) throw ApiError.conflict('Student with same roll number or email already exists');

  const payload = {
    rollNumber: data.rollNumber.trim(),
    email: data.email.trim().toLowerCase(),
    name: '',                            // student fills this on registration
    academicYear: year,
    year,
    semester: 2 * year - 1,              // Y2→3, Y3→5, Y4→7
    section: 'A',
    batch: meta.batch,
    admissionYear: meta.admissionYear,
    department: 'AI & ML',
    course: 'B.Tech AI & ML',
  };

  const s = await Student.create(payload);

  await auditLog.log({
    actor,
    action: 'STUDENT_CREATE',
    entityType: 'Student',
    entityId: s._id,
    description: `Created student ${s.rollNumber} (Year ${s.year})`,
    newValue: payload,
  });

  return s;
}

async function update(id, data, actor) {
  const old = await Student.findById(id);
  if (!old) throw ApiError.notFound('Student not found');

  const s = await Student.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });

  await auditLog.log({
    actor,
    action: 'STUDENT_UPDATE',
    entityType: 'Student',
    entityId: s._id,
    description: `Updated student ${s.rollNumber}`,
    oldValue: old.toObject(),
    newValue: data,
  });

  return s;
}

async function setStatus(id, status, actor) {
  const s = await Student.findByIdAndUpdate(id, { status }, { new: true });
  if (!s) throw ApiError.notFound('Student not found');

  await User.updateOne({ studentId: s._id }, { status });

  await auditLog.log({
    actor,
    action: 'STUDENT_STATUS',
    entityType: 'Student',
    entityId: s._id,
    description: `Set status ${status}`,
  });

  return s;
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
      summary.errors.push({
        row: i + 1,
        rollNumber: row.rollNumber,
        message: e.message,
      });
    }
  }

  await auditLog.log({
    actor,
    action: 'STUDENT_BULK_IMPORT',
    entityType: 'Student',
    description: `Imported ${summary.success}/${summary.total}`,
  });

  return summary;
}

module.exports = { list, getById, create, update, setStatus, bulkImport };