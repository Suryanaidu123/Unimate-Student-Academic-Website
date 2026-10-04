const service = require('../services/feedback.service');
const { success } = require('../utils/apiResponse');

exports.submit = async (req, res, next) => {
  try {
    const data = await service.submit(req.body, req.user);
    return success(res, data, 'Feedback submitted successfully.', 201);
  } catch (e) { next(e); }
};

exports.listMine = async (req, res, next) => {
  try { return success(res, await service.listMine(req.user)); }
  catch (e) { next(e); }
};

exports.listAll = async (req, res, next) => {
  try { return success(res, await service.listForAdmin(req.query)); }
  catch (e) { next(e); }
};

exports.getOne = async (req, res, next) => {
  try { return success(res, await service.getById(req.params.id)); }
  catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try {
    const data = await service.updateStatus(
      req.params.id, req.body.status, req.body.adminReply, req.user
    );
    return success(res, data, 'Feedback updated');
  } catch (e) { next(e); }
};

exports.unreadCount = async (_req, res, next) => {
  try {
    const count = await service.unreadCount();
    return success(res, { count });
  } catch (e) { next(e); }
};
exports.markAllRead = async (req, res, next) => {
  try {
    const data = await service.markAllRead(req.user);
    return success(res, data, `Marked ${data.modified} as read`);
  } catch (e) { next(e); }
};
exports.remove = async (req, res, next) => {
  try { return success(res, await service.remove(req.params.id, req.user)); }
  catch (e) { next(e); }
};