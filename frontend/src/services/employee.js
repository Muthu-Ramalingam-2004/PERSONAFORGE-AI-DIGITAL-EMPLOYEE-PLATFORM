import api from './api';

export const fetchEmployees = async () => {
  const response = await api.get('/employee');
  return response.data;
};

export const fetchEmployeeById = async (id) => {
  const response = await api.get(`/employee/${id}`);
  return response.data;
};

export const createEmployee = async (employeeData) => {
  const response = await api.post('/employee', employeeData);
  return response.data;
};

export const updateEmployee = async (id, employeeData) => {
  const response = await api.put(`/employee/${id}`, employeeData);
  return response.data;
};

export const deleteEmployee = async (id) => {
  const response = await api.delete(`/employee/${id}`);
  return response.data;
};

export const toggleEmployeeStatus = async (id, status) => {
  const response = await api.patch(`/employee/${id}/status`, { status });
  return response.data;
};
