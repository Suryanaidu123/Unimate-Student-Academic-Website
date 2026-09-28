const service = require('../services/student.service');
const { success } = require('../utils/apiResponse');
const ApiError = require('../utils/ApiError');

exports.list = async (req, res, next) => {
  try {
    const data = await service.list(req.query);
    return success(res, data);
  } catch (e) { next(e); }
};

exports.getById = async (req, res, next) => {
  try {
    const data = await service.getById(req.params.id);
    return success(res, data);
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    const data = await service.create(req.body, req.user);
    return success(res, data, 'Student created', 201);
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const data = await service.update(req.params.id, req.body, req.user);
    return success(res, data, 'Student updated');
  } catch (e) { next(e); }
};

exports.setStatus = async (req, res, next) => {
  try {
    const data = await service.setStatus(req.params.id, req.body.status, req.user);
    return success(res, data, 'Status updated');
  } catch (e) { next(e); }
};

exports.bulkImport = async (req, res, next) => {
  try {
    if (!Array.isArray(req.body.rows)) throw ApiError.badRequest('rows array required');
    const data = await service.bulkImport(req.body.rows, req.user);
    return success(res, data, 'Import completed');
  } catch (e) { next(e); }
};

exports.me = async (req, res, next) => {
  try {
    const data = await service.getById(req.user.studentId);
    return success(res, data);
  } catch (e) { next(e); }
};