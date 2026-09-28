const service = require('../services/contact.service');
const { success } = require('../utils/apiResponse');

exports.create = async (req, res, next) => {
  try { return success(res, await service.createMessage(req.body, req.user), 'Message sent', 201); }
  catch (e) { next(e); }
};

exports.listMine = async (req, res, next) => {
  try { return success(res, await service.listMine(req.user)); } catch (e) { next(e); }
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