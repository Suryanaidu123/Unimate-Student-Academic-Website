const router = require('express').Router();
const ctrl = require('../controllers/faculty.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { validate } = require('../middleware/validate');
const { createFacultySchema, updateFacultySchema } = require('../validators/faculty.validator');

router.get('/me', requireAuth, requireRole('FACULTY'), ctrl.me);

router.use(requireAuth, requireRole('ADMIN'));
router.get('/', ctrl.list);
router.post('/', validate(createFacultySchema), ctrl.create);
router.get('/:id', ctrl.getById);
router.put('/:id', validate(updateFacultySchema), ctrl.update);
router.patch('/:id/status', ctrl.setStatus);
router.delete('/:id', ctrl.remove);   // ← NEW

module.exports = router;