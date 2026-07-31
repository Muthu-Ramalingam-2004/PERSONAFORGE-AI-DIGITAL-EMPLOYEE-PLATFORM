const db = require('../config/db');

// Get prompt configurations for an employee
const getPromptConfig = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { employeeId } = req.params;

    // Verify employee ownership
    const empCheck = await db.query(
      'SELECT id FROM ai_employees WHERE id = $1 AND user_id = $2',
      [employeeId, userId]
    );

    if (empCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'AI Employee not found or unauthorized'
      });
    }

    const result = await db.query(
      'SELECT * FROM prompts WHERE employee_id = $1',
      [employeeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Prompt configuration not found'
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

// Update prompt configurations for an employee
const updatePromptConfig = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { employeeId } = req.params;
    const { 
      system_prompt, personality_prompt, goal, tone, temperature, max_tokens 
    } = req.body;

    // Verify employee ownership
    const empCheck = await db.query(
      'SELECT id FROM ai_employees WHERE id = $1 AND user_id = $2',
      [employeeId, userId]
    );

    if (empCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'AI Employee not found or unauthorized'
      });
    }

    // Check if prompt exists
    const checkPrompt = await db.query(
      'SELECT id FROM prompts WHERE employee_id = $1',
      [employeeId]
    );

    let result;
    if (checkPrompt.rows.length === 0) {
      result = await db.query(
        `INSERT INTO prompts (employee_id, system_prompt, personality_prompt, goal, tone, temperature, max_tokens) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          employeeId,
          system_prompt || '',
          personality_prompt || '',
          goal || '',
          tone || 'professional',
          temperature !== undefined ? parseFloat(temperature) : 0.7,
          max_tokens !== undefined ? parseInt(max_tokens) : 1000
        ]
      );
    } else {
      result = await db.query(
        `UPDATE prompts 
         SET system_prompt = $1, personality_prompt = $2, goal = $3, tone = $4, temperature = $5, max_tokens = $6, updated_at = CURRENT_TIMESTAMP 
         WHERE employee_id = $7 RETURNING *`,
        [
          system_prompt || '',
          personality_prompt || '',
          goal || '',
          tone || 'professional',
          temperature !== undefined ? parseFloat(temperature) : 0.7,
          max_tokens !== undefined ? parseInt(max_tokens) : 1000,
          employeeId
        ]
      );
    }

    res.status(200).json({
      success: true,
      message: 'Prompt configuration updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPromptConfig,
  updatePromptConfig
};
