const router = require('express').Router();
const multer = require('multer');
const ctrl   = require('../controllers/studentDocument.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

// Accept PDF, JPG, PNG — max 10 MB
const uploadDoc = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const ext = (file.originalname || '').split('.').pop().toLowerCase();
    if (allowed.includes(file.mimetype) || ['pdf', 'jpg', 'jpeg', 'png'].includes(ext)) {
      return cb(null, true);
    }
    cb(new Error('Only PDF, JPG, or PNG files are allowed.'));
  },
});

router.use(requireAuth);

// Student
router.post('/',         requireRole('STUDENT'),             uploadDoc.single('file'), ctrl.upload);
router.get('/mine',      requireRole('STUDENT'),             ctrl.listMine);
router.delete('/:id',    requireRole('STUDENT'),             ctrl.deleteOwn);

// Shared — student / faculty / admin download
router.get('/:id/url',   requireRole('STUDENT', 'FACULTY', 'ADMIN'), ctrl.getUrl);

// Faculty — view documents for allowed years
router.get('/faculty/list', requireRole('FACULTY'),          ctrl.facultyList);

// Admin
router.get('/',           requireRole('ADMIN'),              ctrl.adminList);
router.put('/visibility/:facultyId', requireRole('ADMIN'),   ctrl.setFacultyVisibility);

module.exports = router;
