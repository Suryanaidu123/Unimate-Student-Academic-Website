const mongoose = require('mongoose');

const midSchema = new mongoose.Schema({
  written: { type: Number, min: 0, max: 30, default: 0 },
  writtenConverted: { type: Number, default: 0 },
  online: { type: Number, min: 0, max: 10, default: 0 },
  assignment: { type: Number, min: 0, max: 5, default: 0 },
  total: { type: Number, default: 0 },
}, { _id: false });

const marksSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
  semesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester' },
  mid1: { type: midSchema, default: () => ({}) },
  mid2: { type: midSchema, default: () => ({}) },
  internalMarks: { type: Number, default: 0 },
  status: { type: String, enum: ['DRAFT', 'PUBLISHED', 'LOCKED'], default: 'DRAFT' },
  publishedAt: { type: Date },
  lockedAt: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

marksSchema.index({ studentId: 1, subjectId: 1 }, { unique: true });
marksSchema.index({ status: 1 });

module.exports = mongoose.models.Marks || mongoose.model('Marks', marksSchema);