const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true, trim: true },
  name: { type: String, default: '', trim: true },
  email: { type: String, default: '', lowercase: true, trim: true },
  department: { type: String, default: 'AI & ML' },
  designation: {
    type: String,
    enum: ['Professor', 'Associate Professor', 'Assistant Professor'],
    default: 'Assistant Professor',
  },
  assignedSubjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
  assignedSections: [{ type: String }],
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'INACTIVE' },
}, { timestamps: true });

module.exports = mongoose.models.Faculty || mongoose.model('Faculty', facultySchema);