const AuditLog = require('../models/AuditLog.model');

async function log({ actor, action, entityType, entityId, description, oldValue, newValue, metadata }) {
  try {
    await AuditLog.create({
      actorUserId: actor?.userId,
      actorRole: actor?.role,
      action,
      entityType,
      entityId,
      description,
      oldValue,
      newValue,
      metadata,
    });
  } catch (e) {
    console.error('AuditLog error:', e.message);
  }
}

module.exports = { log };