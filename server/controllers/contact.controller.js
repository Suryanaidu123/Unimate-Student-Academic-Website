const service = require('../services/contact.service');
const { success } = require('../utils/apiResponse');

exports.create = async (req, res, next) => {
  try { return success(res, await service.createMessage(req.body, req.user), 'Message sent', 201); }
  catch (e) { next(e); }
};

exports.listMine = async (req, res, next) => {
  try { return success(res, await service.listMine(req.user)); } catch (e) { next(e); }
};
exports.block = async (req, res, next) => {
  try {
    const data = await service.setBlocked(req.params.studentId, true, req.user);
    return success(res, data, 'Student blocked from contacting admin');
  } catch (e) { next(e); }
};

exports.unblock = async (req, res, next) => {
  try {
    const data = await service.setBlocked(req.params.studentId, false, req.user);
    return success(res, data, 'Student unblocked');
  } catch (e) { next(e); }
};
exports.listAll = async (req, res, next) => {
  try { return success(res, await service.listAll(req.query)); } catch (e) { next(e); }
};

exports.getOne = async (req, res, next) => {
  try { return success(res, await service.getOne(req.params.id)); } catch (e) { next(e); }
};

exports.reply = async (req, res, next) => {
  try { return success(res, await service.reply(req.params.id, req.body.body, req.user), 'Reply sent'); }
  catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try { return success(res, await service.remove(req.params.id, req.user)); } catch (e) { next(e); }
};

exports.removeOwn = async (req, res, next) => {
  try { return success(res, await service.removeOwn(req.params.id, req.user), 'Message deleted'); }
  catch (e) { next(e); }
};

exports.unreadCount = async (req, res, next) => {
  try { return success(res, { count: await service.unreadCount() }); } catch (e) { next(e); }
};

exports.markRead = async (req, res, next) => {
  try { await service.markRead(req.params.id); return success(res, { ok: true }); } catch (e) { next(e); }
};

exports.markAllRead = async (req, res, next) => {
  try { return success(res, await service.markAllRead(), 'Marked all read'); } catch (e) { next(e); }
};