import { useState } from "react";
import { cancelSession, acceptSession, completeSessionApi } from "../services/sessionService";
import { initiatePayment, simulatePaymentWebhook } from "../services/paymentService";
import toast from "react-hot-toast";

const STATUS_STYLES = {
    BOOKED: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
    RESCHEDULED: "bg-yellow-100 text-yellow-700",
    HOLD: "bg-purple-100 text-purple-700",
};

const PAYMENT_STYLES = {
    PENDING: "text-orange-500",
    PAID: "text-green-600",
    REFUNDED: "text-gray-500",
};

export default function SessionCard({ session, role = "USER", onRefresh, onReview }) {
    const [showCancelPrompt, setShowCancelPrompt] = useState(false);
    const [cancelReason, setCancelReason] = useState("");
    const [showCompletePrompt, setShowCompletePrompt] = useState(false);
    const [prescribedDocument, setPrescribedDocument] = useState(null);
    const [loading, setLoading] = useState(false);

    const formatTime = (timeStr) => {
        if (!timeStr) return "";
        const [h, m] = timeStr.split(":");
        const hour = parseInt(h);
        return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
    };

    const formatDate = (dateStr) =>
        new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
            weekday: "short", month: "short", day: "numeric", year: "numeric",
        });

    const handleCancelClick = () => {
        if (role === "PRACTITIONER") {
            setShowCancelPrompt(true);
            return;
        }
        if (!confirm("Are you sure you want to cancel this session?")) return;
        submitCancel("Cancelled by user");
    };

    const submitCancel = async (reasonText) => {
        if (role === "PRACTITIONER" && !reasonText.trim()) {
            toast.error("A reason is mandatory for practitioners to cancel.");
            return;
        }
        setLoading(true);
        try {
            await cancelSession(session.id, role, reasonText);
            toast.success("Session cancelled.");
            setShowCancelPrompt(false);
            onRefresh && onRefresh();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to cancel session.");
        } finally {
            setLoading(false);
        }
    };

    const handlePayNow = async () => {
        setLoading(true);
        try {
            const orderData = await initiatePayment({
                sessionId: session.id,
                userId: session.userId,
                amount: session.feeAmount
            });

            // Mock/Simulated Payment Flow
            await simulatePaymentWebhook({
                orderId: orderData.orderId,
                paymentId: "mock_pay_" + Date.now(),
                signature: "mock_signature"
            });
            toast.success("Payment Successful! (Mock)");
            onRefresh && onRefresh();
        } catch (err) {
            toast.error(err?.response?.data?.error || "Failed to process mock payment.");
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async () => {
        setLoading(true);
        try {
            await acceptSession(session.id, session.practitionerId);
            toast.success("Session accepted.");
            onRefresh && onRefresh();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to accept session.");
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteClick = () => {
        setShowCompletePrompt(true);
    };

    const submitComplete = async () => {
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('practitionerId', session.practitionerId);
            if (prescribedDocument) {
                formData.append('file', prescribedDocument);
            }

            await completeSessionApi(session.id, formData);
            toast.success("Session marked as completed.");
            setShowCompletePrompt(false);
            onRefresh && onRefresh();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to complete session.");
        } finally {
            setLoading(false);
        }
    };

    const name = role === "USER" ? session.practitionerName : session.userName;
    const label = role === "USER" ? "Practitioner" : "Patient";

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-lg">
                        {name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                        <p className="font-semibold text-gray-900">{name}</p>
                        <p className="text-xs text-gray-400">{label}</p>
                    </div>
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${STATUS_STYLES[session.status] || "bg-gray-100 text-gray-500"}`}>
                    {session.status}
                </span>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-gray-400 text-xs mb-1">📅 Date</p>
                    <p className="font-semibold text-gray-800">{formatDate(session.sessionDate)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-gray-400 text-xs mb-1">🕐 Time</p>
                    <p className="font-semibold text-gray-800">
                        {formatTime(session.startTime)} – {formatTime(session.endTime)}
                    </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-gray-400 text-xs mb-1">📱 Type</p>
                    <p className="font-semibold text-gray-800">{session.sessionType === "ONLINE" ? "🎥 Online" : "🏥 In-Person"}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-gray-400 text-xs mb-1">💳 Payment</p>
                    <p className={`font-semibold ${PAYMENT_STYLES[session.paymentStatus]}`}>{session.paymentStatus}</p>
                </div>
            </div>

            {/* Meeting Link */}
            {session.status === "BOOKED" && session.sessionType === "ONLINE" && session.meetingLink && (
                (() => {
                    const now = new Date();
                    // Assumes sessionDate is YYYY-MM-DD and startTime/endTime are HH:mm:ss
                    const start = new Date(`${session.sessionDate}T${session.startTime}`);
                    const end = new Date(`${session.sessionDate}T${session.endTime}`);
                    const allowedStart = new Date(start.getTime() - 15 * 60000); // 15 mins before

                    const isTime = now >= allowedStart && now <= end;

                    if (isTime) {
                        return (
                            <a
                                href={session.meetingLink}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-800 font-medium mb-4 group"
                            >
                                <span>🔗</span>
                                <span className="group-hover:underline truncate">{session.meetingLink}</span>
                            </a>
                        );
                    }

                    return (
                        <div className="flex items-center gap-2 text-sm text-gray-500 font-medium mb-4">
                            <span>⏳</span>
                            <span>Link available 15 mins before session</span>
                        </div>
                    );
                })()
            )}

            {/* Action Buttons */}
            {session.status === "BOOKED" && !showCancelPrompt && !showCompletePrompt && (
                <div className="flex gap-2">
                    {role === "PRACTITIONER" && (
                        <button
                            onClick={handleCompleteClick}
                            disabled={loading}
                            className="w-full py-2 text-sm font-semibold bg-green-600 text-white rounded-xl hover:bg-green-700 transition disabled:opacity-50"
                        >
                            Mark Complete
                        </button>
                    )}
                    {role === "USER" && session.paymentStatus === "PENDING" && (
                        <button
                            onClick={handlePayNow}
                            disabled={loading}
                            className="w-full py-2 text-sm font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
                        >
                            Pay Now
                        </button>
                    )}
                    <button
                        onClick={handleCancelClick}
                        disabled={loading}
                        className={`w-full py-2 text-sm font-semibold border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition disabled:opacity-50 ${role === "PRACTITIONER" || (role === "USER" && session.paymentStatus === "PENDING") ? "flex-1" : ""}`}
                    >
                        Cancel Session
                    </button>
                </div>
            )}

            {/* Leave Review Button — for completed sessions (USER only) */}
            {session.status?.toUpperCase() === "COMPLETED" && role === "USER" && onReview && !session.reviewed && (
                <button
                    onClick={() => onReview(session)}
                    className="w-full py-2 text-sm font-semibold bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition mt-1"
                >
                    ⭐ Leave a Review
                </button>
            )}

            {session.status === "HOLD" && role === "PRACTITIONER" && (
                <div className="flex gap-2">
                    <button
                        onClick={handleAccept}
                        disabled={loading}
                        className="w-full py-2 text-sm font-semibold bg-green-600 text-white rounded-xl hover:bg-green-700 transition disabled:opacity-50"
                    >
                        Accept Request
                    </button>
                    <button
                        onClick={handleCancelClick}
                        disabled={loading}
                        className="w-full py-2 text-sm font-semibold border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition disabled:opacity-50"
                    >
                        Reject
                    </button>
                </div>
            )}

            {/* Cancel Form Context */}
            {showCancelPrompt && (
                <div className="mt-4 p-4 bg-red-50 rounded-xl space-y-3">
                    <p className="text-sm font-semibold text-red-900">Provide a Reason for Cancellation (Required)</p>
                    <textarea
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="Please brief the patient why this is cancelled."
                        className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 min-h-[60px] resize-none"
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowCancelPrompt(false)}
                            className="flex-1 py-2 text-sm text-gray-600 border border-red-200 rounded-lg hover:bg-red-100 transition"
                        >
                            Go Back
                        </button>
                        <button
                            onClick={() => submitCancel(cancelReason)}
                            disabled={loading || !cancelReason.trim()}
                            className="flex-1 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                        >
                            {loading ? "Cancelling..." : "Confirm Cancellation"}
                        </button>
                    </div>
                </div>
            )}

            {/* Complete Form Context */}
            {showCompletePrompt && (
                <div className="mt-4 p-4 bg-green-50 rounded-xl space-y-3">
                    <p className="text-sm font-semibold text-green-900">Complete Session</p>
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Prescribed Document (Required)
                        </label>
                        <input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg"
                            onChange={(e) => setPrescribedDocument(e.target.files[0])}
                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-100 file:text-green-700 hover:file:bg-green-200"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowCompletePrompt(false)}
                            className="flex-1 py-2 text-sm text-gray-600 border border-green-200 rounded-lg hover:bg-green-100 transition"
                        >
                            Go Back
                        </button>
                        <button
                            onClick={submitComplete}
                            disabled={loading || !prescribedDocument}
                            className="flex-1 py-2 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                        >
                            {loading ? "Completing..." : "Confirm Complete"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
