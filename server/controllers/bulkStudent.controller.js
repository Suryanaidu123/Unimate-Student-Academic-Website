const service = require('../services/bulkStudent.service');
const { success } = require('../utils/apiResponse');

exports.listSeries = async (_req, res, next) => {
  try { return success(res, await service.listSeries()); } catch (e) { next(e); }
};

exports.updateSeries = async (req, res, next) => {
  try {
    const data = await service.updateSeries(req.params.year, req.body, req.user);
    return success(res, data, 'Series updated');
  } catch (e) { next(e); }
};

exports.preview = async (req, res, next) => {
  try { return success(res, await service.previewSeries(req.params.year)); }
  catch (e) { next(e); }
};

exports.generate = async (req, res, next) => {
  try {
    const data = await service.generate(req.body, req.user);
    return success(res, data, `Generated ${data.summary.created} students`);
  } catch (e) { next(e); }
};