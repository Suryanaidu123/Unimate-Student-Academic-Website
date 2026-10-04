const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const env = require('../config/env');

if (!env.B2_KEY_ID || !env.B2_APPLICATION_KEY || !env.B2_ENDPOINT) {
  console.warn('⚠️  Backblaze B2 credentials missing — material uploads will fail.');
}

const s3 = new S3Client({
  region: env.B2_REGION,
  endpoint: env.B2_ENDPOINT,
  credentials: {
    accessKeyId: env.B2_KEY_ID,
    secretAccessKey: env.B2_APPLICATION_KEY,
  },
  forcePathStyle: true,
});

const BUCKET = env.B2_BUCKET;

async function uploadPdf(buffer, originalName) {
  const key = `materials/${Date.now()}-${crypto.randomBytes(8).toString('hex')}.pdf`;

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: 'application/pdf',
  }));

  return { key, fileName: originalName };
}

async function deleteFile(key) {
  try {
    await s3.send(new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }));
  } catch (e) {
    console.error('B2 delete failed:', e.message);
  }
}

async function getSignedDownloadUrl(key, originalName = 'document.pdf', mode = 'inline') {
  const cmd = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ResponseContentDisposition: `${mode}; filename="${encodeURIComponent(originalName)}"`,
  });
  return getSignedUrl(s3, cmd, { expiresIn: 60 * 60 });
}

/**
 * Walk the bucket and sum every object's size.
 * B2 S3-compatible list returns up to 1000 objects per page.
 * For a college project this is usually a single call.
 */
async function getStorageUsage() {
  let totalBytes = 0;
  let fileCount = 0;
  let continuationToken;

  do {
    const res = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      ContinuationToken: continuationToken,
    }));

    (res.Contents || []).forEach((obj) => {
      totalBytes += Number(obj.Size || 0);
      fileCount += 1;
    });

    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);

  return { totalBytes, fileCount };
}

module.exports = {
  uploadPdf,
  deleteFile,
  getSignedDownloadUrl,
  getStorageUsage,
};