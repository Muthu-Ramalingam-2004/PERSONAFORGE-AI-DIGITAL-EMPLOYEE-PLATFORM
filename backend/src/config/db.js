const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const isProduction = process.env.NODE_ENV === 'production';

// Retrieve connection string
const connectionString = process.env.DATABASE_URL;

let pool;

if (!connectionString || connectionString.includes('localhost') && process.env.NODE_ENV === 'test') {
  console.warn('⚠️ WARNING: DATABASE_URL not configured properly or environment is test. Database calls will fail or use mock behavior.');
  // Create a mock pool for safe startup
  pool = {
    query: async (text, params) => {
      console.log(`[MOCK DB QUERY]: ${text}`, params || '');
      return { rows: [], rowCount: 0 };
    },
    connect: async () => {
      return {
        query: async (text, params) => ({ rows: [], rowCount: 0 }),
        release: () => {}
      };
    },
    on: () => {}
  };
} else {
  pool = new Pool({
    connectionString: connectionString,
    ssl: isProduction ? { rejectUnauthorized: false } : false
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
  });
}

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
