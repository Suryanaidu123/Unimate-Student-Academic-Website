const mongoose = require('mongoose');

const downloadEventSchema = new mongoose.Schema({
  materialId: { type: mongoose.Schema.Types.ObjectId, ref: 'Material', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['STUDENT', 'FACULTY', 'ADMIN'], required: true },
  bytes: { type: Number, required: true, min: 0 },
  mode: { type: String, enum: ['inline', 'attachment'], default: 'inline' },
}, { timestamps: true });

downloadEventSchema.index({ createdAt: -1 });
downloadEventSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.models.DownloadEvent || mongoose.model('DownloadEvent', downloadEventSchema);