const router = require('express').Router();
const ctrl = require('../controllers/notification.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.use(requireAuth);

router.get('/', ctrl.list);
router.get('/unread-count', ctrl.unreadCount);
router.get('/exam-notifications', ctrl.myExamNotifications);   // ← NEW
router.put('/read-all', ctrl.markAllRead);
router.put('/:id/read', ctrl.markRead);
router.delete('/:id', ctrl.remove);

// Admin + Faculty can send
router.post('/', requireRole('ADMIN', 'FACULTY'), ctrl.create);

module.exports = router;