const service = require('../services/timetable.service');
const { success } = require('../utils/apiResponse');
const Timetable = require('../models/Timetable.model');
const auditLog = require('../services/auditLog.service');

exports.my = async (req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    return success(res, await service.listForUser(req.user));
  } catch (e) { next(e); }
};

exports.list = async (req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    return success(res, await service.listForUser(req.user, req.query));
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  try { return success(res, await service.create(req.body, req.user), 'Created', 201); } catch (e) { next(e); }
};

exports.update = async (req, res, next) => {
  try { return success(res, await service.update(req.params.id, req.body, req.user)); } catch (e) { next(e); }
};

exports.remove = async (req, res, next) => {
  try { return success(res, await service.remove(req.params.id, req.user)); } catch (e) { next(e); }
};

exports.reset = async (req, res, next) => {
  try {
    const { year, semester, section } = req.body;
    const query = {};
    if (year) query.year = Number(year);
    if (semester) query.semester = Number(semester);
    if (section) query.section = section;

    if (!query.year && !query.semester && !query.section) {
      return res.status(400).json({ success: false, message: 'Provide year, semester or section' });
    }

    const result = await Timetable.deleteMany(query);

    await auditLog.log({
      actor: req.user,
      action: 'TIMETABLE_RESET',
      entityType: 'Timetable',
      description: `Reset timetable: deleted ${result.deletedCount} slots`,
      metadata: { ...query, deleted: result.deletedCount },
    });

    return success(res, { deleted: result.deletedCount }, `Deleted ${result.deletedCount} slots`);
  } catch (e) { next(e); }
};