const express = require('express');
const router = express.Router();
const workflowController = require('../controllers/workflowController');
const authMiddleware = require('../middleware/authMiddleware');

// Get connected automation platforms status
router.get('/status', authMiddleware, workflowController.getIntegrationsStatus);

// Trigger a mock automation workflow task
router.post('/trigger', authMiddleware, workflowController.triggerWorkflowTask);

module.exports = router;
