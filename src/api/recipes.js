import api from './client.js';

export const fetchRecipes = (params) => api.get('/recipes', { params }).then((response) => response.data);

export const fetchRecipe = (id) => api.get(`/recipes/${id}`).then((response) => response.data);

export const createRecipe = (payload) => api.post('/recipes', payload).then((response) => response.data);

export const updateRecipe = (id, payload) =>
  api.put(`/recipes/${id}`, payload).then((response) => response.data);

export const deleteRecipe = (id) => api.delete(`/recipes/${id}`).then((response) => response.data);

export const likeRecipe = (id) => api.post(`/recipes/${id}/like`).then((response) => response.data);

export const favoriteRecipe = (id) =>
  api.post(`/recipes/${id}/favorite`).then((response) => response.data);

export const rateRecipe = (id, value) =>
  api.post(`/recipes/${id}/like?value=${value}`).then((response) => response.data);
