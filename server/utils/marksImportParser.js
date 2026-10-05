/**
 * marksImportParser.js
 *
 * Parses an uploaded Excel (.xlsx / .xls) or CSV buffer
 * into a normalised array of raw rows:
 *   [ { rollNumber, written, online, assignment }, … ]
 */

const XLSX = require('xlsx');

// ---------------------------------------------------------------------------
// Column alias maps
// ---------------------------------------------------------------------------
const ROLL_ALIASES       = ['roll no','roll number','rollno','rollnumber','roll','reg no','reg number','regno','registration no','registration number'];
const WRITTEN_ALIASES    = ['written','written marks','written exam','theory','written test'];
const ONLINE_ALIASES     = ['online','online marks','online assignment','online test'];
const ASSIGNMENT_ALIASES = ['assignment','assignment marks','internal assignment','assign'];

/** Strip range annotations "(0–30)" / "(0-30)" and lowercase. */
function normaliseHeader(raw) {
  return String(raw ?? '')
    .replace(/\(\s*\d+\s*[-\u2013\u2014]\s*\d+\s*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function matchAlias(header, aliases) {
  const h = normaliseHeader(header);
  return aliases.some((a) => h === a || h.startsWith(a + ' ') || h.startsWith(a + '('));
}

function toNum(val) {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(String(val).trim());
  return Number.isFinite(n) ? n : null;
}

/**
 * Collapse "(0–30)"-style tokens back onto their preceding token.
 * pdf-parse sometimes splits "Written (0–30)" into two tokens.
 */
function mergeRangeTokens(tokens) {
  const out = [];
  for (const tok of tokens) {
    if (/^\(\s*\d+\s*[-\u2013\u2014]\s*\d+\s*\)$/.test(tok.trim()) && out.length > 0) {
      out[out.length - 1] += ' ' + tok.trim();
    } else {
      out.push(tok);
    }
  }
  return out;
}

function detectColumns(headerRow) {
  const cols = { roll: -1, written: -1, online: -1, assignment: -1 };
  headerRow.forEach((cell, i) => {
    if      (cols.roll < 0       && matchAlias(cell, ROLL_ALIASES))       cols.roll = i;
    else if (cols.written < 0    && matchAlias(cell, WRITTEN_ALIASES))    cols.written = i;
    else if (cols.online < 0     && matchAlias(cell, ONLINE_ALIASES))     cols.online = i;
    else if (cols.assignment < 0 && matchAlias(cell, ASSIGNMENT_ALIASES)) cols.assignment = i;
  });
  return cols;
}

// ---------------------------------------------------------------------------
// Strategy A — header-column index mapping
// ---------------------------------------------------------------------------
function parseRowsByHeaders(allRows) {
  if (!allRows || allRows.length < 2) throw new Error('Too few rows.');

  let headerIdx = -1, cols;
  for (let i = 0; i < Math.min(allRows.length, 20); i++) {
    const merged = mergeRangeTokens(allRows[i].map(String));
    const c = detectColumns(merged);
    if (c.roll >= 0) { headerIdx = i; cols = c; break; }
  }
  if (headerIdx < 0) throw new Error('No Roll Number header found.');

  const missing = [];
  if (cols.written    < 0) missing.push('"Written"');
  if (cols.online     < 0) missing.push('"Online"');
  if (cols.assignment < 0) missing.push('"Assignment"');
  if (missing.length) throw new Error(`Missing column(s): ${missing.join(', ')}`);

  const rows = [];
  for (let i = headerIdx + 1; i < allRows.length; i++) {
    const raw = allRows[i];
    if (!raw || raw.every(c => String(c).trim() === '')) continue;
    const row = mergeRangeTokens(raw.map(String));
    const rollRaw = String(row[cols.roll] ?? '').trim();
    if (!rollRaw) continue;
    rows.push({
      rollNumber: rollRaw.toUpperCase(),
      written:    toNum(row[cols.written]),
      online:     toNum(row[cols.online]),
      assignment: toNum(row[cols.assignment]),
    });
  }
  if (rows.length === 0) throw new Error('No data rows after header.');
  return rows;
}

// ---------------------------------------------------------------------------
// Excel / CSV  → row array via header-column mapping
// ---------------------------------------------------------------------------
function parseExcelBuffer(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false, raw: false });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error('Excel file contains no sheets.');
  const ws = wb.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  return parseRowsByHeaders(raw);
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
async function parseMarksFile(buffer, originalName) {
  const ext = (originalName || '').split('.').pop().toLowerCase();
  if (['xlsx', 'xls', 'csv'].includes(ext)) return parseExcelBuffer(buffer);
  throw new Error(`Unsupported file type ".${ext}". Upload .xlsx, .xls, or .csv only.`);
}

module.exports = { parseMarksFile };
