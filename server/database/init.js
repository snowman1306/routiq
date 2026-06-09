const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const isLocal = !process.env.DATABASE_URL || 
  process.env.DATABASE_URL.includes('localhost') || 
  process.env.DATABASE_URL.includes('127.0.0.1');

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: isLocal ? false : { rejectUnauthorized: false }
    })
  : new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'habit_tracker',
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT || 5432,
    });

async function initDatabase() {
  console.log('Starting database initialization...');
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(schema);

    // Add any missing columns safely
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT NULL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS coaching_personality VARCHAR(30) DEFAULT 'supportive';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS friction_threshold INTEGER DEFAULT 3;
      ALTER TABLE garden_plants ADD COLUMN IF NOT EXISTS growth_cycle_number INTEGER DEFAULT 1;
      ALTER TABLE garden_plants ADD COLUMN IF NOT EXISTS growth_stage_reached INTEGER DEFAULT 0;
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    throw error;
  }
}

module.exports = { pool, initDatabase };