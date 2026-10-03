const { success } = require('../utils/apiResponse');
const mongoose = require('mongoose');
const { queryStorageUsage } = require('../utils/supabaseAdmin');

// MongoDB Atlas free tier: 512 MB
const MONGO_CAPACITY_BYTES = 512 * 1024 * 1024;

// Supabase Storage free tier: 1 GB
const SUPABASE_CAPACITY_BYTES = 1 * 1024 * 1024 * 1024;

exports.mongoStats = async (_req, res, next) => {
  try {
    const db = mongoose.connection.db;
    let totalBytes = 0;
    let raw = null;

    try {
      raw = await db.command({ atlasSize: 1 });
      totalBytes = Number(raw.atlasSize || 0);
    } catch (err) {
      console.warn('atlasSize command failed, falling back to db.stats():', err.message);
      const stats = await db.stats();
      totalBytes = (stats.dataSize || 0) + (stats.indexSize || 0);
    }

    const usedBytes = Math.min(totalBytes, MONGO_CAPACITY_BYTES);
    const remainingBytes = Math.max(MONGO_CAPACITY_BYTES - usedBytes, 0);
    const usagePercent = Math.round((usedBytes / MONGO_CAPACITY_BYTES) * 1000) / 10;

    return success(res, {
      provider: 'MongoDB Atlas',
      capacityMB: 512,
      usedMB: Math.round((usedBytes / (1024 * 1024)) * 100) / 100,
      remainingMB: Math.round((remainingBytes / (1024 * 1024)) * 100) / 100,
      usagePercent,
      collections: raw?.totals?.collections || null,
      objects: raw?.totals?.objects || null,
      indexSizeBytes: raw?.totals?.indexSize || null,
    });
  } catch (e) { next(e); }
};

exports.supabaseStats = async (_req, res, next) => {
  try {
    const usage = await queryStorageUsage();

    if (!usage) {
      return success(res, {
        provider: 'Supabase Storage',
        configured: false,
        message: 'SUPABASE_DB_URL is not configured.',
      });
    }

    const usedBytes = Math.min(usage.totalBytes, SUPABASE_CAPACITY_BYTES);
    const remainingBytes = Math.max(SUPABASE_CAPACITY_BYTES - usedBytes, 0);
    const usagePercent = Math.round((usedBytes / SUPABASE_CAPACITY_BYTES) * 1000) / 10;

    return success(res, {
      provider: 'Supabase Storage',
      configured: true,
      capacityMB: 1024,
      usedMB: Math.round((usedBytes / (1024 * 1024)) * 100) / 100,
      remainingMB: Math.round((remainingBytes / (1024 * 1024)) * 100) / 100,
      usagePercent,
      fileCount: usage.fileCount,
      bucketCount: usage.bucketCount,
      buckets: usage.buckets,
    });
  } catch (e) { next(e); }
};