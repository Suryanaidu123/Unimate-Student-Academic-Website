const ApiError = require('../utils/ApiError');

function validate(schema, source = 'body') {
  return (req, _res, next) => {
    try {
      req[source] = schema.parse(req[source]);
      next();
    } catch (err) {
      const errors = err.errors?.map((e) => ({ path: e.path.join('.'), message: e.message })) || [];
      next(ApiError.unprocessable('Validation failed', errors));
    }
  };
}

module.exports = { validate };