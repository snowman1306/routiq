require('dotenv').config({ override: true });

const express = require('express');
const path = require('path');
const cors = require('cors');
const { initDatabase } = require('./database/init');
const authRoutes = require('./routes/auth');
const habitRoutes = require('./routes/habits');
const logRoutes = require('./routes/logs');
const moodRoutes = require('./routes/mood');
const reportRoutes = require('./routes/reports');
const notificationRoutes = require('./routes/notifications');
const subtaskRoutes = require('./routes/subtasks');
const gardenRoutes = require('./routes/garden');
const chatRoutes = require('./routes/chat');
const reminderService = require('./services/reminderService');

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/mood', moodRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/subtasks', subtaskRoutes);
app.use('/api/garden', gardenRoutes);
app.use('/api/chat', chatRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve built React frontend
app.use(express.static(path.join(__dirname, '../client/dist')));

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  }
});

const startServer = (port) => {
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Server started on ${port}`);
  });

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      setTimeout(() => startServer(port + 1), 200);
    } else {
      process.exit(1);
    }
  });
};

const startApp = async () => {
  try {
    reminderService.start();
    await initDatabase();
    const initialPort = process.env.PORT ? Number(process.env.PORT) : 5600;
    startServer(initialPort);
  } catch (error) {
    console.error('Failed to start:', error);
  }
};

startApp();

module.exports = app;