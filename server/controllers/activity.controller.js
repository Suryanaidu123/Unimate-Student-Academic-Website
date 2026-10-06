const service = require('../services/activity.service');
const { success } = require('../utils/apiResponse');
const ApiError   = require('../utils/ApiError');

exports.create = async (req, res, next) => {
  try { return success(res, await service.create(req.body, req.user), 'Activity created', 201); }
  catch (e) { next(e); }
};

exports.list = async (req, res, next) => {
  try { return success(res, await service.list(req.query, req.user)); }
  catch (e) { next(e); }
};

exports.getById = async (req, res, next) => {
  try { return success(res, await service.getById(req.params.id, req.user)); }
  catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try { return success(res, await service.update(req.params.id, req.body, req.user), 'Activity updated'); }
  catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try { return success(res, await service.remove(req.params.id, req.user), 'Activity deleted'); }
  catch (e) { next(e); }
};

exports.respond = async (req, res, next) => {
  try { return success(res, await service.respond(req.params.id, req.body, req.user), 'Response submitted'); }
  catch (e) { next(e); }
};

exports.listForStudent = async (req, res, next) => {
  try { return success(res, await service.listForStudent(req.user)); }
  catch (e) { next(e); }
};

exports.getActiveForStudent = async (req, res, next) => {
  try { return success(res, await service.getActiveForStudent(req.user)); }
  catch (e) { next(e); }
};

exports.getActiveForFaculty = async (req, res, next) => {
  try { return success(res, await service.getActiveForFaculty(req.user)); }
  catch (e) { next(e); }
};
