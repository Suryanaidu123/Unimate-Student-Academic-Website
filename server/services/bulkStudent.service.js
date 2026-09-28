const Student = require('../models/Student.model');
const RollSeries = require('../models/RollSeries.model');
const ApiError = require('../utils/ApiError');
const { expandSeries, buildEmail } = require('../utils/rollExpander');
const auditLog = require('./auditLog.service');

/**
 * Preview: what rolls would be generated for a given series.
 */
async function previewSeries(year) {
  const series = await RollSeries.findOne({ year: Number(year), status: 'ACTIVE' });
  if (!series) throw ApiError.notFound(`No roll-number series configured for Year ${year}`);
  const rolls = expandSeries(series);
  return {
    series,
    rolls,
    count: rolls.length,
  };
}

/**
 * Generate students.
 *
 * Body:
 * {
 *   year: 3,
 *   rows: [
 *     { rollNumber: "24K61A6101", firstName: "Aarti", surname: "Sharma" },
 *     ...
 *   ]
 * }
 *
 * For any range the admin wants, the frontend can call previewSeries first
 * and then POST this array of rows.
 */
async function generate({ year, rows }, actor) {
  const series = await RollSeries.findOne({ year: Number(year), status: 'ACTIVE' });
  if (!series) throw ApiError.badRequest(`No series configured for Year ${year}`);

  const summary = { total: rows.length, created: 0, skipped: 0, errors: [] };
  const created = [];

  for (const [i, row] of rows.entries()) {
    try {
      const rollNumber = String(row.rollNumber || '').trim();
      const firstName = String(row.firstName || '').trim();
      const surname = String(row.surname || '').trim();

      if (!rollNumber) throw new Error('Missing roll number');
      if (!firstName || !surname) throw new Error('Missing first name or surname');

      const email = buildEmail(firstName, surname, series.emailSuffix);

      const exists = await Student.findOne({ rollNumber });
      if (exists) {
        summary.skipped++;
        continue;
      }

      const student = await Student.create({
        rollNumber,
        name: `${firstName} ${surname}`,
        email,
        academicYear: series.year,
        year: series.year,
        semester: 2 * series.year - 1,
        section: 'A',
        batch: series.batch,
        admissionYear: series.admissionYear,
        department: 'AI & ML',
        course: 'B.Tech AI & ML',
        status: 'ACTIVE',
      });

      created.push(student);
      summary.created++;
    } catch (e) {
      summary.errors.push({
        row: i + 1,
        rollNumber: row.rollNumber,
        message: e.message,
      });
    }
  }

  await auditLog.log({
    actor,
    action: 'STUDENTS_BULK_GENERATE',
    entityType: 'Student',
    description: `Generated ${summary.created} students for Year ${year} (${summary.skipped} skipped, ${summary.errors.length} errors)`,
    metadata: { year, summary },
  });

  return { summary, created };
}

/**
 * Update the series config for a year (admin adds/edits ranges/singles).
 */
async function updateSeries(year, patch, actor) {
  const series = await RollSeries.findOneAndUpdate(
    { year: Number(year) },
    { $set: patch },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
  );

  await auditLog.log({
    actor,
    action: 'ROLL_SERIES_UPDATE',
    entityType: 'RollSeries',
    entityId: series._id,
    description: `Updated roll series for Year ${year}`,
    newValue: patch,
  });

  return series;
}

async function listSeries() {
  return RollSeries.find().sort({ year: 1 });
}

module.exports = { previewSeries, generate, updateSeries, listSeries };