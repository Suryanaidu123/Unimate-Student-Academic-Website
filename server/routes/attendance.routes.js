const router = require('express').Router();
const ctrl = require('../controllers/attendance.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { requireAttendanceWindow } = require('../middleware/attendanceWindow');

router.use(requireAuth);

// Student
router.get('/my', requireRole('STUDENT'), ctrl.myAttendance);

// Freeze status — anyone authenticated
router.get('/freeze-status', ctrl.freezeStatus);

// Sessions list — staff/admin/faculty
router.get('/sessions', requireRole('ATTENDANCE_STAFF', 'ADMIN', 'FACULTY'), ctrl.listSessions);
router.get('/sessions/:id', requireRole('ATTENDANCE_STAFF', 'ADMIN', 'FACULTY'), ctrl.getSession);

// COP/Admin: record attendance — time window enforced
router.post('/conduct',
  requireRole('ATTENDANCE_STAFF', 'ADMIN'),
  requireAttendanceWindow,
  ctrl.conduct
);
router.post('/conduct-bulk',
  requireRole('ATTENDANCE_STAFF', 'ADMIN'),
  requireAttendanceWindow,
  ctrl.conductBulk
);

// Year-wise summary
router.get('/year-summary',
  requireRole('ATTENDANCE_STAFF', 'ADMIN', 'FACULTY'),
  ctrl.yearSummary
);

// Student detail (staff/admin/faculty)
router.get('/student/:studentId',
  requireRole('ATTENDANCE_STAFF', 'ADMIN', 'FACULTY'),
  ctrl.studentAttendance
);

// Freeze / Resume — ADMIN and ATTENDANCE_STAFF both
router.post('/freeze', requireRole('ADMIN', 'ATTENDANCE_STAFF'), ctrl.freeze);
router.post('/resume', requireRole('ADMIN', 'ATTENDANCE_STAFF'), ctrl.resume);

// Delete a session (admin only — for corrections)
router.delete('/sessions/:id', requireRole('ADMIN'), ctrl.deleteSession);

module.exports = router;