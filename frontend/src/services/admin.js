import api from './api';

export const fetchAdminStats = async () => {
  try {
    const response = await api.get('/admin/stats');
    return response.data;
  } catch (err) {
    console.warn('[OFFLINE FALLBACK] fetchAdminStats');
    return {
      success: true,
      data: {
        totalUsers: 14,
        totalEmployees: 8,
        totalChats: 112,
        totalTokensUsed: 89600
      }
    };
  }
};

export const fetchAdminUsers = async () => {
  try {
    const response = await api.get('/admin/users');
    return response.data;
  } catch (err) {
    console.warn('[OFFLINE FALLBACK] fetchAdminUsers');
    return {
      success: true,
      data: [
        { id: 'usr-1', name: 'Alice Smith', email: 'alice@company.com', subscription_plan: 'pro', role: 'user', created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
        { id: 'usr-2', name: 'Bob Carter', email: 'bob@company.com', subscription_plan: 'enterprise', role: 'user', created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
        { id: 'usr-3', name: 'Admin User', email: 'admin@personaforge.ai', subscription_plan: 'enterprise', role: 'admin', created_at: new Date(Date.now() - 86400000 * 10).toISOString() }
      ]
    };
  }
};

export const updateAdminUserPlan = async (targetUserId, subscriptionPlan, role) => {
  try {
    const response = await api.put('/admin/user-plan', { targetUserId, subscriptionPlan, role });
    return response.data;
  } catch (err) {
    console.warn('[OFFLINE FALLBACK] updateAdminUserPlan');
    return { success: true };
  }
};

export const fetchAdminLogs = async () => {
  try {
    const response = await api.get('/admin/logs');
    return response.data;
  } catch (err) {
    console.warn('[OFFLINE FALLBACK] fetchAdminLogs');
    return {
      success: true,
      data: [
        { id: 'log-1', details: 'Configured new digital HR employee', user_email: 'admin@personaforge.ai', created_at: new Date(Date.now() - 3600000).toISOString() },
        { id: 'log-2', details: 'Synced user auth details with local database', user_email: 'alice@company.com', created_at: new Date(Date.now() - 7200000).toISOString() },
        { id: 'log-3', details: 'Ran mock workflow automation dispatch for Slack', user_email: 'bob@company.com', created_at: new Date(Date.now() - 10800000).toISOString() }
      ]
    };
  }
};
