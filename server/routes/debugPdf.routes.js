/**
 * TEMPORARY DEBUG ROUTE — remove after diagnosing PDF parsing issue.
 * POST /api/debug-pdf   (multipart, field name: "file")
 * Returns the raw text extracted by pdf-parse, split into lines and tokens.
 */
const router = require('express').Router();
const multer = require('multer');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { success } = require('../utils/apiResponse');
const ApiError = require('../utils/ApiError');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/', requireAuth, requireRole('FACULTY', 'ADMIN'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) throw ApiError.badRequest('No file uploaded');
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(req.file.buffer);
    const rawText = data.text || '';

    const lines = rawText.split(/\r?\n/).map((l, i) => ({
      lineIndex: i,
      raw: l,
      trimmed: l.trim(),
      // Strategy A: split on 2+ spaces / tabs / pipe
      tokensA: l.trim().split(/[\t|]+|\s{2,}/).map(t => t.trim()).filter(t => t.length > 0),
      // Strategy B: split on single space
      tokensB: l.trim().split(/\s+/).filter(t => t.length > 0),
    })).filter(l => l.trimmed.length > 0);

    return success(res, { rawText, lines });
  } catch (e) { next(e); }
});

module.exports = router;
