const { pool } = require('../database/init');

async function analyzeHabitConsistency(habitId, userId) {
  try {
    // Get habit details
    const habitResult = await pool.query(
      'SELECT * FROM habits WHERE id = $1 AND user_id = $2',
      [habitId, userId]
    );

    if (habitResult.rows.length === 0) {
      throw new Error('Habit not found');
    }

    const habit = habitResult.rows[0];

    const habitCreatedAt = new Date(habit.created_at);
    habitCreatedAt.setHours(0, 0, 0, 0);
    
    // Get logs from last 14 days
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    
    const analysisStartDate = new Date(Math.max(fourteenDaysAgo.getTime(), habitCreatedAt.getTime()));

    const logsResult = await pool.query(
      `SELECT log_date, completion_percentage 
       FROM habit_logs 
       WHERE habit_id = $1 AND log_date >= $2
       ORDER BY log_date DESC`,
      [habitId, analysisStartDate.toISOString().split('T')[0]]
    );

    const logs = logsResult.rows;
    
    // Calculate actual age of the habit in days (up to 14)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const totalDays = Math.max(1, Math.floor((today - analysisStartDate) / (1000 * 60 * 60 * 24)) + 1);
    
    const completedDays = logs.filter(log => log.completion_percentage > 0).length;
    const completionRate = (completedDays / totalDays) * 100;

    // Check for gaps (missing days)
    const logDates = new Set(logs.map(log => new Date(log.log_date).toISOString().split('T')[0]));
    
    let missingDays = 0;
    for (let i = 0; i < totalDays; i++) {
      const checkDate = new Date(analysisStartDate);
      checkDate.setDate(checkDate.getDate() + i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      if (!logDates.has(dateStr)) {
        missingDays++;
      }
    }

    // Consider inconsistent if:
    // - Habit is at least 3 days old (grace period)
    // - AND Completion rate < 50% OR more than 3 consecutive missing days
    const isInconsistent = totalDays >= 3 && (completionRate < 50 || missingDays >= 3);

    return {
      habitId,
      completionRate: Math.round(completionRate),
      completedDays,
      totalDays,
      missingDays,
      isInconsistent,
      logs: logs.slice(0, 7) // Last 7 days
    };
  } catch (error) {
    console.error('Consistency analysis error:', error);
    throw error;
  }
}

module.exports = { analyzeHabitConsistency };

