const db = require('../config/db');

// Middleware helper within controller to ensure user is an admin
const verifyAdminRole = (req, res) => {
  if (req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'Forbidden: Admin access only'
    });
    return false;
  }
  return true;
};

// Retrieve overall statistics of the SaaS platform
const getPlatformStats = async (req, res, next) => {
  try {
    if (!verifyAdminRole(req, res)) return;

    const usersRes = await db.query('SELECT COUNT(*) FROM users');
    const employeesRes = await db.query('SELECT COUNT(*) FROM ai_employees');
    const chatsRes = await db.query('SELECT COUNT(*) FROM chats');
    const analyticsRes = await db.query('SELECT COALESCE(SUM(tokens_used), 0) as tokens FROM analytics');

    res.status(200).json({
      success: true,
      data: {
        totalUsers: parseInt(usersRes.rows[0].count),
        totalEmployees: parseInt(employeesRes.rows[0].count),
        totalChats: parseInt(chatsRes.rows[0].count),
        totalTokensUsed: parseInt(analyticsRes.rows[0].tokens)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Retrieve all user accounts on the platform
const getAllUsers = async (req, res, next) => {
  try {
    if (!verifyAdminRole(req, res)) return;

    const result = await db.query(
      'SELECT id, name, email, role, subscription_plan, created_at FROM users ORDER BY created_at DESC'
    );

    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

// Modify user access role or subscription details
const updateUserPlan = async (req, res, next) => {
  try {
    if (!verifyAdminRole(req, res)) return;

    const { targetUserId, subscriptionPlan, role } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const updates = [];
    const params = [targetUserId];
    
    if (subscriptionPlan) {
      params.push(subscriptionPlan);
      updates.push(`subscription_plan = $${params.length}`);
    }

    if (role) {
      params.push(role);
      updates.push(`role = $${params.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No updates provided' });
    }

    const queryStr = `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, name, email, role, subscription_plan`;
    const result = await db.query(queryStr, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      message: 'User settings updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// Fetch audit/activity logs of all platform users
const getPlatformLogs = async (req, res, next) => {
  try {
    if (!verifyAdminRole(req, res)) return;

    const result = await db.query(
      `SELECT l.id, l.action, l.details, l.created_at, u.name as user_name, u.email as user_email
       FROM activity_logs l
       LEFT JOIN users u ON l.user_id = u.id
       ORDER BY l.created_at DESC
       LIMIT 50`
    );

    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPlatformStats,
  getAllUsers,
  updateUserPlan,
  getPlatformLogs
};
