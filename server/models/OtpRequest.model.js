const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  rollNumber: { type: String, required: true, index: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  pendingName: { type: String, default: '' },
  codeHash: { type: String, required: true, select: false },
  attempts: { type: Number, default: 0 },
  consumed: { type: Boolean, default: false },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true });

module.exports = mongoose.model('OtpRequest', otpSchema);