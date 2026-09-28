const Faculty = require('../models/Faculty.model');
const User = require('../models/User.model');
const Subject = require('../models/Subject.model');
const bcrypt = require('bcryptjs');
const ApiError = require('../utils/ApiError');
const auditLog = require('./auditLog.service');

const SALT_ROUNDS = 12;

async function list({ q, status, page = 1, limit = 200 }) {
  const query = {};
  if (status) query.status = status;
  if (q) query.$or = [
    { employeeId: new RegExp(q, 'i') },
    { name: new RegExp(q, 'i') },
    { email: new RegExp(q, 'i') },
  ];
  const [items, total] = await Promise.all([
    Faculty.find(query).sort({ employeeId: 1 }).skip((page - 1) * limit).limit(limit),
    Faculty.countDocuments(query),
  ]);
  return { items, total, page, limit };
}

async function getById(id) {
  const f = await Faculty.findById(id);
  if (!f) throw ApiError.notFound('Faculty not found');
  return f;
}

async function create(data, actor, initialPassword) {
  const dup = await Faculty.findOne({
    $or: [{ employeeId: data.employeeId }, { email: data.email }],
  });
  if (dup) throw ApiError.conflict('Faculty with same employee ID or email already exists');

  const f = await Faculty.create(data);
  const passwordHash = await bcrypt.hash(initialPassword || 'Faculty@123', SALT_ROUNDS);
  await User.create({
    email: data.email, passwordHash, role: 'FACULTY', facultyId: f._id,
  });
  await auditLog.log({
    actor, action: 'FACULTY_CREATE', entityType: 'Faculty', entityId: f._id,
    description: `Created faculty ${f.employeeId}`, newValue: data,
  });
  return f;
}

async function update(id, data, actor) {
  const old = await Faculty.findById(id);
  if (!old) throw ApiError.notFound('Faculty not found');
  const f = await Faculty.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  await auditLog.log({
    actor, action: 'FACULTY_UPDATE', entityType: 'Faculty', entityId: f._id,
    description: `Updated faculty ${f.employeeId}`,
    oldValue: old.toObject(), newValue: data,
  });
  return f;
}

async function setStatus(id, status, actor) {
  const f = await Faculty.findByIdAndUpdate(id, { status }, { new: true });
  if (!f) throw ApiError.notFound('Faculty not found');
  await User.updateOne({ facultyId: f._id }, { status });
  await auditLog.log({
    actor, action: 'FACULTY_STATUS', entityType: 'Faculty', entityId: f._id,
    description: `Set status ${status}`,
  });
  return f;
}

async function remove(id, actor) {
  const f = await Faculty.findById(id);
  if (!f) throw ApiError.notFound('Faculty not found');

  // Guard: block deletion if faculty is assigned to any subject
  const assignedCount = await Subject.countDocuments({ facultyId: id });
  if (assignedCount > 0) {
    throw ApiError.conflict(
      `Cannot delete — faculty is assigned to ${assignedCount} subject(s). Unassign them first.`
    );
  }

  await User.deleteOne({ facultyId: id });
  await f.deleteOne();

  await auditLog.log({
    actor, action: 'FACULTY_DELETE', entityType: 'Faculty', entityId: id,
    description: `Deleted faculty ${f.employeeId} (${f.name})`,
    oldValue: f.toObject(),
  });
  return { ok: true };
}

module.exports = { list, getById, create, update, setStatus, remove };