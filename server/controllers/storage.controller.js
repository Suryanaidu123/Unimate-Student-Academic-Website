const { success } = require('../utils/apiResponse');
const mongoose = require('mongoose');

const CAPACITY_BYTES = 512 * 1024 * 1024; // 512 MB Atlas M0 free tier

exports.stats = async (_req, res, next) => {
  try {
    const db = mongoose.connection.db;
    let totalBytes = 0;

    // Try Atlas-native command first
    try {
      const result = await db.command({ atlasSize: 1 });
      totalBytes = result.atlasSize || 0;
    } catch {
      // Fallback: sum db.stats() dataSize + indexSize
      const stats = await db.stats();
      totalBytes = (stats.dataSize || 0) + (stats.indexSize || 0);
    }

    const usedBytes = Math.min(totalBytes, CAPACITY_BYTES);
    const remainingBytes = Math.max(CAPACITY_BYTES - usedBytes, 0);
    const usagePercent = Math.round((usedBytes / CAPACITY_BYTES) * 1000) / 10;

    return success(res, {
      capacityMB: 512,
      usedMB: Math.round(usedBytes / (1024 * 1024) * 100) / 100,
      remainingMB: Math.round(remainingBytes / (1024 * 1024) * 100) / 100,
      usagePercent,
    });
  } catch (e) { next(e); }
};