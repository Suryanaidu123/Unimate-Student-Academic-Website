const GateResource = require('../models/GateResource.model');
const ApiError     = require('../utils/ApiError');
const storage      = require('../utils/storage');
const auditLog     = require('./auditLog.service');

async function create({ title, description }, fileBuffer, originalName, mimeType, actor) {
  if (!title) throw ApiError.badRequest('Title is required.');

  let fileKey = '', fileName = '', fileSize = 0, mime = '';
  if (fileBuffer) {
    const uploaded = await storage.uploadPdf(fileBuffer, originalName);
    fileKey  = uploaded.key;
    fileName = uploaded.fileName || originalName;
    fileSize = fileBuffer.length;
    mime     = mimeType || 'application/pdf';
  }

  const doc = await GateResource.create({
    title: title.trim(),
    description: (description || '').trim(),
    fileKey, fileName, fileSize, mimeType: mime,
    uploadedBy: actor.userId,
    facultyId:  actor.role === 'FACULTY' ? actor.facultyId : undefined,
    status: 'PUBLISHED',
  });

  await auditLog.log({
    actor, action: 'GATE_RESOURCE_CREATE', entityType: 'GateResource', entityId: doc._id,
    description: `Uploaded GATE resource "${doc.title}"`,
  });
  return doc;
}

async function list({ status, page = 1, limit = 50 }) {
  const query = {};
  if (status) query.status = status;
  else query.status = 'PUBLISHED';

  const [items, total] = await Promise.all([
    GateResource.find(query)
      .populate('facultyId', 'name employeeId')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    GateResource.countDocuments(query),
  ]);
  return { items, total, page, limit };
}

async function listAll({ page = 1, limit = 50 }) {
  // For admin/faculty management — includes HIDDEN
  const [items, total] = await Promise.all([
    GateResource.find()
      .populate('facultyId', 'name employeeId')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    GateResource.countDocuments(),
  ]);
  return { items, total, page, limit };
}

async function getDownloadUrl(id) {
  const r = await GateResource.findById(id);
  if (!r) throw ApiError.notFound('Resource not found.');
  if (!r.fileKey) throw ApiError.badRequest('No file attached to this resource.');
  const url = await storage.getSignedDownloadUrl(r.fileKey, r.fileName, 'attachment');
  return { url, fileName: r.fileName };
}

async function update(id, data, actor) {
  const r = await GateResource.findById(id);
  if (!r) throw ApiError.notFound('Resource not found.');
  if (actor.role === 'FACULTY' && String(r.uploadedBy) !== String(actor.userId)) {
    throw ApiError.forbidden('You can only edit your own resources.');
  }

  const patch = {};
  if (data.title       !== undefined) patch.title       = data.title.trim();
  if (data.description !== undefined) patch.description = data.description.trim();
  if (data.status      !== undefined) patch.status      = data.status;

  const updated = await GateResource.findByIdAndUpdate(id, patch, { new: true });
  await auditLog.log({
    actor, action: 'GATE_RESOURCE_UPDATE', entityType: 'GateResource', entityId: id,
    description: `Updated GATE resource "${updated.title}"`,
  });
  return updated;
}

async function remove(id, actor) {
  const r = await GateResource.findById(id);
  if (!r) throw ApiError.notFound('Resource not found.');
  if (actor.role === 'FACULTY' && String(r.uploadedBy) !== String(actor.userId)) {
    throw ApiError.forbidden('You can only delete your own resources.');
  }
  if (r.fileKey) await storage.deleteFile(r.fileKey);
  await r.deleteOne();
  await auditLog.log({
    actor, action: 'GATE_RESOURCE_DELETE', entityType: 'GateResource', entityId: id,
    description: `Deleted GATE resource "${r.title}"`,
  });
  return { ok: true };
}

module.exports = { create, list, listAll, getDownloadUrl, update, remove };
