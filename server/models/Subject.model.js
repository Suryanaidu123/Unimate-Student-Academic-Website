const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  subjectName: { type: String, required: true, trim: true },
  subjectCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
  type: { type: String, enum: ['THEORY', 'LAB'], default: 'THEORY', required: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  courseId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  year: { type: Number, required: true, min: 2, max: 4 },
  semesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester' },
  credits: { type: Number, required: true, min: 0.5, max: 6 },
  facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty' },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
}, { timestamps: true });

subjectSchema.index({ year: 1, type: 1 });
subjectSchema.index({ facultyId: 1 });

module.exports = mongoose.model('Subject', subjectSchema);