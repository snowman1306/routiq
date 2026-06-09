const express = require('express');
const { pool } = require('../database/init');
const authenticate = require('../middleware/auth');

const router = express.Router();

// Get all sub-tasks for a habit
router.get('/habit/:habit_id', authenticate, async (req, res) => {
  try {
    const { habit_id } = req.params;

    // Verify habit belongs to user
    const habitCheck = await pool.query(
      'SELECT id FROM habits WHERE id = $1 AND user_id = $2',
      [habit_id, req.user.id]
    );

    if (habitCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    const result = await pool.query(
      'SELECT * FROM sub_tasks WHERE habit_id = $1 ORDER BY order_index, created_at',
      [habit_id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get sub-tasks error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create sub-task
router.post('/', authenticate, async (req, res) => {
  try {
    const { habit_id, name, description, order_index } = req.body;

    if (!habit_id || !name) {
      return res.status(400).json({ error: 'Habit ID and name are required' });
    }

    // Verify habit belongs to user
    const habitCheck = await pool.query(
      'SELECT id FROM habits WHERE id = $1 AND user_id = $2',
      [habit_id, req.user.id]
    );

    if (habitCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    const result = await pool.query(
      'INSERT INTO sub_tasks (habit_id, name, description, order_index) VALUES ($1, $2, $3, $4) RETURNING *',
      [habit_id, name, description || null, order_index || 0]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create sub-task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update sub-task
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, description, is_completed, order_index } = req.body;
    const { id } = req.params;

    // Verify sub-task belongs to user's habit
    const subTaskCheck = await pool.query(
      `SELECT st.* FROM sub_tasks st
       JOIN habits h ON st.habit_id = h.id
       WHERE st.id = $1 AND h.user_id = $2`,
      [id, req.user.id]
    );

    if (subTaskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Sub-task not found' });
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (is_completed !== undefined) {
      updates.push(`is_completed = $${paramCount++}`);
      values.push(is_completed);
      if (is_completed) {
        updates.push(`completed_at = CURRENT_TIMESTAMP`);
      } else {
        updates.push(`completed_at = NULL`);
      }
    }
    if (order_index !== undefined) {
      updates.push(`order_index = $${paramCount++}`);
      values.push(order_index);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE sub_tasks SET ${updates.join(', ')} WHERE id = $${paramCount++} RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update sub-task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete sub-task
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify sub-task belongs to user's habit
    const subTaskCheck = await pool.query(
      `SELECT st.* FROM sub_tasks st
       JOIN habits h ON st.habit_id = h.id
       WHERE st.id = $1 AND h.user_id = $2`,
      [id, req.user.id]
    );

    if (subTaskCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Sub-task not found' });
    }

    await pool.query('DELETE FROM sub_tasks WHERE id = $1', [id]);

    res.json({ message: 'Sub-task deleted successfully' });
  } catch (error) {
    console.error('Delete sub-task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

