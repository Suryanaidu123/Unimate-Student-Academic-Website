const service = require('../services/semester.service');
const { success } = require('../utils/apiResponse');

exports.status = async (_req, res, next) => {
  try { return success(res, await service.getStatus()); } catch (e) { next(e); }
};

exports.move = async (req, res, next) => {
  try {
    const { year, direction } = req.body;
    const data = await service.moveSemester(year, direction, req.user);
    return success(res, data, `Moved ${data.promoted} students: ${data.from} → ${data.to}`);
  } catch (e) { next(e); }
};