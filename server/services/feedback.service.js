const Feedback = require('../models/Feedback.model');
const Student = require('../models/Student.model');
const Faculty = require('../models/Faculty.model');
const ApiError = require('../utils/ApiError');
const auditLog = require('./auditLog.service');

async function submit({ category, subject, message }, user) {
  if (!['STUDENT', 'FACULTY'].includes(user.role)) {
    throw ApiError.forbidden('Only students and faculty can submit feedback.');
  }

  const payload = {
    fromRole: user.role,
    fromUserId: user.userId,
    category: category || 'General',
    subject: subject.trim(),
    message: message.trim(),
  };

  if (user.role === 'STUDENT') {
    const s = await Student.findById(user.studentId);
    if (!s) throw ApiError.notFound('Student not found');
    payload.studentId = s._id;
    payload.year = s.year;
    payload.semester = s.currentSemester || s.semester;
    payload.section = s.section;
  }

  if (user.role === 'FACULTY') {
    const f = await Faculty.findById(user.facultyId);
    if (!f) throw ApiError.notFound('Faculty not found');
    payload.facultyId = f._id;
    payload.employeeId = f.employeeId;
  }

  const fb = await Feedback.create(payload);

  await auditLog.log({
    actor: user,
    action: 'FEEDBACK_SUBMIT',
    entityType: 'Feedback',
    entityId: fb._id,
    description: `${user.role} submitted feedback: "${subject}"`,
  });

  return fb;
}

async function listMine(user) {
  return Feedback.find({ fromUserId: user.userId })
    .sort({ createdAt: -1 });
}
async function unreadCount() {
  return Feedback.countDocuments({ status: 'NEW' });
}

async function listForAdmin({ kind, year, semester, section, status, q, page = 1, limit = 50 }) {
  const query = {};

  // kind: 'STUDENT' | 'FACULTY' | '' (all)
  if (kind) query.fromRole = kind;

  // Student-only filters
  if (kind === 'STUDENT') {
    if (year) query.year = Number(year);
    if (semester) query.semester = Number(semester);
    if (section) query.section = section;
  }

  if (status) query.status = status;

  if (q) {
    query.$or = [
      { subject: new RegExp(q, 'i') },
      { message: new RegExp(q, 'i') },
    ];
  }

  const [items, total] = await Promise.all([
    Feedback.find(query)
      .populate('studentId', 'rollNumber name year currentSemester section')
      .populate('facultyId', 'employeeId name designation')
      .populate('fromUserId', 'email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Feedback.countDocuments(query),
  ]);

  return { items, total, page, limit };
}

async function getById(id) {
  const fb = await Feedback.findById(id)
    .populate('studentId', 'rollNumber name year currentSemester section')
    .populate('facultyId', 'employeeId name designation')
    .populate('fromUserId', 'email role');
  if (!fb) throw ApiError.notFound('Feedback not found');
  return fb;
}

async function updateStatus(id, status, adminReply, actor) {
  const fb = await Feedback.findById(id);
  if (!fb) throw ApiError.notFound('Feedback not found');

  if (status) fb.status = status;
  if (adminReply !== undefined && adminReply !== null) {
    fb.adminReply = String(adminReply).trim();
    fb.repliedAt = new Date();
    fb.repliedBy = actor.userId;
    if (status === 'NEW') fb.status = 'READ';
  }
  await fb.save();

  await auditLog.log({
    actor,
    action: 'FEEDBACK_UPDATE',
    entityType: 'Feedback',
    entityId: fb._id,
    description: `Updated feedback status → ${fb.status}`,
  });

  return fb;
}
async function markAllRead(actor) {
  const r = await Feedback.updateMany(
    { status: 'NEW' },
    { $set: { status: 'READ' } }
  );

  await auditLog.log({
    actor,
    action: 'FEEDBACK_MARK_ALL_READ',
    entityType: 'Feedback',
    description: `Marked ${r.modifiedCount} feedback items as read`,
  });

  return { modified: r.modifiedCount };
}
async function remove(id, actor) {
  const fb = await Feedback.findByIdAndDelete(id);
  if (!fb) throw ApiError.notFound('Feedback not found');
  await auditLog.log({
    actor,
    action: 'FEEDBACK_DELETE',
    entityType: 'Feedback',
    entityId: id,
  });
  return { ok: true };
}

module.exports = { submit, listMine, listForAdmin, getById, updateStatus, remove, unreadCount, markAllRead };