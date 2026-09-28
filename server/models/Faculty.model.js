const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  department: { type: String, default: 'AI & ML' },
  designation: { type: String, default: 'Assistant Professor' },
  assignedSubjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
  assignedSections: [{ type: String }],   // e.g., ["A", "B"]
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
}, { timestamps: true });

module.exports = mongoose.model('Faculty', facultySchema);