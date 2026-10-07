const router = require('express').Router();
const ctrl = require('../controllers/contact.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.use(requireAuth);

// Student
router.post('/', requireRole('STUDENT'), ctrl.create);
router.get('/mine', requireRole('STUDENT'), ctrl.listMine);
router.delete('/mine/:id', requireRole('STUDENT'), ctrl.removeOwn);

// Admin
router.get('/unread-count',        requireRole('ADMIN'), ctrl.unreadCount);
router.put('/mark-all-read',       requireRole('ADMIN'), ctrl.markAllRead);
router.get('/',                    requireRole('ADMIN'), ctrl.listAll);
router.get('/:id',                 requireRole('ADMIN'), ctrl.getOne);
router.put('/:id/mark-read',       requireRole('ADMIN'), ctrl.markRead);
router.post('/:id/reply',          requireRole('ADMIN'), ctrl.reply);
router.delete('/:id',              requireRole('ADMIN'), ctrl.remove);
router.post('/block/:studentId',   requireRole('ADMIN'), ctrl.block);
router.post('/unblock/:studentId', requireRole('ADMIN'), ctrl.unblock);
module.exports = router;