const express = require('express');
const { pool } = require('../database/init');
const authenticate = require('../middleware/auth');
const { analyzeHabitConsistency } = require('../services/consistencyService');
const { getPlantCatalog, canUsePlant, getPlantById } = require('../services/plantCatalog');

const router = express.Router();

function normalizeWindowDays(value) {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return 1;
  }

  return Math.min(Math.max(parsed, 1), 30);
}

function calculateGoalDueAt(startDate = new Date(), windowDays = 1) {
  const dueDate = new Date(startDate);
  dueDate.setDate(dueDate.getDate() + windowDays);
  return dueDate;
}

async function getUserPlantCount(userId) {
  const result = await pool.query(
    'SELECT plants_fully_grown FROM users WHERE id = $1',
    [userId]
  );

  return result.rows[0]?.plants_fully_grown || 0;
}

// Get plant catalog with unlock status
router.get('/plant-catalog', authenticate, async (req, res) => {
  try {
    const plantsFullyGrown = await getUserPlantCount(req.user.id);
    res.json({
      plants_fully_grown: plantsFullyGrown,
      catalog: getPlantCatalog(plantsFullyGrown)
    });
  } catch (error) {
    console.error('Get plant catalog error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all habits for user
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM habits WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get habits error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single habit
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM habits WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get habit error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create habit with milestone and plant settings
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      name,
      description,
      when_specifically,
      what_motivating,
      what_hindering,
      whom_tell,
      who_inspires,
      milestones,
      treat_myself,
      habit_time,
      current_goal,
      current_reward,
      goal_window_days,
      selected_plant_type
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Habit name is required' });
    }

    const plantsFullyGrown = await getUserPlantCount(req.user.id);
    const chosenPlant = selected_plant_type || 'fern';
    if (!canUsePlant(chosenPlant, plantsFullyGrown)) {
      return res.status(400).json({ error: 'Selected plant is still locked' });
    }

    const windowDays = normalizeWindowDays(goal_window_days);
    const goalStart = new Date();
    const goalDueAt = calculateGoalDueAt(goalStart, windowDays);

    const result = await pool.query(
      `INSERT INTO habits (
        user_id, name, description, when_specifically, what_motivating,
        what_hindering, whom_tell, who_inspires, milestones, treat_myself,
        habit_time, current_goal, current_reward, goal_window_days,
        current_goal_started_at, current_goal_due_at, selected_plant_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        req.user.id,
        name,
        description || null,
        when_specifically || null,
        what_motivating || null,
        what_hindering || null,
        whom_tell || null,
        who_inspires || null,
        milestones || null,
        treat_myself || null,
        habit_time || null,
        current_goal || milestones || null,
        current_reward || treat_myself || null,
        windowDays,
        goalStart.toISOString(),
        goalDueAt.toISOString(),
        chosenPlant
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create habit error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update habit
router.put('/:id', authenticate, async (req, res) => {
  try {
    const {
      name,
      description,
      when_specifically,
      what_motivating,
      what_hindering,
      whom_tell,
      who_inspires,
      milestones,
      treat_myself,
      is_active,
      continue_reason,
      failure_analysis,
      habit_time,
      current_goal,
      current_reward,
      goal_window_days,
      selected_plant_type,
      reset_goal_window
    } = req.body;

    const existingResult = await pool.query(
      'SELECT * FROM habits WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    if (selected_plant_type !== undefined) {
      const plantsFullyGrown = await getUserPlantCount(req.user.id);
      if (!canUsePlant(selected_plant_type, plantsFullyGrown)) {
        return res.status(400).json({ error: 'Selected plant is still locked' });
      }
    }

    const updates = [];
    const values = [];
    let paramCount = 1;

    const pushUpdate = (field, value) => {
      updates.push(`${field} = $${paramCount++}`);
      values.push(value);
    };

    if (name !== undefined) pushUpdate('name', name);
    if (description !== undefined) pushUpdate('description', description);
    if (when_specifically !== undefined) pushUpdate('when_specifically', when_specifically);
    if (what_motivating !== undefined) pushUpdate('what_motivating', what_motivating);
    if (what_hindering !== undefined) pushUpdate('what_hindering', what_hindering);
    if (whom_tell !== undefined) pushUpdate('whom_tell', whom_tell);
    if (who_inspires !== undefined) pushUpdate('who_inspires', who_inspires);
    if (milestones !== undefined) pushUpdate('milestones', milestones);
    if (treat_myself !== undefined) pushUpdate('treat_myself', treat_myself);
    if (is_active !== undefined) pushUpdate('is_active', is_active);
    if (continue_reason !== undefined) pushUpdate('continue_reason', continue_reason);
    if (failure_analysis !== undefined) pushUpdate('failure_analysis', failure_analysis);
    if (habit_time !== undefined) pushUpdate('habit_time', habit_time || null);
    if (current_goal !== undefined) pushUpdate('current_goal', current_goal);
    if (current_reward !== undefined) pushUpdate('current_reward', current_reward);
    if (selected_plant_type !== undefined) pushUpdate('selected_plant_type', selected_plant_type);

    let windowDays;
    if (goal_window_days !== undefined) {
      windowDays = normalizeWindowDays(goal_window_days);
      pushUpdate('goal_window_days', windowDays);
    }

    if (
      reset_goal_window ||
      current_goal !== undefined ||
      current_reward !== undefined ||
      goal_window_days !== undefined
    ) {
      const goalStart = new Date();
      const effectiveWindow = windowDays || normalizeWindowDays(existingResult.rows[0].goal_window_days);
      pushUpdate('current_goal_started_at', goalStart.toISOString());
      pushUpdate('current_goal_due_at', calculateGoalDueAt(goalStart, effectiveWindow).toISOString());
      pushUpdate('current_goal_completed', false);
      pushUpdate('goal_reminder_sent_at', null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(req.params.id, req.user.id);

    const result = await pool.query(
      `UPDATE habits SET ${updates.join(', ')}
       WHERE id = $${paramCount++} AND user_id = $${paramCount++}
       RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update habit error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Complete current milestone and set up the next one
router.post('/:id/complete-milestone', authenticate, async (req, res) => {
  try {
    const {
      next_goal,
      next_reward,
      goal_window_days,
      habit_time,
      selected_plant_type
    } = req.body;

    if (!next_goal || !next_reward) {
      return res.status(400).json({ error: 'Next goal and reward are required' });
    }

    const habitResult = await pool.query(
      'SELECT * FROM habits WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (habitResult.rows.length === 0) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    const habit = habitResult.rows[0];
    if (!habit.current_goal_due_at) {
      return res.status(400).json({ error: 'Milestone can only be claimed on its due date' });
    }

    const dueDate = new Date(habit.current_goal_due_at);
    const today = new Date();
    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    if (dueDate.getTime() !== today.getTime()) {
      return res.status(400).json({ error: 'Milestone can only be claimed on its due date' });
    }

    const userPlantCount = await getUserPlantCount(req.user.id);
    const currentPlantType = habit.selected_plant_type || 'fern';
    if (!canUsePlant(currentPlantType, userPlantCount)) {
      return res.status(400).json({ error: 'Current plant is no longer available' });
    }

    const now = new Date();
    const windowDays = normalizeWindowDays(goal_window_days || habit.goal_window_days || 1);
    const achievedInWindow = !habit.current_goal_due_at || new Date(habit.current_goal_due_at) >= now;
    const growthIncrease = achievedInWindow ? 3 : 1;
    const currentPlantGrowthTarget = getPlantById(currentPlantType).growthTarget || 12;

    let nextGrowthStage = (habit.growth_stage || 0) + growthIncrease;
    let fullyGrown = false;
    let newFullyGrownCount = habit.fully_grown_count || 0;
    let updatedUserPlantCount = userPlantCount;

    if (nextGrowthStage >= currentPlantGrowthTarget) {
      fullyGrown = true;
      nextGrowthStage -= currentPlantGrowthTarget;
      newFullyGrownCount += 1;
      updatedUserPlantCount += 1;

      await pool.query(
        `INSERT INTO garden_plants (user_id, habit_id, habit_name, plant_type, milestone_number, reward_given, growth_cycle_number, growth_stage_reached)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          req.user.id,
          habit.id,
          habit.name,
          currentPlantType,
          (habit.milestones_achieved || 0) + 1,
          habit.current_reward || null,
          newFullyGrownCount,
          currentPlantGrowthTarget
        ]
      );

      await pool.query(
        'UPDATE users SET plants_fully_grown = plants_fully_grown + 1 WHERE id = $1',
        [req.user.id]
      );
    }

    const nextPlantType = selected_plant_type || currentPlantType;
    if (!canUsePlant(nextPlantType, updatedUserPlantCount)) {
      return res.status(400).json({ error: 'Selected plant is still locked' });
    }

    const goalStart = now.toISOString();
    const goalDueAt = calculateGoalDueAt(now, windowDays).toISOString();
    const nextPlantCatalog = getPlantCatalog(updatedUserPlantCount);
    const newlyUnlockedPlants = nextPlantCatalog.filter(
      (plant) => plant.unlocked && plant.unlockCount > userPlantCount
    );

    const result = await pool.query(
      `UPDATE habits
       SET milestones_achieved = $1,
           growth_stage = $2,
           fully_grown_count = $3,
           current_goal = $4,
           current_reward = $5,
           goal_window_days = $6,
           current_goal_started_at = $7,
           current_goal_due_at = $8,
           current_goal_completed = false,
           goal_reminder_sent_at = null,
           last_reward_claimed_at = $9,
           habit_time = $10,
           selected_plant_type = $11
       WHERE id = $12 AND user_id = $13
       RETURNING *`,
      [
        (habit.milestones_achieved || 0) + 1,
        nextGrowthStage,
        newFullyGrownCount,
        next_goal,
        next_reward,
        windowDays,
        goalStart,
        goalDueAt,
        now.toISOString(),
        habit_time || habit.habit_time || null,
        nextPlantType,
        habit.id,
        req.user.id
      ]
    );

    await pool.query(
      `INSERT INTO notifications (user_id, habit_id, message, notification_type)
       VALUES ($1, $2, $3, $4)`,
      [
        req.user.id,
        habit.id,
        fullyGrown
          ? `Reward unlocked for ${habit.name}: ${habit.current_reward || 'Celebrate your milestone'}. Your ${currentPlantType} is now fully grown and has been added to your garden.`
          : `Reward unlocked for ${habit.name}: ${habit.current_reward || 'Celebrate your milestone'}.`,
        'reward'
      ]
    );

    res.json({
      habit: result.rows[0],
      achieved_in_window: achievedInWindow,
      growth_increase: growthIncrease,
      fully_grown: fullyGrown,
      plants_fully_grown: updatedUserPlantCount,
      current_plant_growth_target: currentPlantGrowthTarget,
      completed_plant_type: currentPlantType,
      next_plant_type: nextPlantType,
      habit_name: habit.name,
      reward_claimed: habit.current_reward || null,
      unlocked_plants: nextPlantCatalog.filter((plant) => plant.unlocked),
      plant_catalog: nextPlantCatalog,
      newly_unlocked_plants: newlyUnlockedPlants
    });
  } catch (error) {
    console.error('Complete milestone error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete habit
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM habits WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    res.json({ message: 'Habit deleted successfully' });
  } catch (error) {
    console.error('Delete habit error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Analyze habit consistency
router.get('/:id/consistency', authenticate, async (req, res) => {
  try {
    const habitId = req.params.id;

    const habitCheck = await pool.query(
      'SELECT id FROM habits WHERE id = $1 AND user_id = $2',
      [habitId, req.user.id]
    );

    if (habitCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    const analysis = await analyzeHabitConsistency(habitId, req.user.id);
    res.json(analysis);
  } catch (error) {
    console.error('Consistency analysis error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Replant a fully grown plant without milestone logic
router.post('/:id/replant', authenticate, async (req, res) => {
  try {
    const { selected_plant_type } = req.body;

    const habitResult = await pool.query(
      'SELECT * FROM habits WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (habitResult.rows.length === 0) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    const habit = habitResult.rows[0];
    const userPlantCount = await getUserPlantCount(req.user.id);
    const currentPlantType = habit.selected_plant_type || 'fern';
    const currentPlantGrowthTarget = getPlantById(currentPlantType).growthTarget || 12;

    if ((habit.growth_stage || 0) < currentPlantGrowthTarget) {
      return res.status(400).json({ error: 'Plant is not fully grown yet' });
    }

    let nextGrowthStage = (habit.growth_stage || 0) - currentPlantGrowthTarget;
    let newFullyGrownCount = (habit.fully_grown_count || 0) + 1;
    let updatedUserPlantCount = userPlantCount + 1;

    // Archive plant in garden
    await pool.query(
      `INSERT INTO garden_plants (user_id, habit_id, habit_name, plant_type, milestone_number, reward_given, growth_cycle_number, growth_stage_reached)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        req.user.id,
        habit.id,
        habit.name,
        currentPlantType,
        habit.milestones_achieved || 0,
        null,
        newFullyGrownCount,
        currentPlantGrowthTarget
      ]
    );

    await pool.query(
      'UPDATE users SET plants_fully_grown = plants_fully_grown + 1 WHERE id = $1',
      [req.user.id]
    );

    const nextPlantType = selected_plant_type || currentPlantType;
    if (!canUsePlant(nextPlantType, updatedUserPlantCount)) {
      return res.status(400).json({ error: 'Selected plant is locked' });
    }

    const result = await pool.query(
      `UPDATE habits
       SET growth_stage = $1,
           fully_grown_count = $2,
           selected_plant_type = $3
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [
        nextGrowthStage,
        newFullyGrownCount,
        nextPlantType,
        habit.id,
        req.user.id
      ]
    );

    const nextPlantCatalog = getPlantCatalog(updatedUserPlantCount);
    const newlyUnlockedPlants = nextPlantCatalog.filter(
      (plant) => plant.unlocked && plant.unlockCount > userPlantCount
    );

    res.json({
      habit: result.rows[0],
      fully_grown: true,
      plants_fully_grown: updatedUserPlantCount,
      current_plant_growth_target: currentPlantGrowthTarget,
      completed_plant_type: currentPlantType,
      next_plant_type: nextPlantType,
      habit_name: habit.name,
      unlocked_plants: nextPlantCatalog.filter((plant) => plant.unlocked),
      plant_catalog: nextPlantCatalog,
      newly_unlocked_plants: newlyUnlockedPlants
    });
  } catch (error) {
    console.error('Replant error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
