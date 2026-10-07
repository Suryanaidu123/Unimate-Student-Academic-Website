/**
 * sgpaCgpa.service.js — semester-wise SGPA/CGPA system.
 *
 * Semester mapping (college uses 1-1 through 4-2 notation):
 *   Year 2 → semesters 3, 4   (1-1=sem1, 1-2=sem2, 2-1=sem3, 2-2=sem4)
 *   Year 3 → semesters 5, 6   (3-1=sem5, 3-2=sem6)
 *   Year 4 → semesters 7, 8   (4-1=sem7, 4-2=sem8)
 *
 * Display labels:
 *   sem1→"1-1", sem2→"1-2", sem3→"2-1", sem4→"2-2",
 *   sem5→"3-1", sem6→"3-2", sem7→"4-1", sem8→"4-2"
 */
const {
  SgpaActivation,
  SgpaRecord,
  SgpaSubmission,
} = require('../models/SgpaCgpa.model');
const Student  = require('../models/Student.model');
const ApiError = require('../utils/ApiError');
const auditLog = require('./auditLog.service');

// ── helpers ───────────────────────────────────────────────────────────────────

/** All semesters a student of a given year may ever enter (1 through currentSemester). */
function semestersUpTo(currentSemester) {
  const out = [];
  for (let s = 1; s <= currentSemester; s++) out.push(s);
  return out;
}

/** Human-readable label for a semester number. */
function semLabel(sem) {
  const map = { 1:'1-1', 2:'1-2', 3:'2-1', 4:'2-2', 5:'3-1', 6:'3-2', 7:'4-1', 8:'4-2' };
  return map[sem] || String(sem);
}

/** Returns or creates a SgpaRecord for the given studentId. */
async function getOrCreateRecord(studentId, year, currentSemester) {
  let rec = await SgpaRecord.findOne({ studentId });
  if (!rec) {
    rec = await SgpaRecord.create({ studentId, year, currentSemester, semesterEntries: [] });
  }
  return rec;
}

// ── Activation management (admin / faculty) ───────────────────────────────────

/**
 * Returns a fully hydrated activation state for all valid year+semester pairs.
 * One doc per year in the DB; we read activeSemesters map from each.
 */
async function getActivations() {
  const docs = await SgpaActivation.find().lean();
  const map = {};
  docs.forEach((d) => { map[d.year] = d; });

  return [2, 3, 4].map((y) => {
    const doc = map[y];
    const yearSems = { 2: [3, 4], 3: [5, 6], 4: [7, 8] };

    // All semesters 1–8 can be activated (1-1 through 4-2)
    // We expose the full 1–8 range so admin can activate past semesters too
    const semesters = [1, 2, 3, 4, 5, 6, 7, 8].map((sem) => ({
      semester:   sem,
      label:      semLabel(sem),
      sgpaActive: doc?.activeSemesters?.[String(sem)] ?? false,
    }));

    return {
      year:       y,
      cgpaActive: doc?.cgpaActive ?? false,
      semesters,
    };
  });
}

