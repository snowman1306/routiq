const express = require('express');
const { pool } = require('../database/init');
const authenticate = require('../middleware/auth');
const { analyzeHabitConsistency } = require('../services/consistencyService');

const router = express.Router();

// Log habit completion
router.post('/', authenticate, async (req, res) => {
  try {
    const { habit_id, log_date, completion_percentage, mood, stress_level, notes } = req.body;

    if (!habit_id || !log_date) {
      return res.status(400).json({ error: 'Habit ID and date are required' });
    }

    // Verify habit belongs to user
    const habitCheck = await pool.query(
      'SELECT id FROM habits WHERE id = $1 AND user_id = $2',
      [habit_id, req.user.id]
    );

    if (habitCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    // Get existing log to check if this is new growth
    const existingLogResult = await pool.query(
      'SELECT completion_percentage FROM habit_logs WHERE habit_id = $1 AND log_date = $2',
      [habit_id, log_date]
    );
    const existingLog = existingLogResult.rows[0];

    // Insert or update log
    const result = await pool.query(
      `INSERT INTO habit_logs (habit_id, user_id, log_date, completion_percentage, mood, stress_level, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (habit_id, log_date)
       DO UPDATE SET
         completion_percentage = EXCLUDED.completion_percentage,
         mood = EXCLUDED.mood,
         stress_level = EXCLUDED.stress_level,
         notes = EXCLUDED.notes
       RETURNING *`,
      [
        habit_id, req.user.id, log_date,
        completion_percentage || 0,
        mood || null,
        stress_level || null,
        notes || null
      ]
    );

    // Update plant growth stage based on completion change
    const newCompletion = completion_percentage || 0;
    const oldCompletion = existingLog ? existingLog.completion_percentage : 0;

    const isNewGrowth = oldCompletion === 0 && newCompletion > 0;
    const isLostGrowth = oldCompletion > 0 && newCompletion === 0;

    if (isNewGrowth) {
      await pool.query('UPDATE habits SET growth_stage = COALESCE(growth_stage, 0) + 1 WHERE id = $1', [habit_id]);
    } else if (isLostGrowth) {
      await pool.query('UPDATE habits SET growth_stage = GREATEST(0, COALESCE(growth_stage, 0) - 1) WHERE id = $1', [habit_id]);
    }

    // Update habit statistics
    await updateHabitStats(habit_id, log_date);

    // Check consistency after logging
    const analysis = await analyzeHabitConsistency(habit_id, req.user.id);
    await pool.query(
      'UPDATE habits SET is_inconsistent = $1 WHERE id = $2',
      [analysis.isInconsistent, habit_id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Log habit error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get logs for a habit
router.get('/habit/:habit_id', authenticate, async (req, res) => {
  try {
    const { habit_id } = req.params;
    const { start_date, end_date } = req.query;

    let query = 'SELECT * FROM habit_logs WHERE habit_id = $1 AND user_id = $2';
    const params = [habit_id, req.user.id];

    if (start_date && end_date) {
      query += ' AND log_date BETWEEN $3 AND $4';
      params.push(start_date, end_date);
    }

    query += ' ORDER BY log_date DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all logs for user
router.get('/', authenticate, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let query = 'SELECT * FROM habit_logs WHERE user_id = $1';
    const params = [req.user.id];

    if (start_date && end_date) {
      query += ' AND log_date BETWEEN $2 AND $3';
      params.push(start_date, end_date);
    }

    query += ' ORDER BY log_date DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get all logs error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Helper function to update habit statistics
async function updateHabitStats(habitId, logDate) {
  try {
    // Get completion count for last 30 days
    const thirtyDaysAgo = new Date(logDate);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const completionResult = await pool.query(
      `SELECT COUNT(*) as count, MAX(log_date) as last_completed
       FROM habit_logs
       WHERE habit_id = $1 AND log_date >= $2 AND completion_percentage > 0`,
      [habitId, thirtyDaysAgo.toISOString().split('T')[0]]
    );

    const count = parseInt(completionResult.rows[0].count);
    const lastCompleted = completionResult.rows[0].last_completed;

    // Calculate consecutive days in JS for accuracy
    const logsRes = await pool.query(
      `SELECT log_date 
       FROM habit_logs 
       WHERE habit_id = $1 AND completion_percentage > 0
       ORDER BY log_date DESC`,
      [habitId]
    );
    
    const logDates = new Set(logsRes.rows.map(r => new Date(r.log_date).toISOString().split('T')[0]));
    
    let consecutiveDays = 0;
    let currentDate = new Date(logDate);
    currentDate.setHours(0, 0, 0, 0);

    // If the logDate itself is not in the logs (e.g. updating to 0 completion), streak from today is 0.
    // Otherwise count backwards.
    const logDateStr = currentDate.toISOString().split('T')[0];
    if (logDates.has(logDateStr)) {
      while (true) {
        const checkStr = currentDate.toISOString().split('T')[0];
        if (logDates.has(checkStr)) {
          consecutiveDays++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          break;
        }
      }
    }

    // Update habit
    await pool.query(
      `UPDATE habits 
       SET total_completions = $1, 
           consecutive_days = $2,
           last_completed_at = $3
       WHERE id = $4`,
      [count, consecutiveDays, lastCompleted, habitId]
    );
  } catch (error) {
    console.error('Update habit stats error:', error);
  }
}

module.exports = router;

