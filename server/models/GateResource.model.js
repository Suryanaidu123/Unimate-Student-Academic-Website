const mongoose = require('mongoose');

const gateResourceSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  // File stored in B2 (same as Material)
  fileKey:     { type: String, default: '' },
  fileName:    { type: String, default: '' },
  fileSize:    { type: Number, default: 0 },
  mimeType:    { type: String, default: '' },
  uploadedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  facultyId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty' },
  status:      { type: String, enum: ['PUBLISHED', 'HIDDEN'], default: 'PUBLISHED' },
}, { timestamps: true });

gateResourceSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.models.GateResource ||
  mongoose.model('GateResource', gateResourceSchema);
