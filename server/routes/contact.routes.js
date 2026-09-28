const router = require('express').Router();
const ctrl = require('../controllers/contact.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.use(requireAuth);

// Student
router.post('/', requireRole('STUDENT'), ctrl.create);
router.get('/mine', requireRole('STUDENT'), ctrl.listMine);

// Admin
router.get('/', requireRole('ADMIN'), ctrl.listAll);
router.get('/:id', requireRole('ADMIN'), ctrl.getOne);
router.post('/:id/reply', requireRole('ADMIN'), ctrl.reply);
router.delete('/:id', requireRole('ADMIN'), ctrl.remove);

module.exports = router;