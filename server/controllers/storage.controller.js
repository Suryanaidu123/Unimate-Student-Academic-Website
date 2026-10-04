const { success } = require('../utils/apiResponse');
const mongoose = require('mongoose');
const { getStorageUsage } = require('../utils/storage');
const downloadStats = require('../services/downloadStats.service');

const MONGO_CAPACITY_BYTES = 512 * 1024 * 1024;
const B2_CAPACITY_BYTES = 10 * 1024 * 1024 * 1024;
const DOWNLOAD_WARN_BYTES = 600 * 1024 * 1024;

exports.mongoStats = async (_req, res, next) => {
  try {
    const db = mongoose.connection.db;
    let totalBytes = 0, raw = null;
    try {
      raw = await db.command({ atlasSize: 1 });
      totalBytes = Number(raw.atlasSize || 0);
    } catch {
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

exports.b2Stats = async (_req, res, next) => {
  try {
    const usage = await getStorageUsage();
    const usedBytes = Math.min(usage.totalBytes, B2_CAPACITY_BYTES);
    const remainingBytes = Math.max(B2_CAPACITY_BYTES - usedBytes, 0);
    const usagePercent = Math.round((usedBytes / B2_CAPACITY_BYTES) * 1000) / 10;

    return success(res, {
      provider: 'Backblaze B2',
      configured: true,
      capacityMB: 10240,
      usedMB: Math.round((usedBytes / (1024 * 1024)) * 100) / 100,
      remainingMB: Math.round((remainingBytes / (1024 * 1024)) * 100) / 100,
      usagePercent,
      fileCount: usage.fileCount,
      buckets: [{
        name: process.env.B2_BUCKET || 'unimate-materials',
        fileCount: usage.fileCount,
        totalBytes: usage.totalBytes,
      }],
    });
  } catch (e) { next(e); }
};

exports.downloadStats = async (_req, res, next) => {
  try {
    const today = await downloadStats.todayTotal();
    const daily = await downloadStats.dailyTotals(7);
    const todayBytes = today.bytes;

    return success(res, {
      today: {
        bytes: todayBytes,
        mb: Math.round((todayBytes / (1024 * 1024)) * 100) / 100,
        count: today.count,
        warning: todayBytes >= DOWNLOAD_WARN_BYTES,
        warningThresholdMB: 600,
      },
      last7Days: daily.map((d) => ({
        date: d.date,
        bytes: d.bytes,
        mb: Math.round((d.bytes / (1024 * 1024)) * 100) / 100,
        count: d.count,
      })),
    });
  } catch (e) { next(e); }
};
exports.deleteActivity = async (req, res, next) => {
  try {
    const data = await downloadStats.deleteEvent(req.params.id, req.user);
    return success(res, data, 'History record deleted');
  } catch (e) { next(e); }
};

exports.deleteAllActivity = async (req, res, next) => {
  try {
    const data = await downloadStats.deleteAll(req.user);
    return success(res, data, `Deleted ${data.deleted} history record(s)`);
  } catch (e) { next(e); }
};
exports.activity = async (req, res, next) => {
  try {
    const data = await downloadStats.activityHistory({
      action: req.query.action,
      year: req.query.year,
      role: req.query.role,
      q: req.query.q,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 50,
    });
    return success(res, data);
  } catch (e) { next(e); }
};