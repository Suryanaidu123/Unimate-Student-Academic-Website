const service = require('../services/subject.service');
const { success } = require('../utils/apiResponse');

exports.list = async (req, res, next) => {
  try { return success(res, await service.list(req.query)); } catch (e) { next(e); }
};
exports.getById = async (req, res, next) => {
  try { return success(res, await service.getById(req.params.id)); } catch (e) { next(e); }
};
exports.create = async (req, res, next) => {
  try { return success(res, await service.create(req.body, req.user), 'Subject created', 201); } catch (e) { next(e); }
};
exports.update = async (req, res, next) => {
  try { return success(res, await service.update(req.params.id, req.body, req.user)); } catch (e) { next(e); }
};
exports.remove = async (req, res, next) => {
  try { return success(res, await service.remove(req.params.id, req.user)); } catch (e) { next(e); }
};