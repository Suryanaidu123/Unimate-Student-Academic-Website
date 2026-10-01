const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },

  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },

  year: { type: Number, required: true, min: 2, max: 4 },
  semester: { type: Number, required: true, min: 3, max: 8 },
  unit: { type: Number, required: true, min: 1, max: 5 },

  fileUrl: { type: String, required: true },
  fileName: { type: String, required: true },
  fileSize: { type: Number, required: true },
  mimeType: { type: String, required: true },

  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  uploaderRole: { type: String, enum: ['ADMIN', 'FACULTY'], required: true },

  status: { type: String, enum: ['PUBLISHED', 'HIDDEN'], default: 'PUBLISHED' },
}, { timestamps: true });

materialSchema.index({ subjectId: 1, unit: 1, status: 1 });
materialSchema.index({ year: 1, semester: 1 });

module.exports = mongoose.models.Material || mongoose.model('Material', materialSchema);