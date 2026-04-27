import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export const auth = {
  register: d => api.post('/auth/register', d),
  login:    d => api.post('/auth/login', d),
};
export const jobs = {
  list:            ()  => api.get('/jobs'),
  create:          d   => api.post('/jobs', d),
  getCandidates:   id  => api.get(`/jobs/${id}/candidates`),
};
export const candidates = {
  list:   ()  => api.get('/candidates'),
  upload: fd  => api.post('/candidates', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
};
export const analysis = {
  get:         appId  => api.get(`/analysis/${appId}`),
  rankings:    jobId  => api.get(`/analysis/job/${jobId}/rankings`),
  updateStatus:(appId, status) => api.patch(`/analysis/${appId}/status`, { status }),
};
