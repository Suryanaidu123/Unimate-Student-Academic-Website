const router = require('express').Router();
const ctrl = require('../controllers/notification.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.use(requireAuth);
router.get('/', ctrl.list);
router.get('/unread-count', ctrl.unreadCount);
router.put('/read-all', ctrl.markAllRead);
router.put('/:id/read', ctrl.markRead);
router.delete('/:id', ctrl.remove);

router.post('/', requireRole('ADMIN'), ctrl.create);

module.exports = router;