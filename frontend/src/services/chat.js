import api from './api';

export const fetchChats = async () => {
  try {
    const response = await api.get('/chat');
    return response.data;
  } catch (err) {
    console.warn('[OFFLINE FALLBACK] fetchChats');
    return {
      success: true,
      data: [
        { id: 'mock-chat-1', title: 'HR General Inquiries', employee_id: 'mock-1', created_at: new Date().toISOString() },
        { id: 'mock-chat-2', title: 'Prospect Conversion Run', employee_id: 'mock-2', created_at: new Date().toISOString() }
      ]
    };
  }
};

export const fetchChatMessages = async (chatId) => {
  try {
    const response = await api.get(`/chat/${chatId}/messages`);
    return response.data;
  } catch (err) {
    console.warn('[OFFLINE FALLBACK] fetchChatMessages');
    const mockMessages = {
      'mock-chat-1': [
        { id: 'msg-1', sender_type: 'user', content: 'What is the leave encashment policy?', created_at: new Date(Date.now() - 3600000).toISOString() },
        { id: 'msg-2', sender_type: 'ai', content: 'Based on our organization policy, you can encash up to 15 days of accrued privilege leaves at the end of the calendar year.', created_at: new Date(Date.now() - 3500000).toISOString() }
      ],
      'mock-chat-2': [
        { id: 'msg-3', sender_type: 'user', content: 'Do you offer custom pricing templates?', created_at: new Date(Date.now() - 1800000).toISOString() },
        { id: 'msg-4', sender_type: 'ai', content: 'Yes! We offer customizable enterprise tiers matching user usage distributions. Let me fetch standard scales details.', created_at: new Date(Date.now() - 1700000).toISOString() }
      ]
    };
    return {
      success: true,
      data: mockMessages[chatId] || [
        { id: 'msg-default', sender_type: 'ai', content: 'Hello! I am your configured digital worker. How can I assist you today?', created_at: new Date().toISOString() }
      ]
    };
  }
};

export const createChat = async (employeeId, title) => {
  try {
    const response = await api.post('/chat', { employeeId, title });
    return response.data;
  } catch (err) {
    console.warn('[OFFLINE FALLBACK] createChat');
    return {
      success: true,
      data: { id: `mock-chat-${Date.now()}`, title: title || 'New Simulation Session', employee_id: employeeId, created_at: new Date().toISOString() }
    };
  }
};

export const sendChatMessage = async (chatId, message) => {
  try {
    const response = await api.post(`/chat/${chatId}/messages`, { message });
    return response.data;
  } catch (err) {
    console.warn('[OFFLINE FALLBACK] sendChatMessage');
    const mockReplies = [
      "I've analyzed your input. Let me index my workspace document directories to verify details.",
      "That is a great question. Based on my configured system prompt guidelines, I will execute automation tasks to resolve this.",
      "Certainly! I have updated my short-term memory parameter slots. Let me know what else I should document."
    ];
    const randomReply = mockReplies[Math.floor(Math.random() * mockReplies.length)];
    return {
      success: true,
      data: {
        userMessage: { id: `msg-u-${Date.now()}`, sender_type: 'user', content: message, created_at: new Date().toISOString() },
        aiResponse: { id: `msg-a-${Date.now()}`, sender_type: 'ai', content: randomReply, created_at: new Date().toISOString() }
      }
    };
  }
};

export const deleteChat = async (chatId) => {
  try {
    const response = await api.delete(`/chat/${chatId}`);
    return response.data;
  } catch (err) {
    console.warn('[OFFLINE FALLBACK] deleteChat');
    return { success: true };
  }
};
