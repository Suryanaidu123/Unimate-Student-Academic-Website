const service = require('../services/notification.service');
const { success } = require('../utils/apiResponse');

exports.list = async (req, res, next) => {
  try { return success(res, await service.listForUser(req.user.userId, req.query)); } catch (e) { next(e); }
};
exports.unreadCount = async (req, res, next) => {
  try { const c = await service.unreadCount(req.user.userId); return success(res, { count: c }); } catch (e) { next(e); }
};
exports.markRead = async (req, res, next) => {
  try { return success(res, await service.markRead(req.user.userId, req.params.id)); } catch (e) { next(e); }
};
exports.markAllRead = async (req, res, next) => {
  try { return success(res, await service.markAllRead(req.user.userId)); } catch (e) { next(e); }
};
exports.remove = async (req, res, next) => {
  try { return success(res, await service.remove(req.user.userId, req.params.id)); } catch (e) { next(e); }
};
exports.create = async (req, res, next) => {
  try {
    const data = await service.createManual({ ...req.body, createdBy: req.user.userId });
    return success(res, data, 'Notification sent', 201);
  } catch (e) { next(e); }
};