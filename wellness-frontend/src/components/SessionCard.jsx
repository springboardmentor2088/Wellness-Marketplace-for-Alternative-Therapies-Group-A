import { useState } from "react";
import { cancelSession, rescheduleSession } from "../services/sessionService";
import toast from "react-hot-toast";

const STATUS_STYLES = {
    BOOKED: "bg-blue-100 text-blue-700",
    COMPLETED: "bg-green-100 text-green-700",
    CANCELLED: "bg-red-100 text-red-700",
    RESCHEDULED: "bg-yellow-100 text-yellow-700",
};

const PAYMENT_STYLES = {
    PENDING: "text-orange-500",
    PAID: "text-green-600",
    REFUNDED: "text-gray-500",
};

export default function SessionCard({ session, role = "USER", onRefresh }) {
    const [showReschedule, setShowReschedule] = useState(false);
    const [newDate, setNewDate] = useState("");
    const [newTime, setNewTime] = useState("");
    const [rescheduleReason, setRescheduleReason] = useState("");
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

    const handleCancel = async () => {
        if (!confirm("Are you sure you want to cancel this session?")) return;
        setLoading(true);
        try {
            await cancelSession(session.id, role, "Cancelled by user");
            toast.success("Session cancelled.");
            onRefresh && onRefresh();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to cancel session.");
        } finally {
            setLoading(false);
        }
    };

    const handleReschedule = async () => {
        if (!newDate || !newTime) {
            toast.error("Please select a new date and time.");
            return;
        }
        setLoading(true);
        try {
            await rescheduleSession(session.id, {
                newSessionDate: newDate,
                newStartTime: newTime,
                reason: rescheduleReason,
            });
            toast.success("Session rescheduled successfully!");
            setShowReschedule(false);
            onRefresh && onRefresh();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Reschedule failed.");
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
                <a
                    href={session.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-800 font-medium mb-4 group"
                >
                    <span>🔗</span>
                    <span className="group-hover:underline truncate">{session.meetingLink}</span>
                </a>
            )}

            {/* Action Buttons */}
            {session.status === "BOOKED" && (
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowReschedule(!showReschedule)}
                        className="flex-1 py-2 text-sm font-semibold border border-teal-200 text-teal-700 rounded-xl hover:bg-teal-50 transition"
                    >
                        Reschedule
                    </button>
                    <button
                        onClick={handleCancel}
                        disabled={loading}
                        className="flex-1 py-2 text-sm font-semibold border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition disabled:opacity-50"
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* Reschedule Form */}
            {showReschedule && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl space-y-3">
                    <p className="text-sm font-semibold text-gray-700">Pick a new date & time</p>
                    <input
                        type="date"
                        min={new Date().toISOString().split("T")[0]}
                        value={newDate}
                        onChange={(e) => setNewDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                    <input
                        type="time"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                    <input
                        type="text"
                        placeholder="Reason (optional)"
                        value={rescheduleReason}
                        onChange={(e) => setRescheduleReason(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowReschedule(false)}
                            className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleReschedule}
                            disabled={loading}
                            className="flex-1 py-2 text-sm font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50"
                        >
                            {loading ? "Saving..." : "Confirm"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
