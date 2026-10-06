const router = require('express').Router();
const ctrl   = require('../controllers/sgpaCgpa.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.use(requireAuth);

// Student
router.post('/submit',     requireRole('STUDENT'), ctrl.submit);
router.get('/my',          requireRole('STUDENT'), ctrl.getMySubmission);
router.get('/my-activation', requireRole('STUDENT'), ctrl.getMyActivation);

// Admin / Faculty
router.get('/activations',          requireRole('ADMIN', 'FACULTY'), ctrl.getActivations);
router.put('/activations/:year',    requireRole('ADMIN', 'FACULTY'), ctrl.setActivation);
router.get('/tracking/:year',       requireRole('ADMIN', 'FACULTY'), ctrl.getTracking);
// Admin: clear individual submission fields
router.patch('/submission/:studentId/clear-cgpa', requireRole('ADMIN'), ctrl.clearCgpa);
router.delete('/submission/:studentId',           requireRole('ADMIN'), ctrl.deleteSubmission);

module.exports = router;
