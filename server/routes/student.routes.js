const router = require('express').Router();
const ctrl = require('../controllers/student.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { validate } = require('../middleware/validate');
const { createStudentSchema, updateStudentSchema } = require('../validators/student.validator');

router.get('/me', requireAuth, requireRole('STUDENT'), ctrl.me);

router.use(requireAuth, requireRole('ADMIN'));
router.get('/', ctrl.list);
router.post('/', validate(createStudentSchema), ctrl.create);
router.post('/bulk-import', ctrl.bulkImport);
router.get('/:id', ctrl.getById);
router.put('/:id', validate(updateStudentSchema), ctrl.update);
router.patch('/:id/status', ctrl.setStatus);

module.exports = router;