import { useNavigate } from "react-router-dom";
import { getStoredUser } from "../services/authService";

export default function Unauthorized() {
  const navigate = useNavigate();
  const user = getStoredUser();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 p-4">
      <div className="text-center max-w-md">
        {/* Error Icon */}
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full">
            <span className="text-4xl">🚫</span>
          </div>
        </div>

        {/* Error Title */}
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Access Denied</h1>

        {/* Error Description */}
        <p className="text-gray-600 mb-4">
          You don't have permission to access this page.
        </p>

        {/* Current Role Info */}
        {user && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700">
              Your current role: <strong className="text-blue-600">{user.role}</strong>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              If you believe this is a mistake, please contact support.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 flex flex-col">
          {user?.role === "PATIENT" && (
            <button
              onClick={() => navigate("/user/dashboard")}
              className="w-full bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700 transition"
            >
              Go to User Dashboard
            </button>
          )}

          {user?.role === "PRACTITIONER" && (
            <button
              onClick={() => navigate("/practitioner/dashboard")}
              className="w-full bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700 transition"
            >
              Go to Practitioner Dashboard
            </button>
          )}

          {user?.role === "ADMIN" && (
            <button
              onClick={() => navigate("/admin/dashboard")}
              className="w-full bg-teal-600 text-white py-3 rounded-lg font-semibold hover:bg-teal-700 transition"
            >
              Go to Admin Dashboard
            </button>
          )}

          <button
            onClick={() => navigate("/")}
            className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
