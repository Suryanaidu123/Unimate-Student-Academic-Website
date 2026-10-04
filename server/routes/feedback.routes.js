const router = require('express').Router();
const ctrl = require('../controllers/feedback.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.use(requireAuth);

router.post('/', requireRole('STUDENT', 'FACULTY'), ctrl.submit);
router.get('/mine', requireRole('STUDENT', 'FACULTY'), ctrl.listMine);
router.put('/mark-all-read', requireRole('ADMIN'), ctrl.markAllRead);
router.get('/unread-count', requireRole('ADMIN'), ctrl.unreadCount);
router.get('/', requireRole('ADMIN'), ctrl.listAll);
router.get('/:id', requireRole('ADMIN'), ctrl.getOne);
router.put('/:id', requireRole('ADMIN'), ctrl.update);
router.delete('/:id', requireRole('ADMIN'), ctrl.remove);

module.exports = router;