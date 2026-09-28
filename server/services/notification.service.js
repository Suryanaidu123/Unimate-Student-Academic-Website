const Notification = require('../models/Notification.model');
const User = require('../models/User.model');
const Student = require('../models/Student.model');

/**
 * Fan out a notification to matching users by resolving recipients.
 */
async function fanOut({ title, message, type, recipientType, filter = {}, createdBy, relatedEntity, relatedEntityId }) {
  // Resolve target users
  let userIds = [];

  if (recipientType === 'ALL_STUDENTS' || recipientType === 'ALL_FACULTY') {
    const role = recipientType === 'ALL_STUDENTS' ? 'STUDENT' : 'FACULTY';
    const users = await User.find({ role, status: 'ACTIVE' }).select('_id');
    userIds = users.map((u) => u._id);
  } else if (recipientType === 'USER' && filter.userId) {
    userIds = [filter.userId];
  } else {
    // Y / SEMESTER / SECTION / BATCH → student based
    const studentQuery = {};
    if (filter.year) studentQuery.year = filter.year;
    if (filter.semester) studentQuery.semester = filter.semester;
    if (filter.section) studentQuery.section = filter.section;
    if (filter.batch) studentQuery.batch = filter.batch;
    const students = await Student.find(studentQuery).select('_id');
    const users = await User.find({ role: 'STUDENT', studentId: { $in: students.map((s) => s._id) } }).select('_id');
    userIds = users.map((u) => u._id);
  }

  if (!userIds.length) return { count: 0 };

  const docs = userIds.map((recipientId) => ({
    title, message, type, recipientType, recipientId,
    departmentId: filter.departmentId,
    year: filter.year,
    semesterId: filter.semesterId,
    section: filter.section,
    batch: filter.batch,
    relatedEntity,
    relatedEntityId,
    createdBy,
  }));

  const inserted = await Notification.insertMany(docs, { ordered: false });
  return { count: inserted.length };
}

async function listForUser(userId, { unreadOnly, type, page = 1, limit = 20 }) {
  const query = { recipientId: userId };
  if (unreadOnly) query.isRead = false;
  if (type) query.type = type;

  const [items, total] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Notification.countDocuments(query),
  ]);
  return { items, total, page, limit };
}

async function unreadCount(userId) {
  return Notification.countDocuments({ recipientId: userId, isRead: false });
}

async function markRead(userId, id) {
  return Notification.findOneAndUpdate({ _id: id, recipientId: userId }, { isRead: true }, { new: true });
}

async function markAllRead(userId) {
  const r = await Notification.updateMany({ recipientId: userId, isRead: false }, { isRead: true });
  return { modified: r.modifiedCount };
}

async function remove(userId, id) {
  return Notification.findOneAndDelete({ _id: id, recipientId: userId });
}

async function createManual({ title, message, type, recipientType, filter = {}, year, createdBy }) {
  // Merge year into filter for convenience
  const merged = { ...filter };
  if (year) merged.year = Number(year);
  return fanOut({
    title,
    message,
    type,
    recipientType,
    filter: merged,
    createdBy,
  });
}

module.exports = { fanOut, listForUser, unreadCount, markRead, markAllRead, remove, createManual };