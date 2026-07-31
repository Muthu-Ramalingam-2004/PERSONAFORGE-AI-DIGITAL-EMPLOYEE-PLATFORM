import api from './api';

export const fetchChats = async () => {
  const response = await api.get('/chat');
  return response.data;
};

export const fetchChatMessages = async (chatId) => {
  const response = await api.get(`/chat/${chatId}/messages`);
  return response.data;
};

export const createChat = async (employeeId, title) => {
  const response = await api.post('/chat', { employeeId, title });
  return response.data;
};

export const sendChatMessage = async (chatId, message) => {
  const response = await api.post(`/chat/${chatId}/messages`, { message });
  return response.data;
};

export const deleteChat = async (chatId) => {
  const response = await api.delete(`/chat/${chatId}`);
  return response.data;
};
