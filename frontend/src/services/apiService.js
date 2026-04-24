import axios from 'axios';

// Di mode development (npm run dev), gunakan URL relatif agar Vite proxy
// meneruskan request ke backend Laravel lokal (http://localhost:8000).
// Di mode production (npm run build), gunakan URL server production.
const baseURL = import.meta.env.DEV
  ? '/api/v1'
  : 'https://sso.donarazhar.site/api/v1';

const api = axios.create({
  baseURL,
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

// Branch endpoints
export const branchApi = {
  getAll: () => api.get('/branches'),
  getOne: (id) => api.get(`/branches/${id}`),
  create: (data) => api.post('/branches', data),
  update: (id, data) => api.put(`/branches/${id}`, data),
  delete: (id) => api.delete(`/branches/${id}`),
};

// Attendance endpoints
export const attendanceApi = {
  recognize: (data) => api.post('/attendance/recognize', data),
  today: () => api.get('/attendance/today'),
  stats: () => api.get('/attendance/stats'),
  report: (params) => api.get('/attendance/report', { params }),
};

// Dashboard endpoints
export const dashboardApi = {
  stats: () => api.get('/dashboard/stats'),
};

export default api;
