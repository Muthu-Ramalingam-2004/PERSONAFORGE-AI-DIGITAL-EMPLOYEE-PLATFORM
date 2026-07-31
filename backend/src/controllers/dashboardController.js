const db = require('../config/db');

// Helper to seed demo data if a user has empty dashboard stats (for interactive demo experience)
const seedDemoDataIfEmpty = async (userId) => {
  // Seeding disabled to prevent automatic creation of default employees.
};

// Retrieve overall summary stats for Dashboard
const getStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Seed demo data dynamically to ensure the charts and metrics look rich immediately
    await seedDemoDataIfEmpty(userId);

    // Queries
    const employeeQuery = db.query(
      'SELECT COUNT(*) FROM ai_employees WHERE user_id = $1 AND status = $2',
      [userId, 'active']
    );

    const chatsQuery = db.query(
      'SELECT COUNT(*) FROM chats WHERE user_id = $1',
      [userId]
    );

    const analyticsQuery = db.query(
      `SELECT 
        COALESCE(ROUND(AVG(response_time)), 0) as avg_time, 
        COALESCE(SUM(tokens_used), 0) as total_tokens 
       FROM analytics 
       WHERE user_id = $1`,
      [userId]
    );

    const recentEmployeesQuery = db.query(
      `SELECT id, name, avatar_url, category, status, created_at 
       FROM ai_employees 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 4`,
      [userId]
    );

    const [empRes, chatsRes, analRes, recentEmpRes] = await Promise.all([
      employeeQuery,
      chatsQuery,
      analyticsQuery,
      recentEmployeesQuery
    ]);

    res.status(200).json({
      success: true,
      data: {
        activeEmployees: parseInt(empRes.rows[0].count),
        totalConversations: parseInt(chatsRes.rows[0].count),
        avgResponseTime: parseInt(analRes.rows[0].avg_time),
        tokensUsed: parseInt(analRes.rows[0].total_tokens),
        recentEmployees: recentEmpRes.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

// Retrieve recent activity logs
const getActivities = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `SELECT id, action, details, created_at 
       FROM activity_logs 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 6`,
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

// Retrieve chart details for Recharts render
const getChartData = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Daily volume (chats per day in the last 7 days)
    const chatsHistoryResult = await db.query(
      `SELECT 
        TO_CHAR(c.created_at, 'Mon DD') as date_label,
        COUNT(c.id) as conversations,
        COALESCE(SUM(a.tokens_used), 0) as tokens
       FROM chats c
       LEFT JOIN analytics a ON DATE(a.timestamp) = DATE(c.created_at) AND a.user_id = c.user_id
       WHERE c.user_id = $1 AND c.created_at >= NOW() - INTERVAL '7 days'
       GROUP BY DATE(c.created_at), TO_CHAR(c.created_at, 'Mon DD')
       ORDER BY DATE(c.created_at) ASC`,
      [userId]
    );

    // Categories distribution
    const categoryResult = await db.query(
      `SELECT category as name, COUNT(*) as value 
       FROM ai_employees 
       WHERE user_id = $1 
       GROUP BY category`,
      [userId]
    );

    res.status(200).json({
      success: true,
      data: {
        usageHistory: chatsHistoryResult.rows,
        categoryDistribution: categoryResult.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getStats,
  getActivities,
  getChartData
};
