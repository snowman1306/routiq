const express = require('express');
const { pool } = require('../database/init');
const authenticate = require('../middleware/auth');
const { generateWeeklyReport } = require('../services/reportService');

const router = express.Router();

// Get weekly report
router.get('/weekly', authenticate, async (req, res) => {
  try {
    const { week_start } = req.query;
    
    let weekStartDate;
    if (week_start) {
      weekStartDate = new Date(week_start);
    } else {
      // Default to current week (Monday)
      const today = new Date();
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
      weekStartDate = new Date(today.setDate(diff));
      weekStartDate.setHours(0, 0, 0, 0);
    }

    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);

    const report = await generateWeeklyReport(
      req.user.id,
      weekStartDate.toISOString().split('T')[0],
      weekEndDate.toISOString().split('T')[0]
    );

    res.json(report);
  } catch (error) {
    console.error('Get weekly report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get multiple weeks for comparison
router.get('/weekly/compare', authenticate, async (req, res) => {
  try {
    const { weeks = 4 } = req.query;
    const numWeeks = parseInt(weeks);

    const userResult = await pool.query('SELECT created_at FROM users WHERE id = $1', [req.user.id]);
    const userCreatedAt = new Date(userResult.rows[0].created_at);
    userCreatedAt.setHours(0, 0, 0, 0);

    const reports = [];
    const today = new Date();
    
    for (let i = 0; i < numWeeks; i++) {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1) - (i * 7);
      
      const weekStart = new Date(today.getTime());
      weekStart.setDate(diff);
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      // Don't show archives for weeks before the user created their account
      if (weekEnd < userCreatedAt) {
        break;
      }

      const report = await generateWeeklyReport(
        req.user.id,
        weekStart.toISOString().split('T')[0],
        weekEnd.toISOString().split('T')[0]
      );

      reports.push({
        week_start: weekStart.toISOString().split('T')[0],
        week_end: weekEnd.toISOString().split('T')[0],
        ...report
      });
    }

    res.json(reports);
  } catch (error) {
    console.error('Get weekly comparison error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

