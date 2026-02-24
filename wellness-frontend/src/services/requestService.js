import axios from "axios";

const API_BASE_URL = "/api/practitioners/requests";

// Get all requests for admin (latest first)
export const getAllRequests = async () => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/all`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching all requests:", error);
    throw error;
  }
};

// Get all requests for a practitioner (latest first)
export const getRequestsForPractitioner = async (practitionerId) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/practitioner/${practitionerId}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching requests:", error);
    throw error;
  }
};

// Get pending requests for a practitioner (latest first)
export const getPendingRequests = async (practitionerId) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/practitioner/${practitionerId}/pending`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching pending requests:", error);
    throw error;
  }
};

// Get requests by status
export const getRequestsByStatus = async (practitionerId, status) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/practitioner/${practitionerId}/by-status`,
      {
        params: { status },
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching requests by status:", error);
    throw error;
  }
};

// Get requests by priority
export const getRequestsByPriority = async (practitionerId, priority) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/practitioner/${practitionerId}/by-priority`,
      {
        params: { priority },
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching requests by priority:", error);
    throw error;
  }
};

// Get request by ID
export const getRequestById = async (requestId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/${requestId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching request:", error);
    throw error;
  }
};

// Accept request
export const acceptRequest = async (requestId) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/${requestId}/accept`,
      {},
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error accepting request:", error);
    throw error;
  }
};

// Reject request
export const rejectRequest = async (requestId, reason) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/${requestId}/reject`,
      {},
      {
        params: { reason },
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error rejecting request:", error);
    throw error;
  }
};

// Complete request
export const completeRequest = async (requestId) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/${requestId}/complete`,
      {},
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error completing request:", error);
    throw error;
  }
};

// Cancel request
export const cancelRequest = async (requestId) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/${requestId}/cancel`,
      {},
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error cancelling request:", error);
    throw error;
  }
};

// Count pending requests
export const countPendingRequests = async (practitionerId) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/practitioner/${practitionerId}/pending-count`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error counting pending requests:", error);
    throw error;
  }
};
