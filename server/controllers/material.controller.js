const service = require('../services/material.service');
const { success } = require('../utils/apiResponse');
const ApiError = require('../utils/ApiError');
const storage = require('../utils/storage');

exports.list = async (req, res, next) => {
  try { return success(res, await service.listForUser(req.user, req.query)); }
  catch (e) { next(e); }
};

exports.upload = async (req, res, next) => {
  try {
    const data = await service.create({
      title: req.body.title,
      description: req.body.description || '',
      subjectId: req.body.subjectId,
      section: req.body.section,
      file: req.file,
    }, req.user);
    return success(res, data, 'Material uploaded', 201);
  } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try { return success(res, await service.remove(req.params.id, req.user)); }
  catch (e) { next(e); }
};

exports.download = async (req, res, next) => {
  try {
    const m = await service.getByIdForUser(req.params.id, req.user);
    const mode = req.query.mode === 'download' ? 'attachment' : 'inline';
    const url = await storage.getSignedDownloadUrl(m.fileKey, m.fileName, mode);
    return res.redirect(url);
  } catch (e) { next(e); }
};

// Faculty-only helpers
exports.mySemesters = async (req, res, next) => {
  try {
    if (req.user.role !== 'FACULTY') throw ApiError.forbidden();
    const data = await service.myAssignedSemesters(req.user.facultyId);
    return success(res, data);
  } catch (e) { next(e); }
};

exports.mySubjects = async (req, res, next) => {
  try {
    if (req.user.role !== 'FACULTY') throw ApiError.forbidden();
    const { year, semester } = req.query;
    if (!year || !semester) throw ApiError.badRequest('year and semester are required');
    const data = await service.mySubjectsForSemester(req.user.facultyId, year, semester);
    return success(res, data);
  } catch (e) { next(e); }
};