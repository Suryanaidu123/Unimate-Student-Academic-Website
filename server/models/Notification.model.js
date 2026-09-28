const mongoose = require('mongoose');
const { NOTIFICATION_TYPES, RECIPIENT_TYPES } = require('../constants/notificationTypes');

const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: NOTIFICATION_TYPES, required: true },
  recipientType: { type: String, enum: RECIPIENT_TYPES, required: true },
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  year: { type: Number },
  semesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester' },
  section: { type: String },
  batch: { type: String },
  relatedEntity: { type: String },
  relatedEntityId: { type: mongoose.Schema.Types.ObjectId },
  isRead: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  expiresAt: { type: Date },
}, { timestamps: true });

notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);