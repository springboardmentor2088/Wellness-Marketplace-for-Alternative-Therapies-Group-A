import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";  // ← remove useEffect
import toast from "react-hot-toast";
import { loginUser, storeAuthData } from "../services/authService";

export default function Login() {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState({
    identifier: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        identifier: credentials.identifier.trim(),
        password: credentials.password,
      };

      // Call backend API using authService
      const result = await loginUser(payload);
      const data = result.data;

      // Store auth data using centralized helper
      storeAuthData(data);

      toast.success("Login successful!");

      // Role-based navigation
      if (data.user.role === "PRACTITIONER") {
        // Check if practitioner has completed onboarding
        try {
          const onboardingResponse = await fetch(
            "/api/practitioners/me/onboarding-status",
            {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${data.accessToken}`
              }
            }
          );

          if (onboardingResponse.ok) {
            const onboardingStatus = await onboardingResponse.json();

            // ============================================================
            // UPDATE: SYNC LOCAL STORAGE WITH ONBOARDING STATUS
            // This ensures RoleBasedRoute knows whether to allow dashboard access
            // ============================================================
            const isComplete = onboardingStatus.onboardingCompleted;
            const updatedUser = {
              ...data.user,
              onboardingCompleted: isComplete
            };
            localStorage.setItem("user", JSON.stringify(updatedUser));

            if (!isComplete) {
              // FIXED PATH: Changed from /practitioner/PractitionerOnboarding to /practitioner/onboarding
              navigate("/practitioner/onboarding");
            } else {
              navigate("/practitioner/dashboard");
            }
          } else {
            // Default to onboarding if check fails to ensure data is collected
            navigate("/practitioner/onboarding");
          }
        } catch (err) {
          console.error("Error checking onboarding status:", err);
          navigate("/practitioner/onboarding");
        }
      } else if (data.user.role === "ADMIN") {
        // Admin users are protected by RoleBasedRoute
        navigate("/admin");
      } else {
        navigate("/user/dashboard");
      }
    } catch (err) {
      console.error("Login error:", err);
      const errorMsg = err.response?.data?.message || err.message || "Login failed";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold text-[#1f6f66]">WellnessHub</h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-xl shadow p-10">

          <h2 className="text-3xl font-bold text-[#1f6f66] text-center mb-2">
            Welcome Back
          </h2>

          <p className="text-gray-500 text-center mb-8">
            Sign in to access your dashboard
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">

            {error && (
              <div className="hidden"></div>
              // Keeping 'error' state for logic but hiding visual box in favor of Toast
            )}

            <div>
              <label htmlFor="identifier" className="block text-sm font-semibold text-gray-600 mb-2">
                Email or Phone Number
              </label>
              <input
                id="identifier"
                name="identifier"
                type="text"
                placeholder="example@email.com or +91 9876543210"
                value={credentials.identifier}
                onChange={(e) => setCredentials({ ...credentials, identifier: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1f6f66] transition"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-600 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1f6f66] transition"
                required
              />
            </div>

            <div className="flex justify-between items-center text-sm">
              <label htmlFor="rememberMe" className="flex items-center gap-2 text-gray-600">
                <input id="rememberMe" name="rememberMe" type="checkbox" />
                Remember me
              </label>
              <Link
                to="/forgot-password"
                className="text-[#1f6f66] hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1f6f66] hover:bg-[#155e57] disabled:bg-gray-400 text-white py-3 rounded-lg font-bold shadow transition"
            >
              {loading ? "Logging in..." : "login"}
            </button>
          </form>

          <p className="text-center text-gray-600 mt-8">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="text-[#1f6f66] font-semibold hover:underline"
            >
              Create Account
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}