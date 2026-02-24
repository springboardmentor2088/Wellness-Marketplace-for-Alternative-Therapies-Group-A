import { useState } from "react";
import { setAvailability } from "../services/sessionService";
import toast from "react-hot-toast";

export default function AvailabilityDayCard({ day, existing = {}, practitionerId, onSaved }) {
    const [start, setStart] = useState(existing.startTime || "09:00");
    const [end, setEnd] = useState(existing.endTime || "17:00");
    const [slotDur, setSlotDur] = useState(existing.slotDuration || 60);
    const [isAvail, setIsAvail] = useState(existing.isAvailable !== false);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await setAvailability(practitionerId, {
                dayOfWeek: day,
                startTime: start,
                endTime: end,
                slotDuration: slotDur,
                isAvailable: isAvail,
            });
            toast.success(`${day.charAt(0) + day.slice(1).toLowerCase()} availability saved!`);
            onSaved && onSaved();
        } catch {
            toast.error("Failed to save availability.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={`bg-white rounded-2xl border p-5 transition-opacity ${isAvail ? "border-gray-100" : "border-gray-100 opacity-60"}`}>
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 capitalize">{day.charAt(0) + day.slice(1).toLowerCase()}</h3>
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setIsAvail(!isAvail)}>
                    <div className={`w-10 h-5 rounded-full transition-colors relative ${isAvail ? "bg-blue-600" : "bg-gray-300"}`}>
                        <div className={`absolute top-0 w-5 h-5 bg-white rounded-full shadow transition-transform ${isAvail ? "translate-x-5" : "translate-x-0"}`} />
                    </div>
                    <span className="text-sm text-gray-500">{isAvail ? "Available" : "Off"}</span>
                </div>
            </div>

            {isAvail && (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">Start Time</label>
                            <input
                                type="time"
                                value={start}
                                onChange={(e) => setStart(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 mb-1 block">End Time</label>
                            <input
                                type="time"
                                value={end}
                                onChange={(e) => setEnd(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Slot Duration (mins)</label>
                        <select
                            value={slotDur}
                            onChange={(e) => setSlotDur(Number(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        >
                            <option value={30}>30 minutes</option>
                            <option value={45}>45 minutes</option>
                            <option value={60}>60 minutes</option>
                            <option value={90}>90 minutes</option>
                        </select>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50"
                    >
                        {saving ? "Saving..." : "Save"}
                    </button>
                </div>
            )}
        </div>
    );
}
