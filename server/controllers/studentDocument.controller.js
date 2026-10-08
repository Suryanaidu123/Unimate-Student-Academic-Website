const service = require('../services/studentDocument.service');
const { success } = require('../utils/apiResponse');

exports.upload    = async (req, res, next) => {
  try { return success(res, await service.upload(req.body, req.file, req.user), 'Uploaded', 201); }
  catch (e) { next(e); }
};
exports.listMine  = async (req, res, next) => {
  try { return success(res, await service.listMine(req.user)); } catch (e) { next(e); }
};
exports.getUrl    = async (req, res, next) => {
  try { return success(res, await service.getDownloadUrl(req.params.id, req.user)); } catch (e) { next(e); }
};
exports.deleteOwn = async (req, res, next) => {
  try { return success(res, await service.deleteOwn(req.params.id, req.user), 'Deleted'); } catch (e) { next(e); }
};
exports.adminList  = async (req, res, next) => {
  try { return success(res, await service.adminList(req.query)); } catch (e) { next(e); }
};
exports.facultyList = async (req, res, next) => {
  try { return success(res, await service.facultyList(req.query, req.user)); } catch (e) { next(e); }
};
exports.setFacultyVisibility = async (req, res, next) => {
  try {
    return success(res,
      await service.setFacultyVisibility(req.params.facultyId, req.body.years, req.user),
      'Visibility updated'
    );
  } catch (e) { next(e); }
};
