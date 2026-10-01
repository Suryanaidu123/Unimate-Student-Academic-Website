const router = require('express').Router();
const ctrl = require('../controllers/semester.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.use(requireAuth, requireRole('ADMIN'));
router.get('/status', ctrl.status);
router.post('/move', ctrl.move);

module.exports = router;