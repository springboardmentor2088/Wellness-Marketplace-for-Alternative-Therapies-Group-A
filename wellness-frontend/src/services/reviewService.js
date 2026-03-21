// ============================================
// REVIEW SERVICE - Practitioner Reviews API
// ============================================

const API_BASE = "http://localhost:8081/api";

const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
});

// ---- Submit a review for a practitioner ----
export const submitReview = async (practitionerId, rating, behaviourRating, treatmentEffectivenessRating, recommendPractitioner, comment, sessionId) => {
    const res = await fetch(`${API_BASE}/reviews`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ 
            practitionerId, 
            rating, 
            behaviourRating, 
            treatmentEffectivenessRating, 
            recommendPractitioner, 
            comment,
            sessionId
        }),
    });
    const result = await res.json();
    if (!res.ok) throw { response: { data: result } };
    return result;
};

// ---- Get all reviews for a practitioner ----
export const getPractitionerReviews = async (practitionerId) => {
    const res = await fetch(`${API_BASE}/reviews/practitioner/${practitionerId}`, {
        headers: authHeaders(),
    });
    const result = await res.json();
    if (!res.ok) throw { response: { data: result } };
    return result;
};

// ---- Get all reviews for a product ----
export const getProductReviews = async (productId) => {
    const res = await fetch(`${API_BASE}/product-reviews/${productId}`, {
        headers: authHeaders(),
    });
    const result = await res.json();
    if (!res.ok) throw { response: { data: result } };
    return result;
};

// ---- Submit a product review ----
export const submitProductReview = async (productId, rating, comment) => {
    const res = await fetch(`${API_BASE}/product-reviews`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ productId, rating, comment }),
    });
    const result = await res.json();
    if (!res.ok) throw { response: { data: result } };
    return result;
};
