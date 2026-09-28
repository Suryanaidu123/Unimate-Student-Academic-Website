const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  year: { type: Number, required: true, min: 2, max: 4 },
  fileUrl: { type: String, required: true },      // /uploads/materials/xxxx.pdf
  fileName: { type: String, required: true },      // original filename
  fileSize: { type: Number, required: true },      // bytes
  mimeType: { type: String, required: true },      // application/pdf
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  uploaderRole: { type: String, enum: ['ADMIN', 'FACULTY'], required: true },
  status: { type: String, enum: ['PUBLISHED', 'HIDDEN'], default: 'PUBLISHED' },
}, { timestamps: true });

materialSchema.index({ subjectId: 1, status: 1 });
materialSchema.index({ year: 1 });

module.exports = mongoose.model('Material', materialSchema);