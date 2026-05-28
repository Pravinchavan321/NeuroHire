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
  ranking:         (id, params) => api.get(`/jobs/${id}/ranking`, { params }),
  pipeline:        id  => api.get(`/jobs/${id}/pipeline`),
};
export const candidates = {
  list:   ()  => api.get('/candidates'),
  upload: fd  => api.post('/candidates', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  status: id  => api.get(`/candidates/status/${id}`),
  reanalyze: id => api.post(`/candidates/${id}/reanalyze`),
  similar: id => api.get(`/candidates/${id}/similar`),
};
export const resume = {
  parse: fd => api.post('/resume/parse', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
};
export const analysis = {
  get:         appId  => api.get(`/analysis/${appId}`),
  rankings:    jobId  => api.get(`/analysis/job/${jobId}/candidates`),
  updateStatus:(appId, status) => api.patch(`/analysis/${appId}/status`, { status }),
  logExport: () => api.post('/analysis/log-export'),
};
export const applications = {
  updateStatus: (applicationId, status, note) => api.patch(`/applications/${applicationId}/status`, { status, note }),
};
export const screeningResults = {
  get: (candidateId, jobId) => api.get(`/screening-results/${candidateId}/${jobId}`),
};
export const interviewQuestions = {
  get: (candidateId, jobId) => api.get(`/interview-questions/${candidateId}/${jobId}`),
  generate: data => api.post('/interview-questions/generate', data),
};
export const interviews = {
  schedule: data => api.post('/interviews/schedule', data),
  list: candidateId => api.get(`/interviews/${candidateId}`),
};
export const analytics = {
  get: () => api.get('/analytics'),
  overview: () => api.get('/analytics/overview'),
  scoreDistribution: () => api.get('/analytics/score-distribution'),
  jobsOverTime: () => api.get('/analytics/jobs-over-time'),
  recentActivity: () => api.get('/analytics/recent-activity'),
};
export const settings = {
  getCompany: () => api.get('/settings/company'),
  updateCompany: data => api.put('/settings/company', data),
};
export const system = {
  health: () => axios.get('/health'),
};
export const feedback = {
  submit: data => api.post('/feedback', data),
  get: appId => api.get(`/feedback/${appId}`),
};
export const billing = {
  createCheckout: () => api.post('/billing/create-checkout'),
  getStatus: () => api.get('/billing/status'),
};
export const integrations = {
  getStatus: () => api.get('/integrations/status'),
  setup: data => api.post('/integrations/setup', data),
};
export const audit = {
  list: (params) => api.get('/audit', { params }),
};
export const apikeys = {
  list: () => api.get('/apikeys'),
  generate: name => api.post('/apikeys/generate', { name }),
  revoke: id => api.delete(`/apikeys/${id}`),
};
export const gdpr = {
  getRequests: () => api.get('/gdpr/requests'),
  exportData: email => api.get(`/gdpr/export/${email}`),
  completeRequest: id => api.post(`/gdpr/deletion-request/${id}/complete`),
};
