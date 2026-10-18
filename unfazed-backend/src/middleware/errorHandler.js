function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((item) => ({ field: item.path, message: item.message }));
    return res.status(422).json({ message: errors[0] ? errors[0].message : 'Validation failed', errors });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ message: `Invalid value for ${err.path}` });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'value';
    return res.status(409).json({ message: `That ${field} is already in use`, code: 'DUPLICATE' });
  }
  if (err.name === 'MulterError') {
    return res.status(400).json({ message: err.message });
  }

  const status = err.status || 500;
  if (status >= 500) console.error(err);
  return res.status(status).json({
    message: status >= 500 && process.env.NODE_ENV === 'production' ? 'Something went wrong on our side' : err.message,
    ...(err.details || {}),
  });
}

module.exports = { notFound, errorHandler };
