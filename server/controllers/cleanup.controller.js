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
      case 'fix_sgpa_index': {
        // Drop the old year_1 unique index that blocks per-semester upserts.
        // The new model only needs the year unique index which Mongoose manages.
        const mongoose = require('mongoose');
        const col = mongoose.connection.db.collection('sgpaactivations');
        try {
          await col.dropIndex('year_1_semester_1');
        } catch (_) { /* index may not exist */ }
        try {
          await col.dropIndex('year_1_semester_1_sgpaActive_1');
        } catch (_) { /* ignore */ }
        // Drop any docs with the old compound structure (year+semester fields)
        // These had { year: 3, semester: 5 } shape — old model
        const r = await col.deleteMany({ semester: { $exists: true } });
        deleted = r.deletedCount;
        label = `old per-semester SGPA activation docs removed (index dropped)`;
        break;
      }
      case 'clear_lab_faculty': {
        const Subject = require('../models/Subject.model');
        const Faculty = require('../models/Faculty.model');
        // 1. Collect all LAB subject IDs
        const labs = await Subject.find({ type: 'LAB' }).select('_id').lean();
        const labIds = labs.map((l) => l._id);
        // 2. Clear facultyId on all LAB subjects
        const subResult = await Subject.updateMany(
          { type: 'LAB', facultyId: { $exists: true, $ne: null } },
          { $unset: { facultyId: '' } }
        );
        // 3. Remove lab IDs from every Faculty.assignedSubjects array
        const facResult = await Faculty.updateMany(
          { assignedSubjects: { $in: labIds } },
          { $pull: { assignedSubjects: { $in: labIds } } }
        );
        deleted = subResult.modifiedCount + facResult.modifiedCount;
        label = `lab→faculty assignments removed (${subResult.modifiedCount} subjects, ${facResult.modifiedCount} faculty records updated)`;
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