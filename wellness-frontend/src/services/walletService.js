import axios from "axios";
import { getAccessToken } from "./authService";

const API_BASE = "/api/wallet";

const getAuthHeaders = () => ({
    headers: {
        Authorization: `Bearer ${getAccessToken()}`,
        "Content-Type": "application/json",
    },
});

export const getWalletBalance = async () => {
    const response = await axios.get(`${API_BASE}/balance`, getAuthHeaders());
    return response.data;
};

export const getWalletTransactions = async () => {
    const response = await axios.get(`${API_BASE}/transactions`, getAuthHeaders());
    return response.data;
};

export const withdrawFunds = async (amount) => {
    const response = await axios.post(`${API_BASE}/withdraw`, { amount }, getAuthHeaders());
    return response.data;
};

export const depositFunds = async (amount) => {
    const response = await axios.post(`${API_BASE}/deposit`, { amount }, getAuthHeaders());
    return response.data;
};

// --- Practitioner Earnings ---
export const getPendingEarnings = async () => {
    const response = await axios.get('/api/practitioner/earnings/pending', getAuthHeaders());
    return response.data;
};

export const withdrawEarnings = async () => {
    const response = await axios.post('/api/practitioner/earnings/withdraw', {}, getAuthHeaders());
    return response.data;
};
