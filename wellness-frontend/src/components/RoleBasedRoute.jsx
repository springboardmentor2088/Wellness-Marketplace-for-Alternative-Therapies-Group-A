import { Navigate } from "react-router-dom";
import { getAccessToken, getStoredUser } from "../services/authService";
import { isTokenValid, getRoleFromToken } from "../services/jwtService";

/**
 * Role-Based Route Protection Component
 * Checks JWT token and user role from backend-validated data
 * @param {ReactNode} children - Component to render if authorized
 * @param {string|string[]} allowedRoles - Role(s) that can access this route
 * @returns {ReactNode} Protected component or redirect to login/unauthorized
 */
export const RoleBasedRoute = ({ children, allowedRoles }) => {
  const accessToken = getAccessToken();
  const storedUser = getStoredUser();

  // 1. Check if token exists
  if (!accessToken) {
    console.warn("No access token found");
    return <Navigate to="/login" replace />;
  }

  // 2. Validate token structure and expiration
  if (!isTokenValid(accessToken)) {
    console.warn("Access token is invalid or expired");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    localStorage.removeItem("refreshToken");
    return <Navigate to="/login" replace />;
  }

  // 3. Get role from token (backend source of truth)
  const userRole = storedUser?.role;

  if (!userRole) {
    console.warn("No user role found in stored user data");
    return <Navigate to="/login" replace />;
  }

  // 4. Normalize roles to array for comparison
  const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  // 5. Check if user has required role
  if (!rolesArray.includes(userRole)) {
    console.warn(`User role '${userRole}' not in allowed roles: ${rolesArray.join(", ")}`);
    return <Navigate to="/unauthorized" replace />;
  }

  // 6. All checks passed - render child component
  return children;
};

/**
 * Helper component for Admin-only routes
 */
export const AdminRoute = ({ children }) => {
  return <RoleBasedRoute allowedRoles="ADMIN">{children}</RoleBasedRoute>;
};

/**
 * Helper component for Practitioner-only routes
 */
export const PractitionerRoute = ({ children }) => {
  return <RoleBasedRoute allowedRoles="PRACTITIONER">{children}</RoleBasedRoute>;
};

/**
 * Helper component for Patient-only routes
 */
export const PatientRoute = ({ children }) => {
  return <RoleBasedRoute allowedRoles="PATIENT">{children}</RoleBasedRoute>;
};

/**
 * Helper component for multiple roles
 */
export const MultiRoleRoute = ({ children, roles }) => {
  return <RoleBasedRoute allowedRoles={roles}>{children}</RoleBasedRoute>;
};
