const router = require('express').Router();
const ctrl = require('../controllers/subject.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { validate } = require('../middleware/validate');
const { createSubjectSchema, updateSubjectSchema } = require('../validators/subject.validator');

router.use(requireAuth);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);

router.use(requireRole('ADMIN'));
router.post('/', validate(createSubjectSchema), ctrl.create);
router.put('/:id', validate(updateSubjectSchema), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;