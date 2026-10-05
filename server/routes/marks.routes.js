const router = require('express').Router();
const multer = require('multer');
const ctrl = require('../controllers/marks.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { validate } = require('../middleware/validate');
const { upsertMarksSchema } = require('../validators/marks.validator');

// Multer instance for marks file imports (Excel / CSV only, max 10 MB, memory only)
const uploadMarks = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel',                                           // .xls
      'text/csv',
      'application/csv',
    ];
    const ext = (file.originalname || '').split('.').pop().toLowerCase();
    const extOk = ['xlsx', 'xls', 'csv'].includes(ext);
    if (allowed.includes(file.mimetype) || extOk) return cb(null, true);
    cb(new Error('Only .xlsx, .xls, or .csv files are accepted.'));
  },
});

router.use(requireAuth);

router.get('/my',  requireRole('STUDENT'),          ctrl.my);
router.get('/',    requireRole('FACULTY', 'ADMIN'),  ctrl.list);
router.get('/:id',                                   ctrl.getById);

// Bulk import preview (file upload) — must come before /:id routes
router.post(
  '/import-preview',
  requireRole('FACULTY', 'ADMIN'),
  uploadMarks.single('file'),
  ctrl.importPreview
);

router.post('/bulk',       requireRole('FACULTY', 'ADMIN'),                           ctrl.bulkUpsert);
router.post('/',           requireRole('FACULTY', 'ADMIN'), validate(upsertMarksSchema), ctrl.upsert);
router.post('/:id/publish',   requireRole('FACULTY', 'ADMIN'),                          ctrl.publish);
router.post('/:id/unpublish', requireRole('FACULTY', 'ADMIN'),                          ctrl.unpublish);
router.post('/:id/lock',    requireRole('ADMIN'),                                     ctrl.lock);
router.post('/:id/unlock',  requireRole('ADMIN'),                                     ctrl.unlock);
router.delete('/:id',       requireRole('FACULTY', 'ADMIN'),                          ctrl.remove);

module.exports = router;
