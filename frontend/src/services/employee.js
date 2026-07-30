import api from './api';

export const fetchEmployees = async () => {
  try {
    const response = await api.get('/employee');
    return response.data;
  } catch (err) {
    console.warn('[OFFLINE FALLBACK] fetchEmployees');
    return {
      success: true,
      data: [
        { id: 'mock-1', name: 'Sophia Watson', role_title: 'HR Specialist', category: 'HR', is_active: true, avatar_url: '', system_prompt: 'You are an HR digital employee assistant.', temperature: 0.7, max_tokens: 800 },
        { id: 'mock-2', name: 'Liam Davies', role_title: 'Sales Representative', category: 'Sales', is_active: true, avatar_url: '', system_prompt: 'You are a warm, persuasive sales digital worker.', temperature: 0.8, max_tokens: 1000 },
        { id: 'mock-3', name: 'Ava Mitchell', role_title: 'Customer Support Lead', category: 'Support', is_active: false, avatar_url: '', system_prompt: 'You are a highly efficient customer support digital worker.', temperature: 0.5, max_tokens: 600 }
      ]
    };
  }
};

export const fetchEmployeeById = async (id) => {
  try {
    const response = await api.get(`/employee/${id}`);
    return response.data;
  } catch (err) {
    console.warn('[OFFLINE FALLBACK] fetchEmployeeById');
    const mockWorkers = {
      'mock-1': { id: 'mock-1', name: 'Sophia Watson', role_title: 'HR Specialist', category: 'HR', is_active: true, avatar_url: '', system_prompt: 'You are an HR digital employee assistant.', temperature: 0.7, max_tokens: 800 },
      'mock-2': { id: 'mock-2', name: 'Liam Davies', role_title: 'Sales Representative', category: 'Sales', is_active: true, avatar_url: '', system_prompt: 'You are a warm, persuasive sales digital worker.', temperature: 0.8, max_tokens: 1000 },
      'mock-3': { id: 'mock-3', name: 'Ava Mitchell', role_title: 'Customer Support Lead', category: 'Support', is_active: false, avatar_url: '', system_prompt: 'You are a highly efficient customer support digital worker.', temperature: 0.5, max_tokens: 600 }
    };
    return {
      success: true,
      data: mockWorkers[id] || { id: id, name: 'AI Assistant', role_title: 'Support representative', category: 'Support', is_active: true, avatar_url: '', system_prompt: 'You are an AI assistant.', temperature: 0.7, max_tokens: 800 }
    };
  }
};

export const createEmployee = async (employeeData) => {
  try {
    const response = await api.post('/employee', employeeData);
    return response.data;
  } catch (err) {
    console.warn('[OFFLINE FALLBACK] createEmployee');
    return { success: true, data: { id: `mock-${Date.now()}`, ...employeeData } };
  }
};

export const updateEmployee = async (id, employeeData) => {
  try {
    const response = await api.put(`/employee/${id}`, employeeData);
    return response.data;
  } catch (err) {
    console.warn('[OFFLINE FALLBACK] updateEmployee');
    return { success: true, data: { id, ...employeeData } };
  }
};

export const deleteEmployee = async (id) => {
  try {
    const response = await api.delete(`/employee/${id}`);
    return response.data;
  } catch (err) {
    console.warn('[OFFLINE FALLBACK] deleteEmployee');
    return { success: true };
  }
};

export const toggleEmployeeStatus = async (id, status) => {
  try {
    const response = await api.patch(`/employee/${id}/status`, { status });
    return response.data;
  } catch (err) {
    console.warn('[OFFLINE FALLBACK] toggleEmployeeStatus');
    return { success: true, data: { id, is_active: status === 'active' } };
  }
};
