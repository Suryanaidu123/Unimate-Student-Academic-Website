// server/utils/supabaseAdmin.js
const { Pool } = require('pg');
const env = require('../config/env');

// Supabase exposes Postgres on port 6543 (transaction pooler) or 5432 (direct)
// The connection string is available in Supabase → Project Settings → Database → Connection string (URI)
let pool = null;

function getPool() {
  if (pool) return pool;
  if (!env.SUPABASE_DB_URL) {
    console.warn('⚠️  SUPABASE_DB_URL is not set — Supabase storage stats will not work.');
    return null;
  }
  pool = new Pool({
    connectionString: env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
    max: 2,               // small pool — we only run occasional queries
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  return pool;
}

async function queryStorageUsage() {
  const p = getPool();
  if (!p) return null;

  const sql = `
    SELECT
      COUNT(*)::int AS file_count,
      COALESCE(SUM((metadata->>'size')::bigint), 0)::bigint AS total_bytes,
      COUNT(DISTINCT bucket_id)::int AS bucket_count
    FROM storage.objects;
  `;

  const { rows } = await p.query(sql);
  const row = rows[0] || { file_count: 0, total_bytes: 0, bucket_count: 0 };

  // Also break down by bucket (nice to have)
  const bucketSql = `
    SELECT
      bucket_id,
      COUNT(*)::int AS file_count,
      COALESCE(SUM((metadata->>'size')::bigint), 0)::bigint AS total_bytes
    FROM storage.objects
    GROUP BY bucket_id
    ORDER BY total_bytes DESC;
  `;
  const bucketsRes = await p.query(bucketSql);

  return {
    fileCount: row.file_count,
    totalBytes: Number(row.total_bytes),
    bucketCount: row.bucket_count,
    buckets: bucketsRes.rows.map((b) => ({
      name: b.bucket_id,
      fileCount: b.file_count,
      totalBytes: Number(b.total_bytes),
    })),
  };
}

module.exports = { queryStorageUsage };