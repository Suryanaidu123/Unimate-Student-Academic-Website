/**
 * sgpaCgpa.service.js
 *
 * Semester mapping (1-1 through 4-2 notation):
 *   sem1→1-1  sem2→1-2  sem3→2-1  sem4→2-2
 *   sem5→3-1  sem6→3-2  sem7→4-1  sem8→4-2
 *
 * Activation model: ONE document per academic year.
 *   activeSemesters: { '1': bool, '2': bool, … '8': bool }
 *   cgpaActive: bool
 * No compound index — all updates use findOneAndUpdate({ year }) with $set.
 */
const { SgpaActivation, SgpaRecord, SgpaSubmission } = require('../models/SgpaCgpa.model');
const Student  = require('../models/Student.model');
const ApiError = require('../utils/ApiError');
const auditLog = require('./auditLog.service');

// ── helpers ───────────────────────────────────────────────────────────────────

function semestersUpTo(currentSemester) {
  const out = [];
  for (let s = 1; s <= currentSemester; s++) out.push(s);
  return out;
}

function semLabel(sem) {
  const map = { 1:'1-1', 2:'1-2', 3:'2-1', 4:'2-2', 5:'3-1', 6:'3-2', 7:'4-1', 8:'4-2' };
  return map[sem] || String(sem);
}

async function getOrCreateRecord(studentId, year, currentSemester) {
  let rec = await SgpaRecord.findOne({ studentId });
  if (!rec) {
    rec = await SgpaRecord.create({ studentId, year, currentSemester, semesterEntries: [] });
  }
  return rec;
}

/** Read activeSemesters from a year doc safely. */
function isSemActive(doc, sem) {
  if (!doc) return false;
  const val = doc.activeSemesters?.[String(sem)];
  return val === true;
}

// ── Admin / Faculty — activation ──────────────────────────────────────────────

async function getActivations(actor) {
  // Faculty must have explicit SGPA management permission to view activation controls
  if (actor && actor.role === 'FACULTY') {
    const Faculty = require('../models/Faculty.model');
    const fac = await Faculty.findById(actor.facultyId).select('canManageSgpa').lean();
    if (!fac?.canManageSgpa) {
      throw ApiError.forbidden('You do not have permission to manage SGPA/CGPA activation.');
    }
  }

  const docs = await SgpaActivation.find().lean();
  const map  = {};
  docs.forEach((d) => { map[d.year] = d; });

  // Fetch the highest currentSemester per year so the UI can disable future toggles
  const allStudents = await Student.find({ status: 'ACTIVE', year: { $in: [2, 3, 4] } })
    .select('year currentSemester').lean();
  const maxSemByYear = {};
  allStudents.forEach((s) => {
    if (!maxSemByYear[s.year] || s.currentSemester > maxSemByYear[s.year]) {
      maxSemByYear[s.year] = s.currentSemester;
    }
  });

  // Default maxSem per year when no students exist:
  // Only allow the FIRST semester of that year (conservative — do not open future sems)
  const firstSemOfYear = { 2: 3, 3: 5, 4: 7 };

  return [2, 3, 4].map((y) => {
    const doc    = map[y];
    const maxSem = maxSemByYear[y] ?? firstSemOfYear[y]; // conservative default
    const semesters = [1, 2, 3, 4, 5, 6, 7, 8].map((sem) => ({
      semester:   sem,
      label:      semLabel(sem),
      sgpaActive: isSemActive(doc, sem),
      isFuture:   sem > maxSem,
    }));
    return { year: y, cgpaActive: doc?.cgpaActive ?? false, semesters, maxCurrentSemester: maxSem };
  });
}

