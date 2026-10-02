const { success } = require('../utils/apiResponse');
const mongoose = require('mongoose');

// MongoDB Atlas free tier (M0) has a 512 MB storage limit
const CAPACITY_BYTES = 512 * 1024 * 1024;

exports.stats = async (_req, res, next) => {
  try {
    const db = mongoose.connection.db;

    // Use the Atlas-specific command — this is the accurate source of truth
    // for M0/Flex clusters. It returns dataSize + indexSize combined.
    let totalBytes = 0;
    let raw = null;

    try {
      raw = await db.command({ atlasSize: 1 });
      // atlasSize = total data + index size across all databases
      totalBytes = Number(raw.atlasSize || 0);
    } catch (err) {
      // Fallback for non-Atlas or older setups
      console.warn('atlasSize command failed, falling back to db.stats():', err.message);
      const stats = await db.stats();
      totalBytes = (stats.dataSize || 0) + (stats.indexSize || 0);
    }

    const usedBytes = Math.min(totalBytes, CAPACITY_BYTES);
    const remainingBytes = Math.max(CAPACITY_BYTES - usedBytes, 0);
    const usagePercent = Math.round((usedBytes / CAPACITY_BYTES) * 1000) / 10;

    return success(res, {
      capacityMB: 512,
      usedMB: Math.round((usedBytes / (1024 * 1024)) * 100) / 100,
      remainingMB: Math.round((remainingBytes / (1024 * 1024)) * 100) / 100,
      usagePercent,
      // Extra detail so you can see what's happening
      dataSizeBytes: raw?.totals?.dataSize || null,
      indexSizeBytes: raw?.totals?.indexSize || null,
      storageSizeBytes: raw?.totals?.storageSize || null,
      collections: raw?.totals?.collections || null,
      objects: raw?.totals?.objects || null,
    });
  } catch (e) {
    next(e);
  }
};