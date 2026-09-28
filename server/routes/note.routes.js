const router = require('express').Router();
const ctrl = require('../controllers/note.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

router.use(requireAuth);
router.get('/', ctrl.list);

router.use(requireRole('FACULTY', 'ADMIN'));
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/publish', ctrl.publish);

module.exports = router;