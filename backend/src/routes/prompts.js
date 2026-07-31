const express = require('express');
const router = express.Router();
const promptController = require('../controllers/promptController');
const authMiddleware = require('../middleware/authMiddleware');

// Get prompt config by employee ID
router.get('/:employeeId', authMiddleware, promptController.getPromptConfig);

// Update prompt config by employee ID
router.put('/:employeeId', authMiddleware, promptController.updatePromptConfig);

module.exports = router;
