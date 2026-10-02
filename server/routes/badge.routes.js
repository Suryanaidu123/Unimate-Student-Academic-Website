const router = require('express').Router();
const ctrl = require('../controllers/badge.controller');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);
router.get('/', ctrl.get);
router.post('/:section/read', ctrl.markRead);

module.exports = router;