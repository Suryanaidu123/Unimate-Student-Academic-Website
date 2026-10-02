const router = require('express').Router();
const ctrl = require('../controllers/timetable.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.use(requireAuth);

router.get('/my', ctrl.my);
router.get('/', ctrl.list);

// Admin-only mutations
router.use(requireRole('ADMIN'));
router.post('/', ctrl.create);
router.post('/reset', ctrl.reset);   // ← NEW
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;