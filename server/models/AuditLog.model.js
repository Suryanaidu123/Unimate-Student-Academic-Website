const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorRole: { type: String },
  action: { type: String, required: true },
  entityType: { type: String, required: true },
  entityId: { type: mongoose.Schema.Types.ObjectId },
  description: { type: String },
  oldValue: { type: mongoose.Schema.Types.Mixed },
  newValue: { type: mongoose.Schema.Types.Mixed },
  metadata: { type: mongoose.Schema.Types.Mixed },
}, { timestamps: true });

auditLogSchema.index({ actorUserId: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);