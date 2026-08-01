const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { connectDb } = require('./config/db');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;
const isDev = (process.env.NODE_ENV || 'development') !== 'production';

let server;

(async () => {
  try {
    logger.info('⏳ Initializing database connection...');
    await connectDb();

    const app = require('./app');
    server = app.listen(PORT, () => {
      logger.info(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
})();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  if (err.stack) {
    console.error(err.stack);
  }
  if (isDev) {
    // In development: log but keep the server alive so nodemon doesn't restart
    console.warn('⚠️  [DEV] Unhandled rejection caught — server continues running.');
  } else if (server) {
    // In production: close gracefully and exit
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  if (err.stack) {
    console.error(err.stack);
  }
  if (!isDev) {
    process.exit(1);
  } else {
    console.warn('⚠️  [DEV] Uncaught exception — server continues running.');
  }
});

