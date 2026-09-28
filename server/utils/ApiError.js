class ApiError extends Error {
  constructor(status, message, errors = []) {
    super(message);
    this.status = status;
    this.errors = errors;
    this.isOperational = true;
  }
  static badRequest(msg, errors) { return new ApiError(400, msg, errors); }
  static unauthorized(msg = 'Unauthorized') { return new ApiError(401, msg); }
  static forbidden(msg = 'Forbidden') { return new ApiError(403, msg); }
  static notFound(msg = 'Not found') { return new ApiError(404, msg); }
  static conflict(msg = 'Conflict') { return new ApiError(409, msg); }
  static unprocessable(msg = 'Validation failed', errors = []) { return new ApiError(422, msg, errors); }
}

module.exports = ApiError;