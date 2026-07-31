import api from './api';

export const fetchDocuments = async (employeeId) => {
  const response = await api.get(`/kb/employee/${employeeId}`);
  return response.data;
};

export const uploadDocument = async (employeeId, file) => {
  const formData = new FormData();
  formData.append('employeeId', employeeId);
  formData.append('file', file);

  const response = await api.post('/kb/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

export const deleteDocument = async (id) => {
  const response = await api.delete(`/kb/${id}`);
  return response.data;
};

export const searchKB = async (employeeId, query) => {
  const response = await api.get(`/kb/search`, {
    params: { employeeId, query }
  });
  return response.data;
};
