const mongoose = require('mongoose');
const { ROLES } = require('../constants/roles');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: Object.values(ROLES), required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
  facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', default: null },
  adminId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Admin',   default: null },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  lastLogin: { type: Date, default: null },
}, { timestamps: true });

userSchema.index({ role: 1, status: 1 });

module.exports = mongoose.model('User', userSchema);