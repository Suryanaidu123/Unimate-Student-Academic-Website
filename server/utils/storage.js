const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const env = require('../config/env');

if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
  console.warn('⚠️  Supabase credentials missing — material uploads will fail.');
}

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const BUCKET = env.SUPABASE_BUCKET;

/**
 * Upload a PDF buffer to Supabase Storage.
 * Returns { key, fileName } where `key` is the object path inside the bucket.
 */
async function uploadPdf(buffer, originalName) {
  // ✅ Generate a clean key — no bucket prefix, no leading slash, no special chars
  const key = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.pdf`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(key, buffer, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (error) {
    console.error('Supabase upload error:', error);
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  // The path is what you store in MongoDB
  return { key: data.path, fileName: originalName };
}

/**
 * Delete an object from Supabase Storage by key.
 */
async function deleteFile(key) {
  try {
    const { error } = await supabase.storage.from(BUCKET).remove([key]);
    if (error) console.error('Supabase delete error:', error.message);
  } catch (e) {
    console.error('Supabase delete failed:', e.message);
  }
}

/**
 * Generate a signed URL (valid 1 hour) that lets the user view or download the file.
 * `mode` = 'inline' (view) or 'attachment' (download).
 */
async function getSignedDownloadUrl(key, originalName = 'document.pdf', mode = 'inline') {
  const options = mode === 'attachment'
    ? { download: originalName }
    : {};

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(key, 60 * 60, options);

  if (error) {
    console.error('Supabase signed URL error:', error);
    throw new Error(`Supabase signed URL failed: ${error.message}`);
  }
  return data.signedUrl;
}

module.exports = { uploadPdf, deleteFile, getSignedDownloadUrl };