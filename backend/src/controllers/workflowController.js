const db = require('../config/db');

// Retrieve list of connected integrations and automation tasks
const getIntegrationsStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Fetch user keys/settings
    const settingsResult = await db.query(
      'SELECT api_keys FROM settings WHERE user_id = $1',
      [userId]
    );

    const apiKeys = settingsResult.rows[0]?.api_keys || {};
    
    const integrations = [
      { 
        id: 'gmail', 
        name: 'Gmail Integration', 
        connected: !!apiKeys.gmail, 
        desc: 'Send emails automatically upon task execution or AI triggers.' 
      },
      { 
        id: 'calendar', 
        name: 'Google Calendar', 
        connected: !!apiKeys.calendar, 
        desc: 'Schedule and manage appointments via digital workers.' 
      },
      { 
        id: 'slack', 
        name: 'Slack Workspaces', 
        connected: !!apiKeys.slack, 
        desc: 'Connect AI workers directly to custom Slack channel feeds.' 
      },
      { 
        id: 'whatsapp', 
        name: 'WhatsApp Business (Demo)', 
        connected: true, // business demo activated by default
        desc: 'Simulate business inquiry routing through chat widgets.' 
      }
    ];

    res.status(200).json({
      success: true,
      data: integrations
    });
  } catch (error) {
    next(error);
  }
};

// Trigger a mock automation workflow task (Gmail, Slack, WhatsApp, Calendar)
const triggerWorkflowTask = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { platform, action, payload } = req.body;

    if (!platform || !action) {
      return res.status(400).json({
        success: false,
        message: 'Platform and action are required parameters'
      });
    }

    // Process mock triggers
    let statusMessage = '';
    
    switch (platform) {
      case 'gmail':
        statusMessage = `[GMAIL ROUTER] Simulated email dispatched to ${payload?.to || 'client'} with subject: "${payload?.subject || 'AI Update'}"`;
        break;
      case 'calendar':
        statusMessage = `[CALENDAR ROUTER] Set virtual conference appointment: "${payload?.title || 'AI Worker Consultation'}" on ${payload?.date || 'tomorrow'}`;
        break;
      case 'slack':
        statusMessage = `[SLACK BOT] Posted AI status updates to channel #${payload?.channel || 'operations'}`;
        break;
      case 'whatsapp':
        statusMessage = `[WHATSAPP WEBHOOK] Routed conversation text notification to phone ${payload?.phone || '+1 (555) 0199'}`;
        break;
      default:
        return res.status(400).json({ success: false, message: 'Unsupported automation platform' });
    }

    // Log this task run in the Postgres audit logs
    await db.query(
      `INSERT INTO activity_logs (user_id, action, details) 
       VALUES ($1, 'workflow_run', $2)`,
      [userId, statusMessage]
    );

    res.status(200).json({
      success: true,
      message: 'Workflow automation task executed successfully',
      details: statusMessage
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getIntegrationsStatus,
  triggerWorkflowTask
};
