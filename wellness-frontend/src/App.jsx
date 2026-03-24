import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import PractitionerOnboarding from "./pages/PractitionerOnboarding.jsx";
import PractitionerDashboard from "./pages/PractitionerDashboard.jsx";
import UserDashboard from "./pages/UserDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import ProductMarketplace from "./pages/ProductMarketplace.jsx";
import Cart from "./pages/Cart.jsx";
import OrderHistory from "./pages/OrderHistory.jsx";
import BrowseSessions from "./pages/BrowseSessions.jsx";
import MyBookings from "./pages/MyBookings.jsx";
import Unauthorized from "./pages/Unauthorized.jsx";
import VerifyEmail from "./pages/VerifyEmail.jsx";
import CommunityForum from "./pages/CommunityForum.jsx";
import ForumThreadDetail from "./pages/ForumThreadDetail.jsx";
import { AdminRoute, PractitionerRoute } from "./components/RoleBasedRoute.jsx";
import { NotificationProvider } from "./context/NotificationContext.jsx";

import toast, { Toaster } from 'react-hot-toast';

function App() {

  return (
    <NotificationProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />

          {/* Error Routes */}
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Admin Routes - Role-Based Protection */}
          <Route
            path="/admin/dashboard"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />

          {/* Practitioner Onboarding - PUBLIC/BASIC AUTH ONLY to avoid redirect loops */}
          <Route path="/practitioner/onboarding" element={<PractitionerOnboarding />} />

          {/* Practitioner Dashboard - FULL PROTECTION */}
          <Route
            path="/practitioner/dashboard"
            element={
              <PractitionerRoute>
                <PractitionerDashboard />
              </PractitionerRoute>
            }
          />

          {/* User Routes */}
          <Route path="/user/dashboard" element={<UserDashboard />} />
          <Route path="/browse-sessions" element={<BrowseSessions />} />
          <Route path="/my-bookings" element={<MyBookings />} />

          {/* Product Marketplace Routes */}
          <Route path="/products" element={<ProductMarketplace />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/user/orders" element={<OrderHistory />} />

          {/* Social / Community */}
          <Route path="/community-forum" element={<CommunityForum />} />
          <Route path="/community-forum/:id" element={<ForumThreadDetail />} />

          {/* Fallback Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </NotificationProvider>
  );
}

export default App;