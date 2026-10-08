const router = require('express').Router();
const ctrl = require('../controllers/bulkStudent.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.use(requireAuth, requireRole('ADMIN'));

router.get('/series', ctrl.listSeries);
router.put('/series/:year', ctrl.updateSeries);
router.get('/preview/:year', ctrl.preview);
router.post('/generate', ctrl.generate);
router.post('/import', ctrl.importStudents);

module.exports = router;