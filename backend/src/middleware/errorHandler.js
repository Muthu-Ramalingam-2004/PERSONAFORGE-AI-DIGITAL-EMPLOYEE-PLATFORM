const logger = require('../utils/logger');

// Express global error handler middleware
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Only treat genuine Node.js network / PG connection errors as DB errors
  // NOTE: Do NOT match on message text like "connect" — that catches normal
  //       business-logic errors (e.g. "AI Employee not found or unauthorized").
  const isDbError =
    err.code === 'ECONNREFUSED' ||
    err.code === 'ENOTFOUND'    ||
    err.code === 'ETIMEDOUT'    ||
    err.code === '57P03'        || // pg: cannot_connect_now
    err.code === '08006'        || // pg: connection_failure
    err.code === '08001'        || // pg: sqlclient_unable_to_establish_sqlconnection
    (typeof message === 'string' && /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|connection pool|connection timed out/i.test(message));

  if (isDbError) {
    statusCode = 503;
    message = 'Database not connected';
  }
  
  if (logger && typeof logger.error === 'function') {
    logger.error(`${statusCode} - ${message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  } else {
    console.error(`[Error] ${statusCode} - ${message} - ${req.originalUrl} - ${req.method}`);
    if (err.stack && process.env.NODE_ENV !== 'production') {
      console.error(err.stack);
    }
  }

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
};

module.exports = errorHandler;
