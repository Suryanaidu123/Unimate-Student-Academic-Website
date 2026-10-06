const service = require('../services/sgpaCgpa.service');
const { success } = require('../utils/apiResponse');

exports.getActivations = async (req, res, next) => {
  try { return success(res, await service.getActivations()); }
  catch (e) { next(e); }
};

exports.setActivation = async (req, res, next) => {
  try {
    return success(res,
      await service.setActivation(req.params.year, req.body, req.user),
      'Activation updated'
    );
  } catch (e) { next(e); }
};

exports.submit = async (req, res, next) => {
  try { return success(res, await service.submit(req.body, req.user), 'Submitted'); }
  catch (e) { next(e); }
};

exports.getMySubmission = async (req, res, next) => {
  try { return success(res, await service.getMySubmission(req.user)); }
  catch (e) { next(e); }
};

exports.getMyActivation = async (req, res, next) => {
  try { return success(res, await service.getMyActivation(req.user)); }
  catch (e) { next(e); }
};

exports.getTracking = async (req, res, next) => {
  try { return success(res, await service.getTracking(req.params.year)); }
  catch (e) { next(e); }
};

// Admin: clear only the CGPA field from one student's submission (SGPA preserved)
exports.clearCgpa = async (req, res, next) => {
  try {
    const { SgpaSubmission } = require('../models/SgpaCgpa.model');
    const doc = await SgpaSubmission.findOneAndUpdate(
      { studentId: req.params.studentId },
      { $set: { cgpa: null } },
      { new: true }
    );
    if (!doc) return next(require('../utils/ApiError').notFound('Submission not found'));
    return success(res, doc, 'CGPA cleared — SGPA preserved');
  } catch (e) { next(e); }
};

// Admin: delete the entire submission record for one student
exports.deleteSubmission = async (req, res, next) => {
  try {
    const { SgpaSubmission } = require('../models/SgpaCgpa.model');
    const doc = await SgpaSubmission.findOneAndDelete({ studentId: req.params.studentId });
    if (!doc) return next(require('../utils/ApiError').notFound('Submission not found'));
    return success(res, { ok: true }, 'Submission deleted');
  } catch (e) { next(e); }
};
