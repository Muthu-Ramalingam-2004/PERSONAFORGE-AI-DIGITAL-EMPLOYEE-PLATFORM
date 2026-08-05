"use strict";

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

// Load .env from backend folder
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const DB_PATH = path.join(__dirname, "../db_emulated.json");
const SCHEMA_PATH = path.join(__dirname, "../../docs/schema.sql");

const TABLE_COLUMNS = {
  users: ['id', 'firebase_uid', 'email', 'password', 'name', 'role', 'subscription_plan', 'created_at', 'updated_at'],
  ai_employees: ['id', 'user_id', 'name', 'avatar_url', 'category', 'status', 'created_at', 'updated_at'],
  prompts: ['id', 'employee_id', 'system_prompt', 'personality_prompt', 'goal', 'tone', 'temperature', 'max_tokens', 'created_at', 'updated_at'],
  chats: ['id', 'user_id', 'employee_id', 'title', 'created_at', 'updated_at'],
  messages: ['id', 'chat_id', 'sender', 'content', 'created_at'],
  documents: ['id', 'employee_id', 'name', 'file_path', 'file_type', 'file_size', 'status', 'created_at'],
  settings: ['id', 'user_id', 'theme', 'api_keys', 'notification_settings', 'created_at', 'updated_at'],
  analytics: ['id', 'user_id', 'employee_id', 'usage_count', 'response_time', 'tokens_used', 'timestamp'],
  activity_logs: ['id', 'user_id', 'action', 'details', 'ip_address', 'created_at'],
  document_chunks: ['id', 'document_id', 'employee_id', 'content', 'created_at']
};

const TABLE_ORDER = [
  'users',
  'ai_employees',
  'prompts',
  'settings',
  'documents',
  'chats',
  'messages',
  'document_chunks',
  'analytics',
  'activity_logs'
];

function cleanJsonField(val) {
  if (val === null || val === undefined) return null;
  if (typeof val !== 'string') return val;
  let str = val.trim();
  if (str.startsWith("'")) {
    const firstBrace = str.indexOf('{');
    const lastBrace = str.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      str = str.substring(firstBrace, lastBrace + 1);
    }
  }
  const lastBraceIndex = str.lastIndexOf('}');
  if (lastBraceIndex !== -1 && lastBraceIndex < str.length - 1) {
    str = str.substring(0, lastBraceIndex + 1);
  }
  try {
    return JSON.parse(str);
  } catch (e) {
    try {
      const unescaped = str.replace(/\\"/g, '"');
      return JSON.parse(unescaped);
    } catch (e2) {
      return {};
    }
  }
}

