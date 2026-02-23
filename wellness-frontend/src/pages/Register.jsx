import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

import { registerUser, storeAuthData, getAccessToken, getStoredUser } from "../services/authService";

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'PATIENT'
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setErrors({});
    setLoading(true);

    try {
      const payload = {
        name: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password,
        role: formData.role,
        bio: ""
      };

      // Call backend API using authService
      const result = await registerUser(payload);
      const data = result.data;

      // Store auth data using centralized helper
      storeAuthData(data);

      toast.success("Registration successful!");

      // Navigate based on role
      if (data.user.role === "PRACTITIONER") {
        navigate("/practitioner/onboarding");
      } else {
        navigate("/user/dashboard");
      }
    } catch (err) {
      console.error("Registration error:", err);
      const errorMsg = err.response?.data?.message || err.message || "Registration failed";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-[#f5f3ea] to-[#e7e2d3]">

      {/* LEFT SIDE BRAND PANEL */}
      <div className="hidden md:flex w-1/2 bg-[#1f6f66] text-white flex-col justify-center px-16">
        <h1 className="text-4xl font-bold mb-6">
          Welcome to Wellness
        </h1>
        <p className="text-lg opacity-90 leading-relaxed">
          Your personalized digital therapy platform.
          Secure. Private. Professional.
        </p>

        <div className="mt-10 space-y-3 text-sm opacity-80">
          <p>✔ Secure Authentication</p>
          <p>✔ Role Based Access</p>
          <p>✔ Real-time Dashboard</p>
        </div>
      </div>

      {/* RIGHT SIDE FORM */}
      <div className="flex w-full md:w-1/2 items-center justify-center px-6">
        <div className="bg-white w-full max-w-md p-10 rounded-2xl shadow-xl">

          <h2 className="text-3xl font-bold text-[#1f6f66] text-center mb-2">
            Create Account
          </h2>
          <p className="text-center text-gray-500 text-sm mb-8">
            Start your wellness journey today
          </p>

          <form className="space-y-5" onSubmit={handleSubmit}>

            {error && (
              <div className="hidden"></div>
            )}

            <div>
              <label className="text-xs font-semibold text-gray-600 tracking-wide">
                FULL NAME
              </label>
              <input
                type="text"
                placeholder="John Doe"
                className={`w-full mt-2 px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none ${errors.fullName
                  ? 'border-red-500 focus:ring-red-500'
                  : 'focus:ring-[#1f6f66]'
                  }`}
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
              />
              {errors.fullName && (
                <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 tracking-wide">
                EMAIL
              </label>
              <input
                type="email"
                placeholder="example@email.com"
                className={`w-full mt-2 px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none ${errors.email
                  ? 'border-red-500 focus:ring-red-500'
                  : 'focus:ring-[#1f6f66]'
                  }`}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 tracking-wide">
                PHONE NUMBER
              </label>
              <input
                type="tel"
                placeholder="+91 9876543210"
                className={`w-full mt-2 px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none ${errors.phone
                    ? 'border-red-500 focus:ring-red-500'
                    : 'focus:ring-[#1f6f66]'
                  }`}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
              {errors.phone && (
                <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 tracking-wide">
                PASSWORD
              </label>
              <input
                type="password"
                placeholder="•••••••• (minimum 6 characters)"
                className={`w-full mt-2 px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none ${errors.password
                  ? 'border-red-500 focus:ring-red-500'
                  : 'focus:ring-[#1f6f66]'
                  }`}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password}</p>
              )}
              {!errors.password && formData.password && formData.password.length > 0 && (
                <p className="text-gray-500 text-xs mt-1">
                  {formData.password.length < 6
                    ? `${6 - formData.password.length} more characters needed`
                    : '✓ Password length is valid'}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 tracking-wide">
                SELECT ROLE
              </label>
              <select
                className="w-full mt-2 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#1f6f66] focus:outline-none"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="PATIENT">Patient/User</option>
                <option value="PRACTITIONER">Practitioner</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1f6f66] text-white py-3 rounded-lg font-semibold hover:bg-[#155e57] disabled:bg-gray-400 transition duration-300 shadow-md"
            >
              {loading ? "Registering..." : "Register"}
            </button>
          </form>

          <p className="text-center text-sm mt-8 text-gray-600">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-[#1f6f66] font-semibold hover:underline"
            >
              Login
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}