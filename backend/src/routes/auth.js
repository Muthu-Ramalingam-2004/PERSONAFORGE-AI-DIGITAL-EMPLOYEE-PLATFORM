const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Route to synchronize Firebase authenticated user with local DB
router.post('/sync', authMiddleware, authController.syncUser);

// Route to get current user details
router.get('/profile', authMiddleware, authController.getUserProfile);

// Route to update user profile
router.put('/profile', authMiddleware, authController.updateUserProfile);

module.exports = router;
