const service = require('../services/timetable.service');
const { success } = require('../utils/apiResponse');

exports.my = async (req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    return success(res, await service.listForUser(req.user));
  } catch (e) { next(e); }
};

exports.list = async (req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    return success(res, await service.listForUser(req.user, req.query));
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try {
    return success(res, await service.create(req.body, req.user), 'Created', 201);
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    return success(res, await service.update(req.params.id, req.body, req.user));
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try {
    return success(res, await service.remove(req.params.id, req.user));
  } catch (e) { next(e); }
};

exports.reset = async (req, res, next) => {
  try {
    const data = await service.reset(req.body, req.user);
    return success(res, data, `Deleted ${data.deleted} slots`);
  } catch (e) { next(e); }
};