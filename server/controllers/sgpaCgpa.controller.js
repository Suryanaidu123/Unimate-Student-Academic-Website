const service = require('../services/sgpaCgpa.service');
const { success } = require('../utils/apiResponse');
const ApiError    = require('../utils/ApiError');

// ── Admin / Faculty — activation ──────────────────────────────────────────────

exports.getActivations = async (req, res, next) => {
  try { return success(res, await service.getActivations(req.user)); }
  catch (e) { next(e); }
};

/** PUT /sgpa-cgpa/activations/semester/:year/:semester  { sgpaActive } */
exports.setSemesterActivation = async (req, res, next) => {
  try {
    const { year, semester } = req.params;
    const { sgpaActive } = req.body;
    return success(
      res,
      await service.setSemesterActivation(year, semester, sgpaActive, req.user),
      'Activation updated'
    );
  } catch (e) { next(e); }
};

/** PUT /sgpa-cgpa/activations/cgpa/:year  { cgpaActive } */
exports.setCgpaActivation = async (req, res, next) => {
  try {
    const { year } = req.params;
    const { cgpaActive } = req.body;
    return success(
      res,
      await service.setCgpaActivation(year, cgpaActive, req.user),
      'CGPA activation updated'
    );
  } catch (e) { next(e); }
};

/** Legacy: PUT /sgpa-cgpa/activations/:year  { sgpaActive, cgpaActive } */
exports.setActivation = async (req, res, next) => {
  try {
    return success(
      res,
      await service.setActivation(req.params.year, req.body, req.user),
      'Activation updated'
    );
  } catch (e) { next(e); }
};

// ── Student — read ────────────────────────────────────────────────────────────

exports.getMyActivation = async (req, res, next) => {
  try { return success(res, await service.getMyActivation(req.user)); }
  catch (e) { next(e); }
};

exports.getMyRecord = async (req, res, next) => {
  try { return success(res, await service.getMyRecord(req.user)); }
  catch (e) { next(e); }
};

// Legacy alias used by old student SgpaCgpa page
exports.getMySubmission = async (req, res, next) => {
  try { return success(res, await service.getMyRecord(req.user)); }
  catch (e) { next(e); }
};

// ── Student — write ───────────────────────────────────────────────────────────

/** POST /sgpa-cgpa/submit-sgpa  { semester, sgpa } */
exports.submitSgpa = async (req, res, next) => {
  try {
    return success(res, await service.submitSgpa(req.body, req.user), 'SGPA submitted');
  } catch (e) { next(e); }
};

/** POST /sgpa-cgpa/submit-cgpa  { cgpa } */
exports.submitCgpa = async (req, res, next) => {
  try {
    return success(res, await service.submitCgpa(req.body, req.user), 'CGPA submitted');
  } catch (e) { next(e); }
};

/** POST /sgpa-cgpa/submit-failed  { semester, subjects: [{subjectName, subjectCode}] } */
exports.submitFailedSubjects = async (req, res, next) => {
  try {
    return success(
      res,
      await service.submitFailedSubjects(req.body, req.user),
      'Failed subjects saved'
    );
  } catch (e) { next(e); }
};

// ── Admin / Faculty — tracking ────────────────────────────────────────────────

exports.getTracking = async (req, res, next) => {
  try { return success(res, await service.getTracking(req.params.year)); }
  catch (e) { next(e); }
};

// ── Admin — clear / reset ─────────────────────────────────────────────────────

/** PATCH /sgpa-cgpa/admin/:studentId/clear-sem/:semester */
exports.clearSemesterEntry = async (req, res, next) => {
  try {
    return success(
      res,
      await service.clearSemesterEntry(req.params.studentId, req.params.semester, req.user),
      'Semester entry cleared — student can re-submit'
    );
  } catch (e) { next(e); }
};

/** PATCH /sgpa-cgpa/admin/:studentId/clear-cgpa */
exports.clearCgpaEntry = async (req, res, next) => {
  try {
    return success(
      res,
      await service.clearCgpaEntry(req.params.studentId, req.user),
      'CGPA cleared — student can re-submit'
    );
  } catch (e) { next(e); }
};

/** DELETE /sgpa-cgpa/admin/:studentId */
exports.deleteRecord = async (req, res, next) => {
  try {
    return success(
      res,
      await service.deleteRecord(req.params.studentId, req.user),
      'Record deleted'
    );
  } catch (e) { next(e); }
};

// ── Legacy handlers (kept so old routes still resolve) ────────────────────────

exports.submit = async (req, res, next) => {
  // Old single-field submit — route to per-sem or cgpa based on what was sent
  try {
    const { sgpa, cgpa, semester } = req.body;
    if (sgpa !== undefined && semester) {
      return success(res, await service.submitSgpa({ semester, sgpa }, req.user), 'Submitted');
    }
    if (cgpa !== undefined) {
      return success(res, await service.submitCgpa({ cgpa }, req.user), 'Submitted');
    }
    throw ApiError.badRequest('Provide semester+sgpa or cgpa.');
  } catch (e) { next(e); }
};

// Old clear-cgpa used inline in admin page (kept working)
exports.clearCgpa = exports.clearCgpaEntry;

// Old delete-submission
exports.deleteSubmission = exports.deleteRecord;
