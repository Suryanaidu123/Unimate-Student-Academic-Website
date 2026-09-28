const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // "2023-2027"
  admissionYear: { type: Number, required: true },
  graduationYear: { type: Number, required: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
}, { timestamps: true });

module.exports = mongoose.model('Batch', batchSchema);