async function runMigration() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ [MIGRATION ERROR] DATABASE_URL is not set in environment variables.");
    process.exit(1);
  }

  console.log("⏳ [MIGRATION] Connecting to PostgreSQL database...");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000
  });

  let client;
  try {
    client = await pool.connect();
    console.log("✅ [MIGRATION] Connected to PostgreSQL successfully.");

    // 1. Initialize schema if needed
    if (fs.existsSync(SCHEMA_PATH)) {
      console.log("⏳ [MIGRATION] Ensuring database schema is initialized...");
      const schemaSql = fs.readFileSync(SCHEMA_PATH, "utf8");
      await client.query(schemaSql);
      console.log("⏳ [MIGRATION] Ensuring password column exists in users table...");
      await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255)');
      console.log("✅ [MIGRATION] Database schema checked/initialized.");
    } else {
      console.warn("⚠️  [MIGRATION] schema.sql not found at", SCHEMA_PATH);
    }

    // 2. Check if migration has already run
    await client.query(`
      CREATE TABLE IF NOT EXISTS migration_history (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const checkResult = await client.query(`
      SELECT 1 FROM migration_history WHERE name = 'import_emulated_db'
    `);

    if (checkResult.rowCount > 0) {
      console.log("\nℹ️  [MIGRATION] Migration 'import_emulated_db' has already run successfully on this database.");
      console.log("No new imports were performed.");
      console.log("\nMigration Results:");
      for (const tableName of TABLE_ORDER) {
        console.log(`- ${tableName}: 0 records imported`);
      }
      return;
    }

    // Fetch existing database state to initialize mapping and unique pools
    const existingUsers = await client.query("SELECT id, email, firebase_uid FROM users");
    const userEmailToIdMap = {};
    const userUidToIdMap = {};
    const insertedUserEmails = new Set();
    const insertedUserUids = new Set();

    for (const row of existingUsers.rows) {
      const email = (row.email || "").toLowerCase();
      const uid = row.firebase_uid;
      insertedUserEmails.add(email);
      insertedUserUids.add(uid);
      userEmailToIdMap[email] = row.id;
      userUidToIdMap[uid] = row.id;
    }

    const existingSettings = await client.query("SELECT user_id FROM settings");
    const insertedSettingsUsers = new Set();
    for (const row of existingSettings.rows) {
      insertedSettingsUsers.add(row.user_id);
    }

    const idMappings = {};

    // Helper to map foreign keys if their parent users were merged
    function mapRowKeys(tblName, rec) {
      const mapped = { ...rec };
      const fkeys = {
        ai_employees: ['user_id'],
        prompts: ['employee_id'],
        chats: ['user_id', 'employee_id'],
        messages: ['chat_id'],
        documents: ['employee_id'],
        settings: ['user_id'],
        analytics: ['user_id', 'employee_id'],
        activity_logs: ['user_id'],
        document_chunks: ['document_id', 'employee_id']
      };

      const keysToMap = fkeys[tblName] || [];
      for (const key of keysToMap) {
        if (mapped[key] && idMappings[mapped[key]]) {
          mapped[key] = idMappings[mapped[key]];
        }
      }
      return mapped;
    }

    // 3. Read db_emulated.json
    if (!fs.existsSync(DB_PATH)) {
      console.error(`❌ [MIGRATION ERROR] db_emulated.json not found at: ${DB_PATH}`);
      process.exit(1);
    }

    console.log("⏳ [MIGRATION] Reading db_emulated.json...");
    const dbData = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));

    const importCounts = {};
    for (const tableName of TABLE_ORDER) {
      importCounts[tableName] = 0;
      const records = dbData[tableName] || [];
      const allowedCols = TABLE_COLUMNS[tableName];

      console.log(`⏳ [MIGRATION] Importing ${records.length} records into '${tableName}' table...`);

      for (const record of records) {
        let mappedRecord = { ...record };

        // Handle unique constraints on users table
        if (tableName === 'users') {
          const emailKey = (record.email || "").toLowerCase();
          const uidKey = record.firebase_uid;
          
          // Check if this specific record ID already exists in DB
          const checkIdRes = await client.query("SELECT id FROM users WHERE id = $1", [record.id]);
          if (checkIdRes.rowCount > 0) {
            idMappings[record.id] = record.id;
            continue;
          }

          // Check for email duplicate
          if (insertedUserEmails.has(emailKey)) {
            const targetId = userEmailToIdMap[emailKey];
            idMappings[record.id] = targetId;
            console.log(`ℹ️  [MIGRATION] Mapping user ${record.id} to existing user ${targetId} (matched email: ${record.email})`);
            continue;
          }

          // Check for firebase_uid duplicate
          if (insertedUserUids.has(uidKey)) {
            const targetId = userUidToIdMap[uidKey];
            idMappings[record.id] = targetId;
            console.log(`ℹ️  [MIGRATION] Mapping user ${record.id} to existing user ${targetId} (matched firebase_uid: ${record.firebase_uid})`);
            continue;
          }

          // Record new user to mapping pools
          insertedUserEmails.add(emailKey);
          insertedUserUids.add(uidKey);
          userEmailToIdMap[emailKey] = record.id;
          userUidToIdMap[uidKey] = record.id;
          idMappings[record.id] = record.id;
        }

        // Apply ID mappings for foreign keys on other tables
        mappedRecord = mapRowKeys(tableName, mappedRecord);

        // Handle settings uniqueness on user_id
        if (tableName === 'settings') {
          if (insertedSettingsUsers.has(mappedRecord.user_id)) {
            console.log(`ℹ️  [MIGRATION] Skipping duplicate settings record for user ${mappedRecord.user_id}`);
            continue;
          }
          insertedSettingsUsers.add(mappedRecord.user_id);
        }

        const recordKeys = Object.keys(mappedRecord).filter(key => allowedCols.includes(key));
        if (recordKeys.length === 0) continue;

        const values = recordKeys.map(key => {
          let val = mappedRecord[key];
          if (tableName === 'settings' && (key === 'api_keys' || key === 'notification_settings')) {
            val = cleanJsonField(val);
            return JSON.stringify(val);
          }
          return val;
        });

        const columnsStr = recordKeys.join(', ');
        const placeholdersStr = recordKeys.map((_, idx) => `$${idx + 1}`).join(', ');

        const query = `
          INSERT INTO ${tableName} (${columnsStr})
          VALUES (${placeholdersStr})
          ON CONFLICT (id) DO NOTHING
        `;

        try {
          const res = await client.query(query, values);
          if (res.rowCount > 0) {
            importCounts[tableName]++;
          }
        } catch (err) {
          console.warn(`⚠️  [MIGRATION] Skipping row in ${tableName} with ID ${record.id} due to database error: ${err.message}`);
        }
      }
    }

    // 4. Mark migration as completed
    await client.query(`
      INSERT INTO migration_history (name) VALUES ('import_emulated_db')
      ON CONFLICT (name) DO NOTHING
    `);

    console.log("\n✅ [MIGRATION] Data migration completed successfully.");
    console.log("\nMigration Results:");
    for (const tableName of TABLE_ORDER) {
      console.log(`- ${tableName}: ${importCounts[tableName]} records imported`);
    }

  } catch (err) {
    console.error("❌ [MIGRATION ERROR] Fatal error during migration:", err.message);
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
    console.log("🔌 [MIGRATION] Database pool closed.");
  }
}

runMigration();
