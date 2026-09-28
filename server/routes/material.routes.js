const router = require('express').Router();
const ctrl = require('../controllers/material.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { uploadMaterial } = require('../middleware/upload');

router.use(requireAuth);

router.get('/', ctrl.list);
router.get('/:id/download', ctrl.download);

router.post(
  '/',
  requireRole('FACULTY', 'ADMIN'),
  uploadMaterial.single('file'),
  ctrl.upload
);

router.delete('/:id', requireRole('FACULTY', 'ADMIN'), ctrl.remove);

module.exports = router;