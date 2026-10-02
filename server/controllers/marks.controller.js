const service = require('../services/marks.service');
const { success } = require('../utils/apiResponse');
const ApiError = require('../utils/ApiError');

exports.upsert = async (req, res, next) => {
  try {
    if (req.user.role === 'STUDENT') throw ApiError.forbidden();
    const data = await service.upsertMarks(req.body, req.user);
    return success(res, data, 'Marks saved');
  } catch (e) { next(e); }
};

exports.bulkUpsert = async (req, res, next) => {
  try {
    if (req.user.role === 'STUDENT') throw ApiError.forbidden();
    const data = await service.bulkUpsertMarks(req.body, req.user);
    return success(res, data, `Saved ${data.saved} record(s)`);
  } catch (e) { next(e); }
};

exports.my = async (req, res, next) => {
  try {
    const data = await service.listMy(req.user.studentId);
    return success(res, data);
  } catch (e) { next(e); }
};

exports.list = async (req, res, next) => {
  try {
    if (req.user.role === 'FACULTY') {
      return success(res, await service.listForFaculty(req.user.facultyId, req.query));
    }
    if (req.user.role === 'ADMIN') {
      const Marks = require('../models/Marks.model');
      const Student = require('../models/Student.model');

      const { year, semester, subjectId, status, section } = req.query;
      const query = {};
      if (subjectId) query.subjectId = subjectId;
      if (status) query.status = status;

      const studentQ = { status: 'ACTIVE' };
      if (year) studentQ.year = Number(year);
      if (semester) studentQ.currentSemester = Number(semester);
      if (section) studentQ.section = section;

      const students = await Student.find(studentQ).select('_id');
      query.studentId = { $in: students.map((s) => s._id) };

      const items = await Marks.find(query)
        .populate('studentId', 'rollNumber name section year currentSemester')
        .populate('subjectId', 'subjectName subjectCode type')
        .sort({ createdAt: -1 });

      return success(res, { items, total: items.length });
    }
    throw ApiError.forbidden();
  } catch (e) { next(e); }
};

exports.getById = async (req, res, next) => {
  try {
    const m = await service.getById(req.params.id, req.user);
    if (req.user.role === 'STUDENT' && String(m.studentId._id) !== String(req.user.studentId)) {
      throw ApiError.forbidden();
    }
    return success(res, m);
  } catch (e) { next(e); }
};

exports.publish = async (req, res, next) => {
  try { return success(res, await service.publish(req.params.id, req.user), 'Marks published'); }
  catch (e) { next(e); }
};
exports.lock = async (req, res, next) => {
  try { return success(res, await service.lock(req.params.id, req.user), 'Marks locked'); }
  catch (e) { next(e); }
};
exports.unlock = async (req, res, next) => {
  try { return success(res, await service.unlock(req.params.id, req.user), 'Marks unlocked'); }
  catch (e) { next(e); }
};
exports.remove = async (req, res, next) => {
  try { return success(res, await service.remove(req.params.id, req.user), 'Marks deleted'); }
  catch (e) { next(e); }
};