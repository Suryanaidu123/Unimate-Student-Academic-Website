const SystemSetting = require('../models/SystemSetting.model');
const auditLog = require('./auditLog.service');

const FREEZE_KEY = 'attendance_frozen';

async function isFrozen() {
  const doc = await SystemSetting.findOne({ key: FREEZE_KEY });
  return doc?.value?.frozen === true;
}

async function setFrozen(frozen, actor, reason = '') {
  const doc = await SystemSetting.findOneAndUpdate(
    { key: FREEZE_KEY },
    {
      $set: {
        value: {
          frozen: !!frozen,
          reason,
          updatedAt: new Date(),
          updatedBy: actor?.userId || null,
        },
        updatedBy: actor?.userId,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  await auditLog.log({
    actor,
    action: frozen ? 'ATTENDANCE_FREEZE' : 'ATTENDANCE_RESUME',
    entityType: 'SystemSetting',
    entityId: doc._id,
    description: frozen ? `Attendance frozen (${reason})` : 'Attendance resumed',
  });

  return doc.value;
}

async function getStatus() {
  const doc = await SystemSetting.findOne({ key: FREEZE_KEY });
  return doc?.value || { frozen: false };
}

module.exports = { isFrozen, setFrozen, getStatus, FREEZE_KEY };