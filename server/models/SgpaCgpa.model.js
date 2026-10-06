const mongoose = require('mongoose');

// Activation settings — one doc per year (2/3/4), managed by admin/faculty
const activationSchema = new mongoose.Schema({
  year:        { type: Number, required: true, unique: true, min: 2, max: 4 },
  sgpaActive:  { type: Boolean, default: false },
  cgpaActive:  { type: Boolean, default: false },
  updatedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Student submission — one doc per student (upsert on resubmit)
const submissionSchema = new mongoose.Schema({
  studentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, unique: true },
  year:        { type: Number, required: true },
  sgpa:        { type: Number, min: 0, max: 10, default: null },
  cgpa:        { type: Number, min: 0, max: 10, default: null },
  submittedAt: { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now },
}, { timestamps: true });

submissionSchema.index({ year: 1 });

const SgpaActivation = mongoose.models.SgpaActivation ||
  mongoose.model('SgpaActivation', activationSchema);
const SgpaSubmission = mongoose.models.SgpaSubmission ||
  mongoose.model('SgpaSubmission', submissionSchema);

module.exports = { SgpaActivation, SgpaSubmission };
