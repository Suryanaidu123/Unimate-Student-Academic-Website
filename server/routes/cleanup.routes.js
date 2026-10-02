const router = require('express').Router();
const ctrl = require('../controllers/cleanup.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.use(requireAuth, requireRole('ADMIN'));
router.post('/cleanup', ctrl.cleanup);

module.exports = router;