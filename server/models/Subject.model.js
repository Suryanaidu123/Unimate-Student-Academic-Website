const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  subjectName: { type: String, required: true, trim: true },
  subjectCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
  type: { type: String, enum: ['THEORY', 'LAB', 'ACTIVITY'], default: 'THEORY', required: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  year: { type: Number, required: true, min: 2, max: 4 },
  semester: { type: Number, required: true, min: 3, max: 8 },
  semesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester' },
  credits: { type: Number, required: false, min: 0, max: 6, default: 0 },
  facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty' },
  description: { type: String, default: '' },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
}, { timestamps: true });

subjectSchema.index({ year: 1, semester: 1 });
subjectSchema.index({ facultyId: 1 });

module.exports = mongoose.models.Subject || mongoose.model('Subject', subjectSchema);