const express = require('express');
const router = express.Router();
const authRoutes = require('./auth');
const dashboardRoutes = require('./dashboard');
const employeeRoutes = require('./employee');
const chatRoutes = require('./chat');
const kbRoutes = require('./kb');
const workflowRoutes = require('./workflow');
const adminRoutes = require('./admin');
const promptRoutes = require('./prompts');

// Mount Authentication module routes
router.use('/auth', authRoutes);

// Mount Dashboard module routes
router.use('/dashboard', dashboardRoutes);

// Mount Employee CRUD routes
router.use('/employee', employeeRoutes);

// Mount Chat routes
router.use('/chat', chatRoutes);

// Mount Knowledge Base (RAG) routes
router.use('/kb', kbRoutes);
router.use('/knowledge-base', kbRoutes);

// Mount Prompts and Prompt Manager routes
router.use('/prompts', promptRoutes);
router.use('/prompt-manager', promptRoutes);

// Mount Automation Workflows routes
router.use('/workflow', workflowRoutes);

// Mount Admin Monitoring routes
router.use('/admin', adminRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  const { getDbState } = require('../config/db');
  res.status(200).json({
    status: 'healthy',
    database: getDbState(),
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

module.exports = router;
