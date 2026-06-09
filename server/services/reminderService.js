const cron = require('node-cron');
const { pool } = require('../database/init');

async function createNotificationIfMissing(userId, habitId, message, type) {
  const existing = await pool.query(
    `SELECT id
     FROM notifications
     WHERE user_id = $1
       AND habit_id IS NOT DISTINCT FROM $2
       AND notification_type = $3
       AND DATE(created_at) = CURRENT_DATE
     LIMIT 1`,
    [userId, habitId || null, type]
  );

  if (existing.rows.length > 0) {
    return;
  }

  await pool.query(
    'INSERT INTO notifications (user_id, habit_id, message, notification_type) VALUES ($1, $2, $3, $4)',
    [userId, habitId || null, message, type]
  );
}

async function sendDailyReminders() {
  try {
    const usersResult = await pool.query(
      'SELECT id, username, reminder_enabled FROM users WHERE reminder_enabled = true'
    );

    const today = new Date().toISOString().split('T')[0];

    for (const user of usersResult.rows) {
      const habitsResult = await pool.query(
        'SELECT id, name, current_goal FROM habits WHERE user_id = $1 AND is_active = true',
        [user.id]
      );

      if (habitsResult.rows.length === 0) {
        continue;
      }

      const todayLogsResult = await pool.query(
        'SELECT COUNT(*) as count FROM habit_logs WHERE user_id = $1 AND log_date = $2',
        [user.id, today]
      );

      const hasLoggedToday = parseInt(todayLogsResult.rows[0].count, 10) > 0;

      if (!hasLoggedToday) {
        const habitSummary = habitsResult.rows
          .slice(0, 3)
          .map((habit) => habit.name)
          .join(', ');
        const message = `Today's garden still needs attention. Check in on: ${habitSummary}.`;
        await createNotificationIfMissing(user.id, null, message, 'daily_summary');
      }
    }

    console.log('Daily reminders sent');
  } catch (error) {
    console.error('Error sending reminders:', error);
  }
}

async function sendHabitTimeReminders() {
  try {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now
      .getMinutes()
      .toString()
      .padStart(2, '0')}:00`;
    const today = now.toISOString().split('T')[0];

    const result = await pool.query(
      `SELECT h.id, h.name, h.current_goal, h.habit_time, u.id as user_id
       FROM habits h
       JOIN users u ON u.id = h.user_id
       WHERE h.is_active = true
         AND h.habit_time = $1
         AND u.reminder_enabled = true`,
      [currentTime]
    );

    for (const habit of result.rows) {
      const logResult = await pool.query(
        `SELECT id
         FROM habit_logs
         WHERE habit_id = $1 AND user_id = $2 AND log_date = $3
         LIMIT 1`,
        [habit.id, habit.user_id, today]
      );

      if (logResult.rows.length > 0) {
        continue;
      }

      const message = habit.current_goal
        ? `It's time for ${habit.name}. Current goal: ${habit.current_goal}.`
        : `It's time for ${habit.name}.`;

      await createNotificationIfMissing(habit.user_id, habit.id, message, 'habit_time');
    }
  } catch (error) {
    console.error('Error sending habit-time reminders:', error);
  }
}

async function sendGoalWindowPrompts() {
  try {
    const result = await pool.query(
      `SELECT h.id, h.name, h.current_goal, h.current_goal_due_at, h.user_id
       FROM habits h
       JOIN users u ON u.id = h.user_id
       WHERE h.is_active = true
         AND h.current_goal_completed = false
         AND h.current_goal_due_at IS NOT NULL
         AND h.current_goal_due_at <= NOW()
         AND h.goal_reminder_sent_at IS NULL
         AND u.reminder_enabled = true`
    );

    for (const habit of result.rows) {
      const message = `Goal check for ${habit.name}: did you complete "${habit.current_goal || 'this milestone'}" within the window? Open the registry to confirm and claim the reward.`;

      await pool.query(
        'UPDATE habits SET goal_reminder_sent_at = NOW() WHERE id = $1',
        [habit.id]
      );

      await createNotificationIfMissing(habit.user_id, habit.id, message, 'goal_window');
    }
  } catch (error) {
    console.error('Error sending goal-window prompts:', error);
  }
}

// Only schedule cron jobs outside Vercel serverless
if (!process.env.VERCEL) {
  cron.schedule('* * * * *', async () => {
    await sendHabitTimeReminders();
    await sendGoalWindowPrompts();
  });

  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:00:00`;

      const usersResult = await pool.query(
        'SELECT id FROM users WHERE reminder_enabled = true AND reminder_time = $1',
        [currentTime]
      );

      if (usersResult.rows.length > 0) {
        await sendDailyReminders();
      }
    } catch (error) {
      console.error('Error in reminder cron job:', error);
    }
  });

  cron.schedule('0 9 * * *', sendDailyReminders);
}

function start() {
  console.log('Reminder service started');
}

module.exports = {
  start,
  sendDailyReminders,
  sendHabitTimeReminders,
  sendGoalWindowPrompts
};
