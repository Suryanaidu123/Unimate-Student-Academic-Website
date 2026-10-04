const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  fromRole: { type: String, enum: ['STUDENT', 'FACULTY'], required: true },
  fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
  facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', default: null },

  category: { type: String, default: 'General' },
  subject: { type: String, required: true, trim: true },
  message: { type: String, required: true },

  // Snapshot of academic context at submission time
  year: { type: Number, default: null },
  semester: { type: Number, default: null },
  section: { type: String, default: null },
  employeeId: { type: String, default: null },

  // Admin response
  status: { type: String, enum: ['NEW', 'READ', 'RESOLVED'], default: 'NEW' },
  adminReply: { type: String, default: '' },
  repliedAt: { type: Date, default: null },
  repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

feedbackSchema.index({ createdAt: -1 });
feedbackSchema.index({ fromRole: 1, createdAt: -1 });
feedbackSchema.index({ year: 1, semester: 1, section: 1 });

module.exports = mongoose.models.Feedback || mongoose.model('Feedback', feedbackSchema);