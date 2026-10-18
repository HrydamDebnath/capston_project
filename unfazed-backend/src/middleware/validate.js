const { validationResult } = require('express-validator');

module.exports = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const errors = result.array().map((item) => ({ field: item.path, message: item.msg }));
  return res.status(422).json({ message: errors[0].message, errors });
};
