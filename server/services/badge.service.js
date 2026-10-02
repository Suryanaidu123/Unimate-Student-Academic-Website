const Notification = require('../models/Notification.model');
const Student = require('../models/Student.model');

// Which notification types belong to which section
const SECTION_TYPES = {
  exams: ['EXAM_SCHEDULED', 'EXAM_APPROACHING'],
  materials: ['NEW_NOTES_PUBLISHED'],
  assignments: ['ASSIGNMENT_CREATED', 'ASSIGNMENT_DUE_SOON', 'ASSIGNMENT_OVERDUE'],
  timetable: ['TIMETABLE_UPDATED'],
  marks: ['MARKS_PUBLISHED'],
  notifications: null, // "everything else unread"
};

async function getBadges(user) {
  if (!user.studentId) return {};

  const student = await Student.findById(user.studentId);
  if (!student) return {};

  const read = student.sectionReadAt || {};
  const result = {};

  for (const [section, types] of Object.entries(SECTION_TYPES)) {
    if (section === 'notifications') {
      // Notifications section = unread notifications NOT belonging to any other section
      const otherTypes = Object.values(SECTION_TYPES)
        .filter((v) => v)
        .flat();
      const query = {
        recipientId: user.userId,
        isRead: false,
        type: { $nin: otherTypes },
      };
      result[section] = await Notification.countDocuments(query);
    } else {
      const since = read[section] || new Date(0);
      const query = {
        recipientId: user.userId,
        type: { $in: types },
        createdAt: { $gt: since },
      };
      result[section] = await Notification.countDocuments(query);
    }
  }

  return result;
}

async function markSectionRead(user, section) {
  if (!user.studentId) return;
  const valid = ['exams', 'materials', 'assignments', 'timetable', 'marks', 'notifications'];
  if (!valid.includes(section)) return;
  await Student.updateOne(
    { _id: user.studentId },
    { $set: { [`sectionReadAt.${section}`]: new Date() } }
  );
}

module.exports = { getBadges, markSectionRead, SECTION_TYPES };