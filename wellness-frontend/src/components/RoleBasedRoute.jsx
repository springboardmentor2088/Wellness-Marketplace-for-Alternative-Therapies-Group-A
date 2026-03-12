import React from "react";
import { Navigate } from "react-router-dom";
import { getAccessToken, getStoredUser } from "../services/authService";
import { isTokenValid, getRoleFromToken } from "../services/jwtService";

/**
 * Role-Based Route Protection Component
 * - Validates JWT token
 * - Checks expiration
 * - Extracts role from token
 * - Supports multiple roles
 * - Handles onboarding redirect for practitioners
 */
export const RoleBasedRoute = ({ children, allowedRoles, skipOnboardingCheck = false }) => {
  const accessToken = getAccessToken();
  const storedUser = getStoredUser();

  /* ========================================
     1️⃣ Check if access token exists
  ======================================== */
  if (!accessToken) {
    console.warn("No access token found");
    return <Navigate to="/login" replace />;
  }

  /* ========================================
     2️⃣ Validate token (structure + expiry)
  ======================================== */
  if (!isTokenValid(accessToken)) {
    console.warn("Access token invalid or expired. Clearing storage.");

    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem("userRole");

    return <Navigate to="/login" replace />;
  }

  /* ========================================
     3️⃣ Get role from JWT (Primary Source)
  ======================================== */
  let userRole = getRoleFromToken(accessToken);

  /* ========================================
     4️⃣ Fallback to stored user role
  ======================================== */
  if (!userRole && storedUser?.role) {
    userRole = storedUser.role;
    console.warn("Using fallback role from stored user");
  }

  if (!userRole) {
    console.warn("No user role found.");
    return <Navigate to="/login" replace />;
  }

  /* ========================================
     5️⃣ STRICT PRACTITIONER ONBOARDING CHECK
  ======================================== */
  if (
    !skipOnboardingCheck &&
    userRole === "PRACTITIONER" &&
    storedUser?.onboardingCompleted !== true
  ) {
    console.warn("Practitioner onboarding incomplete. Redirecting.");
    return <Navigate to="/practitioner/onboarding" replace />;
  }

  /* ========================================
     6️⃣ Normalize allowed roles to array
  ======================================== */
  const rolesArray = Array.isArray(allowedRoles)
    ? allowedRoles
    : [allowedRoles];

  /* ========================================
     7️⃣ Handle USER / PATIENT compatibility
  ======================================== */
  const normalizedUserRole =
    userRole === "PATIENT" ? "USER" : userRole;

  const normalizedAllowedRoles = rolesArray.map((role) =>
    role === "PATIENT" ? "USER" : role
  );

  /* ========================================
     8️⃣ Final Access Check
  ======================================== */
  const hasAccess =
    normalizedAllowedRoles.includes(normalizedUserRole) ||
    rolesArray.includes(userRole);

  if (!hasAccess) {
    console.warn(
      `User role '${userRole}' not allowed. Required: ${rolesArray.join(", ")}`
    );
    return <Navigate to="/unauthorized" replace />;
  }

  /* ========================================
     9️⃣ All checks passed
  ======================================== */
  return children;
};

/* =========================================================
   Helper Components
========================================================= */

/**
 * Admin-only route
 */
export const AdminRoute = ({ children }) => (
  <RoleBasedRoute allowedRoles="ADMIN">
    {children}
  </RoleBasedRoute>
);

/**
 * Practitioner-only route
 */
export const PractitionerRoute = ({ children }) => (
  <RoleBasedRoute allowedRoles="PRACTITIONER">
    {children}
  </RoleBasedRoute>
);

/**
 * Patient/User route (supports both)
 */
export const PatientRoute = ({ children }) => (
  <RoleBasedRoute allowedRoles={["PATIENT", "USER"]}>
    {children}
  </RoleBasedRoute>
);

/**
 * Multiple role route
 */
export const MultiRoleRoute = ({ children, roles }) => (
  <RoleBasedRoute allowedRoles={roles}>
    {children}
  </RoleBasedRoute>
);

export default RoleBasedRoute;