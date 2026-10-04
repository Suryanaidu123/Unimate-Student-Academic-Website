const router = require('express').Router();
const ctrl = require('../controllers/storage.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.use(requireAuth, requireRole('ADMIN'));
router.delete('/activity/:id', ctrl.deleteActivity);
router.delete('/activity', ctrl.deleteAllActivity);
router.get('/stats', ctrl.mongoStats);
router.get('/b2-stats', ctrl.b2Stats);
router.get('/download-stats', ctrl.downloadStats);
router.get('/activity', ctrl.activity);

module.exports = router;