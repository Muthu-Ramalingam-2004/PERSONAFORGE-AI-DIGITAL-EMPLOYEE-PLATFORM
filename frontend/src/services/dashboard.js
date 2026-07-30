import api from './api';

// Fetch summary metrics for dashboard cards
export const fetchStats = async () => {
  try {
    const response = await api.get('/dashboard/stats');
    return response.data;
  } catch (err) {
    console.warn('[OFFLINE FALLBACK] Dashboard stats');
    return {
      success: true,
      data: {
        activeEmployees: 3,
        totalConversations: 24,
        avgResponseTime: 540,
        tokensUsed: 4200,
        recentEmployees: [
          { id: 'mock-1', name: 'Sophia (HR Assistant)', category: 'HR', avatar_url: '' },
          { id: 'mock-2', name: 'Liam (Sales Representative)', category: 'Sales', avatar_url: '' }
        ]
      }
    };
  }
};

// Fetch activity logs for the current user
export const fetchActivities = async () => {
  try {
    const response = await api.get('/dashboard/activities');
    return response.data;
  } catch (err) {
    console.warn('[OFFLINE FALLBACK] Dashboard activities');
    return {
      success: true,
      data: [
        { id: 'act-1', details: 'Sophia indexed HR recruitment criteria handbook', action: 'document_upload', created_at: new Date().toISOString() },
        { id: 'act-2', details: 'Liam completed a sales onboarding turn session', action: 'chat_turn', created_at: new Date().toISOString() }
      ]
    };
  }
};

// Fetch time-series and category breakdown chart datasets
export const fetchCharts = async () => {
  try {
    const response = await api.get('/dashboard/charts');
    return response.data;
  } catch (err) {
    console.warn('[OFFLINE FALLBACK] Dashboard charts');
    return {
      success: true,
      data: {
        usageHistory: [
          { date_label: '07/25', conversations: 4, tokens: 620 },
          { date_label: '07/26', conversations: 6, tokens: 980 },
          { date_label: '07/27', conversations: 5, tokens: 750 },
          { date_label: '07/28', conversations: 9, tokens: 1850 }
        ],
        categoryDistribution: [
          { name: 'HR Operations', value: 1 },
          { name: 'Sales Reps', value: 1 }
        ]
      }
    };
  }
};
