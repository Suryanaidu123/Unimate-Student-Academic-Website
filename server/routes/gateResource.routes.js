const router = require('express').Router();
const ctrl   = require('../controllers/gateResource.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { uploadMaterial } = require('../middleware/upload');

router.use(requireAuth);

// Student — published list + download URL
router.get('/student',        requireRole('STUDENT'),             ctrl.list);
router.get('/:id/download',   requireRole('STUDENT', 'FACULTY', 'ADMIN'), ctrl.download);

// Faculty / Admin — full management
router.get('/',    requireRole('FACULTY', 'ADMIN'), ctrl.listAll);
router.post('/',   requireRole('FACULTY', 'ADMIN'), uploadMaterial.single('file'), ctrl.create);
router.put('/:id', requireRole('FACULTY', 'ADMIN'), ctrl.update);
router.delete('/:id', requireRole('FACULTY', 'ADMIN'), ctrl.remove);

module.exports = router;
