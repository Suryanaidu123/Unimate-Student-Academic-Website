const router = require('express').Router();
const ctrl = require('../controllers/storage.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.use(requireAuth, requireRole('ADMIN'));
router.get('/stats', ctrl.stats);

module.exports = router;