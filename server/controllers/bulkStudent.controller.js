const service = require('../services/bulkStudent.service');
const { success } = require('../utils/apiResponse');

exports.listSeries = async (_req, res, next) => {
  try { return success(res, await service.listSeries()); } catch (e) { next(e); }
};

exports.updateSeries = async (req, res, next) => {
  try {
    const data = await service.updateSeries(req.params.year, req.body, req.user);
    return success(res, data, 'Series updated');
  } catch (e) { next(e); }
};

exports.preview = async (req, res, next) => {
  try { return success(res, await service.previewSeries(req.params.year)); }
  catch (e) { next(e); }
};

exports.generate = async (req, res, next) => {
  try {
    const data = await service.generate(req.body, req.user);
    return success(res, data, `Generated ${data.summary.created} students`);
  } catch (e) { next(e); }
};

exports.importStudents = async (req, res, next) => {
  try {
    const { year, semester, students } = req.body;
    if (!year || !semester || !Array.isArray(students) || students.length === 0) {
      return next(require('../utils/ApiError').badRequest('year, semester and students[] are required.'));
    }

    const Student  = require('../models/Student.model');
    const ApiError = require('../utils/ApiError');
    const BATCH_MAP = { 2: { batch: '2025-2029', admissionYear: 2025 },
                        3: { batch: '2024-2028', admissionYear: 2024 },
                        4: { batch: '2023-2027', admissionYear: 2023 } };

    const batchInfo = BATCH_MAP[Number(year)] || {};
    const saved  = [];
    const errors = [];

    for (const s of students) {
      try {
        const existing = await Student.findOne({
          $or: [
            { rollNumber: s.rollNumber },
            { email: s.email.toLowerCase() },
          ],
        });
        if (existing) {
          errors.push({ rollNumber: s.rollNumber, message: `Duplicate — roll or email already exists.` });
          continue;
        }
        await Student.create({
          rollNumber:      s.rollNumber.toUpperCase(),
          email:           s.email.toLowerCase(),
          name:            s.name || '',
          year:            Number(year),
          academicYear:    Number(year),
          currentSemester: Number(semester),
          semester:        Number(semester),
          status:          'ACTIVE',
          ...batchInfo,
        });
        saved.push(s.rollNumber);
      } catch (e) {
        errors.push({ rollNumber: s.rollNumber, message: e.message });
      }
    }

    return success(res, { saved: saved.length, errors }, `Imported ${saved.length} students`);
  } catch (e) { next(e); }
};