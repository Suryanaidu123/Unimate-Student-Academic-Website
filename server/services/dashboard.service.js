const Student = require('../models/Student.model');
const Faculty = require('../models/Faculty.model');
const Subject = require('../models/Subject.model');
const Marks = require('../models/Marks.model');
const Assignment = require('../models/Assignment.model');
const Exam = require('../models/Exam.model');
const Notification = require('../models/Notification.model');
const Note = require('../models/Note.model');
const AuditLog = require('../models/AuditLog.model');

async function studentDashboard(userId, studentId) {
  const student = await Student.findById(studentId);
  const subjects = await Subject.find({ year: student.year }).populate('facultyId', 'name');
  const marks = await Marks.find({ studentId, status: { $in: ['PUBLISHED', 'LOCKED'] } }).populate('subjectId', 'subjectName subjectCode');
  const assignments = await Assignment.find({ section: student.section, status: 'PUBLISHED', dueDate: { $gte: new Date() } })
    .populate('subjectId', 'subjectName').sort({ dueDate: 1 }).limit(5);
  const exams = await Exam.find({ year: student.year, section: student.section, date: { $gte: new Date() } })
    .populate('subjectId', 'subjectName').sort({ date: 1 }).limit(5);
  const unread = await Notification.countDocuments({ recipientId: userId, isRead: false });
  const recentNotes = await Note.find({ status: 'PUBLISHED' }).populate('subjectId', 'subjectName').sort({ publishedAt: -1 }).limit(5);

  return { student, subjects, marks, assignments, exams, unread, recentNotes };
}

async function facultyDashboard(userId, facultyId) {
  const faculty = await Faculty.findById(facultyId);
  const subjects = await Subject.find({ facultyId });

  // Unique years this faculty teaches
  const years = [...new Set(subjects.map((s) => s.year))].sort((a, b) => a - b);

  const studentCount = await Student.countDocuments({ year: { $in: years } });

  const assignments = await Assignment.find({ facultyId })
    .sort({ createdAt: -1 })
    .limit(5);

  const exams = await Exam.find({ year: { $in: years } })
    .populate('subjectId', 'subjectName subjectCode')
    .sort({ date: 1 })
    .limit(5);

  const unread = await Notification.countDocuments({ recipientId: userId, isRead: false });

  return { faculty, subjects, years, studentCount, assignments, exams, unread };
}

async function adminDashboard() {
  const [
    totalStudents, secondYear, thirdYear, fourthYear,
    totalFaculty, totalSubjects, totalLabs, totalActivities,
    totalBatches, totalSections,
  ] = await Promise.all([
    Student.countDocuments(),
    Student.countDocuments({ year: 2 }),
    Student.countDocuments({ year: 3 }),
    Student.countDocuments({ year: 4 }),
    Faculty.countDocuments(),
    Subject.countDocuments({ type: 'THEORY' }),
    Subject.countDocuments({ type: 'LAB' }),
    Subject.countDocuments({ type: 'ACTIVITY' }),
    require('../models/Batch.model').countDocuments(),
    require('../models/Section.model').countDocuments(),
  ]);

  const recentActivity = await AuditLog.find().sort({ createdAt: -1 }).limit(10).populate('actorUserId', 'email role');

  return {
    totalStudents, secondYear, thirdYear, fourthYear,
    totalFaculty, totalSubjects, totalLabs, totalActivities,
    totalBatches, totalSections,
    recentActivity,
  };
}

module.exports = { studentDashboard, facultyDashboard, adminDashboard };