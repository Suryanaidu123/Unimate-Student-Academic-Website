const { success } = require('../utils/apiResponse');
const Staff = require('../models/Staff.model');
const User = require('../models/User.model');
const ApiError = require('../utils/ApiError');
const auditLog = require('../services/auditLog.service');

exports.list = async (_req, res, next) => {
  try {
    const items = await Staff.find().sort({ employeeId: 1 });
    return success(res, items);
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const emp = String(req.body.employeeId || '').trim();
    if (!emp) throw ApiError.badRequest('Employee ID is required');

    const dup = await Staff.findOne({ employeeId: emp });
    if (dup) throw ApiError.conflict('An attendance staff with this Employee ID already exists');

    const staff = await Staff.create({ employeeId: emp, status: 'INACTIVE' });

    await auditLog.log({
      actor: req.user,
      action: 'STAFF_CREATE_STUB',
      entityType: 'Staff',
      entityId: staff._id,
      description: `Created attendance staff stub ${emp}`,
    });

    return success(res, staff, 'Employee ID added. Staff can now register.', 201);
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    const staff = await Staff.findById(req.params.id);
    if (!staff) throw ApiError.notFound('Staff not found');

    await User.deleteMany({ staffId: staff._id });
    await staff.deleteOne();

    await auditLog.log({
      actor: req.user,
      action: 'STAFF_DELETE',
      entityType: 'Staff',
      entityId: staff._id,
      description: `Deleted attendance staff ${staff.employeeId}`,
    });

    return success(res, { ok: true }, 'Staff deleted');
  } catch (e) { next(e); }
};