const mongoose = require('mongoose');

const semesterSchema = new mongoose.Schema({
  number: { type: Number, required: true, min: 1, max: 8 },
  label: { type: String, required: true }, // "Semester 1"
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
}, { timestamps: true });

semesterSchema.index({ number: 1 }, { unique: true });

module.exports = mongoose.model('Semester', semesterSchema);