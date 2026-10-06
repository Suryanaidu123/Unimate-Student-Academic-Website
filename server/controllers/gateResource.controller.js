const service = require('../services/gateResource.service');
const { success } = require('../utils/apiResponse');
const ApiError    = require('../utils/ApiError');

exports.create = async (req, res, next) => {
  try {
    const doc = await service.create(
      req.body,
      req.file?.buffer,
      req.file?.originalname,
      req.file?.mimetype,
      req.user
    );
    return success(res, doc, 'Resource uploaded', 201);
  } catch (e) { next(e); }
};

exports.list = async (req, res, next) => {
  try { return success(res, await service.list(req.query)); }
  catch (e) { next(e); }
};

exports.listAll = async (req, res, next) => {
  try { return success(res, await service.listAll(req.query)); }
  catch (e) { next(e); }
};

exports.download = async (req, res, next) => {
  try {
    const { url, fileName } = await service.getDownloadUrl(req.params.id);
    return success(res, { url, fileName });
  } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try { return success(res, await service.update(req.params.id, req.body, req.user), 'Updated'); }
  catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try { return success(res, await service.remove(req.params.id, req.user), 'Deleted'); }
  catch (e) { next(e); }
};
