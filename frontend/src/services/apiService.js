import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Employee endpoints
export const employeeApi = {
  getAll: () => api.get('/employees'),
  getOne: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
  enrollFace: (id, data) => api.post(`/employees/${id}/enroll-face`, data),
  removeFace: (id) => api.delete(`/employees/${id}/remove-face`),
};

// Attendance endpoints
export const attendanceApi = {
  recognize: (data) => api.post('/attendance/recognize', data),
  today: () => api.get('/attendance/today'),
  report: (params) => api.get('/attendance/report', { params }),
};

// Dashboard endpoints
export const dashboardApi = {
  stats: () => api.get('/dashboard/stats'),
};

export default api;
