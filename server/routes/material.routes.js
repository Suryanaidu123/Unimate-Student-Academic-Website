const router = require('express').Router();
const ctrl = require('../controllers/material.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { uploadMaterial } = require('../middleware/upload');

router.use(requireAuth);

// Faculty-specific helpers
router.get('/faculty/semesters', requireRole('FACULTY'), ctrl.mySemesters);
router.get('/faculty/subjects', requireRole('FACULTY'), ctrl.mySubjects);

// All authenticated users can list & download
router.get('/', ctrl.list);
router.get('/:id/download', ctrl.download);

// Upload: Admin + Faculty
router.post('/', requireRole('FACULTY', 'ADMIN'), uploadMaterial.single('file'), ctrl.upload);

// Delete: Admin + Faculty
router.delete('/:id', requireRole('FACULTY', 'ADMIN'), ctrl.remove);

module.exports = router;