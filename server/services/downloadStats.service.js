const DownloadEvent = require('../models/DownloadEvent.model');

/**
 * Record a view or download event.
 * - mode = 'inline'      → View
 * - mode = 'attachment'  → Download
 * - Dedupes same user + material + mode within 5 seconds.
 */
async function record({ materialId, userId, role, bytes, mode }) {
  try {
    if (!['inline', 'attachment'].includes(mode)) return;

    // Dedupe rapid repeats (browser prefetch, double-click, etc.)
    const since = new Date(Date.now() - 5000);
    const recent = await DownloadEvent.findOne({
      materialId,
      userId,
      mode,
      createdAt: { $gte: since },
    });
    if (recent) return;

    await DownloadEvent.create({ materialId, userId, role, bytes, mode });
  } catch (e) {
    console.error('Failed to record download event:', e.message);
  }
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function todayTotal() {
  const from = startOfToday();
  const rows = await DownloadEvent.aggregate([
    { $match: { createdAt: { $gte: from }, mode: 'attachment' } },
    { $group: { _id: null, bytes: { $sum: '$bytes' }, count: { $sum: 1 } } },
  ]);
  const r = rows[0] || { bytes: 0, count: 0 };
  return { bytes: Number(r.bytes) || 0, count: r.count || 0 };
}

async function dailyTotals(days = 7) {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - (days - 1));

  const rows = await DownloadEvent.aggregate([
    { $match: { createdAt: { $gte: from }, mode: 'attachment' } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        bytes: { $sum: '$bytes' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const map = Object.fromEntries(rows.map((r) => [r._id, r]));
  const out = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const row = map[key];
    out.push({
      date: key,
      bytes: row ? Number(row.bytes) : 0,
      count: row ? row.count : 0,
    });
  }
  return out;
}
async function deleteEvent(id, actor) {
  const DownloadEvent = require('../models/DownloadEvent.model');
  const AuditLog = require('../models/AuditLog.model');

  const doc = await DownloadEvent.findByIdAndDelete(id);
  if (!doc) throw new Error('History record not found');

  await AuditLog.create({
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: 'MATERIAL_HISTORY_DELETE',
    entityType: 'DownloadEvent',
    entityId: id,
    description: `Deleted material history entry (${doc.mode})`,
  });

  return { ok: true };
}

async function deleteAll(actor) {
  const DownloadEvent = require('../models/DownloadEvent.model');
  const AuditLog = require('../models/AuditLog.model');

  const r = await DownloadEvent.deleteMany({});

  await AuditLog.create({
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: 'MATERIAL_HISTORY_DELETE_ALL',
    entityType: 'DownloadEvent',
    description: `Cleared all material history (${r.deletedCount} records)`,
  });

  return { deleted: r.deletedCount };
}
async function activityHistory({
  action,        // 'view' | 'download' | undefined
  year,          // 2 | 3 | 4
  role,          // 'STUDENT' | 'FACULTY'
  q,
  page = 1,
  limit = 50,
}) {
  const match = {};
  if (action === 'view') match.mode = 'inline';
  if (action === 'download') match.mode = 'attachment';
  if (role) match.role = role;

  const rows = await DownloadEvent.aggregate([
    { $match: match },
    {
      $lookup: {
        from: 'materials',
        localField: 'materialId',
        foreignField: '_id',
        as: 'material',
      },
    },
    { $unwind: { path: '$material', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'students',
        localField: 'user.studentId',
        foreignField: '_id',
        as: 'student',
      },
    },
    { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'faculties',
        localField: 'user.facultyId',
        foreignField: '_id',
        as: 'faculty',
      },
    },
    { $unwind: { path: '$faculty', preserveNullAndEmptyArrays: true } },
    ...(year ? [{ $match: { 'student.year': Number(year) } }] : []),
    ...(q
      ? [{
          $match: {
            $or: [
              { 'student.name': new RegExp(q, 'i') },
              { 'student.rollNumber': new RegExp(q, 'i') },
              { 'faculty.name': new RegExp(q, 'i') },
              { 'faculty.employeeId': new RegExp(q, 'i') },
              { 'material.title': new RegExp(q, 'i') },
            ],
          },
        }]
      : []),
    { $sort: { createdAt: -1 } },
    { $skip: (page - 1) * limit },
    { $limit: limit },
  ]);

  const items = rows.map((r) => ({
    _id: r._id,
    action: r.mode === 'attachment' ? 'Downloaded' : 'Viewed',
    mode: r.mode,
    bytes: r.bytes,
    createdAt: r.createdAt,
    material: r.material
      ? {
          _id: r.material._id,
          title: r.material.title,
          semester: r.material.semester,
          year: r.material.year,
          section: r.material.section,
        }
      : null,
    actor: {
      role: r.role,
      name: r.student?.name || r.faculty?.name || r.user?.email || 'Unknown',
      rollNumber: r.student?.rollNumber || null,
      employeeId: r.faculty?.employeeId || null,
      year: r.student?.year || null,
      semester: r.student?.currentSemester || r.student?.semester || null,
      section: r.student?.section || null,
    },
  }));

  // Count with the same filters
  const totalRows = await DownloadEvent.aggregate([
    { $match: match },
    {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'students',
        localField: 'user.studentId',
        foreignField: '_id',
        as: 'student',
      },
    },
    { $unwind: { path: '$student', preserveNullAndEmptyArrays: true } },
    ...(year ? [{ $match: { 'student.year': Number(year) } }] : []),
    { $count: 'total' },
  ]);
  const total = totalRows[0]?.total || 0;

  return { items, total, page, limit };
}

module.exports = {
  record, todayTotal, dailyTotals, activityHistory,
  deleteEvent, deleteAll,
};