import api from './api';

// Fetch summary metrics for dashboard cards
export const fetchStats = async () => {
  const response = await api.get('/dashboard/stats');
  return response.data;
};

// Fetch activity logs for the current user
export const fetchActivities = async () => {
  const response = await api.get('/dashboard/activities');
  return response.data;
};

// Fetch time-series and category breakdown chart datasets
export const fetchCharts = async () => {
  const response = await api.get('/dashboard/charts');
  return response.data;
};
