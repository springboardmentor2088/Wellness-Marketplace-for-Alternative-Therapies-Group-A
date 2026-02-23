// ============================================
// USER SERVICE - Backend API Integration
// ============================================

import axios from "axios";
import { getAccessToken } from "./authService";

// Create axios instance with auth header
const getAuthHeaders = () => ({
    headers: {
        Authorization: `Bearer ${getAccessToken()}`,
        "Content-Type": "application/json",
    },
});

// ---- Get Current User Profile ----
export const getCurrentUser = async () => {
    const response = await axios.get("/api/users/me", getAuthHeaders());
    return response.data;
};

// ---- Update User Profile ----
export const updateUser = async (id, data) => {
    const response = await axios.put(`/api/users/${id}`, data, getAuthHeaders());
    return response.data;
};

// ---- Get Verified Practitioners (for Find Doctors) ----
export const getVerifiedPractitioners = async () => {
    const response = await axios.get("/api/practitioners/verified", getAuthHeaders());
    return response.data;
};

// ---- Create Appointment Request ----
export const createAppointmentRequest = async (practitionerId, requestData) => {
    const response = await axios.post(
        `/api/practitioners/requests/create/${practitionerId}`,
        requestData,
        getAuthHeaders()
    );
    return response.data;
};
