
// File: api/data_control/conn.js
import mysql from 'mysql2/promise';
import mosyDbConfig from '../s_env/assetguard_env';

const isLocal = process.env.NODE_ENV !== 'production';
const dbSettings = isLocal ? mosyDbConfig.local : mosyDbConfig.production;


// Export the DB name (for use in queries like `SELECT * FROM ${dbName}.table`)
const activeDB = dbSettings.DB_NAME;

export { dbSettings, activeDB };

console.log("🧪 DB Settings Loaded:", dbSettings);

export async function connectDB() {
  try {
    console.log("Connecting with settings:", {
      host: dbSettings.DB_HOST,
      user: dbSettings.DB_USER,
      db: dbSettings.DB_NAME
    });

    const conn = await mysql.createConnection({
      host: dbSettings.DB_HOST,
      user: dbSettings.DB_USER,
      password: dbSettings.DB_PASS,
      database: dbSettings.DB_NAME,
    });

    console.log(`✅ Connected to ${isLocal ? 'LOCAL' : 'PRODUCTION'} DB`);
    return conn;

  } catch (err) {
    console.error("❌ DB Connection Failed:", err);
    throw new Error("Could not connect to the database.");
  }
}
