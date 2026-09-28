const { WRITTEN_DIVISOR, WRITTEN_MAX, ONLINE_MAX, ASSIGNMENT_MAX } = require('../constants/marks');

function clamp(n, min, max) {
  const v = Number(n);
  if (Number.isNaN(v)) throw new Error('Invalid number');
  if (v < min || v > max) throw new Error(`Value out of range [${min},${max}]`);
  return v;
}

function computeMid(written, online, assignment) {
  const w = clamp(written, 0, WRITTEN_MAX);
  const o = clamp(online, 0, ONLINE_MAX);
  const a = clamp(assignment, 0, ASSIGNMENT_MAX);
  const writtenConverted = w / WRITTEN_DIVISOR;
  const total = writtenConverted + o + a;
  return { written: w, writtenConverted, online: o, assignment: a, total };
}

function computeInternal(mid1Total, mid2Total) {
  return Math.max(mid1Total || 0, mid2Total || 0);
}

module.exports = { computeMid, computeInternal };