const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  rollNumber: { type: String, required: true, unique: true, trim: true },
  name: { type: String, default: '', trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  phoneNumber: { type: String, trim: true },
  department: { type: String, default: 'AI & ML' },
  course: { type: String, default: 'B.Tech AI & ML' },
  batch: { type: String, default: '' },
  admissionYear: { type: Number },
  academicYear: { type: Number, required: true, min: 2, max: 4 },
  year: { type: Number, required: true, min: 2, max: 4 },
  currentSemester: { type: Number, required: true, min: 1, max: 8 },
  semester: { type: Number, required: true, min: 1, max: 8 },
  section: { type: String, default: 'A' },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'GRADUATED'], default: 'ACTIVE' },

  contactBlocked: { type: Boolean, default: false },
  contactBlockedAt: { type: Date, default: null },
  contactBlockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  // NEW: timestamps for when each section was last viewed
  sectionReadAt: {
    exams: { type: Date, default: null },
    materials: { type: Date, default: null },
    assignments: { type: Date, default: null },
    timetable: { type: Date, default: null },
    marks: { type: Date, default: null },
    notifications: { type: Date, default: null },
  },
}, { timestamps: true });

studentSchema.index({ year: 1, currentSemester: 1, section: 1 });
studentSchema.index({ batch: 1, status: 1 });
studentSchema.index({ contactBlocked: 1 });

module.exports = mongoose.models.Student || mongoose.model('Student', studentSchema);