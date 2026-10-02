const { success } = require('../utils/apiResponse');
const Notification = require('../models/Notification.model');
const OtpRequest = require('../models/OtpRequest.model');
const AuditLog = require('../models/AuditLog.model');
const auditLog = require('../services/auditLog.service');

exports.cleanup = async (req, res, next) => {
  try {
    const { target } = req.body;
    const now = new Date();
    let deleted = 0;
    let label = '';

    switch (target) {
      case 'read_notifications': {
        const r = await Notification.deleteMany({ isRead: true });
        deleted = r.deletedCount;
        label = 'read notifications';
        break;
      }
      case 'old_notifications': {
        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const r = await Notification.deleteMany({ createdAt: { $lt: cutoff } });
        deleted = r.deletedCount;
        label = 'notifications older than 30 days';
        break;
      }
      case 'expired_otps': {
        const r = await OtpRequest.deleteMany({ expiresAt: { $lt: now } });
        deleted = r.deletedCount;
        label = 'expired OTPs';
        break;
      }
      case 'old_audit_logs': {
        const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const r = await AuditLog.deleteMany({ createdAt: { $lt: cutoff } });
        deleted = r.deletedCount;
        label = 'audit logs older than 90 days';
        break;
      }
      default:
        return res.status(400).json({ success: false, message: 'Unknown cleanup target' });
    }

    await auditLog.log({
      actor: req.user,
      action: 'DB_CLEANUP',
      entityType: 'System',
      description: `Cleaned ${deleted} ${label}`,
      metadata: { target, deleted },
    });

    return success(res, { deleted, label }, `Deleted ${deleted} ${label}`);
  } catch (e) { next(e); }
};