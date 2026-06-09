const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../database/init');
const authenticate = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user exists
    const userCheck = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, reminder_time, reminder_enabled, plants_fully_grown, avatar',
      [username, email, passwordHash]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({ user, token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const result = await pool.query(
      'SELECT id, username, email, password_hash, reminder_time, reminder_enabled, plants_fully_grown, avatar FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        reminder_time: user.reminder_time,
        reminder_enabled: user.reminder_enabled,
        plants_fully_grown: user.plants_fully_grown,
        avatar: user.avatar
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  res.json({ user: req.user });
});

// Update reminder settings
router.put('/reminder-settings', authenticate, async (req, res) => {
  try {
    const { reminder_time, reminder_enabled } = req.body;

    const result = await pool.query(
      'UPDATE users SET reminder_time = $1, reminder_enabled = $2 WHERE id = $3 RETURNING reminder_time, reminder_enabled',
      [reminder_time || '09:00:00', reminder_enabled !== undefined ? reminder_enabled : true, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update reminder settings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update coaching settings
router.put('/coaching-settings', authenticate, async (req, res) => {
  try {
    const { coaching_personality, friction_threshold } = req.body;

    const result = await pool.query(
      'UPDATE users SET coaching_personality = $1, friction_threshold = $2 WHERE id = $3 RETURNING coaching_personality, friction_threshold',
      [coaching_personality || 'supportive', friction_threshold || 3, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update coaching settings error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { username, email, avatar } = req.body;

    if (!username || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    // Check if username or email is already taken by another user
    const checkUser = await pool.query(
      'SELECT id FROM users WHERE (username = $1 OR email = $2) AND id != $3',
      [username, email, req.user.id]
    );

    if (checkUser.rows.length > 0) {
      return res.status(400).json({ error: 'Name or Email is already in use' });
    }

    const result = await pool.query(
      'UPDATE users SET username = $1, email = $2, avatar = $3 WHERE id = $4 RETURNING id, username, email, reminder_time, reminder_enabled, plants_fully_grown, avatar',
      [username, email, avatar, req.user.id]
    );

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Change Password
router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    const userResult = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    const user = userResult.rows[0];

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, req.user.id]
    );

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
