// ============================================
// SESSION SERVICE - Therapy Sessions API
// ============================================

const API_BASE = "http://localhost:8081/api";

const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
});

// Book a new session
export const bookSession = async (data) => {
    const res = await fetch(`${API_BASE}/sessions/book`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw { response: { data: result } };
    return result;
};

// Cancel a session
export const cancelSession = async (sessionId, cancelledBy = "USER", reason = "") => {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/cancel`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ cancelledBy, reason }),
    });
    const result = await res.json();
    if (!res.ok) throw { response: { data: result } };
    return result;
};

// Reschedule a session
export const rescheduleSession = async (sessionId, data) => {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/reschedule`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw { response: { data: result } };
    return result;
};

// Get all sessions for a user
export const getSessionsForUser = async (userId) => {
    const res = await fetch(`${API_BASE}/sessions/user/${userId}`, {
        headers: authHeaders(),
    });
    const result = await res.json();
    if (!res.ok) throw { response: { data: result } };
    return result;
};

// Get all sessions for a practitioner
export const getSessionsForPractitioner = async (practitionerId) => {
    const res = await fetch(`${API_BASE}/sessions/practitioner/${practitionerId}`, {
        headers: authHeaders(),
    });
    const result = await res.json();
    if (!res.ok) throw { response: { data: result } };
    return result;
};

// Get available time slots for a practitioner on a specific date
export const getAvailableSlots = async (practitionerId, date) => {
    const res = await fetch(`${API_BASE}/sessions/${practitionerId}/slots?date=${date}`, {
        headers: authHeaders(),
    });
    const result = await res.json();
    if (!res.ok) throw { response: { data: result } };
    return result;
};

// Get practitioner availability schedule
export const getAvailability = async (practitionerId) => {
    const res = await fetch(`${API_BASE}/availability/${practitionerId}`);
    const result = await res.json();
    if (!res.ok) throw { response: { data: result } };
    return result;
};

// Set/update practitioner availability for a day
export const setAvailability = async (practitionerId, data) => {
    const res = await fetch(`${API_BASE}/availability/${practitionerId}`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw { response: { data: result } };
    return result;
};
