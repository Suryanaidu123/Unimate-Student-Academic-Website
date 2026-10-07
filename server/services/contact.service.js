const ContactMessage = require('../models/ContactMessage.model');
const Student = require('../models/Student.model');
const User = require('../models/User.model');
const ApiError = require('../utils/ApiError');
const auditLog = require('./auditLog.service');
const notification = require('./notification.service');

// Student — create
async function createMessage({ subject, body }, user) {
  if (!user.studentId) throw ApiError.forbidden('Only students can contact admin');

  const student = await Student.findById(user.studentId);
  if (!student) throw ApiError.notFound('Student not found');

  if (student.contactBlocked) {
    throw ApiError.forbidden(
      'You are currently blocked from contacting the admin.'
    );
  }

  const msg = await ContactMessage.create({
    studentId: user.studentId,
    studentUserId: user.userId,
    subject: subject.trim(),
    body: body.trim(),
  });

  await auditLog.log({
    actor: user,
    action: 'CONTACT_MESSAGE_CREATE',
    entityType: 'ContactMessage',
    entityId: msg._id,
    description: `Student message: ${subject}`,
  });

  return msg;
}

// Student — list own
async function listMine(user) {
  if (!user.studentId) throw ApiError.forbidden();
  const [messages, student] = await Promise.all([
    ContactMessage.find({ studentId: user.studentId }).sort({ createdAt: -1 }),
    Student.findById(user.studentId).select('contactBlocked contactBlockedAt'),
  ]);
  return {
    messages,
    blocked: student?.contactBlocked || false,
    blockedAt: student?.contactBlockedAt || null,
  };
}
async function setBlocked(studentId, blocked, actor) {
  const student = await Student.findById(studentId);
  if (!student) throw ApiError.notFound('Student not found');

  student.contactBlocked = blocked;
  student.contactBlockedAt = blocked ? new Date() : null;
  student.contactBlockedBy = blocked ? actor.userId : null;
  await student.save();

  await auditLog.log({
    actor,
    action: blocked ? 'STUDENT_BLOCK_CONTACT' : 'STUDENT_UNBLOCK_CONTACT',
    entityType: 'Student',
    entityId: student._id,
    description: `${blocked ? 'Blocked' : 'Unblocked'} student ${student.rollNumber} from contacting admin`,
  });

  return student;
}
// Admin — unread count
async function unreadCount() {
  return ContactMessage.countDocuments({ isRead: false });
}

// Admin — mark one message as read
async function markRead(id) {
  await ContactMessage.findByIdAndUpdate(id, { isRead: true });
}

// Admin — mark all as read
async function markAllRead() {
  const r = await ContactMessage.updateMany({ isRead: false }, { isRead: true });
  return { modified: r.modifiedCount };
}

// Admin — list all
async function listAll({ status, q, page = 1, limit = 50 }) {
  const query = {};
  if (status) query.status = status;
  if (q) query.$or = [
    { subject: new RegExp(q, 'i') },
    { body: new RegExp(q, 'i') },
  ];

  const [items, total] = await Promise.all([
    ContactMessage.find(query)
      .populate('studentId', 'rollNumber name email year section contactBlocked contactBlockedAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    ContactMessage.countDocuments(query),
  ]);
  return { items, total, page, limit };
}

// Admin — get one (with full context)
async function getOne(id) {
  const m = await ContactMessage.findById(id)
    .populate('studentId', 'rollNumber name email year semester section batch contactBlocked contactBlockedAt');
  if (!m) throw ApiError.notFound('Message not found');
  return m;
}

// Admin — reply
async function reply(id, body, actor) {
  const m = await ContactMessage.findById(id).populate('studentId', 'rollNumber name email');
  if (!m) throw ApiError.notFound('Message not found');

  m.replies.push({ from: 'ADMIN', body: body.trim() });
  m.status = 'REPLIED';
  await m.save();

  // Notify the student ONLY
  const targetUser = await User.findOne({ studentId: m.studentId._id });
  if (targetUser) {
    await notification.fanOut({
      title: `Reply from Admin: ${m.subject}`,
      message: body.slice(0, 200),
      type: 'ACADEMIC_ALERT',
      recipientType: 'USER',
      filter: { userId: targetUser._id },
      createdBy: actor.userId,
      relatedEntity: 'ContactMessage',
      relatedEntityId: m._id,
    });
  }

  await auditLog.log({
    actor, action: 'CONTACT_MESSAGE_REPLY',
    entityType: 'ContactMessage', entityId: m._id,
    description: `Replied to ${m.studentId.rollNumber}`,
  });

  return m;
}

// Student — delete own message
async function removeOwn(id, user) {
  const m = await ContactMessage.findById(id);
  if (!m) throw ApiError.notFound('Message not found');
  if (String(m.studentId) !== String(user.studentId)) {
    throw ApiError.forbidden('You can only delete your own messages.');
  }
  await m.deleteOne();
  await auditLog.log({
    actor: user, action: 'CONTACT_MESSAGE_DELETE_SELF',
    entityType: 'ContactMessage', entityId: id,
    description: `Student deleted own message: ${m.subject}`,
  });
  return { ok: true };
}

// Admin — delete
async function remove(id, actor) {
  const m = await ContactMessage.findByIdAndDelete(id);
  if (!m) throw ApiError.notFound('Message not found');
  await auditLog.log({
    actor, action: 'CONTACT_MESSAGE_DELETE',
    entityType: 'ContactMessage', entityId: id,
  });
  return { ok: true };
}

module.exports = { createMessage, listMine, listAll, getOne, reply, remove, removeOwn, setBlocked, unreadCount, markRead, markAllRead };