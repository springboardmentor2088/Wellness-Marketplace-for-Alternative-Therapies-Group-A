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
import Unauthorized from "./pages/Unauthorized.jsx";
import { AdminRoute, PractitionerRoute } from "./components/RoleBasedRoute.jsx";

import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

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

        {/* Practitioner Routes - Role-Based Protection */}
        <Route
          path="/practitioner/onboarding"
          element={
            <PractitionerRoute>
              <PractitionerOnboarding />
            </PractitionerRoute>
          }
        />
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

        {/* Product Marketplace Routes */}
        <Route path="/products" element={<ProductMarketplace />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/user/orders" element={<OrderHistory />} />

        {/* Fallback Route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;