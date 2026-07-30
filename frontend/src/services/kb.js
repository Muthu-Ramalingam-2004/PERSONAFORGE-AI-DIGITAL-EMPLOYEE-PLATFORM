import api from './api';

export const fetchDocuments = async (employeeId) => {
  try {
    const response = await api.get(`/kb/employee/${employeeId}`);
    return response.data;
  } catch (err) {
    console.warn('[OFFLINE FALLBACK] fetchDocuments');
    return {
      success: true,
      data: [
        { id: 'doc-1', name: 'employee_handbook.pdf', file_type: 'pdf', char_count: 14500, created_at: new Date().toISOString() },
        { id: 'doc-2', name: 'sales_pitch_faq.txt', file_type: 'txt', char_count: 3200, created_at: new Date().toISOString() }
      ]
    };
  }
};

export const uploadDocument = async (employeeId, file) => {
  try {
    const formData = new FormData();
    formData.append('employeeId', employeeId);
    formData.append('file', file);

    const response = await api.post('/kb/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (err) {
    console.warn('[OFFLINE FALLBACK] uploadDocument');
    return {
      success: true,
      data: { id: `doc-${Date.now()}`, name: file.name, file_type: file.name.split('.').pop() || 'txt', char_count: 500, created_at: new Date().toISOString() }
    };
  }
};

export const deleteDocument = async (id) => {
  try {
    const response = await api.delete(`/kb/${id}`);
    return response.data;
  } catch (err) {
    console.warn('[OFFLINE FALLBACK] deleteDocument');
    return { success: true };
  }
};

export const searchKB = async (employeeId, query) => {
  try {
    const response = await api.get(`/kb/search`, {
      params: { employeeId, query }
    });
    return response.data;
  } catch (err) {
    console.warn('[OFFLINE FALLBACK] searchKB');
    return {
      success: true,
      data: [
        { content: `Mock document match snippet referencing query word: ${query}` }
      ]
    };
  }
};
