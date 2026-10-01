const service = require('../services/material.service');
const { success } = require('../utils/apiResponse');
const path = require('path');
const fs = require('fs');

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
      unit: req.body.unit,
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
    const filePath = path.join(__dirname, '..', m.fileUrl);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File missing on server' });
    }

    const mode = req.query.mode === 'download' ? 'attachment' : 'inline';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `${mode}; filename="${encodeURIComponent(m.fileName)}"`
    );
    fs.createReadStream(filePath).pipe(res);
  } catch (e) { next(e); }
};