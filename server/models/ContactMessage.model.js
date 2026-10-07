const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  from: { type: String, enum: ['ADMIN', 'STUDENT'], required: true },
  body: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const contactMessageSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
  studentUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true, trim: true },
  body: { type: String, required: true },
  status: { type: String, enum: ['OPEN', 'REPLIED', 'CLOSED'], default: 'OPEN' },
  isRead: { type: Boolean, default: false },   // admin has opened/read this message
  replies: [replySchema],
}, { timestamps: true });

contactMessageSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ContactMessage', contactMessageSchema);