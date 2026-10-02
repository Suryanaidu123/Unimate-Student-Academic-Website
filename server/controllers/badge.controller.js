const service = require('../services/badge.service');
const { success } = require('../utils/apiResponse');

exports.get = async (req, res, next) => {
  try { return success(res, await service.getBadges(req.user)); } catch (e) { next(e); }
};

exports.markRead = async (req, res, next) => {
  try {
    await service.markSectionRead(req.user, req.params.section);
    return success(res, { ok: true });
  } catch (e) { next(e); }
};