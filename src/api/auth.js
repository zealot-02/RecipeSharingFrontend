import api from './client.js';

export const registerUser = (payload) =>
  api.post('/auth/register', payload).then((response) => response.data);

export const loginUser = (payload) =>
  api.post('/auth/login', payload).then((response) => response.data);

export const fetchCurrentUser = () => api.get('/auth/me').then((response) => response.data);