async function setSemesterActivation(year, semester, sgpaActive, actor) {
  const y   = Number(year);
  const sem = Number(semester);
  if (![2, 3, 4].includes(y)) throw ApiError.badRequest('Year must be 2, 3, or 4.');
  if (sem < 1 || sem > 8)     throw ApiError.badRequest('Semester must be 1–8.');

  // Faculty must have explicit SGPA management permission
  if (actor.role === 'FACULTY') {
    const Faculty = require('../models/Faculty.model');
    const fac = await Faculty.findById(actor.facultyId).select('canManageSgpa').lean();
    if (!fac?.canManageSgpa) {
      throw ApiError.forbidden('You do not have permission to manage SGPA/CGPA activation. Contact Admin.');
    }
  }

  // Block future-semester activation: find the highest currentSemester among
  // active students in this year. Only allow activating up to that semester.
  if (!!sgpaActive) {
    const students = await Student.find({ year: y, status: 'ACTIVE' })
      .select('currentSemester').lean();
    if (students.length > 0) {
      const maxSem = Math.max(...students.map((s) => s.currentSemester));
      if (sem > maxSem) {
        throw ApiError.badRequest(
          `Cannot activate ${semLabel(sem)} for Year ${y} — students are currently in semester ${semLabel(maxSem)}. ` +
          `Only semesters up to ${semLabel(maxSem)} can be activated.`
        );
      }
    }
  }

  const doc = await SgpaActivation.findOneAndUpdate(
    { year: y },
    { $set: { [`activeSemesters.${sem}`]: !!sgpaActive, updatedBy: actor.userId } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  await auditLog.log({
    actor, action: 'SGPA_ACTIVATION_UPDATE', entityType: 'SgpaActivation', entityId: doc._id,
    description: `Year ${y} Sem ${sem} (${semLabel(sem)}): sgpaActive=${sgpaActive}`,
  });
  return doc;
}

async function setCgpaActivation(year, cgpaActive, actor) {
  const y = Number(year);
  if (![2, 3, 4].includes(y)) throw ApiError.badRequest('Year must be 2, 3, or 4.');

  // Faculty must have explicit SGPA management permission
  if (actor.role === 'FACULTY') {
    const Faculty = require('../models/Faculty.model');
    const fac = await Faculty.findById(actor.facultyId).select('canManageSgpa').lean();
    if (!fac?.canManageSgpa) {
      throw ApiError.forbidden('You do not have permission to manage SGPA/CGPA activation. Contact Admin.');
    }
  }

  const doc = await SgpaActivation.findOneAndUpdate(
    { year: y },
    { $set: { cgpaActive: !!cgpaActive, updatedBy: actor.userId } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  await auditLog.log({
    actor, action: 'CGPA_ACTIVATION_UPDATE', entityType: 'SgpaActivation', entityId: doc._id,
    description: `Year ${y}: cgpaActive=${cgpaActive}`,
  });
  return doc;
}

// ── Student — activation view ─────────────────────────────────────────────────

async function getMyActivation(actor) {
  const student = await Student.findById(actor.studentId).select('year currentSemester').lean();
  if (!student) throw ApiError.notFound('Student not found.');

  const completedSems = semestersUpTo(student.currentSemester);

  // Single query — one doc per year
  const doc = await SgpaActivation.findOne({ year: student.year }).lean();

  return {
    year:            student.year,
    currentSemester: student.currentSemester,
    cgpaActive:      doc?.cgpaActive ?? false,
    semesters:       completedSems.map((sem) => ({
      semester:   sem,
      label:      semLabel(sem),
      sgpaActive: isSemActive(doc, sem),
    })),
  };
}

// ── Student — submit SGPA ─────────────────────────────────────────────────────

async function submitSgpa({ semester, sgpa }, actor) {
  if (actor.role !== 'STUDENT') throw ApiError.forbidden('Only students can submit.');

  const sem = Number(semester);
  const val = Number(sgpa);
  if (!sem || sem < 1 || sem > 8)        throw ApiError.badRequest('Invalid semester.');
  if (isNaN(val) || val < 0 || val > 10) throw ApiError.badRequest('SGPA must be 0–10.');

  const student = await Student.findById(actor.studentId).select('year currentSemester').lean();
  if (!student) throw ApiError.notFound('Student not found.');

  if (sem > student.currentSemester) {
    throw ApiError.badRequest(
      `You cannot enter SGPA for ${semLabel(sem)} — it is a future semester.`
    );
  }

  // Check activation using single-doc model
  const actDoc = await SgpaActivation.findOne({ year: student.year }).lean();
  if (!isSemActive(actDoc, sem)) {
    throw ApiError.badRequest(
      `SGPA entry for ${semLabel(sem)} is not currently active. Please wait for Faculty/Admin to activate it.`
    );
  }

  const rec   = await getOrCreateRecord(actor.studentId, student.year, student.currentSemester);
  let   entry = rec.semesterEntries.find((e) => e.semester === sem);

  if (!entry) {
    rec.semesterEntries.push({ semester: sem, sgpa: val, submittedAt: new Date(), editCount: 1, clearedByAdmin: false });
  } else if (entry.clearedByAdmin) {
    entry.sgpa = val; entry.submittedAt = new Date(); entry.editCount = 1; entry.clearedByAdmin = false;
  } else if (entry.editCount === 0) {
    entry.sgpa = val; entry.submittedAt = new Date(); entry.editCount = 1;
  } else if (entry.editCount === 1) {
    entry.sgpa = val; entry.editCount = 2;
  } else {
    throw ApiError.forbidden(`${semLabel(sem)} SGPA is locked. Contact Faculty/Admin to reset.`);
  }

  rec.currentSemester = student.currentSemester;
  await rec.save();
  return sanitizeRecord(rec);
}

// ── Student — submit CGPA ─────────────────────────────────────────────────────

async function submitCgpa({ cgpa }, actor) {
  if (actor.role !== 'STUDENT') throw ApiError.forbidden('Only students can submit.');

  const val = Number(cgpa);
  if (isNaN(val) || val < 0 || val > 10) throw ApiError.badRequest('CGPA must be 0–10.');

  const student = await Student.findById(actor.studentId).select('year currentSemester').lean();
  if (!student) throw ApiError.notFound('Student not found.');

  // Check CGPA activation from same single-year doc
  const actDoc = await SgpaActivation.findOne({ year: student.year }).lean();
  if (!actDoc?.cgpaActive) {
    throw ApiError.badRequest('CGPA entry is not currently active for your year.');
  }

  const rec = await getOrCreateRecord(actor.studentId, student.year, student.currentSemester);

  if (rec.cgpaClearedByAdmin) {
    rec.cgpa = val; rec.cgpaSubmittedAt = new Date(); rec.cgpaEditCount = 1; rec.cgpaClearedByAdmin = false;
  } else if (rec.cgpaEditCount === 0) {
    rec.cgpa = val; rec.cgpaSubmittedAt = new Date(); rec.cgpaEditCount = 1;
  } else if (rec.cgpaEditCount === 1) {
    rec.cgpa = val; rec.cgpaEditCount = 2;
  } else {
    throw ApiError.forbidden('CGPA is locked. Contact Faculty/Admin to reset.');
  }

  await rec.save();
  return sanitizeRecord(rec);
}

// ── Student — failed subjects ─────────────────────────────────────────────────

async function submitFailedSubjects({ semester, subjects }, actor) {
  if (actor.role !== 'STUDENT') throw ApiError.forbidden('Only students can submit.');

  const sem = Number(semester);
  if (!sem || sem < 1 || sem > 8) throw ApiError.badRequest('Invalid semester.');
  if (!Array.isArray(subjects))   throw ApiError.badRequest('subjects must be an array.');

  const student = await Student.findById(actor.studentId).select('year currentSemester').lean();
  if (!student) throw ApiError.notFound('Student not found.');
  if (sem > student.currentSemester) throw ApiError.badRequest('Cannot enter failed subjects for a future semester.');

  const rec = await getOrCreateRecord(actor.studentId, student.year, student.currentSemester);

  rec.failedSubjects = [
    ...rec.failedSubjects.filter((f) => f.semester !== sem),
    ...subjects.map((s) => ({
      semester:    sem,
      subjectName: String(s.subjectName || s).trim(),
      subjectCode: String(s.subjectCode || '').trim(),
    })),
  ];

  await rec.save();
  return sanitizeRecord(rec);
}

// ── Student — get own record ──────────────────────────────────────────────────

async function getMyRecord(actor) {
  const student = await Student.findById(actor.studentId).select('year currentSemester').lean();
  if (!student) throw ApiError.notFound('Student not found.');
  const rec = await SgpaRecord.findOne({ studentId: actor.studentId }).lean();
  return rec ? sanitizeRecord(rec) : null;
}

// Legacy alias
async function getMySubmission(actor) { return getMyRecord(actor); }

// ── Admin / Faculty — tracking ────────────────────────────────────────────────

async function getTracking(year) {
  const y = Number(year);
  if (![2, 3, 4].includes(y)) throw ApiError.badRequest('Year must be 2, 3, or 4.');

  const [students, records] = await Promise.all([
    Student.find({ year: y, status: 'ACTIVE' })
      .select('rollNumber name year currentSemester').sort({ rollNumber: 1 }).lean(),
    SgpaRecord.find({ year: y }).lean(),
  ]);

  const recMap = Object.fromEntries(records.map((r) => [String(r.studentId), r]));

  const rows = students.map((s) => {
    const rec = recMap[String(s._id)];
    const semsByNum = {};
    (rec?.semesterEntries || []).forEach((e) => { semsByNum[e.semester] = e; });

    const completedSems = semestersUpTo(s.currentSemester);
    const semDetails = completedSems.map((sem) => {
      const e = semsByNum[sem];
      return {
        semester:       sem,
        label:          semLabel(sem),
        sgpa:           e?.sgpa ?? null,
        submitted:      (e?.editCount ?? 0) > 0,
        editCount:      e?.editCount ?? 0,
        clearedByAdmin: e?.clearedByAdmin ?? false,
      };
    });

    return {
      studentId:          s._id,
      rollNumber:         s.rollNumber,
      name:               s.name,
      year:               s.year,
      currentSemester:    s.currentSemester,
      semDetails,
      cgpa:               rec?.cgpa ?? null,
      cgpaEditCount:      rec?.cgpaEditCount ?? 0,
      cgpaClearedByAdmin: rec?.cgpaClearedByAdmin ?? false,
      failedSubjects:     rec?.failedSubjects || [],
      submittedCount:     semDetails.filter((d) => d.submitted).length,
      totalSems:          completedSems.length,
    };
  });

  const submitted    = rows.filter((r) => r.submittedCount > 0).length;
  const notSubmitted = rows.length - submitted;

  const topBySem = {};
  rows.forEach((r) => {
    r.semDetails.forEach((d) => {
      if (d.sgpa == null) return;
      if (!topBySem[d.semester] || d.sgpa > topBySem[d.semester].sgpa) {
        topBySem[d.semester] = { sgpa: d.sgpa, name: r.name, rollNumber: r.rollNumber, label: d.label };
      }
    });
  });

  let topCgpa = null;
  rows.forEach((r) => {
    if (r.cgpa == null) return;
    if (!topCgpa || r.cgpa > topCgpa.cgpa) {
      topCgpa = { cgpa: r.cgpa, name: r.name, rollNumber: r.rollNumber };
    }
  });

  return { year: y, total: rows.length, submitted, notSubmitted, rows, topBySem, topCgpa };
}

// ── Admin — clear / reset ─────────────────────────────────────────────────────

async function clearSemesterEntry(studentId, semester, actor) {
  const sem = Number(semester);
  const rec = await SgpaRecord.findOne({ studentId });
  if (!rec) throw ApiError.notFound('No record found for this student.');

  let entry = rec.semesterEntries.find((e) => e.semester === sem);
  if (!entry) {
    // Create a cleared placeholder so the student can enter it fresh
    rec.semesterEntries.push({ semester: sem, sgpa: null, submittedAt: null, editCount: 0, clearedByAdmin: true });
  } else {
    entry.clearedByAdmin = true;
    entry.editCount      = 0;
  }
  await rec.save();

  await auditLog.log({ actor, action: 'SGPA_CLEAR_SEM', entityType: 'SgpaRecord', entityId: rec._id,
    description: `Cleared ${semLabel(sem)} for student ${studentId}` });
  return sanitizeRecord(rec);
}

async function clearCgpaEntry(studentId, actor) {
  const rec = await SgpaRecord.findOne({ studentId });
  if (!rec) throw ApiError.notFound('No record found for this student.');
  rec.cgpaClearedByAdmin = true;
  rec.cgpaEditCount      = 0;
  await rec.save();
  await auditLog.log({ actor, action: 'CGPA_CLEAR', entityType: 'SgpaRecord', entityId: rec._id,
    description: `Cleared CGPA for student ${studentId}` });
  return sanitizeRecord(rec);
}

async function deleteRecord(studentId, actor) {
  const rec = await SgpaRecord.findOneAndDelete({ studentId });
  if (!rec) throw ApiError.notFound('No record found.');
  await auditLog.log({ actor, action: 'SGPA_RECORD_DELETE', entityType: 'SgpaRecord', entityId: rec._id,
    description: `Deleted entire SGPA record for student ${studentId}` });
  return { ok: true };
}

// ── Legacy shim ───────────────────────────────────────────────────────────────

async function setActivation(year, { sgpaActive, cgpaActive }, actor) {
  const y = Number(year);
  const yearSems = { 2: [3, 4], 3: [5, 6], 4: [7, 8] };
  const sems = yearSems[y] || [];
  await Promise.all(sems.map((sem) => setSemesterActivation(y, sem, !!sgpaActive, actor)));
  if (cgpaActive !== undefined) await setCgpaActivation(y, !!cgpaActive, actor);
  return { year: y, sgpaActive: !!sgpaActive, cgpaActive: !!cgpaActive };
}

// ── internal ──────────────────────────────────────────────────────────────────

function sanitizeRecord(rec) {
  return rec.toObject ? rec.toObject() : rec;
}

module.exports = {
  getActivations, setSemesterActivation, setCgpaActivation, setActivation,
  getMyActivation, getMyRecord, getMySubmission,
  submitSgpa, submitCgpa, submitFailedSubjects,
  getTracking, clearSemesterEntry, clearCgpaEntry, deleteRecord,
  semLabel, semestersUpTo,
};
