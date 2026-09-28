const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  durationYears: { type: Number, default: 4 },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
}, { timestamps: true });

module.exports = mongoose.model('Course', courseSchema);