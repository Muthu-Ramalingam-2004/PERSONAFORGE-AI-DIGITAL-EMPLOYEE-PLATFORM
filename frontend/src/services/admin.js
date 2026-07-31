import api from './api';

export const fetchAdminStats = async () => {
  const response = await api.get('/admin/stats');
  return response.data;
};

export const fetchAdminUsers = async () => {
  const response = await api.get('/admin/users');
  return response.data;
};

export const updateAdminUserPlan = async (targetUserId, subscriptionPlan, role) => {
  const response = await api.put('/admin/user-plan', { targetUserId, subscriptionPlan, role });
  return response.data;
};

export const fetchAdminLogs = async () => {
  const response = await api.get('/admin/logs');
  return response.data;
};
