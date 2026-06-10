const { pool } = require('../database/init');
const { getPlantCatalog, canUsePlant, getPlantById } = require('./plantCatalog');
const AnalysisEngine = require('./analysisEngine');
const MemoryService = require('./memoryService');
const { analyzeHabitConsistency } = require('./consistencyService');
require('dotenv').config();

// Groq API integration
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Gather a complete snapshot of a user's habit data for AI context.
 * This is the single source of truth the Oracle uses to personalise every response.
 */
async function getUserContext(userId) {
  // ── 1. User profile ──────────────────────────────────────────────
  const userRes = await pool.query(
    `SELECT id, username, created_at, plants_fully_grown, coaching_personality, friction_threshold
     FROM users WHERE id = $1`,
    [userId]
  );
  const user = userRes.rows[0];
  if (!user) throw new Error('User not found');

  const daysSinceJoined = Math.floor(
    (Date.now() - new Date(user.created_at).getTime()) / 86400000
  );

  // ── 2. All habits (active + inactive) ────────────────────────────
  const habitsRes = await pool.query(
    `SELECT id, name, description, is_active, consecutive_days,
            total_completions, growth_stage, milestones_achieved,
            is_inconsistent, selected_plant_type, current_goal,
            current_reward, habit_time, when_specifically,
            what_motivating, what_hindering, created_at,
            fully_grown_count
     FROM habits WHERE user_id = $1
     ORDER BY is_active DESC, created_at DESC`,
    [userId]
  );
  const habits = habitsRes.rows;
  const activeHabits = habits.filter(h => h.is_active);
  const inactiveHabits = habits.filter(h => !h.is_active);

  // ── 3. Logs from the last 30 days ────────────────────────────────
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const logsRes = await pool.query(
    `SELECT hl.habit_id, hl.log_date, hl.completion_percentage,
            hl.mood, hl.stress_level, hl.notes, h.name AS habit_name
     FROM habit_logs hl
     JOIN habits h ON hl.habit_id = h.id
     WHERE hl.user_id = $1 AND hl.log_date >= $2
     ORDER BY hl.log_date DESC`,
    [userId, thirtyDaysAgo.toISOString().split('T')[0]]
  );
  const logs = logsRes.rows || [];

  // ── 4. Per-habit stats (last 14 days) ────────────────────────────
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const recentLogs = logs.filter(
    l => new Date(l.log_date) >= fourteenDaysAgo
  );

  const habitStats = {};
  for (const h of activeHabits) {
    const hLogs = recentLogs.filter(l => l.habit_id === h.id);
    const completions = hLogs.filter(l => l.completion_percentage > 0).length;
    const fullCompletions = hLogs.filter(l => l.completion_percentage === 3).length;
    const moods = hLogs.filter(l => l.mood).map(l => l.mood);
    const stressLevels = hLogs.filter(l => l.stress_level).map(l => l.stress_level);

    habitStats[h.id] = {
      name: h.name,
      loggedDays: hLogs.length,
      completions,
      fullCompletions,
      completionRate: hLogs.length > 0
        ? Math.round((completions / 14) * 100)
        : 0,
      moods,
      avgStress: stressLevels.length > 0
        ? +(stressLevels.reduce((a, b) => a + b, 0) / stressLevels.length).toFixed(1)
        : null,
      mostCommonMood: modeMood(moods),
    };
  }

  // ── 5. Overall mood & stress distribution ────────────────────────
  const allMoods = logs.filter(l => l.mood).map(l => l.mood);
  const allStress = logs.filter(l => l.stress_level).map(l => l.stress_level);
  const moodDistribution = {};
  allMoods.forEach(m => { moodDistribution[m] = (moodDistribution[m] || 0) + 1; });

  // ── 6. Advanced behavioral metrics ───────────────────────────────
  const correlation = AnalysisEngine.calculateStressCorrelation(logs);
  const catalysts = AnalysisEngine.getCatalystHabits(logs, activeHabits);
  const dips = AnalysisEngine.getDayOfWeekWillpowerDips(logs);
  const burnoutStatus = AnalysisEngine.detectPreBurnoutSignal(logs);

  // ── 7. Garden ────────────────────────────────────────────────────
  const gardenRes = await pool.query(
    `SELECT plant_type, habit_name, milestone_number, grown_at
     FROM garden_plants WHERE user_id = $1
     ORDER BY grown_at DESC`,
    [userId]
  );

  return {
    user,
    daysSinceJoined,
    activeHabits,
    inactiveHabits,
    habitStats,
    moodDistribution,
    avgStress: allStress.length > 0
      ? +(allStress.reduce((a, b) => a + b, 0) / allStress.length).toFixed(1)
      : null,
    correlation,
    catalysts,
    dips,
    burnoutStatus,
    gardenPlants: gardenRes.rows,
    totalLogs: logs.length,
    rawLogs: logs
  };
}

