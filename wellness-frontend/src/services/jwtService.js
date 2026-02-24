// ============================================
// JWT UTILITY - Decode JWT Token Safely
// ============================================

/**
 * Decodes JWT token without verification (frontend use only)
 * Token verification happens on backend
 * @param {string} token - JWT token
 * @returns {object} Decoded payload or null if invalid
 */
export const decodeToken = (token) => {
  try {
    if (!token) return null;

    // JWT format: header.payload.signature
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    // Decode payload (second part)
    const decoded = JSON.parse(atob(parts[1]));
    return decoded;
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
};

/**
 * Get user role from JWT token
 * @param {string} token - JWT token
 * @returns {string} Role (PATIENT, PRACTITIONER, ADMIN) or null
 */
export const getRoleFromToken = (token) => {
  const decoded = decodeToken(token);
  
  // JWT typically stores role in 'roles' array or 'role' field
  if (decoded?.authorities) {
    // Format: ROLE_ADMIN -> extract ADMIN
    const roleString = decoded.authorities[0] || "";
    return roleString.replace("ROLE_", "");
  }
  
  if (decoded?.role) {
    return decoded.role;
  }

  return null;
};

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean} True if expired, false otherwise
 */
export const isTokenExpired = (token) => {
  const decoded = decodeToken(token);
  
  if (!decoded?.exp) return true;
  
  // exp is in seconds, Date.now() is in milliseconds
  const expirationTime = decoded.exp * 1000;
  return Date.now() >= expirationTime;
};

/**
 * Validate token structure and expiration
 * @param {string} token - JWT token
 * @returns {boolean} True if valid, false otherwise
 */
export const isTokenValid = (token) => {
  if (!token) return false;
  
  const decoded = decodeToken(token);
  if (!decoded) return false;
  
  if (isTokenExpired(token)) return false;
  
  return true;
};

/**
 * Get user info from token
 * @param {string} token - JWT token
 * @returns {object} User object with id, email, role
 */
export const getUserFromToken = (token) => {
  const decoded = decodeToken(token);
  
  if (!decoded) return null;
  
  return {
    email: decoded.sub || decoded.email,
    role: getRoleFromToken(token),
    userId: decoded.userId || decoded.id,
    expiresAt: decoded.exp ? new Date(decoded.exp * 1000) : null
  };
};
