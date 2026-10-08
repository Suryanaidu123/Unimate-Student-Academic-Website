const service = require('../services/faculty.service');
const { success } = require('../utils/apiResponse');

exports.list = async (req, res, next) => {
  try { return success(res, await service.list(req.query)); } catch (e) { next(e); }
};
exports.getById = async (req, res, next) => {
  try { return success(res, await service.getById(req.params.id)); } catch (e) { next(e); }
};
exports.create = async (req, res, next) => {
  try {
    return success(res, await service.create(req.body, req.user, req.body.initialPassword), 'Faculty record created', 201);
  } catch (e) { next(e); }
};
exports.update = async (req, res, next) => {
  try { return success(res, await service.update(req.params.id, req.body, req.user), 'Faculty updated'); }
  catch (e) { next(e); }
};
exports.setStatus = async (req, res, next) => {
  try { return success(res, await service.setStatus(req.params.id, req.body.status, req.user)); }
  catch (e) { next(e); }
};

exports.setPermissions = async (req, res, next) => {
  try {
    const Faculty = require('../models/Faculty.model');
    const ApiError = require('../utils/ApiError');
    const { canManageSgpa } = req.body;
    const f = await Faculty.findByIdAndUpdate(
      req.params.id,
      { $set: { canManageSgpa: !!canManageSgpa } },
      { new: true }
    );
    if (!f) return next(ApiError.notFound('Faculty not found'));
    return success(res, f, 'Permissions updated');
  } catch (e) { next(e); }
};
exports.remove = async (req, res, next) => {
  try { return success(res, await service.remove(req.params.id, req.user), 'Faculty deleted'); }
  catch (e) { next(e); }
};
exports.me = async (req, res, next) => {
  try { return success(res, await service.getById(req.user.facultyId)); } catch (e) { next(e); }
};