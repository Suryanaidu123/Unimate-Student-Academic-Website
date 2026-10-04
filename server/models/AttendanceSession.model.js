const mongoose = require('mongoose');

const attendanceSessionSchema = new mongoose.Schema({
  year: { type: Number, required: true, min: 2, max: 4 },
  semester: { type: Number, required: true, min: 3, max: 8 },
  section: { type: String, required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  date: { type: Date, required: true },
  day: { type: String, required: true }, // MON, TUE…
  periodStart: { type: String, required: true }, // "09:00"
  periodEnd: { type: String, required: true },   // "09:50"
  periodsCount: { type: Number, required: true, min: 1 }, // how many periods this session represents
  facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty' },
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  locked: { type: Boolean, default: true },
  notes: { type: String, default: '' },
}, { timestamps: true });

// Prevent duplicate entries for the same date + period + section
attendanceSessionSchema.index(
  { year: 1, semester: 1, section: 1, date: 1, periodStart: 1 },
  { unique: true }
);

module.exports = mongoose.models.AttendanceSession || mongoose.model('AttendanceSession', attendanceSessionSchema);