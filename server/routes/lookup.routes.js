const router = require('express').Router();
const Student = require('../models/Student.model');
const Subject = require('../models/Subject.model');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { success } = require('../utils/apiResponse');

router.use(requireAuth);

// GET /api/lookup/students?year=2&section=A
// GET /api/lookup/students?year=2&section=A
router.get('/students', requireRole('FACULTY', 'ADMIN'), async (req, res, next) => {
  try {
    const { year, section } = req.query;
    const q = {};
    if (year) q.year = Number(year);
    if (section) q.section = section;

    if (req.user.role === 'FACULTY') {
      // Faculty can only see students in years they teach
      const theirSubjects = await Subject.find({ facultyId: req.user.facultyId }).select('year');
      const allowedYears = [...new Set(theirSubjects.map((s) => s.year))];
      if (year && !allowedYears.includes(Number(year))) {
        return success(res, []);
      }
      if (!year) q.year = { $in: allowedYears };
    }

    const students = await Student.find(q)
  .select('rollNumber name year section')
  .sort({ year: 1, section: 1, rollNumber: 1 });   // ← changed
return success(res, students);
  } catch (e) { next(e); }
});

// GET /api/lookup/subjects?year=2
// GET /api/lookup/subjects?year=2
// GET /api/lookup/subjects?year=2
// GET /api/lookup/subjects?year=2&type=THEORY|LAB
router.get('/subjects', requireRole('FACULTY', 'ADMIN'), async (req, res, next) => {
  try {
    const { year, type } = req.query;
    const q = {};
    if (year) q.year = Number(year);
    if (type) q.type = type;

    if (req.user.role === 'FACULTY') {
      q.facultyId = req.user.facultyId;
    }

    const subjects = await Subject.find(q)
      .select('subjectName subjectCode type year credits facultyId')
      .sort({ subjectCode: 1 });

    // THEORY first, then LAB
    subjects.sort((a, b) => {
      const rank = (s) => (s.type === 'LAB' ? 1 : 0);
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      return String(a.subjectCode).localeCompare(String(b.subjectCode));
    });

    return success(res, subjects);
  } catch (e) { next(e); }
});

module.exports = router;