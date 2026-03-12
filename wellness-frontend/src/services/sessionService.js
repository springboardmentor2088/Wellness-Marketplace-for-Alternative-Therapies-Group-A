// ============================================
// SESSION SERVICE - Therapy Sessions API
// ============================================

import axios from "axios";
import { getAccessToken } from "./authService";

const API_BASE = "/api";

const getAuthHeaders = () => ({
    headers: {
        Authorization: `Bearer ${getAccessToken()}`,
        "Content-Type": "application/json",
    },
});

// Book a new session
export const bookSession = async (data) => {
    const response = await axios.post(`${API_BASE}/sessions/book`, data, getAuthHeaders());
    return response.data;
};

// Cancel a session
export const cancelSession = async (sessionId, cancelledBy = "USER", reason = "") => {
    const response = await axios.put(`${API_BASE}/sessions/${sessionId}/cancel`, { cancelledBy, reason }, getAuthHeaders());
    return response.data;
};

// Reschedule a session
export const rescheduleSession = async (sessionId, data) => {
    const response = await axios.put(`${API_BASE}/sessions/${sessionId}/reschedule`, data, getAuthHeaders());
    return response.data;
};

// Get all sessions for a user
export const getSessionsForUser = async (userId) => {
    const response = await axios.get(`${API_BASE}/sessions/user/${userId}`, getAuthHeaders());
    return response.data;
};

// Get all sessions for a practitioner
export const getSessionsForPractitioner = async (practitionerId) => {
    const response = await axios.get(`${API_BASE}/sessions/practitioner/${practitionerId}`, getAuthHeaders());
    return response.data;
};

// Get available time slots for a practitioner on a specific date
export const getAvailableSlots = async (practitionerId, date) => {
    const response = await axios.get(`${API_BASE}/sessions/${practitionerId}/slots?date=${date}`, getAuthHeaders());
    return response.data;
};

// Get practitioner availability schedule
export const getAvailability = async (practitionerId) => {
    const response = await axios.get(`${API_BASE}/availability/${practitionerId}`);
    return response.data;
};

// Set/update practitioner availability for a day
export const setAvailability = async (practitionerId, data) => {
    const response = await axios.post(`${API_BASE}/availability/${practitionerId}`, data, getAuthHeaders());
    return response.data;
};
