const mongoose = require('mongoose');

const SECTION_VALUES = [
  'UNIT_1', 'UNIT_2', 'UNIT_3', 'UNIT_4', 'UNIT_5', 'COMPLETE',
  'EXP_1', 'EXP_2',
];

const materialSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },

  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },

  year: { type: Number, required: true, min: 2, max: 4 },
  semester: { type: Number, required: true, min: 3, max: 8 },
  section: { type: String, enum: SECTION_VALUES, required: true },

  fileKey: { type: String, required: true },
  fileName: { type: String, required: true },
  fileSize: { type: Number, required: true },
  mimeType: { type: String, required: true },

  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  uploaderRole: { type: String, enum: ['ADMIN', 'FACULTY'], required: true },

  status: { type: String, enum: ['PUBLISHED', 'HIDDEN'], default: 'PUBLISHED', required: true },
}, { timestamps: true });

materialSchema.index({ subjectId: 1, section: 1, status: 1 });
materialSchema.index({ year: 1, semester: 1, status: 1 });

module.exports = mongoose.models.Material || mongoose.model('Material', materialSchema);