const express = require('express');
const authenticate = require('../middleware/auth');
const { generateInsights, generateLocalResponse, generateHabitSuggestions, createHabitInRegistry } = require('../services/chatService');

const router = express.Router();

// ── POST /api/chat — conversational endpoint ────────────────────────
router.post('/', authenticate, async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Call our completely local reflection engine
    const reply = await generateLocalResponse(req.user.id, message, history);

    // Artificial delay to show the "thinking" indicator in the UI
    await new Promise(resolve => setTimeout(resolve, 1200));

    res.json({ reply });
  } catch (error) {
    console.error('Chat error:', error?.message || error);
    res.status(500).json({
      error: 'Failed to generate response',
      reply: 'The Oracle could not process your request. Please try again in a moment.',
    });
  }
});

// ── GET /api/chat/insights — auto-generated insight cards ───────────
router.get('/insights', authenticate, async (req, res) => {
  try {
    const insights = await generateInsights(req.user.id);
    res.json({ insights });
  } catch (error) {
    console.error('Insights error:', error);
    res.status(500).json({ error: 'Failed to generate insights', insights: [] });
  }
});

// ── POST /api/chat/habit-suggestions — generate habit field suggestions ───────────
router.post('/habit-suggestions', authenticate, async (req, res) => {
  try {
    const { habitName } = req.body;
    if (!habitName || typeof habitName !== 'string' || habitName.trim().length === 0) {
      return res.status(400).json({ error: 'Habit name is required' });
    }

    const suggestions = await generateHabitSuggestions(req.user.id, habitName.trim());
    res.json({ suggestions });
  } catch (error) {
    console.error('Habit suggestions error:', error);
    res.status(500).json({ error: 'Failed to generate habit suggestions' });
  }
});

// ── POST /api/chat/habit-draft — save an editable habit draft from the chat ─────
router.post('/habit-draft', authenticate, async (req, res) => {
  try {
    const { draft } = req.body;
    if (!draft || typeof draft !== 'object') {
      return res.status(400).json({ error: 'Habit draft data is required' });
    }

    const habit = await createHabitInRegistry(req.user.id, draft);
    res.status(201).json({ habit });
  } catch (error) {
    console.error('Habit draft save error:', error?.message || error);
    res.status(500).json({ error: 'Failed to save habit draft' });
  }
});

module.exports = router;
