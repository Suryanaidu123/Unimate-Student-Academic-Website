/**
 * Expand a range like "24K61A6101" → "24K61A6164" into every roll number.
 * Works on the trailing numeric portion. The prefix must match.
 */
function expandRange(start, end) {
  const m1 = start.match(/^(.*?)(\d+)$/);
  const m2 = end.match(/^(.*?)(\d+)$/);
  if (!m1 || !m2) throw new Error(`Invalid roll number format: ${start} / ${end}`);
  if (m1[1] !== m2[1]) throw new Error(`Prefix mismatch: "${m1[1]}" vs "${m2[1]}"`);

  const pad = Math.max(m1[2].length, m2[2].length);
  const a = parseInt(m1[2], 10);
  const b = parseInt(m2[2], 10);
  if (b < a) throw new Error(`End < start for range ${start} → ${end}`);

  const out = [];
  for (let n = a; n <= b; n++) {
    out.push(m1[1] + String(n).padStart(pad, '0'));
  }
  return out;
}

/**
 * Given a RollSeries doc, return the full de-duplicated, sorted list
 * of roll numbers (ranges + singles).
 */
function expandSeries(series) {
  const set = new Set();
  (series.ranges || []).forEach((r) => {
    expandRange(r.start, r.end).forEach((roll) => set.add(roll));
  });
  (series.singles || []).forEach((roll) => set.add(roll));
  return [...set].sort();
}

/**
 * Build the college email from first name + surname + year suffix.
 * Example: ("Surya", "Kavala", "24@sasi.ac.in") → "surya.kavala24@sasi.ac.in"
 */
function buildEmail(firstName, surname, emailSuffix) {
  const clean = (s) =>
    String(s || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ''); // strip spaces/punct
  return `${clean(firstName)}.${clean(surname)}${emailSuffix}`;
}

module.exports = { expandRange, expandSeries, buildEmail };