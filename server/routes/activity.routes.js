const router = require('express').Router();
const ctrl   = require('../controllers/activity.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.use(requireAuth);

// Student-specific routes (before generic /:id)
router.get('/student/mine',      requireRole('STUDENT'), ctrl.listForStudent);
router.get('/student/active',    requireRole('STUDENT'), ctrl.getActiveForStudent);
router.post('/:id/respond',      requireRole('STUDENT'), ctrl.respond);

// Faculty active activities (for their dashboard marquee)
router.get('/faculty/active',    requireRole('FACULTY', 'ADMIN'), ctrl.getActiveForFaculty);

// Admin / Faculty CRUD
router.get('/',    requireRole('ADMIN', 'FACULTY'), ctrl.list);
router.post('/',   requireRole('ADMIN', 'FACULTY'), ctrl.create);
router.get('/:id', requireRole('ADMIN', 'FACULTY'), ctrl.getById);
router.put('/:id', requireRole('ADMIN', 'FACULTY'), ctrl.update);
router.delete('/:id', requireRole('ADMIN', 'FACULTY'), ctrl.remove);

module.exports = router;
