import axios from 'axios';
import { getAccessToken } from './authService';

const getHeaders = () => {
  const token = getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

export const createThread = async (threadData) => {
  const response = await axios.post('/api/forum/threads', threadData, { headers: getHeaders() });
  return response.data;
};

export const getThreads = async (page = 0, size = 10, category = '') => {
  const params = new URLSearchParams({ page, size });
  if (category) params.append('category', category);
  
  const response = await axios.get(`/api/forum/threads?${params.toString()}`, { headers: getHeaders() });
  return response.data;
};

export const getThreadById = async (id) => {
  const response = await axios.get(`/api/forum/threads/${id}`, { headers: getHeaders() });
  return response.data;
};

export const addAnswer = async (threadId, answerData) => {
  const response = await axios.post(`/api/forum/threads/${threadId}/answers`, answerData, { headers: getHeaders() });
  return response.data;
};

export const addComment = async (answerId, commentData) => {
  const response = await axios.post(`/api/forum/answers/${answerId}/comments`, commentData, { headers: getHeaders() });
  return response.data;
};

export const deleteThread = async (id) => {
  await axios.delete(`/api/forum/threads/${id}`, { headers: getHeaders() });
};

export const deleteAnswer = async (id) => {
  await axios.delete(`/api/forum/answers/${id}`, { headers: getHeaders() });
};

export const deleteComment = async (id) => {
  await axios.delete(`/api/forum/comments/${id}`, { headers: getHeaders() });
};

export const likeAnswer = async (id) => {
  const response = await axios.post(`/api/forum/answers/${id}/like`, {}, { headers: getHeaders() });
  return response.data;
};

export const unlikeAnswer = async (id) => {
  const response = await axios.delete(`/api/forum/answers/${id}/like`, { headers: getHeaders() });
  return response.data;
};

export const acceptSolution = async (id) => {
  const response = await axios.put(`/api/forum/answers/${id}/accept`, {}, { headers: getHeaders() });
  return response.data;
};

export const reportAnswer = async (answerId, reason) => {
  const response = await axios.post(`/api/forum/answers/${answerId}/report`, { reason }, { headers: getHeaders() });
  return response.data;
};

export const getReports = async () => {
  const response = await axios.get('/api/forum/reports', { headers: getHeaders() });
  return response.data;
};

export const resolveReport = async (reportId) => {
  const response = await axios.put(`/api/forum/reports/${reportId}/resolve`, {}, { headers: getHeaders() });
  return response.data;
};

export const getMyThreads = async (page = 0, size = 10) => {
  const response = await axios.get(`/api/forum/threads/my?page=${page}&size=${size}`, { headers: getHeaders() });
  return response.data;
};

export const searchThreads = async (keyword, page = 0, size = 10) => {
  const response = await axios.get(`/api/forum/threads/search?q=${encodeURIComponent(keyword)}&page=${page}&size=${size}`, { headers: getHeaders() });
  return response.data;
};

