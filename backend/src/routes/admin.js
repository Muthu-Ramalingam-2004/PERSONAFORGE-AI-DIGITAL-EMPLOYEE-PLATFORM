const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');

// Get overall platform usage statistics
router.get('/stats', authMiddleware, adminController.getPlatformStats);

// Get list of all registered users
router.get('/users', authMiddleware, adminController.getAllUsers);

// Modify user plan or permissions
router.put('/user-plan', authMiddleware, adminController.updateUserPlan);

// Get platform-wide activity logs
router.get('/logs', authMiddleware, adminController.getPlatformLogs);

module.exports = router;
