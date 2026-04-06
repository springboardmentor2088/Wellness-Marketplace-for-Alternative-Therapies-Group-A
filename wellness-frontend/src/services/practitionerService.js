import axios from 'axios';
import { getAccessToken } from './authService';

const API_URL = '/api';

const getHeaders = () => {
  const token = getAccessToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
};

export const getIssuedPrescriptions = async () => {
  const response = await axios.get(`${API_URL}/practitioners/me/issued-prescriptions`, { headers: getHeaders() });
  return response.data;
};

export const getPatientLogs = async () => {
  const response = await axios.get(`${API_URL}/practitioners/me/patient-logs`, { headers: getHeaders() });
  return response.data;
};

export const getAllMedicines = async () => {
  const response = await axios.get(`${API_URL}/products/available`, { headers: getHeaders() });
  return response.data;
};

export const searchMedicines = async (query) => {
  const response = await axios.get(`${API_URL}/products/search?query=${query}`, { headers: getHeaders() });
  return response.data;
};
