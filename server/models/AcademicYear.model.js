const mongoose = require('mongoose');

const academicYearSchema = new mongoose.Schema({
  label: { type: String, required: true, unique: true }, // "2024-25"
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  isCurrent: { type: Boolean, default: false },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
}, { timestamps: true });

module.exports = mongoose.model('AcademicYear', academicYearSchema);