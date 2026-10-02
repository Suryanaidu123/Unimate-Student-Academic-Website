const multer = require('multer');

function fileFilter(_req, file, cb) {
  if (file.mimetype === 'application/pdf' ||
      file.originalname.toLowerCase().endsWith('.pdf')) {
    return cb(null, true);
  }
  cb(new Error('Only PDF files are allowed'));
}

const uploadMaterial = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 40 * 1024 * 1024 },
});

module.exports = { uploadMaterial };