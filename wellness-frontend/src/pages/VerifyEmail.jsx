import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { verifyEmail, resendOtp, storeAuthData } from "../services/authService";

const OTP_EXPIRY_SECONDS = 300; // 5 minutes
const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmail() {
    const navigate = useNavigate();
    const location = useLocation();
    const email = location.state?.email || "";

    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);

    // Countdown timers
    const [expirySeconds, setExpirySeconds] = useState(OTP_EXPIRY_SECONDS);
    const [resendSeconds, setResendSeconds] = useState(RESEND_COOLDOWN_SECONDS);

    const inputRefs = useRef([]);

    // Redirect if no email passed in state
    useEffect(() => {
        if (!email) {
            navigate("/register", { replace: true });
        }
    }, [email, navigate]);

    // OTP expiry countdown
    useEffect(() => {
        if (expirySeconds <= 0) return;
        const timer = setInterval(() => setExpirySeconds((s) => s - 1), 1000);
        return () => clearInterval(timer);
    }, [expirySeconds]);

    // Resend cooldown countdown
    useEffect(() => {
        if (resendSeconds <= 0) return;
        const timer = setInterval(() => setResendSeconds((s) => s - 1), 1000);
        return () => clearInterval(timer);
    }, [resendSeconds]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, "0");
        const s = (seconds % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    };

    const handleOtpChange = (index, value) => {
        if (!/^\d*$/.test(value)) return; // digits only
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1); // take last char in case of paste into single box
        setOtp(newOtp);
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        if (pasted.length === 6) {
            setOtp(pasted.split(""));
            inputRefs.current[5]?.focus();
        }
        e.preventDefault();
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setError("");
        setSuccessMsg("");
        const otpString = otp.join("");
        if (otpString.length < 6) {
            setError("Please enter all 6 digits.");
            return;
        }
        setLoading(true);
        try {
            const data = await verifyEmail(email, otpString);
            // data = { accessToken, refreshToken, user: { id, name, email, role } }
            storeAuthData(data);
            toast.success("Email verified! Redirecting...");

            // Role-based redirect — no login step needed
            if (data.user?.role === "PRACTITIONER") {
                // Check if onboarding is already complete
                try {
                    const res = await fetch("/api/practitioners/me/onboarding-status", {
                        headers: { Authorization: `Bearer ${data.accessToken}` },
                    });
                    if (res.ok) {
                        const status = await res.json();
                        const updatedUser = { ...data.user, onboardingCompleted: status.onboardingCompleted };
                        localStorage.setItem("user", JSON.stringify(updatedUser));
                        setTimeout(() => navigate(status.onboardingCompleted ? "/practitioner/dashboard" : "/practitioner/onboarding"), 1000);
                    } else {
                        setTimeout(() => navigate("/practitioner/onboarding"), 1000);
                    }
                } catch {
                    setTimeout(() => navigate("/practitioner/onboarding"), 1000);
                }
            } else {
                setTimeout(() => navigate("/user/dashboard"), 1000);
            }
        } catch (err) {
            const msg = err.response?.data?.message || "Verification failed. Please try again.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setError("");
        setSuccessMsg("");
        setResendLoading(true);
        try {
            await resendOtp(email);
            toast.success("A new OTP has been sent to your email.");
            setExpirySeconds(OTP_EXPIRY_SECONDS);
            setResendSeconds(RESEND_COOLDOWN_SECONDS);
            setOtp(["", "", "", "", "", ""]);
            inputRefs.current[0]?.focus();
        } catch (err) {
            const msg = err.response?.data?.message || "Could not resend OTP. Please wait and try again.";
            setError(msg);
        } finally {
            setResendLoading(false);
        }
    };

    const isExpired = expirySeconds <= 0;

    return (
        <div className="min-h-screen flex bg-gradient-to-br from-[#f5f3ea] to-[#e7e2d3]">
            {/* LEFT SIDE BRAND PANEL */}
            <div className="hidden md:flex w-1/2 bg-[#1f6f66] text-white flex-col justify-center px-16">
                <h1 className="text-4xl font-bold mb-6">Almost There!</h1>
                <p className="text-lg opacity-90 leading-relaxed">
                    We've sent a 6-digit OTP to your email address. Enter it below to verify your account.
                </p>
                <div className="mt-10 space-y-3 text-sm opacity-80">
                    <p>✔ OTP valid for 5 minutes</p>
                    <p>✔ Secure BCrypt-hashed storage</p>
                    <p>✔ Max 5 verification attempts</p>
                </div>
            </div>

            {/* RIGHT SIDE FORM */}
            <div className="flex w-full md:w-1/2 items-center justify-center px-6">
                <div className="bg-white w-full max-w-md p-10 rounded-2xl shadow-xl">
                    <h2 className="text-3xl font-bold text-[#1f6f66] text-center mb-2">
                        Verify Your Email
                    </h2>
                    <p className="text-center text-gray-500 text-sm mb-2">
                        OTP sent to <strong>{email}</strong>
                    </p>

                    {/* Expiry timer */}
                    <div className={`text-center text-sm font-semibold mb-6 ${isExpired ? "text-red-500" : "text-gray-500"}`}>
                        {isExpired ? "⚠ OTP expired. Please resend." : `⏳ Expires in ${formatTime(expirySeconds)}`}
                    </div>

                    <form onSubmit={handleVerify} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-red-800 text-sm">{error}</p>
                            </div>
                        )}
                        {successMsg && (
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-green-800 text-sm">{successMsg}</p>
                            </div>
                        )}

                        {/* 6-digit OTP boxes */}
                        <div>
                            <label className="text-xs font-semibold text-gray-600 tracking-wide block mb-3 text-center">
                                ENTER 6-DIGIT OTP
                            </label>
                            <div className="flex gap-2 justify-center" onPaste={handlePaste}>
                                {otp.map((digit, i) => (
                                    <input
                                        key={i}
                                        id={`otp-${i}`}
                                        ref={(el) => (inputRefs.current[i] = el)}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleOtpChange(i, e.target.value)}
                                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                        className="w-12 h-14 text-center text-xl font-bold border-2 rounded-lg focus:ring-2 focus:ring-[#1f6f66] focus:outline-none focus:border-[#1f6f66] transition"
                                        disabled={isExpired || loading}
                                    />
                                ))}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || isExpired}
                            className="w-full bg-[#1f6f66] text-white py-3 rounded-lg font-semibold hover:bg-[#155e57] disabled:bg-gray-400 transition duration-300 shadow-md"
                        >
                            {loading ? "Verifying..." : "Verify Email"}
                        </button>
                    </form>

                    {/* Resend section */}
                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-500 mb-2">Didn't receive the OTP?</p>
                        <button
                            onClick={handleResend}
                            disabled={resendSeconds > 0 || resendLoading}
                            className="text-sm font-semibold text-[#1f6f66] hover:underline disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed"
                        >
                            {resendLoading
                                ? "Sending..."
                                : resendSeconds > 0
                                    ? `Resend OTP in ${resendSeconds}s`
                                    : "Resend OTP"}
                        </button>
                    </div>

                    <p className="text-center text-sm mt-6 text-gray-600">
                        <Link to="/register" className="text-[#1f6f66] font-semibold hover:underline">
                            ← Back to Register
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
