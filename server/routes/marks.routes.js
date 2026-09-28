const router = require('express').Router();
const ctrl = require('../controllers/marks.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { validate } = require('../middleware/validate');
const { upsertMarksSchema } = require('../validators/marks.validator');

router.use(requireAuth);
router.get('/my', requireRole('STUDENT'), ctrl.my);
router.get('/', requireRole('FACULTY', 'ADMIN'), ctrl.list);
router.get('/:id', ctrl.getById);

router.post('/', requireRole('FACULTY', 'ADMIN'), validate(upsertMarksSchema), ctrl.upsert);
router.post('/:id/publish', requireRole('FACULTY', 'ADMIN'), ctrl.publish);
router.post('/:id/lock', requireRole('ADMIN'), ctrl.lock);
router.post('/:id/unlock', requireRole('ADMIN'), ctrl.unlock);
router.delete('/:id', requireRole('FACULTY', 'ADMIN'), ctrl.remove);
module.exports = router;