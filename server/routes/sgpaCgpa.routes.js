const router = require('express').Router();
const ctrl   = require('../controllers/sgpaCgpa.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.use(requireAuth);

// ── Student ───────────────────────────────────────────────────────────────────
router.get('/my-activation',    requireRole('STUDENT'), ctrl.getMyActivation);
router.get('/my',               requireRole('STUDENT'), ctrl.getMyRecord);
router.post('/submit-sgpa',     requireRole('STUDENT'), ctrl.submitSgpa);
router.post('/submit-cgpa',     requireRole('STUDENT'), ctrl.submitCgpa);
router.post('/submit-failed',   requireRole('STUDENT'), ctrl.submitFailedSubjects);

// Legacy student endpoint (old page used /submit)
router.post('/submit',          requireRole('STUDENT'), ctrl.submit);

// ── Admin / Faculty ───────────────────────────────────────────────────────────
router.get('/activations',                            requireRole('ADMIN', 'FACULTY'), ctrl.getActivations);
// New semester-wise activation
router.put('/activations/semester/:year/:semester',   requireRole('ADMIN', 'FACULTY'), ctrl.setSemesterActivation);
router.put('/activations/cgpa/:year',                 requireRole('ADMIN', 'FACULTY'), ctrl.setCgpaActivation);
// Legacy year-level activation (used by old toggle UI)
router.put('/activations/:year',                      requireRole('ADMIN', 'FACULTY'), ctrl.setActivation);
// Tracking
router.get('/tracking/:year',                         requireRole('ADMIN', 'FACULTY'), ctrl.getTracking);

// ── Admin-only ────────────────────────────────────────────────────────────────
router.patch('/admin/:studentId/clear-sem/:semester', requireRole('ADMIN', 'FACULTY'), ctrl.clearSemesterEntry);
router.patch('/admin/:studentId/clear-cgpa',          requireRole('ADMIN', 'FACULTY'), ctrl.clearCgpaEntry);
router.delete('/admin/:studentId',                    requireRole('ADMIN', 'FACULTY'), ctrl.deleteRecord);

// Legacy admin routes (kept for old inline calls in SgpaCgpa.jsx)
router.patch('/submission/:studentId/clear-cgpa',     requireRole('ADMIN', 'FACULTY'), ctrl.clearCgpa);
router.delete('/submission/:studentId',               requireRole('ADMIN', 'FACULTY'), ctrl.deleteSubmission);

module.exports = router;
