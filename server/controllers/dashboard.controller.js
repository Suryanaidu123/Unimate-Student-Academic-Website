const service = require('../services/dashboard.service');
const { success } = require('../utils/apiResponse');
const ApiError = require('../utils/ApiError');

exports.student = async (req, res, next) => {
  try {
    if (req.user.role !== 'STUDENT') throw ApiError.forbidden();
    return success(res, await service.studentDashboard(req.user.userId, req.user.studentId));
  } catch (e) { next(e); }
};

exports.faculty = async (req, res, next) => {
  try {
    if (req.user.role !== 'FACULTY') throw ApiError.forbidden();
    return success(res, await service.facultyDashboard(req.user.userId, req.user.facultyId));
  } catch (e) { next(e); }
};

exports.admin = async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') throw ApiError.forbidden();
    return success(res, await service.adminDashboard());
  } catch (e) { next(e); }
};