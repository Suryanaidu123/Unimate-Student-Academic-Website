const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/students', require('./student.routes'));
router.use('/faculty', require('./faculty.routes'));
router.use('/subjects', require('./subject.routes'));
router.use('/marks', require('./marks.routes'));
router.use('/notes', require('./note.routes'));
router.use('/assignments', require('./assignment.routes'));
router.use('/timetable', require('./timetable.routes'));
router.use('/exams', require('./exam.routes'));
router.use('/notifications', require('./notification.routes'));
router.use('/admin/bulk-students', require('./bulkStudent.routes'));
router.use('/dashboard', require('./dashboard.routes'));
router.use('/contact', require('./contact.routes'));
router.use('/lookup', require('./lookup.routes'));
router.use('/materials', require('./material.routes'));
module.exports = router;