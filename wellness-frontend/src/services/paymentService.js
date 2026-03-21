import axios from "axios";
import { getAccessToken } from "./authService";

const API_BASE = "/api/payments";

const getAuthHeaders = () => ({
    headers: {
        Authorization: `Bearer ${getAccessToken()}`,
        "Content-Type": "application/json",
    },
});

// Initiate Payment
export const initiatePayment = async (data) => {
    // data: { sessionId, orderId, userId, amount }
    const response = await axios.post(`${API_BASE}/initiate`, data, getAuthHeaders());
    return response.data;
};

export const payWithWallet = async (data) => {
    // data: { sessionId, orderId, userId, amount }
    const response = await axios.post(`${API_BASE}/wallet-pay`, data, getAuthHeaders());
    return response.data;
};

// Mock Webhook (Normally called by Gateway, but we call it frontend for Dev)
export const simulatePaymentWebhook = async (data) => {
    // data: { orderId, paymentId, signature }
    const response = await axios.post(`${API_BASE}/webhook`, data, {
        headers: { "Content-Type": "application/json" }
    });
    return response.data;
};
