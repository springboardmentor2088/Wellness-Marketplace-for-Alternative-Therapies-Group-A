import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import toast from "react-hot-toast";

import { registerUser } from "../services/authService";

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.phone && formData.phone.length !== 10) {
      setPhoneError('Phone number must be exactly 10 digits');
      return;
    }
    setError("");
    setErrors({});
    setLoading(true);

    try {
      const payload = {
        name: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        password: formData.password,
        role: 'PATIENT',
        bio: ""
      };

      const result = await registerUser(payload);

      toast.success(result.data?.message || "Registration successful! Please verify your email.");

      // Redirect to OTP verification page — no JWT issued yet
      navigate("/verify-email", { state: { email: payload.email } });

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
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="fullName" className="text-xs font-semibold text-gray-600 tracking-wide">
                FULL NAME
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="John Doe"
                className={`w-full mt-2 px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none ${errors.fullName ? 'border-red-500 focus:ring-red-500' : 'focus:ring-[#1f6f66]'
                  }`}
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
              />
              {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
            </div>

            <div>
              <label htmlFor="email" className="text-xs font-semibold text-gray-600 tracking-wide">
                EMAIL
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="example@email.com"
                className={`w-full mt-2 px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none ${errors.email ? 'border-red-500 focus:ring-red-500' : 'focus:ring-[#1f6f66]'
                  }`}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="phone" className="text-xs font-semibold text-gray-600 tracking-wide">
                PHONE NUMBER
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="Enter 10-digit phone number"
                maxLength="10"
                className={`w-full mt-2 px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none ${(errors.phone || phoneError) ? 'border-red-500 focus:ring-red-500' : 'focus:ring-[#1f6f66]'
                  }`}
                value={formData.phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setFormData({ ...formData, phone: value });
                  if (value.length > 0 && value.length !== 10) {
                    setPhoneError('Phone number must be exactly 10 digits');
                  } else {
                    setPhoneError('');
                  }
                }}
                required
              />
              {(errors.phone || phoneError) && <p className="text-red-500 text-xs mt-1">{errors.phone || phoneError}</p>}
            </div>

            <div>
              <label htmlFor="password" className="text-xs font-semibold text-gray-600 tracking-wide">
                PASSWORD
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                className={`w-full mt-2 px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none ${errors.password ? 'border-red-500 focus:ring-red-500' : 'focus:ring-[#1f6f66]'
                  }`}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
              {!errors.password && formData.password && (
                <div className="mt-2 space-y-1">
                  <p className={`text-xs ${formData.password.length >= 8 ? 'text-green-600' : 'text-gray-500'}`}>
                    {formData.password.length >= 8 ? '✓' : '○'} At least 8 characters
                  </p>
                  <p className={`text-xs ${/[A-Z]/.test(formData.password) ? 'text-green-600' : 'text-gray-500'}`}>
                    {/[A-Z]/.test(formData.password) ? '✓' : '○'} One uppercase letter
                  </p>
                  <p className={`text-xs ${/[a-z]/.test(formData.password) ? 'text-green-600' : 'text-gray-500'}`}>
                    {/[a-z]/.test(formData.password) ? '✓' : '○'} One lowercase letter
                  </p>
                  <p className={`text-xs ${/\d/.test(formData.password) ? 'text-green-600' : 'text-gray-500'}`}>
                    {/\d/.test(formData.password) ? '✓' : '○'} One number
                  </p>
                  <p className={`text-xs ${/.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?].*/.test(formData.password) ? 'text-green-600' : 'text-gray-500'}`}>
                    {/.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?].*/.test(formData.password) ? '✓' : '○'} One special character
                  </p>
                </div>
              )}
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
            <Link to="/login" className="text-[#1f6f66] font-semibold hover:underline">
              Login
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}