-- Habit Tracker Database Schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reminder_time TIME DEFAULT '09:00:00',
    reminder_enabled BOOLEAN DEFAULT true,
    plants_fully_grown INTEGER DEFAULT 0,
    avatar TEXT DEFAULT NULL
);

-- Habits table
CREATE TABLE IF NOT EXISTS habits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    -- Habit logging questions
    when_specifically TEXT,
    what_motivating TEXT,
    what_hindering TEXT,
    whom_tell TEXT,
    who_inspires TEXT,
    milestones TEXT,
    treat_myself TEXT,
    -- Consistency tracking
    consecutive_days INTEGER DEFAULT 0,
    total_completions INTEGER DEFAULT 0,
    last_completed_at TIMESTAMP,
    habit_time TIME,
    current_goal TEXT,
    current_reward TEXT,
    goal_window_days INTEGER DEFAULT 1,
    current_goal_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    current_goal_due_at TIMESTAMP,
    current_goal_completed BOOLEAN DEFAULT false,
    goal_reminder_sent_at TIMESTAMP,
    milestones_achieved INTEGER DEFAULT 0,
    fully_grown_count INTEGER DEFAULT 0,
    growth_stage INTEGER DEFAULT 0,
    selected_plant_type VARCHAR(50) DEFAULT 'fern',
    last_reward_claimed_at TIMESTAMP,
    -- Inconsistency analysis
    is_inconsistent BOOLEAN DEFAULT false,
    continue_reason TEXT,
    failure_analysis TEXT
);

-- Habit logs table (daily completions)
CREATE TABLE IF NOT EXISTS habit_logs (
    id SERIAL PRIMARY KEY,
    habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 3),
    mood VARCHAR(50),
    stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 5),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(habit_id, log_date)
);

-- Mood logs table (separate mood tracking)
CREATE TABLE IF NOT EXISTS mood_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    mood VARCHAR(50) NOT NULL,
    stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 5),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, log_date)
);

-- Weekly reports table
CREATE TABLE IF NOT EXISTS weekly_reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    week_end_date DATE NOT NULL,
    total_habits INTEGER DEFAULT 0,
    consistent_habits INTEGER DEFAULT 0,
    inconsistent_habits INTEGER DEFAULT 0,
    total_completions INTEGER DEFAULT 0,
    average_mood VARCHAR(50),
    average_stress DECIMAL(3,2),
    report_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, week_start_date)
);

-- Sub-tasks table (sub-goals for habits)
CREATE TABLE IF NOT EXISTS sub_tasks (
    id SERIAL PRIMARY KEY,
    habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    order_index INTEGER DEFAULT 0
);

-- Notifications/Reminders table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    habit_id INTEGER REFERENCES habits(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) DEFAULT 'reminder',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Garden archive table
CREATE TABLE IF NOT EXISTS garden_plants (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    habit_id INTEGER REFERENCES habits(id) ON DELETE SET NULL,
    habit_name VARCHAR(100),
    plant_type VARCHAR(50) NOT NULL,
    milestone_number INTEGER DEFAULT 0,
    reward_given TEXT,
    grown_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_id ON habit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_id ON habit_logs(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON habit_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_mood_logs_user_id ON mood_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_logs_date ON mood_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_user_id ON weekly_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_tasks_habit_id ON sub_tasks(habit_id);
CREATE INDEX IF NOT EXISTS idx_garden_plants_user_id ON garden_plants(user_id);

ALTER TABLE users ADD COLUMN IF NOT EXISTS plants_fully_grown INTEGER DEFAULT 0;

ALTER TABLE habits ADD COLUMN IF NOT EXISTS habit_time TIME;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS current_goal TEXT;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS current_reward TEXT;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS goal_window_days INTEGER DEFAULT 1;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS current_goal_started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS current_goal_due_at TIMESTAMP;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS current_goal_completed BOOLEAN DEFAULT false;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS goal_reminder_sent_at TIMESTAMP;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS milestones_achieved INTEGER DEFAULT 0;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS fully_grown_count INTEGER DEFAULT 0;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS growth_stage INTEGER DEFAULT 0;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS selected_plant_type VARCHAR(50) DEFAULT 'fern';
ALTER TABLE habits ADD COLUMN IF NOT EXISTS last_reward_claimed_at TIMESTAMP;

ALTER TABLE users ADD COLUMN IF NOT EXISTS coaching_personality VARCHAR(30) DEFAULT 'supportive';
ALTER TABLE users ADD COLUMN IF NOT EXISTS friction_threshold INTEGER DEFAULT 3;

CREATE TABLE IF NOT EXISTS oracle_memories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding REAL[],
    category VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Greenhouse migration
ALTER TABLE garden_plants ADD COLUMN IF NOT EXISTS growth_cycle_number INTEGER DEFAULT 1;
ALTER TABLE garden_plants ADD COLUMN IF NOT EXISTS growth_stage_reached INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_garden_plants_grown_at ON garden_plants(grown_at);
CREATE INDEX IF NOT EXISTS idx_garden_plants_habit_name ON garden_plants(habit_name);
