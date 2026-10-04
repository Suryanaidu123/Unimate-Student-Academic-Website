const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceSession', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  status: { type: String, enum: ['PRESENT', 'ABSENT'], required: true },
  year: { type: Number, required: true },
  semester: { type: Number, required: true },
  section: { type: String, required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  date: { type: Date, required: true },
  periodsCount: { type: Number, required: true },
}, { timestamps: true });

// One record per student per session
attendanceSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });
attendanceSchema.index({ studentId: 1, subjectId: 1 });
attendanceSchema.index({ studentId: 1, date: -1 });

module.exports = mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);