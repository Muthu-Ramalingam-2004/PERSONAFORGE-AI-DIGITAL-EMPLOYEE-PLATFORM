const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const authMiddleware = require('../middleware/authMiddleware');

// Get all employees
router.get('/', authMiddleware, employeeController.getAllEmployees);

// Get single employee details
router.get('/:id', authMiddleware, employeeController.getEmployeeById);

// Create new employee
router.post('/', authMiddleware, employeeController.createEmployee);

// Update employee settings
router.put('/:id', authMiddleware, employeeController.updateEmployee);

// Delete employee
router.delete('/:id', authMiddleware, employeeController.deleteEmployee);

// Toggle active/inactive status
router.patch('/:id/status', authMiddleware, employeeController.toggleStatus);

module.exports = router;
