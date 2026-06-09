const express = require('express');
const { pool } = require('../database/init');
const authenticate = require('../middleware/auth');

const router = express.Router();

// Log mood
router.post('/', authenticate, async (req, res) => {
  try {
    const { log_date, mood, stress_level, notes } = req.body;

    if (!log_date || !mood) {
      return res.status(400).json({ error: 'Date and mood are required' });
    }

    const result = await pool.query(
      `INSERT INTO mood_logs (user_id, log_date, mood, stress_level, notes)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, log_date)
       DO UPDATE SET
         mood = EXCLUDED.mood,
         stress_level = EXCLUDED.stress_level,
         notes = EXCLUDED.notes
       RETURNING *`,
      [req.user.id, log_date, mood, stress_level || null, notes || null]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Log mood error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get mood logs
router.get('/', authenticate, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let query = 'SELECT * FROM mood_logs WHERE user_id = $1';
    const params = [req.user.id];

    if (start_date && end_date) {
      query += ' AND log_date BETWEEN $2 AND $3';
      params.push(start_date, end_date);
    }

    query += ' ORDER BY log_date DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get mood logs error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

