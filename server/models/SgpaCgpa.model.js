/**
 * SgpaCgpa.model.js
 *
 * SgpaActivation  — ONE document per academic year (2 / 3 / 4).
 *                   Stores per-semester active flags as a plain object map:
 *                     activeSemesters: { '1': false, '2': false, ... '8': false }
 *                   Plus a year-level cgpaActive flag.
 *                   Single unique index on `year` only — no compound index needed.
 *                   This avoids the E11000 error caused by the old year_1 index.
 *
 * SgpaRecord      — One document per student.
 *                     semesterEntries[]  one entry per semester (1–8)
 *                     cgpa               student-entered cumulative GPA
 *                     cgpaEditCount      0=never, 1=submitted, 2=used edit
 *                     cgpaClearedByAdmin boolean
 *                     failedSubjects[]   per-semester failed subject records
 *
 * SgpaSubmission  — Legacy model kept for backward compatibility.
 */
const mongoose = require('mongoose');

// ── 1. Activation — one doc per year ─────────────────────────────────────────
//
// activeSemesters is a Mixed (plain JS object) storing { semNumber: boolean }
// e.g. { '1': true, '2': true, '3': false, '4': false, '5': true, ... }
//
// Using Mixed instead of sub-documents avoids any index complications.

const activationSchema = new mongoose.Schema({
  year:       { type: Number, required: true, unique: true, min: 2, max: 4 },
  // Semester active flags — keys '1' through '8', values boolean
  activeSemesters: { type: mongoose.Schema.Types.Mixed, default: {} },
  cgpaActive: { type: Boolean, default: false },
  updatedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// ── 2. Per-semester SGPA entry (sub-doc inside SgpaRecord) ───────────────────

const semesterEntrySchema = new mongoose.Schema({
  semester:       { type: Number, required: true, min: 1, max: 8 },
  sgpa:           { type: Number, min: 0, max: 10, default: null },
  submittedAt:    { type: Date,    default: null },
  editCount:      { type: Number,  default: 0 },   // 0=never, 1=submitted, 2=used edit
  clearedByAdmin: { type: Boolean, default: false },
}, { _id: false });

// ── 3. Failed subject entry (sub-doc) ─────────────────────────────────────────

const failedSubjectSchema = new mongoose.Schema({
  semester:    { type: Number, required: true, min: 1, max: 8 },
  subjectName: { type: String, required: true, trim: true },
  subjectCode: { type: String, default: '', trim: true },
}, { _id: true });

// ── 4. Main student record ───────────────────────────────────────────────────

const sgpaRecordSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true,
    unique: true,
  },
  year:            { type: Number, required: true },
  currentSemester: { type: Number, required: true },

  semesterEntries: [semesterEntrySchema],

  cgpa:              { type: Number,  min: 0, max: 10, default: null },
  cgpaEditCount:     { type: Number,  default: 0 },
  cgpaClearedByAdmin:{ type: Boolean, default: false },
  cgpaSubmittedAt:   { type: Date,    default: null },

  failedSubjects: [failedSubjectSchema],
}, { timestamps: true });

sgpaRecordSchema.index({ year: 1 });

// ── 5. Legacy SgpaSubmission (backward compat) ───────────────────────────────

const legacySubmissionSchema = new mongoose.Schema({
  studentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, unique: true },
  year:        { type: Number, required: true },
  sgpa:        { type: Number, min: 0, max: 10, default: null },
  cgpa:        { type: Number, min: 0, max: 10, default: null },
  submittedAt: { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now },
}, { timestamps: true });

legacySubmissionSchema.index({ year: 1 });

// ── Exports ──────────────────────────────────────────────────────────────────

const SgpaActivation = mongoose.models.SgpaActivation ||
  mongoose.model('SgpaActivation', activationSchema);

const SgpaRecord = mongoose.models.SgpaRecord ||
  mongoose.model('SgpaRecord', sgpaRecordSchema);

const SgpaSubmission = mongoose.models.SgpaSubmission ||
  mongoose.model('SgpaSubmission', legacySubmissionSchema);

module.exports = { SgpaActivation, SgpaRecord, SgpaSubmission };
