const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
}, { timestamps: true });

module.exports = mongoose.model('Department', departmentSchema);