function modeMood(moods) {
  if (moods.length === 0) return null;
  const counts = {};
  moods.forEach(m => { counts[m] = (counts[m] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function buildContextString(ctx) {
  const lines = [];

  lines.push(`=== USER PROFILE ===`);
  lines.push(`Username: ${ctx.user.username}`);
  lines.push(`Coaching personality preference: ${ctx.user.coaching_personality || 'supportive'}`);
  lines.push(`Member for: ${ctx.daysSinceJoined} days`);
  lines.push(`Plants fully grown (lifetime): ${ctx.user.plants_fully_grown || 0}`);
  lines.push(`Garden collection: ${ctx.gardenPlants.length} plants`);
  lines.push(`Total log entries (last 30 days): ${ctx.totalLogs}`);
  lines.push('');

  lines.push(`=== ADVANCED BEHAVIORAL ANALYTICS ===`);
  lines.push(`Pearson stress-to-completion correlation: ${ctx.correlation !== null ? ctx.correlation : 'insufficient data'}`);
  lines.push(`Pre-burnout status: ${ctx.burnoutStatus.preBurnout ? 'WARNING: High Fatigue Risk' : 'Healthy Consistency'}`);
  if (ctx.catalysts.length > 0) {
    lines.push(`Catalyst Keystone Habits:`);
    ctx.catalysts.forEach(c => {
      lines.push(`  - Completing "${c.catalyst}" raises "${c.target}" consistency by ${c.liftPercent}%`);
    });
  }
  if (ctx.dips.length > 0) {
    lines.push(`Weekly Willpower Dips (under 60% completion):`);
    ctx.dips.forEach(d => {
      lines.push(`  - ${d.day}s (${d.rate}% completion)`);
    });
  }
  lines.push('');

  lines.push(`=== ACTIVE HABITS (${ctx.activeHabits.length}) ===`);
  ctx.activeHabits.forEach(h => {
    const stats = ctx.habitStats[h.id] || {};
    lines.push(`- ${h.name}`);
    lines.push(`  Growth Vine: ${h.consecutive_days || 0} consecutive days`);
    lines.push(`  Total completions: ${h.total_completions || 0}`);
    lines.push(`  14-day completion rate: ${stats.completionRate || 0}%`);
    lines.push(`  Growth stage: ${h.growth_stage || 0}, Milestones: ${h.milestones_achieved || 0}`);
    lines.push(`  Plant: ${h.selected_plant_type || 'fern'}`);
    lines.push(`  Flagged inconsistent: ${h.is_inconsistent ? 'YES' : 'no'}`);
    if (h.current_goal) lines.push(`  Current goal: ${h.current_goal}`);
    if (h.habit_time) lines.push(`  Scheduled time: ${h.habit_time}`);
    if (h.what_motivating) lines.push(`  Motivation: ${h.what_motivating}`);
    if (h.what_hindering) lines.push(`  Hindrances: ${h.what_hindering}`);
    if (stats.mostCommonMood) lines.push(`  Most common mood while logging: ${stats.mostCommonMood}`);
    if (stats.avgStress !== null) lines.push(`  Avg stress while logging: ${stats.avgStress}/5`);
  });
  lines.push('');

  if (ctx.inactiveHabits.length > 0) {
    lines.push(`=== INACTIVE / PAUSED HABITS (${ctx.inactiveHabits.length}) ===`);
    ctx.inactiveHabits.forEach(h => {
      lines.push(`- ${h.name} (total completions: ${h.total_completions || 0})`);
    });
    lines.push('');
  }

  lines.push(`=== MOOD DISTRIBUTION (last 30 days) ===`);
  Object.entries(ctx.moodDistribution).forEach(([mood, count]) => {
    lines.push(`  ${mood}: ${count} logs`);
  });
  if (ctx.avgStress !== null) {
    lines.push(`  Average stress level: ${ctx.avgStress}/5`);
  }

  return lines.join('\n');
}

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

function detectHabitIntent(message) {
  const trimmed = String(message || '').trim();

  if (!trimmed) {
    return { type: 'none' };
  }

  const savePattern =
    /(confirm\s*(?:&|and)?\s*save|save\s*(?:and|&)\s*add|save\s*(?:to|into)\s*(?:tracker|registry)|confirm\s*(?:to)?\s*save|register\s*habit|yes,\s*save|yes save|go ahead and save)/i;

  if (savePattern.test(trimmed)) {
    return { type: 'confirm_save' };
  }

  const recommendationPatterns = [
    /\bwhat\s+habits?\b.*\b(?:recommend|suggest)\b/i,
    /\b(?:recommend|suggest)\b.*\bhabits?\b/i,
    /\bhabit\s+(?:ideas?|recommendations?|suggestions?)\b/i,
    /\b(?:some|any|new|other|different|few)\s+habits?\b/i,
    /\bwhat\s+should\s+i\s+add\b.*\b(?:tracker|registry)\b/i,
    /\bwhich\s+habits?\b.*\badd\b.*\b(?:tracker|registry)\b/i,
    /\bnew\s+user\b.*\bhabits?\b/i,
    /\bcomplementary\s+habits?\b/i
  ];

  if (recommendationPatterns.some((pattern) => pattern.test(trimmed))) {
    return { type: 'none' };
  }

  const createPatterns = [
    /^(?:can you\s+|could you\s+|please\s+)?(?:add|create|start|build)\s+(?:a|an|the)?\s*(?:habit\s+(?:called|named)\s+)?(?:"([^"\n]+)"|“([^”\n]+)”|([a-z0-9][a-z0-9 '&-]{1,80}?))(?=\s+(?:to\s+(?:my|the)?\s*(?:tracker|registry)|for\s+me|in\s+(?:my|the)?\s*(?:tracker|registry)|with\b|as\b)|[.!?]?\s*$)/i,
    /^(?:can you\s+|could you\s+|please\s+)?(?:my\s+new\s+habit\s+is|habit\s+(?:called|named))\s+(?:"([^"\n]+)"|“([^”\n]+)”|([a-z0-9][a-z0-9 '&-]{1,80}?))[.!?]?$/i
  ];

  for (const pattern of createPatterns) {
    const match = trimmed.match(pattern);

    if (!match) {
      continue;
    }

    const name = (match[1] || match[2] || match[3] || '').trim();

    if (name) {
      return { type: 'draft', habitName: name };
    }
  }

  return { type: 'none' };
}

function parseHabitDraftFromContent(content) {
  const labelMap = {
    'habit draft': 'name',
    'habit name': 'name',
    'description': 'description',
    'when specifically': 'when_specifically',
    'what motivating': 'what_motivating',
    "what's motivating me": 'what_motivating',
    'what motivates me': 'what_motivating',
    'what hindering': 'what_hindering',
    "what's hindering me": 'what_hindering',
    'whom to tell': 'whom_tell',
    'who inspires me': 'who_inspires',
    'who inspires': 'who_inspires',
    'my milestones are': 'milestones',
    'milestones': 'milestones',
    "i'm gonna treat myself with": 'treat_myself',
    'treat myself': 'treat_myself',
    'current goal': 'current_goal',
    'current reward': 'current_reward',
    'habit time': 'habit_time',
    'selected plant type': 'selected_plant_type',
    'plant type': 'selected_plant_type'
  };

  const fields = {};
  content.split(/\r?\n/).forEach((line) => {
    const parts = line.split(/:\s*/);
    if (parts.length < 2) return;
    const label = parts[0].trim().toLowerCase();
    const value = parts.slice(1).join(':').trim();
    const field = labelMap[label];
    if (field) {
      fields[field] = value;
    }
  });

  if (!fields.name) {
    const match = content.match(/Habit Draft\s*[:\-]\s*(.+)/i);
    if (match) {
      fields.name = match[1].trim();
    }
  }

  return fields;
}

async function createHabitInRegistry(userId, fields) {
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
  } = fields;

  if (!name || !name.trim()) {
    throw new Error('Habit name is required');
  }

  const plantsFullyGrown = await getUserPlantCount(userId);
  const chosenPlant = selected_plant_type || 'fern';
  if (!canUsePlant(chosenPlant, plantsFullyGrown)) {
    throw new Error('Selected plant is still locked');
  }

  const windowDays = normalizeWindowDays(goal_window_days || 1);
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
      userId,
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

  return result.rows[0];
}

async function createHabitFromHistory(userId, history) {
  const draftMessage = [...history].reverse().find((msg) => {
    return msg.role === 'assistant' && /habit draft/i.test(msg.content);
  }) || [...history].reverse().find((msg) => {
    return msg.role === 'assistant' && /description:/i.test(msg.content) && /when specifically:/i.test(msg.content);
  });

  if (!draftMessage) {
    throw new Error('I could not find a habit draft to save. Ask me to add a habit first, and I will generate the details for you.');
  }

  const draftFields = parseHabitDraftFromContent(draftMessage.content);
  if (!draftFields.name) {
    throw new Error('I found a draft but could not read the habit name. Please provide a habit name like "Add morning walk".');
  }

  return await createHabitInRegistry(userId, draftFields);
}

async function generateHabitDraftResponse(userId, habitName) {
  const suggestions = await generateHabitSuggestions(userId, habitName);

  const responseLines = [
    `Habit Draft: ${habitName}`,
    `Habit name: ${habitName}`,
    `Description: ${suggestions.description}`,
    `When specifically: ${suggestions.when_specifically}`,
    `What's motivating me: ${suggestions.what_motivating}`,
    `What's hindering me: ${suggestions.what_hindering}`,
    `Whom do I tell?: ${suggestions.whom_tell}`,
    `Who inspires me?: ${suggestions.who_inspires}`,
    `My milestones are: ${suggestions.milestones}`,
    `I'm gonna treat myself with: ${suggestions.treat_myself}`,
    `Current goal: ${suggestions.current_goal}`,
    `Current reward: ${suggestions.current_reward}`,
    `Habit time: ${suggestions.habit_time}`,
    `Which flower do you want for the habit? Choose one of your unlocked flowers.`,
    `Selected plant type: ${suggestions.selected_plant_type}`,
    ``,
    `Review these fields in the dropdown, edit anything you want, and use the green save button only when you're happy with it.`
  ];

  return responseLines.join('\n');
}

/**
 * Generate AI Insight Cards by analysing the user's data.
 * Merges high-performance mathematical statistics.
 */
async function generateInsights(userId) {
  const ctx = await getUserContext(userId);
  const insights = [];

  // ── Vine champion ──────────────────────────────────────────────
  const bestStreak = [...ctx.activeHabits].sort(
    (a, b) => (b.consecutive_days || 0) - (a.consecutive_days || 0)
  )[0];
  if (bestStreak && (bestStreak.consecutive_days || 0) >= 3) {
    insights.push({
      type: 'vine',
      iconName: 'flame',
      title: 'Vine Champion',
      body: `"${bestStreak.name}" has grown a ${bestStreak.consecutive_days}-day vine. This level of consistency rewires neural pathways — keep it growing.`,
      priority: bestStreak.consecutive_days >= 7 ? 'high' : 'medium',
    });
  }

  // ── Burnout signal ───────────────────────────────────────────────
  if (ctx.burnoutStatus.preBurnout) {
    insights.push({
      type: 'burnout',
      iconName: 'alert-triangle',
      title: 'Burnout Signal Detected',
      body: `Your average stress has spiked to ${ctx.burnoutStatus.score}/5 recently. Consider reducing habit difficulty or shortening your routine temporarily.`,
      priority: 'high',
    });
  }

  // ── Stress-completion correlation ────────────────────────────────
  if (ctx.correlation !== null && ctx.correlation <= -0.4) {
    insights.push({
      type: 'pattern',
      iconName: 'brain',
      title: 'Stress-Performance Pattern',
      body: `Your stress-to-completion correlation is strongly negative (${ctx.correlation}). On high stress days, your consistency significantly dips.`,
      priority: 'high',
    });
  }

  // ── Catalyst habits ──────────────────────────────────────────────
  if (ctx.catalysts.length > 0) {
    const topCat = ctx.catalysts[0];
    insights.push({
      type: 'pattern',
      iconName: 'zap',
      title: 'Keystone Habit Catalyst',
      body: `Completing your keystone habit "${topCat.catalyst}" raises consistency for "${topCat.target}" by ${topCat.liftPercent}% on the same day.`,
      priority: 'high',
    });
  }

  // ── Day of week dips ─────────────────────────────────────────────
  if (ctx.dips.length > 0) {
    const worstDip = ctx.dips[0];
    insights.push({
      type: 'timing',
      iconName: 'calendar',
      title: 'Willpower Dip Day',
      body: `Your consistency dips to ${worstDip.rate}% on ${worstDip.day}s. Consider planning lighter routines or scheduled rest days here.`,
      priority: 'medium',
    });
  }

  // ── Inconsistent habit warning ───────────────────────────────────
  // Dynamically recalculate to guarantee absolute data freshness
  const inconsistentHabits = [];
  for (const h of ctx.activeHabits) {
    try {
      const analysis = await analyzeHabitConsistency(h.id, userId);
      if (analysis.isInconsistent) {
        inconsistentHabits.push(h);
      }
    } catch (e) {
      if (h.is_inconsistent) inconsistentHabits.push(h); // fallback to cache on error
    }
  }
  if (inconsistentHabits.length > 0) {
    const names = inconsistentHabits.map(h => `"${h.name}"`).join(', ');
    insights.push({
      type: 'consistency',
      iconName: 'trending-down',
      title: 'Consistency Watch',
      body: `${names} ${inconsistentHabits.length === 1 ? 'has' : 'have'} been flagged as inconsistent. Small, daily micro-actions can rebuild momentum.`,
      priority: 'medium',
    });
  }

  // ── Emotional pattern ────────────────────────────────────────────
  const moodCounts = {};
  ctx.rawLogs.filter(l => l.mood).forEach(l => { moodCounts[l.mood] = (moodCounts[l.mood] || 0) + 1; });
  const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];
  if (topMood && topMood[1] >= 4) {
    insights.push({
      type: 'emotional',
      iconName: 'heart-pulse',
      title: 'Emotional Landscape',
      body: `Your dominant mood recently is "${topMood[0]}" (${topMood[1]} logs). ${topMood[0] === 'happy' || topMood[0] === 'motivated' ? 'Ride this wave — momentum is on your side.' : 'Be gentle with yourself. Consistency matters more than perfection.'}`,
      priority: 'medium',
    });
  }

  // ── Growth milestone approaching ─────────────────────────────────
  for (const h of ctx.activeHabits) {
    const growthTarget = getPlantById(h.selected_plant_type || 'fern').growthTarget || 12;
    const progress = ((h.growth_stage || 0) / growthTarget) * 100;
    if (progress >= 70 && progress < 100) {
      insights.push({
        type: 'milestone',
        iconName: 'sprout',
        title: 'Almost Bloomed',
        body: `"${h.name}" is at ${Math.round(progress)}% growth. A few more consistent days and your ${h.selected_plant_type || 'fern'} will be fully grown.`,
        priority: 'medium',
      });
    }
  }

  // Onboarding nudge
  if (ctx.activeHabits.length === 0) {
    insights.push({
      type: 'onboarding',
      iconName: 'leaf',
      title: 'Plant Your First Seed',
      body: 'Start with one small habit — something so easy you can\'t say no. Consistency with one is worth more than ambition with five.',
      priority: 'high',
    });
  }

  // ── Early-stage insights (for users with some data but below other thresholds) ──
  if (insights.length === 0 && ctx.totalLogs > 0) {
    // Active habit summary
    if (ctx.activeHabits.length > 0) {
      const names = ctx.activeHabits.map(h => `"${h.name}"`).join(', ');
      const totalCompletions = ctx.activeHabits.reduce((sum, h) => sum + (h.total_completions || 0), 0);
      insights.push({
        type: 'progress',
        iconName: 'sprout',
        title: 'Your Growth So Far',
        body: `You're actively tracking ${ctx.activeHabits.length} habit${ctx.activeHabits.length > 1 ? 's' : ''}: ${names}. ${totalCompletions} total completion${totalCompletions !== 1 ? 's' : ''} logged. Every entry builds your behavioral fingerprint.`,
        priority: 'medium',
      });
    }

    // Any vine at all
    const anyStreak = ctx.activeHabits.find(h => (h.consecutive_days || 0) >= 1);
    if (anyStreak) {
      insights.push({
        type: 'vine',
        iconName: 'flame',
        title: 'Vine Growing',
        body: `"${anyStreak.name}" has grown a ${anyStreak.consecutive_days}-day vine. The first few days are the hardest — you're laying the root foundation right now.`,
        priority: 'medium',
      });
    }

    // Mood snapshot
    if (Object.keys(ctx.moodDistribution).length > 0) {
      const topMoodEntry = Object.entries(ctx.moodDistribution).sort((a, b) => b[1] - a[1])[0];
      insights.push({
        type: 'emotional',
        iconName: 'heart-pulse',
        title: 'Mood Snapshot',
        body: `Your most logged mood so far is "${topMoodEntry[0]}". As more data flows in, I'll map how your emotional state correlates with habit performance.`,
        priority: 'low',
      });
    }

    // Average stress if present
    if (ctx.avgStress !== null) {
      insights.push({
        type: 'pattern',
        iconName: 'brain',
        title: 'Stress Baseline',
        body: `Your average stress level sits at ${ctx.avgStress}/5. I'm tracking this — in a few more days I can tell you exactly how stress impacts your consistency.`,
        priority: 'low',
      });
    }
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return insights.slice(0, 6);
}

/**
 * Next-Gen Conversational Companion Service using Google Gemini
 */
async function generateResponse(userId, message, history = []) {
  const ctx = await getUserContext(userId);
  const personality = ctx.user.coaching_personality || 'analytical';

  const habitIntent = detectHabitIntent(message);
  if (habitIntent.type === 'draft') {
    // Generate suggested draft and immediately create a habit record in the registry
    const suggestions = await generateHabitSuggestions(userId, habitIntent.habitName);
    // Build fields to persist using the suggestion object
    const draftFields = {
      name: habitIntent.habitName,
      description: suggestions.description,
      when_specifically: suggestions.when_specifically,
      what_motivating: suggestions.what_motivating,
      what_hindering: suggestions.what_hindering,
      whom_tell: suggestions.whom_tell,
      who_inspires: suggestions.who_inspires,
      milestones: suggestions.milestones,
      treat_myself: suggestions.treat_myself,
      current_goal: suggestions.current_goal,
      current_reward: suggestions.current_reward,
      habit_time: suggestions.habit_time,
      selected_plant_type: suggestions.selected_plant_type,
      goal_window_days: 1
    };

    let createdHabit = null;
    try {
      createdHabit = await createHabitInRegistry(userId, draftFields);
    } catch (err) {
      // if creation fails, fall back to returning the draft text without id
      const text = await generateHabitDraftResponse(userId, habitIntent.habitName);
      return text + `\n\n_Note: I couldn't auto-save this habit: ${err.message}_`;
    }

    // Compose a user-facing draft response that mirrors the saved habit and includes the habit id
    const responseLines = [
      `Habit Draft: ${createdHabit.name}`,
      `Habit name: ${createdHabit.name}`,
      `Description: ${createdHabit.description || ''}`,
      `When specifically: ${createdHabit.when_specifically || ''}`,
      `What's motivating me: ${createdHabit.what_motivating || ''}`,
      `What's hindering me: ${createdHabit.what_hindering || ''}`,
      `Whom do I tell?: ${createdHabit.whom_tell || ''}`,
      `Who inspires me?: ${createdHabit.who_inspires || ''}`,
      `My milestones are: ${createdHabit.milestones || ''}`,
      `I'm gonna treat myself with: ${createdHabit.treat_myself || ''}`,
      `Current goal: ${createdHabit.current_goal || ''}`,
      `Current reward: ${createdHabit.current_reward || ''}`,
      `Habit time: ${createdHabit.habit_time || ''}`,
      `Habit ID: ${createdHabit.id}`,
      ``,
      `These fields are editable in the chat. Edit any line, then click 'Confirm & save to tracker' to update the saved habit.`
    ];

    return responseLines.join('\n');
  }

  if (habitIntent.type === 'confirm_save') {
    try {
      const habit = await createHabitFromHistory(userId, history);
      return `Habit **${habit.name}** has been created and added to your registry. It is now ready for tracking and journaling. If you want to make edits, ask me to update any field before your next save.`;
    } catch (saveError) {
      return `I could not save the habit yet: ${saveError.message}`;
    }
  }

  // 1. Retrieve Semantic Memories (RAG)
  const recollections = await MemoryService.retrieveMemories(userId, message, 3);
  const recollectionText = recollections.length > 0
    ? recollections.map((m, idx) => `[RECOLLECTION #${idx+1}]: "${m.content}" (Category: ${m.category})`).join('\n')
    : 'No related memories found.';

  // 2. Save current user message asynchronously to memory
  MemoryService.saveMemory(userId, message, 'dialogue').catch(err => console.error('Failed to save dialogue memory:', err));

  // 3. System Prompt Engineering based on selected coaching personality
  const personalityPrompts = {
    supportive: `You are the Supportive Compassion Oracle. You are dealing with a user who may be feeling depreciative, depressed, or given up. Your role is to guide them with kindness, make them believe they are capable of change, and always try to make them think positive and give hope. You are empathetic, validating, and focused heavily on self-compassion, mindful recovery, and showing up for just 2 minutes on tough days. You recognize that consistency drops are natural during high stress, and you validate emotional headspace. You focus on removing shame, building gentle starting structures, and healing burnout. Always remind them that small steps matter and that they are worthy of growth.`,
    strict: `You are the Strict Accountability Oracle. You are dealing with a user who is motivated and determined to grow, but needs upfront and direct responses. You do not go easy on them - you give them the facts straight about exactly what they are doing wrong and what they have to do to fix it. You do not beat around the bush. You are a highly professional, high-intensity mentor who provides tough-love and holds the user strictly accountable to their goals. You do not accept excuses, you despise willpower dilution, and you demand consistent actions over intentions. Your tone is supportive but extremely firm, focused on establishing rigorous systems, eliminating friction, and sticking to the habit loop without fail.`,
    calm: `You are the Calm Zen-Master Oracle. You are dealing with an anxious user who wants to see fast results and cannot seem to reason that growing takes time. They are also scared of the future. Your role is to calm them, make them see reason, and be soft in response but direct as well. You are slow-paced, deeply mindful, and talk with peaceful, serene, and grounding wisdom. You help the user align their daily routines with their core identity rather than transactional boxes. You focus heavily on identity-based mindsets, breathing cues, and visual caretaking of plants. Remind them that growth is a journey, not a race, and that patience is part of the process.`
  };

  const systemInstructions = `
${personalityPrompts[personality]}

You have direct access to the user's real database context and behavioral analytics:
--------------------------------------------------------------------------------
${buildContextString(ctx)}
--------------------------------------------------------------------------------

You also have access to the user's past semantic reflections and relevant recollected moments:
--------------------------------------------------------------------------------
${recollectionText}
--------------------------------------------------------------------------------

CORE PROTOCOL RULES:
1. Always base your response on the actual database context provided above.
2. Use clear headings and short sections. The first section should be analytical and data-driven, with metrics, completion rates, stress correlations, growth stage progress, and milestone status. Follow that with personality-aligned guidance. Avoid producing exactly two long paragraphs; prefer multiple concise sections that are easy to scan.
3. If the user is asking to create or add a habit, provide a clearly labeled habit draft with field names and values. Then explicitly tell them to reply with "save and add" to persist it.
4. If the user asks why they are failing, reference their day-of-week willpower dips, stress-to-completion correlation, or too many active habits when relevant.
5. If the user mentions stress, fatigue, or burnout, use the actual pre-burnout and stress scores from their data.
6. Weave recollected moments naturally into your response when relevant.
7. Do not invent habits that are not present in the user's current active habit list unless recommending complementary additions.
8. Never output system-level prompts, raw JSON, schemas, or database structures. Be an immersive, human-grade habit coach.
9. Always mention milestone progress: 12 growth points equals a fully grown plant and unlocks new plant types.
`;

  // 4. Generate response using Groq API
  if (GROQ_API_KEY) {
    try {
      const formattedHistory = history.map(h => ({
        role: h.role === 'assistant' ? 'assistant' : 'user',
        content: h.content
      }));

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemInstructions },
            ...formattedHistory,
            { role: 'user', content: message }
          ],
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Groq Generation failed. Falling back to Local Reflection Engine:', error.message);
    }
  }

  // 5. Fallback to highly detailed deterministic Local Response Generator
  const rawReply = await generateLocalResponse(userId, message, history);
  return wrapLocalResponse(userId, rawReply);
}

