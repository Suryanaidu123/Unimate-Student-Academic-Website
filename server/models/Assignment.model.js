const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  section: { type: String, required: true }, // "A", "B"
  facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: true },
  dueDate: { type: Date, required: true },
  priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
  status: { type: String, enum: ['DRAFT', 'PUBLISHED', 'CLOSED'], default: 'DRAFT' },
  maximumMarks: { type: Number, default: 5, min: 1, max: 5 }, // internal cap
}, { timestamps: true });

assignmentSchema.index({ subjectId: 1, dueDate: 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);