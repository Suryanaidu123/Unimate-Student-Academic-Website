const router = require('express').Router();
const ctrl = require('../controllers/faculty.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { validate } = require('../middleware/validate');
const {
  createFacultyStubSchema,
  updateFacultySchema,
} = require('../validators/faculty.validator');

// Faculty self
router.get('/me', requireAuth, requireRole('FACULTY'), ctrl.me);

// Admin-only management
router.use(requireAuth, requireRole('ADMIN'));

router.get('/', ctrl.list);
router.post('/', validate(createFacultyStubSchema), ctrl.create);
router.get('/:id', ctrl.getById);
router.put('/:id', validate(updateFacultySchema), ctrl.update);
router.patch('/:id/status', ctrl.setStatus);
router.patch('/:id/permissions', ctrl.setPermissions);
router.delete('/:id', ctrl.remove);

module.exports = router;