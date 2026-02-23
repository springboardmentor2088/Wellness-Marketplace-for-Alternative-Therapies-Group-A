import { useState } from "react";
import { bookSession } from "../services/sessionService";
import toast from "react-hot-toast";

export default function BookingForm({ practitionerId, practitionerName, selectedSlot, onSuccess, onClose }) {
    const [sessionType, setSessionType] = useState("ONLINE");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);

    if (!selectedSlot) return null;

    const formatTime = (timeStr) => {
        if (!timeStr) return "";
        const [h, m] = timeStr.split(":");
        const hour = parseInt(h);
        return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
    };

    const handleBook = async () => {
        setLoading(true);
        try {
            await bookSession({
                practitionerId,
                sessionDate: selectedSlot.date,
                startTime: selectedSlot.time,
                sessionType,
                notes,
            });
            toast.success("Session booked successfully!");
            onSuccess && onSuccess();
            onClose && onClose();
        } catch (err) {
            const msg = err?.response?.data?.message || "Booking failed. Please try again.";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative animate-fade-in">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition"
                >
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Confirm Booking</h2>
                    <p className="text-gray-500 text-sm mt-1">Review your session details before confirming</p>
                </div>

                {/* Session Summary Card */}
                <div className="bg-teal-50 rounded-xl p-4 mb-6 space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {practitionerName?.[0]}
                        </div>
                        <div>
                            <p className="font-semibold text-gray-900">{practitionerName}</p>
                            <p className="text-sm text-gray-500">Your Practitioner</p>
                        </div>
                    </div>
                    <div className="border-t border-teal-100 pt-2 mt-2 grid grid-cols-2 gap-2 text-sm">
                        <div>
                            <p className="text-gray-500">Date</p>
                            <p className="font-semibold text-gray-800">
                                {new Date(selectedSlot.date + "T00:00:00").toLocaleDateString("en-US", {
                                    weekday: "short", month: "long", day: "numeric"
                                })}
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-500">Time</p>
                            <p className="font-semibold text-gray-800">{formatTime(selectedSlot.time)}</p>
                        </div>
                    </div>
                </div>

                {/* Session Type */}
                <div className="mb-5">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Session Type</label>
                    <div className="grid grid-cols-2 gap-3">
                        {["ONLINE", "OFFLINE"].map((type) => (
                            <button
                                key={type}
                                onClick={() => setSessionType(type)}
                                className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all
                  ${sessionType === type
                                        ? "border-teal-600 bg-teal-600 text-white"
                                        : "border-gray-200 text-gray-600 hover:border-teal-300"
                                    }`}
                            >
                                {type === "ONLINE" ? "🎥 Online" : "🏥 In-Person"}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Notes */}
                <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Notes (optional)</label>
                    <textarea
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Describe your concerns or reason for the session..."
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                    />
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 font-semibold hover:bg-gray-50 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleBook}
                        disabled={loading}
                        className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 text-white rounded-xl font-semibold transition shadow-md"
                    >
                        {loading ? "Booking..." : "Confirm Booking"}
                    </button>
                </div>
            </div>
        </div>
    );
}
