const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: true },
  year: { type: Number, required: true, min: 2, max: 4 },
  semesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester'},
  section: { type: String, required: true },
  room: { type: String, required: true },
  day: { type: String, enum: ['MON','TUE','WED','THU','FRI','SAT'], required: true },
  startTime: { type: String, required: true }, // "09:00"
  endTime: { type: String, required: true },
}, { timestamps: true });

timetableSchema.index({ year: 1, semesterId: 1, section: 1, day: 1 });

module.exports = mongoose.model('Timetable', timetableSchema);