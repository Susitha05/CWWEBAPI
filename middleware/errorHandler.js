class ApiError extends Error {
  constructor(status, code, message, details = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// One consistent error-body shape for the whole API:
// { error: { code, message, details } }
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details }
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      error: { code: 'INVALID_ID', message: `Invalid identifier: ${err.value}`, details: null }
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: err.message, details: err.errors || null }
    });
  }

  console.error(err);
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.', details: null }
  });
}

function notFound(req, res, next) {
  next(new ApiError(404, 'NOT_FOUND', `No such route: ${req.method} ${req.originalUrl}`));
}

module.exports = { ApiError, errorHandler, notFound };
