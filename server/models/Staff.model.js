const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true, trim: true },
  name: { type: String, default: '', trim: true },
  email: { type: String, default: '', lowercase: true, trim: true },
  role: {
    type: String,
    enum: ['ATTENDANCE_STAFF'],
    default: 'ATTENDANCE_STAFF',
  },
  department: { type: String, default: 'AI & ML' },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'INACTIVE' },
}, { timestamps: true });

module.exports = mongoose.models.Staff || mongoose.model('Staff', staffSchema);