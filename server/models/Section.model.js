const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },  // "A", "B"
  year: { type: Number, required: true, min: 2, max: 4 },
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
}, { timestamps: true });

sectionSchema.index({ name: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Section', sectionSchema);