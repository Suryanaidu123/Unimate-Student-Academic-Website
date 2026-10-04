const router = require('express').Router();
const ctrl = require('../controllers/staff.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.use(requireAuth, requireRole('ADMIN'));
router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.delete('/:id', ctrl.remove);

module.exports = router;