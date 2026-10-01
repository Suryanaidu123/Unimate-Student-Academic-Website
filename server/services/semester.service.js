const Student = require('../models/Student.model');
const ApiError = require('../utils/ApiError');
const auditLog = require('./auditLog.service');

const YEAR_SEMESTERS = { 2: [3, 4], 3: [5, 6], 4: [7, 8] };
const BATCH_MAP = {
  2: { batch: '2025-2029', admissionYear: 2025 },
  3: { batch: '2024-2028', admissionYear: 2024 },
  4: { batch: '2023-2027', admissionYear: 2023 },
};

async function getStatus() {
  return Promise.all(
    [2, 3, 4].map(async (year) => {
      const [sem1, sem2] = YEAR_SEMESTERS[year];
      const [sem1Count, sem2Count, total] = await Promise.all([
        Student.countDocuments({ year, currentSemester: sem1, status: 'ACTIVE' }),
        Student.countDocuments({ year, currentSemester: sem2, status: 'ACTIVE' }),
        Student.countDocuments({ year, status: 'ACTIVE' }),
      ]);
      return {
        year,
        semesters: { first: sem1, second: sem2 },
        counts: { sem1: sem1Count, sem2: sem2Count, total },
        label: `${year}${year === 2 ? 'nd' : year === 3 ? 'rd' : 'th'} Year`,
      };
    })
  );
}

/**
 * Move all active students of a year forward (INC) or backward (DEC) by one semester.
 */
async function moveSemester(year, direction, actor) {
  const y = Number(year);
  const dir = direction === 'DEC' || direction === 'decrement' ? 'DEC' : 'INC';
  if (!YEAR_SEMESTERS[y]) throw ApiError.badRequest('Year must be 2, 3 or 4');

  const [sem1, sem2] = YEAR_SEMESTERS[y];

  // Count what's there
  const inFirst = await Student.countDocuments({ year: y, currentSemester: sem1, status: 'ACTIVE' });
  const inSecond = await Student.countDocuments({ year: y, currentSemester: sem2, status: 'ACTIVE' });
  if (inFirst === 0 && inSecond === 0) {
    throw ApiError.badRequest(`No active students in Year ${y}.`);
  }

  let summary = null;

  if (dir === 'INC') {
    if (inFirst > 0) {
      // sem1 → sem2 (same year)
      const r = await Student.updateMany(
        { year: y, currentSemester: sem1, status: 'ACTIVE' },
        { $set: { currentSemester: sem2, semester: sem2 } }
      );
      summary = {
        promoted: r.modifiedCount,
        from: `${y}-1 (Sem ${sem1})`,
        to: `${y}-2 (Sem ${sem2})`,
      };
    } else {
      // sem2 → next year sem1 (or graduate if y === 4)
      if (y === 4) {
        const r = await Student.updateMany(
          { year: 4, currentSemester: sem2, status: 'ACTIVE' },
          { $set: { status: 'GRADUATED' } }
        );
        summary = { promoted: r.modifiedCount, from: '4-2 (Sem 8)', to: 'GRADUATED' };
      } else {
        const nextYear = y + 1;
        const nextFirst = 2 * nextYear - 1;
        const meta = BATCH_MAP[nextYear];
        const r = await Student.updateMany(
          { year: y, currentSemester: sem2, status: 'ACTIVE' },
          {
            $set: {
              year: nextYear,
              academicYear: nextYear,
              currentSemester: nextFirst,
              semester: nextFirst,
              batch: meta.batch,
              admissionYear: meta.admissionYear,
            },
          }
        );
        summary = {
          promoted: r.modifiedCount,
          from: `${y}-2 (Sem ${sem2})`,
          to: `${nextYear}-1 (Sem ${nextFirst})`,
        };
      }
    }
  } else {
    // DEC
    if (inSecond > 0) {
      // sem2 → sem1 (same year)
      const r = await Student.updateMany(
        { year: y, currentSemester: sem2, status: 'ACTIVE' },
        { $set: { currentSemester: sem1, semester: sem1 } }
      );
      summary = {
        promoted: r.modifiedCount,
        from: `${y}-2 (Sem ${sem2})`,
        to: `${y}-1 (Sem ${sem1})`,
      };
    } else {
      // sem1 → previous year sem2 (only possible for year 3 and 4)
      if (y === 2) {
        throw ApiError.badRequest('Cannot decrement from 2-1 — it is the first semester.');
      }
      const prevYear = y - 1;
      const prevSecond = 2 * prevYear;
      const meta = BATCH_MAP[prevYear];
      const r = await Student.updateMany(
        { year: y, currentSemester: sem1, status: 'ACTIVE' },
        {
          $set: {
            year: prevYear,
            academicYear: prevYear,
            currentSemester: prevSecond,
            semester: prevSecond,
            batch: meta.batch,
            admissionYear: meta.admissionYear,
          },
        }
      );
      summary = {
        promoted: r.modifiedCount,
        from: `${y}-1 (Sem ${sem1})`,
        to: `${prevYear}-2 (Sem ${prevSecond})`,
      };
    }
  }

  await auditLog.log({
    actor,
    action: dir === 'INC' ? 'SEMESTER_INCREMENT' : 'SEMESTER_DECREMENT',
    entityType: 'Student',
    description: `Moved ${summary.promoted} students: ${summary.from} → ${summary.to}`,
    metadata: { ...summary, direction: dir },
  });

  return summary;
}

module.exports = { getStatus, moveSemester };