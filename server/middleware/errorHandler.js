const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

function notFoundHandler(_req, _res, next) {
  next(ApiError.notFound('Route not found'));
}

function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  const payload = {
    success: false,
    message: err.message || 'Server error',
    errors: err.errors || [],
  };
  if (status >= 500) {
    logger.error(err);
    if (process.env.NODE_ENV === 'production') payload.message = 'Internal server error';
  }
  res.status(status).json(payload);
}

module.exports = { errorHandler, notFoundHandler };