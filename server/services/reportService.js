const { pool } = require('../database/init');

async function generateWeeklyReport(userId, weekStart, weekEnd) {
  try {
    // Get all active habits
    const habitsResult = await pool.query(
      'SELECT id, name FROM habits WHERE user_id = $1 AND is_active = true',
      [userId]
    );

    const habits = habitsResult.rows;
    const totalHabits = habits.length;

    // Get logs for the week
    const logsResult = await pool.query(
      `SELECT hl.*, h.name as habit_name
       FROM habit_logs hl
       JOIN habits h ON hl.habit_id = h.id
       WHERE hl.user_id = $1 
       AND hl.log_date BETWEEN $2 AND $3
       ORDER BY hl.log_date, h.name`,
      [userId, weekStart, weekEnd]
    );

    const logs = logsResult.rows;

    // Calculate statistics per habit
    const habitStats = {};
    habits.forEach(habit => {
      habitStats[habit.id] = {
        name: habit.name,
        completions: 0,
        totalDays: 0,
        moods: [],
        stressLevels: [],
        completionPercentages: []
      };
    });

    logs.forEach(log => {
      if (habitStats[log.habit_id]) {
        habitStats[log.habit_id].totalDays++;
        if (log.completion_percentage > 0) {
          habitStats[log.habit_id].completions++;
        }
        if (log.mood) {
          habitStats[log.habit_id].moods.push(log.mood);
        }
        if (log.stress_level) {
          habitStats[log.habit_id].stressLevels.push(log.stress_level);
        }
        habitStats[log.habit_id].completionPercentages.push(log.completion_percentage);
      }
    });

    // Determine consistent vs inconsistent habits
    const consistentHabits = [];
    const inconsistentHabits = [];

    Object.values(habitStats).forEach(stat => {
      const consistencyRate = stat.totalDays > 0 ? (stat.completions / stat.totalDays) * 100 : 0;
      if (consistencyRate >= 70) {
        consistentHabits.push(stat);
      } else {
        inconsistentHabits.push(stat);
      }
    });

    // Calculate average mood and stress
    const allMoods = logs.filter(l => l.mood).map(l => l.mood);
    const allStressLevels = logs.filter(l => l.stress_level).map(l => l.stress_level);
    
    const moodCounts = {};
    allMoods.forEach(mood => {
      moodCounts[mood] = (moodCounts[mood] || 0) + 1;
    });

    const averageMood = Object.keys(moodCounts).reduce((a, b) => 
      moodCounts[a] > moodCounts[b] ? a : b, Object.keys(moodCounts)[0] || 'N/A'
    );

    const averageStress = allStressLevels.length > 0
      ? (allStressLevels.reduce((a, b) => a + b, 0) / allStressLevels.length).toFixed(2)
      : null;

    // Prepare chart data
    const habitCompletionData = Object.values(habitStats).map(stat => ({
      name: stat.name,
      completions: stat.completions,
      totalDays: stat.totalDays,
      consistency: stat.totalDays > 0 ? Math.round((stat.completions / stat.totalDays) * 100) : 0
    }));

    const moodDistributionData = Object.entries(moodCounts).map(([mood, count]) => ({
      name: mood,
      value: count
    }));

    const stressDistributionData = [1, 2, 3, 4, 5].map(level => ({
      level,
      count: allStressLevels.filter(s => s === level).length
    }));

    // Save report to database
    const reportData = {
      habitStats,
      habitCompletionData,
      moodDistributionData,
      stressDistributionData
    };

    await pool.query(
      `INSERT INTO weekly_reports (
        user_id, week_start_date, week_end_date, total_habits,
        consistent_habits, inconsistent_habits, total_completions,
        average_mood, average_stress, report_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (user_id, week_start_date)
      DO UPDATE SET
        total_habits = EXCLUDED.total_habits,
        consistent_habits = EXCLUDED.consistent_habits,
        inconsistent_habits = EXCLUDED.inconsistent_habits,
        total_completions = EXCLUDED.total_completions,
        average_mood = EXCLUDED.average_mood,
        average_stress = EXCLUDED.average_stress,
        report_data = EXCLUDED.report_data`,
      [
        userId, weekStart, weekEnd, totalHabits,
        consistentHabits.length, inconsistentHabits.length,
        logs.filter(l => l.completion_percentage > 0).length,
        averageMood, averageStress, JSON.stringify(reportData)
      ]
    );

    return {
      week_start: weekStart,
      week_end: weekEnd,
      total_habits: totalHabits,
      consistent_habits: consistentHabits.length,
      inconsistent_habits: inconsistentHabits.length,
      total_completions: logs.filter(l => l.completion_percentage > 0).length,
      average_mood: averageMood,
      average_stress: averageStress ? parseFloat(averageStress) : null,
      habit_completion_data: habitCompletionData,
      mood_distribution: moodDistributionData,
      stress_distribution: stressDistributionData,
      habit_stats: habitStats,
      consistent_habits_list: consistentHabits,
      inconsistent_habits_list: inconsistentHabits
    };
  } catch (error) {
    console.error('Generate weekly report error:', error);
    throw error;
  }
}

module.exports = { generateWeeklyReport };

