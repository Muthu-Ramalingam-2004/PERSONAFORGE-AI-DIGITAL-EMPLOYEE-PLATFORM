const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');

// Route to get aggregated counts and active stats
router.get('/stats', authMiddleware, dashboardController.getStats);

// Route to get recent system/employee activity logs
router.get('/activities', authMiddleware, dashboardController.getActivities);

// Route to get chart statistics for analytics graphs
router.get('/charts', authMiddleware, dashboardController.getChartData);

module.exports = router;