/**
 * Wrap local responses with personality tone (embedded, not explicit).
 */
async function wrapLocalResponse(userId, rawText) {
  // Return raw text directly - personality tone is embedded in the response itself
  // via the system prompt, not announced with explicit labels
  return rawText;
}

/**
 * Deterministic local reflection engine fallback — data-driven, never generic.
 */
async function generateLocalResponse(userId, message, history) {
  const msg = message.toLowerCase();
  const ctx = await getUserContext(userId);
  const habitNames = ctx.activeHabits.map(h => h.name);
  const personality = ctx.user.coaching_personality || 'supportive';

  // ── Intercept persona inquiries ──
  if (msg.match(/(are you|current|your|what is|set to.*)persona/)) {
    if (personality === 'strict') {
      return `I bring a strict accountability approach to your habits. I focus on discipline, elimination of excuses, and maintaining rigorous systems. What habit are we solidifying today?`;
    } else if (personality === 'supportive') {
      return `I bring a supportive, compassionate approach to your growth. I focus on kindness, self-compassion, and gentle recovery. How can I support you today?`;
    } else if (personality === 'calm') {
      return `I bring a calm, mindful approach to your habits. I focus on patience, identity alignment, and letting your routines flourish at their own pace. What is on your mind?`;
    } else {
      return `I bring a supportive, compassionate approach to your growth. I focus on kindness, self-compassion, and gentle recovery. How can I support you today?`;
    }
  }

  // ── Intercept lazy mentions ──
  if (msg.match(/(lazy|feel lazy|procrastinat|can't be bothered)/)) {
    if (personality === 'strict') {
      return `Feeling lazy is an emotion, not a physical barrier. The Strict Accountability framework doesn't recognize excuses. Your active plant needs nourishment, and skipping today recedes your vine. Shut down the distractions, commit to just **2 minutes of action right now**, and execute. No shortcuts.`;
    } else if (personality === 'supportive') {
      return `It's completely okay to feel lazy or exhausted. Your body might be calling for a gentle pause. Instead of forcing a full routine, try the 2-Minute Rule -- do a micro-version of your habit just to keep the touchpoint alive, with zero judgment. Be compassionate to yourself today. You are worthy of rest, and showing up in small ways still counts.`;
    } else if (personality === 'calm') {
      return `Observe this feeling of laziness without judging it. Breathe in. Routines are not heavy weights, but peaceful roots. If energy is low, sit silently with your plant, complete a single mindful breath, and let that be your seed for today. Growth happens in cycles, and this is just one moment in your journey.`;
    } else {
      return `It's completely okay to feel lazy or exhausted. Your body might be calling for a gentle pause. Instead of forcing a full routine, try the 2-Minute Rule -- do a micro-version of your habit just to keep the touchpoint alive, with zero judgment. Be compassionate to yourself today. You are worthy of rest, and showing up in small ways still counts.`;
    }
  }

  // ── Context-aware follow-ups (History) ──
  if (history && history.length > 0) {
    const lastMsg = history[history.length - 1];
    if (lastMsg.role === 'assistant' && lastMsg.content.toLowerCase().includes('what feels most natural')) {
      // User is responding to a new habit recommendation
      const anchorInfo = ctx.activeHabits.filter(h => h.habit_time).map(h => `${h.name} at ${h.habit_time}`).join(', ');
      const fallbackAnchor = habitNames.length > 0 ? `"${habitNames[0]}"` : 'your morning coffee or waking up';
      
      return `Excellent choice! The science of habit formation says "${message}" will fail if it relies on willpower alone. It needs an **anchor**.\n\nTo make it stick, stack it onto an existing routine. ${anchorInfo ? `Since you already do ${anchorInfo}, try anchoring this new habit immediately before or after it.` : `Try anchoring this immediately before or after ${fallbackAnchor}.`}\n\n**Next step:** Go to the Registry tab and add "${message}" as a new habit. Set the initial goal to just 2 minutes to minimize starting friction.`;
    }
  }

  // ── Burnout / Stress ──
  if (msg.match(/(burnout|stress|exhausted|tired|overwhelmed|too much|fatigue|drained)/)) {
    if (ctx.burnoutStatus.preBurnout) {
      return `Your recent data confirms elevated fatigue — average stress at **${ctx.burnoutStatus.score}/5** over the last week. That's a clear pre-burnout signal.\n\nHere's what I'd recommend based on your patterns:\n- Scale back to **2-minute micro-versions** of your hardest habits\n- ${ctx.dips.length > 0 ? `Give yourself a full rest day on **${ctx.dips[0].day}s** (your lowest completion day at ${ctx.dips[0].rate}%)` : 'Pick one day this week as a deliberate rest day'}\n- Your growth vine won't wither from adapting — it withers from quitting entirely`;
    }
    return `Your stress levels are currently at ${ctx.avgStress !== null ? ctx.avgStress + '/5' : 'a moderate baseline'}. No burnout flags yet, but I'm watching.\n\nIf you're feeling the weight, try this: pick your **easiest habit** and do only that today. ${habitNames.length > 0 ? `For you, that might be "${habitNames[habitNames.length - 1]}".` : ''} Protecting momentum is more important than perfecting every day.`;
  }

  // ── Timing / Productivity / Day patterns ──
  if (msg.match(/(when|time|productive|peak|best day|worst day|dip|schedule|morning|evening|night)/)) {
    if (ctx.dips.length > 0) {
      const dipDays = ctx.dips.map(d => `**${d.day}s** (${d.rate}%)`).join(', ');
      return `Your data reveals clear willpower dips on ${dipDays}.\n\n**Strategy**: On dip days, schedule only your easiest habits or reduce them to 2-minute micro-versions. Save demanding habits for your high-performance days. ${ctx.activeHabits.some(h => h.habit_time) ? `\n\nYou currently have habits scheduled at: ${ctx.activeHabits.filter(h => h.habit_time).map(h => `${h.name} at ${h.habit_time}`).join(', ')}.` : ''}`;
    }
    return `With ${ctx.totalLogs} log entries so far, your completions are fairly balanced across the week. A few more days of data and I'll be able to pinpoint your exact high-performance windows and willpower valleys.${ctx.activeHabits.some(h => h.habit_time) ? `\n\nCurrent schedule: ${ctx.activeHabits.filter(h => h.habit_time).map(h => `${h.name} at ${h.habit_time}`).join(', ')}.` : ''}`;
  }

  // ── Recommendations / New habits ──
  if (msg.match(/(recommend|suggest|new habit|complement|what.*should|what.*next)/)) {
    if (ctx.activeHabits.length >= 5) {
      return `You currently have **${ctx.activeHabits.length} active habits** — that's approaching cognitive overload territory. Research shows willpower dilutes beyond 3-5 concurrent habits.\n\nBefore adding more, I'd focus on getting at least 3 of your current habits to a **70%+ consistency rate** over 14 days. ${Object.values(ctx.habitStats).some(s => s.completionRate < 50) ? `Right now, some of your habits are below 50% completion.` : 'You\'re doing well on consistency — almost ready to expand.'}`;
    }
    const existing = habitNames.join(', ');
    return `You're currently tracking: **${existing || 'nothing yet'}**.\n\nBased on your profile, here are complementary additions that create **habit stacking synergy**:\n- **Morning hydration** (30 seconds, zero friction — anchors your day)\n- **2-minute journaling** before bed (processes the day, reduces next-day stress)\n- **5-minute movement** (walking, stretching — catalyzes energy for other habits)\n\nThe key: pick one that you can attach to an existing routine. What feels most natural?`;
  }

  // ── Consistency / Progress / How am I doing ──
  if (msg.match(/(consistency|progress|how.*doing|how.*am.*i|streak|performance|track|status|overview|summary)/)) {
    const statLines = ctx.activeHabits.map(h => {
      const s = ctx.habitStats[h.id] || {};
      return `- **${h.name}**: ${s.completionRate || 0}% (14-day), ${h.consecutive_days || 0}-day vine, growth stage ${h.growth_stage || 0}`;
    });
    return `Here's your performance snapshot:\n\n${statLines.length > 0 ? statLines.join('\n') : 'No active habits yet.'}\n\n${ctx.avgStress !== null ? `Average stress: **${ctx.avgStress}/5**` : ''}${ctx.correlation !== null ? ` | Stress-performance correlation: **${ctx.correlation}**` : ''}\n\n${ctx.burnoutStatus.preBurnout ? '**Warning**: Pre-burnout signals detected. Consider scaling back.' : 'No burnout flags — keep building.'}`;
  }

  // ── Mood / Feelings / Emotional ──
  if (msg.match(/(mood|feeling|emotion|happy|sad|anxious|angry|calm|motivated|neutral)/)) {
    const moodEntries = Object.entries(ctx.moodDistribution);
    if (moodEntries.length > 0) {
      const moodSummary = moodEntries.sort((a, b) => b[1] - a[1]).map(([m, c]) => `${m}: ${c} logs`).join(', ');
      return `Your emotional landscape over the last 30 days:\n\n${moodSummary}\n\n${ctx.avgStress !== null ? `Average stress sits at **${ctx.avgStress}/5**.` : ''} ${ctx.correlation !== null && ctx.correlation <= -0.3 ? `I'm seeing a negative correlation (${ctx.correlation}) between stress and habit completion — on high-stress days, your consistency drops noticeably.` : 'Your mood and performance seem relatively independent, which is a sign of solid routine resilience.'}`;
    }
    return `I don't have enough mood data yet to draw patterns. When you log habits, try recording your mood too — it unlocks powerful emotional-performance correlations.`;
  }

  // ── Specific habit mentioned by name ──
  const mentionedHabit = ctx.activeHabits.find(h => msg.includes(h.name.toLowerCase()));
  if (mentionedHabit) {
    const s = ctx.habitStats[mentionedHabit.id] || {};
    return `Here's what I know about **"${mentionedHabit.name}"**:\n\n- Vine Length: **${mentionedHabit.consecutive_days || 0} days**\n- 14-day completion rate: **${s.completionRate || 0}%**\n- Total completions: **${mentionedHabit.total_completions || 0}**\n- Growth stage: **${mentionedHabit.growth_stage || 0}** (plant: ${mentionedHabit.selected_plant_type || 'fern'})\n- Most common mood when logging: **${s.mostCommonMood || 'not enough data'}**\n${mentionedHabit.what_motivating ? `- Your motivation: "${mentionedHabit.what_motivating}"` : ''}\n${mentionedHabit.what_hindering ? `- What hinders you: "${mentionedHabit.what_hindering}"` : ''}\n\n${s.completionRate >= 70 ? 'Strong consistency — this habit is becoming automatic.' : s.completionRate >= 40 ? 'Building momentum. Try anchoring this to an existing daily routine to push past 70%.' : 'This one needs attention. Can you reduce it to a 2-minute micro-version?'}`;
  }

  // ── Garden / Plants ──
  if (msg.match(/(garden|plant|grow|bloom|flower|fern|tree|seed)/)) {
    const gardenCount = ctx.gardenPlants.length;
    return `Your garden has **${gardenCount} fully grown plant${gardenCount !== 1 ? 's' : ''}**.\n\n${ctx.activeHabits.map(h => {
      const gt = getPlantById(h.selected_plant_type || 'fern').growthTarget || 12;
      const pct = Math.round(((h.growth_stage || 0) / gt) * 100);
      return `- **${h.name}** (${h.selected_plant_type || 'fern'}): ${pct}% grown (stage ${h.growth_stage || 0}/${gt})`;
    }).join('\n')}\n\n${gardenCount > 0 ? `Lifetime plants fully grown: **${ctx.user.plants_fully_grown || 0}**. Each one represents a real behavioral transformation.` : 'Keep logging consistently to grow your first plant!'}`;
  }

  // ── Failure / Struggling / Help ──
  if (msg.match(/(fail|struggling|can't|cant|hard|difficult|giving up|quit|stop|miss|skip)/)) {
    const weakest = Object.values(ctx.habitStats).sort((a, b) => a.completionRate - b.completionRate)[0];
    return `Struggling is not failing — it's data.\n\n${weakest ? `Your hardest habit right now is **"${weakest.name}"** at ${weakest.completionRate}% completion. ` : ''}Here's what the science says works:\n\n1. **Shrink it**: Make the habit so small it's impossible to skip (2 minutes max)\n2. **Stack it**: Attach it to something you already do daily\n3. **Track it**: Just showing up and logging "partial" counts — ${ctx.activeHabits.length > 0 ? 'your plant still grows' : 'momentum still builds'}\n\n${ctx.dips.length > 0 ? `Also: your data shows you dip on **${ctx.dips[0].day}s**. Maybe give yourself permission to skip that day entirely.` : 'You\'re still early — patterns will emerge as you log more.'}`;
  }

  // ── Catch-all: always use real data, never a dead end ──
  const summary = [];
  if (ctx.activeHabits.length > 0) summary.push(`You're tracking **${ctx.activeHabits.length} active habit${ctx.activeHabits.length > 1 ? 's' : ''}**: ${habitNames.join(', ')}`);
  if (ctx.totalLogs > 0) summary.push(`**${ctx.totalLogs} log entries** in the last 30 days`);
  if (ctx.avgStress !== null) summary.push(`Average stress: **${ctx.avgStress}/5**`);
  const bestHabit = ctx.activeHabits.sort((a, b) => (b.consecutive_days || 0) - (a.consecutive_days || 0))[0];
  if (bestHabit) summary.push(`Longest current vine: **"${bestHabit.name}"** at ${bestHabit.consecutive_days || 0} days`);

  return `Here's a quick read on where you stand:\n\n${summary.length > 0 ? summary.map(s => `- ${s}`).join('\n') : 'Start by adding and logging a habit — I need data to give you real insights.'}\n\nI can dive deeper into any of these areas. Try asking me:\n- "How is my consistency?"\n- "Am I close to burnout?"\n- "Which days am I weakest?"\n- ${habitNames.length > 0 ? `"Tell me about ${habitNames[0]}"` : '"What habit should I start with?"'}`;
}

/**
 * Generate habit field suggestions based on user context and personality
 */
async function generateHabitSuggestions(userId, habitName) {
  const ctx = await getUserContext(userId);
  const personality = ctx.user.coaching_personality || 'supportive';

  const systemInstructions = `
You are the ${personality === 'supportive' ? 'Supportive Compassion' : personality === 'strict' ? 'Strict Accountability' : 'Calm Zen-Master'} Oracle.
You are helping the user create a new habit called "${habitName}".

Based on the user's profile and behavioral data:
--------------------------------------------------------------------------------
${buildContextString(ctx)}
--------------------------------------------------------------------------------

Generate suggested responses for the following habit creation fields. Be specific, personalized, and aligned with the user's personality and current situation.

Return ONLY a JSON object with these exact keys:
{
  "description": "A meaningful purpose statement for this habit",
  "when_specifically": "A specific cue/trigger for when to do this habit",
  "what_motivating": "What motivates the user to keep this habit",
  "what_hindering": "Potential obstacles that might get in the way",
  "whom_tell": "Someone who can hold the user accountable",
  "who_inspires": "A person or inspiration for this goal",
  "milestones": "Longer-term milestone vision",
  "treat_myself": "How the user likes to celebrate progress",
  "current_goal": "Immediate specific goal for this habit",
  "current_reward": "Reward for achieving the current goal",
  "habit_time": "Suggested time of day (HH:MM format)",
  "selected_plant_type": "Suggested plant type (fern, bonsai, orchid, succulent, cherry-blossom, bamboo, lotus, cactus, rose, sunflower)"
}

Keep responses concise (1-2 sentences each) but meaningful and personalized.
`;

  if (GROQ_API_KEY) {
    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemInstructions },
            { role: 'user', content: `Generate habit suggestions for "${habitName}"` }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;
      
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const plantCatalog = require('./plantCatalog');
        const plantsFullyGrown = ctx.user.plants_fully_grown || 0;
        const availablePlants = plantCatalog.getPlantCatalog(plantsFullyGrown).filter(p => p.unlocked).map(p => p.id);
        const normalizedPlant = String(parsed.selected_plant_type || '').trim().toLowerCase();
        return {
          ...parsed,
          selected_plant_type: availablePlants.includes(normalizedPlant) ? normalizedPlant : (availablePlants[0] || 'fern')
        };
      }
      
      // Fallback if JSON parsing fails
      return generateDefaultHabitSuggestions(habitName, ctx);
    } catch (error) {
      console.error('Groq habit suggestion failed:', error.message);
      return generateDefaultHabitSuggestions(habitName, ctx);
    }
  }

  return generateDefaultHabitSuggestions(habitName, ctx);
}

/**
 * Generate default habit suggestions when AI is unavailable
 */
function generateDefaultHabitSuggestions(habitName, ctx) {
  const plantCatalog = require('./plantCatalog');
  const plantsFullyGrown = ctx.user.plants_fully_grown || 0;
  const availablePlants = plantCatalog.getPlantCatalog(plantsFullyGrown).filter(p => p.unlocked);
  const suggestedPlant = availablePlants.length > 0 ? availablePlants[0].id : 'fern';

  return {
    description: `Building this habit will help me create positive change in my daily routine.`,
    when_specifically: `Right after I wake up in the morning`,
    what_motivating: `I want to feel more accomplished and in control of my day`,
    what_hindering: `Feeling tired or getting distracted by other tasks`,
    whom_tell: `A close friend or family member who supports my growth`,
    who_inspires: `Someone who has successfully built similar habits`,
    milestones: `Build consistency over 30 days, then expand the habit`,
    treat_myself: `Small celebrations like a favorite treat or activity`,
    current_goal: `Complete this habit daily for the next 7 days`,
    current_reward: `A relaxing evening or small purchase I've been wanting`,
    habit_time: '08:00',
    selected_plant_type: suggestedPlant
  };
}

module.exports = { 
  getUserContext, 
  generateInsights, 
  generateLocalResponse: generateResponse,
  generateHabitSuggestions,
  createHabitInRegistry
};
