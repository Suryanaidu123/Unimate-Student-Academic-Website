const service = require('../services/attendance.service');
const settings = require('../services/settings.service');
const { success } = require('../utils/apiResponse');
const ApiError = require('../utils/ApiError');
const { isWithinWindow } = require('../middleware/attendanceWindow');

exports.conduct = async (req, res, next) => {
  try {
    const data = await service.conductSession(req.body, req.user);
    return success(res, data, 'Attendance recorded', 201);
  } catch (e) { next(e); }
};

exports.conductBulk = async (req, res, next) => {
  try {
    const data = await service.conductBulk(req.body, req.user);
    return success(res, data, 'Bulk attendance processed');
  } catch (e) { next(e); }
};

exports.listSessions = async (req, res, next) => {
  try { return success(res, await service.listSessions(req.query)); }
  catch (e) { next(e); }
};

exports.getSession = async (req, res, next) => {
  try { return success(res, await service.getSessionDetail(req.params.id)); }
  catch (e) { next(e); }
};

exports.deleteSession = async (req, res, next) => {
  try { return success(res, await service.deleteSession(req.params.id, req.user)); }
  catch (e) { next(e); }
};

exports.myAttendance = async (req, res, next) => {
  try {
    if (req.user.role !== 'STUDENT') throw ApiError.forbidden();
    const data = await service.studentSummary(req.user.studentId, req.query.subjectId);
    return success(res, data);
  } catch (e) { next(e); }
};

exports.studentAttendance = async (req, res, next) => {
  try {
    const data = await service.studentSummary(req.params.studentId);
    return success(res, data);
  } catch (e) { next(e); }
};

exports.yearSummary = async (req, res, next) => {
  try { return success(res, await service.yearSummary(req.query)); }
  catch (e) { next(e); }
};

exports.freezeStatus = async (_req, res, next) => {
  try {
    const data = await settings.getStatus();
    const window = isWithinWindow();
    return success(res, { ...data, window });
  } catch (e) { next(e); }
};

exports.freeze = async (req, res, next) => {
  try {
    const data = await settings.setFrozen(true, req.user, req.body.reason || '');
    return success(res, data, 'Attendance frozen');
  } catch (e) { next(e); }
};

exports.resume = async (req, res, next) => {
  try {
    const data = await settings.setFrozen(false, req.user, req.body.reason || '');
    return success(res, data, 'Attendance resumed');
  } catch (e) { next(e); }
};