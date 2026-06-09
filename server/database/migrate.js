const { pool } = require('./init');

async function runMigrations() {
  console.log('Running database migrations...');
  try {
    // 1. Add coaching columns to users
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS coaching_personality VARCHAR(30) DEFAULT 'supportive',
      ADD COLUMN IF NOT EXISTS friction_threshold INTEGER DEFAULT 3;
    `);
    console.log('Users table upgraded successfully.');

    // 2. Create oracle_memories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS oracle_memories (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        embedding REAL[],
        category VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('oracle_memories table verified/created successfully.');
    
    console.log('Migrations completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

runMigrations();
