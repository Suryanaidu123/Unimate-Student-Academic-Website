const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty' },

  year: { type: Number, required: true, min: 2, max: 4 },
  semester: { type: Number, required: true, min: 3, max: 8 },
  semesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester' },
  section: { type: String, required: true },

  room: { type: String, default: '' },

  day: { type: String, enum: ['MON','TUE','WED','THU','FRI','SAT'], required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },

  periodType: { type: String, enum: ['CLASS', 'BREAK', 'LUNCH'], default: 'CLASS' },
  isBreak: { type: Boolean, default: false },
}, { timestamps: true });

timetableSchema.index({ year: 1, semester: 1, section: 1, day: 1, startTime: 1 });

module.exports = mongoose.models.Timetable || mongoose.model('Timetable', timetableSchema);