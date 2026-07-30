const db = require('../config/db');

// Helper to seed demo data if a user has empty dashboard stats (for interactive demo experience)
const seedDemoDataIfEmpty = async (userId) => {
  try {
    // Check if the user already has any AI employees
    const empCheck = await db.query('SELECT COUNT(*) FROM ai_employees WHERE user_id = $1', [userId]);
    const empCount = parseInt(empCheck.rows[0].count);

    if (empCount === 0) {
      console.log(`[SEEDING DEMO DATA] Seeding demo workers & logs for user: ${userId}`);

      // 1. Create a couple of default digital employees
      const hrResult = await db.query(
        `INSERT INTO ai_employees (user_id, name, avatar_url, category, status) 
         VALUES ($1, 'Sophia Williams', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80', 'HR', 'active') 
         RETURNING id`,
        [userId]
      );
      const hrId = hrResult.rows[0].id;

      const salesResult = await db.query(
        `INSERT INTO ai_employees (user_id, name, avatar_url, category, status) 
         VALUES ($1, 'David Miller', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80', 'Sales', 'active') 
         RETURNING id`,
        [userId]
      );
      const salesId = salesResult.rows[0].id;

      // 2. Create Prompts for them
      await db.query(
        `INSERT INTO prompts (employee_id, system_prompt, personality_prompt, goal, tone, temperature, max_tokens) 
         VALUES ($1, 'You are an HR Assistant.', 'Helpful, warm, professional', 'Handle HR queries', 'professional', 0.7, 1000)`,
        [hrId]
      );
      await db.query(
        `INSERT INTO prompts (employee_id, system_prompt, personality_prompt, goal, tone, temperature, max_tokens) 
         VALUES ($1, 'You are a Sales executive.', 'Enthusiastic, persuasive, sharp', 'Sell PersonaForge subscriptions', 'persuasive', 0.85, 1000)`,
        [salesId]
      );

      // 3. Create default settings
      await db.query(
        `INSERT INTO settings (user_id, theme, api_keys, notification_settings) 
         VALUES ($1, 'dark', '{}'::jsonb, '{"email": true, "push": false}'::jsonb)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );

      // 4. Create some activity logs
      await db.query(
        `INSERT INTO activity_logs (user_id, action, details, created_at) 
         VALUES 
         ($1, 'employee_create', 'Created HR Assistant - Sophia Williams', NOW() - INTERVAL '2 hours'),
         ($1, 'employee_create', 'Created Sales Representative - David Miller', NOW() - INTERVAL '1 hour'),
         ($1, 'profile_update', 'Setup workspace profile', NOW() - INTERVAL '30 minutes')`,
        [userId]
      );

      // 5. Create some mock analytics history for Recharts graphing
      // Add charts database records for the last 7 days
      for (let i = 6; i >= 0; i--) {
        const dateOffset = `NOW() - INTERVAL '${i} days'`;
        // Insert daily chats
        const chatRes = await db.query(
          `INSERT INTO chats (user_id, employee_id, title, created_at) 
           VALUES ($1, $2, 'Inquiry about pricing', ${dateOffset}) RETURNING id`,
          [userId, salesId]
        );
        const chatId = chatRes.rows[0].id;

        // Insert messages
        await db.query(
          `INSERT INTO messages (chat_id, sender, content, created_at) 
           VALUES 
           ($1, 'user', 'What are the plans?', ${dateOffset}),
           ($1, 'ai', 'We offer Free, Pro, and Enterprise subscription packages.', ${dateOffset})`,
          [chatId]
        );

        // Insert analytics entry
        const tokens = Math.floor(Math.random() * 200) + 100;
        const resTime = Math.floor(Math.random() * 800) + 400;
        await db.query(
          `INSERT INTO analytics (user_id, employee_id, usage_count, response_time, tokens_used, timestamp) 
           VALUES ($1, $2, 1, $3, $4, ${dateOffset})`,
          [userId, salesId, resTime, tokens]
        );
      }
    }
  } catch (err) {
    console.error('Failed to seed demo data for user:', err.message);
  }
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
