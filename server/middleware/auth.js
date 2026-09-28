const { verifyAccess } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');

function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const bearer = header.startsWith('Bearer ') ? header.slice(7) : null;
    const token = bearer || req.query.token || req.cookies?.accessToken;

    if (!token) throw ApiError.unauthorized('Missing authentication token');

    const payload = verifyAccess(token);
    req.user = {
      userId: payload.sub,
      role: payload.role,
      studentId: payload.studentId,
      facultyId: payload.facultyId,
    };
    next();
  } catch (err) {
    next(ApiError.unauthorized('Invalid or expired token'));
  }
}

module.exports = { requireAuth };