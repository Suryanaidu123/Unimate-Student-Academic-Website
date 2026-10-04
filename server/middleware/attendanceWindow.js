const ApiError = require('../utils/ApiError');

// IST attendance window: 9:00 AM – 4:30 PM, Monday–Saturday
const OPEN_HOUR = 9;      // 09:00
const CLOSE_HOUR = 16;    // 16:30 (16h 30m)
const CLOSE_MIN = 30;

function isWithinWindow(now = new Date()) {
  const day = now.getDay(); // 0 = Sunday
  if (day === 0) return { ok: false, reason: 'Sunday — attendance cannot be recorded.' };

  const h = now.getHours();
  const m = now.getMinutes();

  // Before 9:00
  if (h < OPEN_HOUR) {
    return { ok: false, reason: 'Attendance window opens at 9:00 AM.' };
  }

  // After 4:30 PM
  if (h > CLOSE_HOUR || (h === CLOSE_HOUR && m > CLOSE_MIN)) {
    return { ok: false, reason: 'Attendance window closes at 4:30 PM.' };
  }

  return { ok: true };
}

function requireAttendanceWindow(req, _res, next) {
  // Admin bypasses the window (can correct data after-hours if needed)
  if (req.user?.role === 'ADMIN') return next();

  const check = isWithinWindow();
  if (!check.ok) return next(ApiError.forbidden(check.reason));
  next();
}

module.exports = { requireAttendanceWindow, isWithinWindow };