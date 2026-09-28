const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
  examName: { type: String, required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  examType: { type: String, enum: ['INTERNAL','MID1','MID2','SEMESTER','LAB','VIVA','OTHER'], required: true },
  date: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  room: { type: String, required: true },
  year: { type: Number, required: true, min: 2, max: 4 },
  semesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester', required: true },
  section: { type: String, required: true },
  syllabus: { type: String, default: '' },
  status: { type: String, enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED'], default: 'SCHEDULED' },
}, { timestamps: true });

examSchema.index({ year: 1, semesterId: 1, section: 1, date: 1 });

module.exports = mongoose.model('Exam', examSchema);