const db = require('../config/db');

// Get all AI employees for the authenticated user
const getAllEmployees = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await db.query(
      `SELECT e.*, p.system_prompt, p.personality_prompt, p.goal, p.tone, p.temperature, p.max_tokens 
       FROM ai_employees e 
       LEFT JOIN prompts p ON e.id = p.employee_id
       WHERE e.user_id = $1 
       ORDER BY e.created_at DESC`,
      [userId]
    );

    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

// Get a single AI employee by ID
const getEmployeeById = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await db.query(
      `SELECT e.*, p.system_prompt, p.personality_prompt, p.goal, p.tone, p.temperature, p.max_tokens 
       FROM ai_employees e 
       LEFT JOIN prompts p ON e.id = p.employee_id
       WHERE e.id = $1 AND e.user_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'AI Employee not found'
      });
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// Create a new AI employee
const createEmployee = async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const userId = req.user.id;
    const { 
      name, avatar_url, category, 
      system_prompt, personality_prompt, goal, tone, temperature, max_tokens 
    } = req.body;

    if (!name || !category || !system_prompt) {
      return res.status(400).json({
        success: false,
        message: 'Name, Category, and System Instruction are required fields'
      });
    }

    await client.query('BEGIN');

    // 1. Insert into ai_employees
    const employeeInsert = await client.query(
      `INSERT INTO ai_employees (user_id, name, avatar_url, category, status) 
       VALUES ($1, $2, $3, $4, 'active') 
       RETURNING *`,
      [userId, name, avatar_url || '', category]
    );
    const employee = employeeInsert.rows[0];

    // 2. Insert into prompts config
    await client.query(
      `INSERT INTO prompts (employee_id, system_prompt, personality_prompt, goal, tone, temperature, max_tokens) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        employee.id, 
        system_prompt, 
        personality_prompt || '', 
        goal || '', 
        tone || 'professional', 
        temperature !== undefined ? parseFloat(temperature) : 0.7, 
        max_tokens !== undefined ? parseInt(max_tokens) : 1000
      ]
    );

    // 3. Log active audit activity
    await client.query(
      `INSERT INTO activity_logs (user_id, action, details) 
       VALUES ($1, 'employee_create', $2)`,
      [userId, `Hired employee ${name} (${category})`]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'AI Employee created successfully',
      data: {
        ...employee,
        system_prompt,
        personality_prompt,
        goal,
        tone,
        temperature,
        max_tokens
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

// Update an AI employee
const updateEmployee = async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { 
      name, avatar_url, category, status,
      system_prompt, personality_prompt, goal, tone, temperature, max_tokens 
    } = req.body;

    if (!name || !category || !system_prompt) {
      return res.status(400).json({
        success: false,
        message: 'Name, Category, and System Instruction are required fields'
      });
    }

    await client.query('BEGIN');

    // Check ownership
    const checkOwnership = await client.query(
      'SELECT id FROM ai_employees WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (checkOwnership.rows.length === 0) {
      client.release();
      return res.status(404).json({
        success: false,
        message: 'AI Employee not found or unauthorized'
      });
    }

    // 1. Update ai_employees table
    const employeeUpdate = await client.query(
      `UPDATE ai_employees 
       SET name = $1, avatar_url = $2, category = $3, status = $4, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $5 
       RETURNING *`,
      [name, avatar_url || '', category, status || 'active', id]
    );
    const employee = employeeUpdate.rows[0];

    // 2. Update prompts table
    await client.query(
      `UPDATE prompts 
       SET system_prompt = $1, personality_prompt = $2, goal = $3, tone = $4, temperature = $5, max_tokens = $6, updated_at = CURRENT_TIMESTAMP 
       WHERE employee_id = $7`,
      [
        system_prompt, 
        personality_prompt || '', 
        goal || '', 
        tone || 'professional', 
        temperature !== undefined ? parseFloat(temperature) : 0.7, 
        max_tokens !== undefined ? parseInt(max_tokens) : 1000,
        id
      ]
    );

    // 3. Log activity
    await client.query(
      `INSERT INTO activity_logs (user_id, action, details) 
       VALUES ($1, 'employee_update', $2)`,
      [userId, `Updated employee ${name} settings`]
    );

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: 'AI Employee updated successfully',
      data: {
        ...employee,
        system_prompt,
        personality_prompt,
        goal,
        tone,
        temperature,
        max_tokens
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

// Delete an AI employee
const deleteEmployee = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Check ownership & retrieve name for logging
    const checkEmp = await db.query(
      'SELECT name FROM ai_employees WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (checkEmp.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'AI Employee not found or unauthorized'
      });
    }

    const employeeName = checkEmp.rows[0].name;

    // Execute delete (cascade will delete the prompts automatically due to DB constraints)
    await db.query('DELETE FROM ai_employees WHERE id = $1', [id]);

    // Log deletion event
    await db.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES ($1, $2, $3)',
      [userId, 'employee_delete', `Fired employee ${employeeName}`]
    );

    res.status(200).json({
      success: true,
      message: 'AI Employee deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Toggle Employee active status
const toggleStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { status } = req.body; // 'active' or 'inactive'

    if (!status || (status !== 'active' && status !== 'inactive')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be active or inactive'
      });
    }

    const result = await db.query(
      `UPDATE ai_employees 
       SET status = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2 AND user_id = $3 
       RETURNING *`,
      [status, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'AI Employee not found or unauthorized'
      });
    }

    const employee = result.rows[0];

    // Log active audit activity
    await db.query(
      `INSERT INTO activity_logs (user_id, action, details) 
       VALUES ($1, 'employee_update', $2)`,
      [userId, `Changed employee ${employee.name} status to ${status}`]
    );

    res.status(200).json({
      success: true,
      message: `AI Employee status updated to ${status}`,
      data: employee
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  toggleStatus
};
