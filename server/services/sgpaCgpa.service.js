const { SgpaActivation, SgpaSubmission } = require('../models/SgpaCgpa.model');
const Student  = require('../models/Student.model');
const ApiError = require('../utils/ApiError');
const auditLog = require('./auditLog.service');

// ── activation management (admin/faculty) ─────────────────────────────────────

async function getActivations() {
  const docs = await SgpaActivation.find().sort({ year: 1 }).lean();
  // Always return rows for years 2, 3, 4
  const map = Object.fromEntries(docs.map((d) => [d.year, d]));
  return [2, 3, 4].map((y) => map[y] || { year: y, sgpaActive: false, cgpaActive: false });
}

async function setActivation(year, { sgpaActive, cgpaActive }, actor) {
  const y = Number(year);
  if (![2, 3, 4].includes(y)) throw ApiError.badRequest('Year must be 2, 3, or 4.');

  const doc = await SgpaActivation.findOneAndUpdate(
    { year: y },
    { sgpaActive: !!sgpaActive, cgpaActive: !!cgpaActive, updatedBy: actor.userId },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  await auditLog.log({
    actor, action: 'SGPA_ACTIVATION_UPDATE', entityType: 'SgpaActivation', entityId: doc._id,
    description: `Year ${y}: SGPA=${sgpaActive}, CGPA=${cgpaActive}`,
  });
  return doc;
}

// ── student submission ─────────────────────────────────────────────────────────

async function submit({ sgpa, cgpa }, actor) {
  if (actor.role !== 'STUDENT') throw ApiError.forbidden('Only students can submit.');

  const student = await Student.findById(actor.studentId).select('year');
  if (!student) throw ApiError.notFound('Student not found.');

  const activation = await SgpaActivation.findOne({ year: student.year });

  const wantsSgpa = sgpa !== undefined && sgpa !== null && sgpa !== '';
  const wantsCgpa = cgpa !== undefined && cgpa !== null && cgpa !== '';

  if (wantsSgpa && !activation?.sgpaActive) {
    throw ApiError.badRequest('SGPA entry is not currently active for your year.');
  }
  if (wantsCgpa && !activation?.cgpaActive) {
    throw ApiError.badRequest('CGPA entry is not currently active for your year.');
  }

  const patch = { year: student.year, updatedAt: new Date() };
  if (wantsSgpa) {
    const v = Number(sgpa);
    if (isNaN(v) || v < 0 || v > 10) throw ApiError.badRequest('SGPA must be between 0 and 10.');
    patch.sgpa = v;
  }
  if (wantsCgpa) {
    const v = Number(cgpa);
    if (isNaN(v) || v < 0 || v > 10) throw ApiError.badRequest('CGPA must be between 0 and 10.');
    patch.cgpa = v;
  }
  if (!wantsSgpa && !wantsCgpa) throw ApiError.badRequest('Provide SGPA or CGPA to submit.');

  const doc = await SgpaSubmission.findOneAndUpdate(
    { studentId: actor.studentId },
    { $set: patch, $setOnInsert: { studentId: actor.studentId, submittedAt: new Date() } },
    { new: true, upsert: true }
  );
  return doc;
}

async function getMySubmission(actor) {
  return SgpaSubmission.findOne({ studentId: actor.studentId }).lean();
}

async function getMyActivation(actor) {
  const student = await Student.findById(actor.studentId).select('year');
  if (!student) throw ApiError.notFound('Student not found.');
  const activation = await SgpaActivation.findOne({ year: student.year }).lean();
  return {
    year:       student.year,
    sgpaActive: activation?.sgpaActive ?? false,
    cgpaActive: activation?.cgpaActive ?? false,
  };
}

// ── tracking (admin/faculty) ──────────────────────────────────────────────────

async function getTracking(year) {
  const y = Number(year);
  if (![2, 3, 4].includes(y)) throw ApiError.badRequest('Year must be 2, 3, or 4.');

  const [students, submissions] = await Promise.all([
    Student.find({ year: y, status: 'ACTIVE' })
      .select('rollNumber name year section')
      .sort({ rollNumber: 1 })
      .lean(),
    SgpaSubmission.find({ year: y }).lean(),
  ]);

  const subMap = Object.fromEntries(
    submissions.map((s) => [String(s.studentId), s])
  );

  const rows = students.map((s) => {
    const sub = subMap[String(s._id)];
    return {
      studentId:   s._id,
      rollNumber:  s.rollNumber,
      name:        s.name,
      year:        s.year,
      sgpa:        sub?.sgpa  ?? null,
      cgpa:        sub?.cgpa  ?? null,
      submitted:   !!sub,
      submittedAt: sub?.submittedAt || null,
    };
  });

  const submitted    = rows.filter((r) => r.submitted).length;
  const notSubmitted = rows.length - submitted;

  return { year: y, total: rows.length, submitted, notSubmitted, rows };
}

module.exports = { getActivations, setActivation, submit, getMySubmission, getMyActivation, getTracking };
