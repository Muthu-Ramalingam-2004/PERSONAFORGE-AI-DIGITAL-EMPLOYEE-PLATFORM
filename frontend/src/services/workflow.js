import api from './api';

export const fetchIntegrationsStatus = async () => {
  const response = await api.get('/workflow/status');
  return response.data;
};

export const triggerWorkflow = async (platform, action, payload) => {
  const response = await api.post('/workflow/trigger', { platform, action, payload });
  return response.data;
};
