const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'materials');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, unique);
  },
});

function fileFilter(_req, file, cb) {
  if (file.mimetype === 'application/pdf' ||
      file.originalname.toLowerCase().endsWith('.pdf')) {
    return cb(null, true);
  }
  cb(new Error('Only PDF files are allowed'));
}

const uploadMaterial = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

module.exports = { uploadMaterial, UPLOAD_DIR };