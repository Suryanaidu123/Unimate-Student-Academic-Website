/**
 * Extract a short alias from a subject name.
 *
 * Rules (in order):
 *  1. If name contains "(XXX)" → use XXX
 *  2. Otherwise, take the first letter of each word, up to 4 chars
 *  3. Fallback to the subject code, else the first word
 */
export function getSubjectAlias(subject) {
  if (!subject) return '';

  const name = String(subject.subjectName || '').trim();

  // Rule 1 — explicit alias in parentheses
  const m = name.match(/\(([^)]+)\)/);
  if (m) {
    const alias = m[1].trim();
    if (alias.length > 0 && alias.length <= 8) return alias;
  }

  // Rule 2 — acronym from first letters
  const words = name
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (words.length >= 2) {
    const acronym = words.map((w) => w[0].toUpperCase()).join('').slice(0, 4);
    if (acronym.length >= 2) return acronym;
  }

  // Rule 3 — fallback to code, else first word
  if (subject.subjectCode) return String(subject.subjectCode).toUpperCase();
  return name.slice(0, 6).toUpperCase();
}