/** Toggle SGPA activation for one specific semester within a year. */
async function setSemesterActivation(year, semester, sgpaActive, actor) {
  const y   = Number(year);
  const sem = Number(semester);
  if (![2, 3, 4].includes(y)) throw ApiError.badRequest('Year must be 2, 3, or 4.');
  if (sem < 1 || sem > 8)     throw ApiError.badRequest('Semester must be 1–8.');

  // Upsert one doc per year, set the specific semester key inside activeSemesters
  const doc = await SgpaActivation.findOneAndUpdate(
    { year: y },
    {
      $set: {
        [`activeSemesters.${sem}`]: !!sgpaActive,
        updatedBy: actor.userId,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  await auditLog.log({
    actor,
    action:      'SGPA_ACTIVATION_UPDATE',
    entityType:  'SgpaActivation',
    entityId:    doc._id,
    description: `Year ${y} Sem ${sem} (${semLabel(sem)}): sgpaActive=${sgpaActive}`,
  });
  return doc;
}

/** Toggle CGPA activation for a year. */
async function setCgpaActivation(year, cgpaActive, actor) {
  const y = Number(year);
  if (![2, 3, 4].includes(y)) throw ApiError.badRequest('Year must be 2, 3, or 4.');

  const doc = await SgpaActivation.findOneAndUpdate(
    { year: y },
    { $set: { cgpaActive: !!cgpaActive, updatedBy: actor.userId } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  await auditLog.log({
    actor,
    action:      'CGPA_ACTIVATION_UPDATE',
    entityType:  'SgpaActivation',
    entityId:    doc._id,
    description: `Year ${y}: cgpaActive=${cgpaActive}`,
  });
  return doc;
}

// ── Student-facing activation check ──────────────────────────────────────────

/**
 * Returns per-semester activation status for the calling student, filtered to
 * semesters they have actually completed (1 through currentSemester).
 */
async function getMyActivation(actor) {
  const student = await Student.findById(actor.studentId)
    .select('year currentSemester').lean();
  if (!student) throw ApiError.notFound('Student not found.');

  const completedSems = semestersUpTo(student.currentSemester);

  const [semActs, cgpaDoc] = await Promise.all([
    SgpaActivation.find({
      year:     student.year,
      semester: { $in: completedSems },
    }).lean(),
    CgpaActivation.findOne({ year: student.year }).lean(),
  ]);

  const semMap = {};
  semActs.forEach((a) => { semMap[a.semester] = a.sgpaActive; });

  return {
    year:            student.year,
    currentSemester: student.currentSemester,
    cgpaActive:      cgpaDoc?.cgpaActive ?? false,
    semesters:       completedSems.map((sem) => ({
      semester:   sem,
      label:      semLabel(sem),
      sgpaActive: semMap[sem] ?? false,
    })),
  };
}

// ── Student submission ────────────────────────────────────────────────────────

/**
 * Submit (or edit once) a single semester's SGPA.
 *
 * Rules:
 *  1. Semester must be in 1..currentSemester (no future sems)
 *  2. Activation must be ON for that semester
 *  3. editCount === 0 → first submission allowed
 *  4. editCount === 1 → one edit allowed (increments to 2)
 *  5. editCount === 2 → locked unless admin cleared (clearedByAdmin=true)
 *  6. After admin clear: clearedByAdmin resets, editCount resets to 0
 */
async function submitSgpa({ semester, sgpa }, actor) {
  if (actor.role !== 'STUDENT') throw ApiError.forbidden('Only students can submit.');

  const sem = Number(semester);
  const val = Number(sgpa);

  if (!sem || sem < 1 || sem > 8)       throw ApiError.badRequest('Invalid semester.');
  if (isNaN(val) || val < 0 || val > 10) throw ApiError.badRequest('SGPA must be 0–10.');

  const student = await Student.findById(actor.studentId)
    .select('year currentSemester').lean();
  if (!student) throw ApiError.notFound('Student not found.');

  // Rule 1 — no future semesters
  if (sem > student.currentSemester) {
    throw ApiError.badRequest(
      `You cannot enter SGPA for semester ${semLabel(sem)} — it is a future semester.`
    );
  }

  // Rule 2 — activation must be ON
  const activation = await SgpaActivation.findOne({ year: student.year, semester: sem }).lean();
  if (!activation?.sgpaActive) {
    throw ApiError.badRequest(
      `SGPA entry for ${semLabel(sem)} is not currently active. Please wait for Faculty/Admin to activate it.`
    );
  }

  const rec = await getOrCreateRecord(actor.studentId, student.year, student.currentSemester);

  // Find or create the entry for this semester
  let entry = rec.semesterEntries.find((e) => e.semester === sem);

  if (!entry) {
    // First time submitting this semester
    rec.semesterEntries.push({
      semester:       sem,
      sgpa:           val,
      submittedAt:    new Date(),
      editCount:      1,
      clearedByAdmin: false,
    });
  } else {
    // Re-submission — check edit rules
    if (entry.clearedByAdmin) {
      // Admin reset → fresh start
      entry.sgpa           = val;
      entry.submittedAt    = new Date();
      entry.editCount      = 1;
      entry.clearedByAdmin = false;
    } else if (entry.editCount === 0) {
      entry.sgpa        = val;
      entry.submittedAt = new Date();
      entry.editCount   = 1;
    } else if (entry.editCount === 1) {
      // One allowed edit
      entry.sgpa      = val;
      entry.editCount = 2;
    } else {
      throw ApiError.forbidden(
        `You have already used your one allowed edit for ${semLabel(sem)}. Contact Faculty/Admin to reset.`
      );
    }
  }

  rec.currentSemester = student.currentSemester; // keep snapshot fresh
  await rec.save();

  return sanitizeRecord(rec);
}

/**
 * Submit (or edit once) CGPA.
 */
async function submitCgpa({ cgpa }, actor) {
  if (actor.role !== 'STUDENT') throw ApiError.forbidden('Only students can submit.');

  const val = Number(cgpa);
  if (isNaN(val) || val < 0 || val > 10) throw ApiError.badRequest('CGPA must be 0–10.');

  const student = await Student.findById(actor.studentId)
    .select('year currentSemester').lean();
  if (!student) throw ApiError.notFound('Student not found.');

  const cgpaDoc = await CgpaActivation.findOne({ year: student.year }).lean();
  if (!cgpaDoc?.cgpaActive) {
    throw ApiError.badRequest('CGPA entry is not currently active for your year.');
  }

  const rec = await getOrCreateRecord(actor.studentId, student.year, student.currentSemester);

  if (rec.cgpaClearedByAdmin) {
    rec.cgpa             = val;
    rec.cgpaSubmittedAt  = new Date();
    rec.cgpaEditCount    = 1;
    rec.cgpaClearedByAdmin = false;
  } else if (rec.cgpaEditCount === 0) {
    rec.cgpa            = val;
    rec.cgpaSubmittedAt = new Date();
    rec.cgpaEditCount   = 1;
  } else if (rec.cgpaEditCount === 1) {
    rec.cgpa          = val;
    rec.cgpaEditCount = 2;
  } else {
    throw ApiError.forbidden(
      'You have already used your one allowed edit for CGPA. Contact Faculty/Admin to reset.'
    );
  }

  await rec.save();
  return sanitizeRecord(rec);
}

/**
 * Submit failed subjects for a semester.
 * Replaces existing failed-subject entries for that semester.
 */
async function submitFailedSubjects({ semester, subjects }, actor) {
  if (actor.role !== 'STUDENT') throw ApiError.forbidden('Only students can submit.');

  const sem = Number(semester);
  if (!sem || sem < 1 || sem > 8) throw ApiError.badRequest('Invalid semester.');
  if (!Array.isArray(subjects))   throw ApiError.badRequest('subjects must be an array.');

  const student = await Student.findById(actor.studentId)
    .select('year currentSemester').lean();
  if (!student) throw ApiError.notFound('Student not found.');

  if (sem > student.currentSemester) {
    throw ApiError.badRequest('You cannot enter failed subjects for a future semester.');
  }

  const rec = await getOrCreateRecord(actor.studentId, student.year, student.currentSemester);

  // Remove existing entries for this semester, then add the new ones
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
  const student = await Student.findById(actor.studentId)
    .select('year currentSemester').lean();
  if (!student) throw ApiError.notFound('Student not found.');

  const rec = await SgpaRecord.findOne({ studentId: actor.studentId }).lean();
  return rec ? sanitizeRecord(rec) : null;
}

// ── Admin / Faculty — tracking ────────────────────────────────────────────────

/**
 * Tracking for a year — returns all students with their semester-wise SGPA,
 * CGPA, failed subjects, and per-semester submission status.
 */
async function getTracking(year) {
  const y = Number(year);
  if (![2, 3, 4].includes(y)) throw ApiError.badRequest('Year must be 2, 3, or 4.');

  const [students, records] = await Promise.all([
    Student.find({ year: y, status: 'ACTIVE' })
      .select('rollNumber name year currentSemester')
      .sort({ rollNumber: 1 })
      .lean(),
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
        semester:   sem,
        label:      semLabel(sem),
        sgpa:       e?.sgpa ?? null,
        submitted:  e?.editCount > 0,
        editCount:  e?.editCount ?? 0,
        clearedByAdmin: e?.clearedByAdmin ?? false,
      };
    });

    const submittedCount = semDetails.filter((d) => d.submitted).length;

    return {
      studentId:      s._id,
      rollNumber:     s.rollNumber,
      name:           s.name,
      year:           s.year,
      currentSemester: s.currentSemester,
      semDetails,
      cgpa:           rec?.cgpa ?? null,
      cgpaEditCount:  rec?.cgpaEditCount ?? 0,
      cgpaClearedByAdmin: rec?.cgpaClearedByAdmin ?? false,
      failedSubjects: rec?.failedSubjects || [],
      submittedCount,
      totalSems:      completedSems.length,
    };
  });

  const submitted    = rows.filter((r) => r.submittedCount > 0).length;
  const notSubmitted = rows.length - submitted;

  // Top SGPA per semester
  const topBySem = {};
  rows.forEach((r) => {
    r.semDetails.forEach((d) => {
      if (d.sgpa == null) return;
      if (!topBySem[d.semester] || d.sgpa > topBySem[d.semester].sgpa) {
        topBySem[d.semester] = { sgpa: d.sgpa, name: r.name, rollNumber: r.rollNumber, label: d.label };
      }
    });
  });

  // Top CGPA
  let topCgpa = null;
  rows.forEach((r) => {
    if (r.cgpa == null) return;
    if (!topCgpa || r.cgpa > topCgpa.cgpa) {
      topCgpa = { cgpa: r.cgpa, name: r.name, rollNumber: r.rollNumber };
    }
  });

  return {
    year:         y,
    total:        rows.length,
    submitted,
    notSubmitted,
    rows,
    topBySem,     // { [semester]: { sgpa, name, rollNumber, label } }
    topCgpa,      // { cgpa, name, rollNumber } | null
  };
}

// ── Admin — clear / reset ─────────────────────────────────────────────────────

/** Clear a specific semester SGPA entry → student can re-submit. */
async function clearSemesterEntry(studentId, semester, actor) {
  const sem = Number(semester);
  const rec = await SgpaRecord.findOne({ studentId });
  if (!rec) throw ApiError.notFound('No record found for this student.');

  const entry = rec.semesterEntries.find((e) => e.semester === sem);
  if (!entry) throw ApiError.notFound(`No ${semLabel(sem)} entry found.`);

  entry.clearedByAdmin = true;
  entry.editCount      = 0;
  await rec.save();

  await auditLog.log({
    actor,
    action:      'SGPA_CLEAR_SEM',
    entityType:  'SgpaRecord',
    entityId:    rec._id,
    description: `Cleared ${semLabel(sem)} SGPA for student ${studentId}`,
  });
  return sanitizeRecord(rec);
}

/** Clear CGPA → student can re-submit. */
async function clearCgpaEntry(studentId, actor) {
  const rec = await SgpaRecord.findOne({ studentId });
  if (!rec) throw ApiError.notFound('No record found for this student.');

  rec.cgpaClearedByAdmin = true;
  rec.cgpaEditCount      = 0;
  await rec.save();

  await auditLog.log({
    actor,
    action:      'CGPA_CLEAR',
    entityType:  'SgpaRecord',
    entityId:    rec._id,
    description: `Cleared CGPA for student ${studentId}`,
  });
  return sanitizeRecord(rec);
}

/** Delete entire record → student can re-submit everything. */
async function deleteRecord(studentId, actor) {
  const rec = await SgpaRecord.findOneAndDelete({ studentId });
  if (!rec) throw ApiError.notFound('No record found.');

  await auditLog.log({
    actor,
    action:      'SGPA_RECORD_DELETE',
    entityType:  'SgpaRecord',
    entityId:    rec._id,
    description: `Deleted entire SGPA record for student ${studentId}`,
  });
  return { ok: true };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Strip Mongoose document into a clean plain object. */
function sanitizeRecord(rec) {
  const obj = rec.toObject ? rec.toObject() : rec;
  return obj;
}

// ── Legacy shims (keep old controller handlers working) ───────────────────────

/** Old single-value activation — kept for any old code that might call it. */
async function setActivation(year, { sgpaActive, cgpaActive }, actor) {
  const y = Number(year);
  const yearSems = { 2: [3, 4], 3: [5, 6], 4: [7, 8] };
  const sems = yearSems[y] || [];

  await Promise.all(sems.map((sem) =>
    setSemesterActivation(y, sem, !!sgpaActive, actor)
  ));
  if (cgpaActive !== undefined) {
    await setCgpaActivation(y, !!cgpaActive, actor);
  }
  return { year: y, sgpaActive: !!sgpaActive, cgpaActive: !!cgpaActive };
}

async function getMySubmission(actor) {
  return getMyRecord(actor);
}

module.exports = {
  // Activation
  getActivations,
  setSemesterActivation,
  setCgpaActivation,
  setActivation,          // legacy shim

  // Student
  getMyActivation,
  getMyRecord,
  getMySubmission,        // legacy alias
  submitSgpa,
  submitCgpa,
  submitFailedSubjects,

  // Admin/Faculty
  getTracking,
  clearSemesterEntry,
  clearCgpaEntry,
  deleteRecord,

  // Helpers exposed for tests/migrations
  semLabel,
  semestersUpTo,
};
