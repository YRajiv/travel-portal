const { isProduction } = require('../config/runtime');

const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  let message = err.message || 'Something went wrong';
  const errorStatus = err.status || err.statusCode;

  if (Number.isInteger(errorStatus) && errorStatus >= 400 && errorStatus < 600) {
    statusCode = errorStatus;
  }

  if (err.name === 'ValidationError' || err.name === 'CastError') {
    statusCode = 400;
    if (err.name === 'ValidationError') {
      message = Object.values(err.errors).map((validationError) => validationError.message).join(', ');
    }
  } else if (err.code === 11000) {
    statusCode = 409;
    message = 'A record with the same unique value already exists.';
  }

  res.status(statusCode).json({
    message,
    stack: isProduction() ? undefined : err.stack,
  });
};

module.exports = { errorHandler };
