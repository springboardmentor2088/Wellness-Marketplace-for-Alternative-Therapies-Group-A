import { useState, useEffect } from "react";
import { getAvailableSlots } from "../services/sessionService";

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function SessionCalendar({ practitionerId, onSlotSelect }) {
    const today = new Date();
    const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
    const [selectedDate, setSelectedDate] = useState(null);
    const [slots, setSlots] = useState([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    const handleDateClick = async (day) => {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        if (date < new Date(today.getFullYear(), today.getMonth(), today.getDate())) return;
        setSelectedDate(date);
        setSelectedSlot(null);
        setSlots([]);
        setLoadingSlots(true);
        try {
            const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
            const available = await getAvailableSlots(practitionerId, dateStr);
            setSlots(available);
        } catch {
            setSlots([]);
        } finally {
            setLoadingSlots(false);
        }
    };

    const handleSlotClick = (slot) => {
        setSelectedSlot(slot);
        if (onSlotSelect && selectedDate) {
            const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
            onSlotSelect({ date: dateStr, time: slot });
        }
    };

    const formatTime = (timeStr) => {
        const [h, m] = timeStr.split(":");
        const hour = parseInt(h);
        return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
    };

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    const isSameDay = (day) => {
        if (!selectedDate) return false;
        return selectedDate.getDate() === day &&
            selectedDate.getMonth() === currentDate.getMonth() &&
            selectedDate.getFullYear() === currentDate.getFullYear();
    };

    const isPast = (day) => {
        const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        return d < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    };

    const isToday = (day) =>
        day === today.getDate() &&
        currentDate.getMonth() === today.getMonth() &&
        currentDate.getFullYear() === today.getFullYear();

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
                <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h3 className="text-lg font-bold text-gray-800">
                    {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h3>
                <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 mb-2">
                {DAYS_SHORT.map(d => (
                    <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
                {Array(firstDayOfMonth).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
                {Array(daysInMonth).fill(null).map((_, i) => {
                    const day = i + 1;
                    return (
                        <button
                            key={day}
                            onClick={() => handleDateClick(day)}
                            disabled={isPast(day)}
                            className={`h-9 w-9 mx-auto rounded-full text-sm font-medium transition-all
                ${isPast(day) ? "text-gray-300 cursor-not-allowed" : "hover:bg-teal-50 cursor-pointer"}
                ${isToday(day) && !isSameDay(day) ? "border-2 border-teal-400 text-teal-700" : ""}
                ${isSameDay(day) ? "bg-teal-600 text-white shadow-md hover:bg-teal-700" : "text-gray-700"}
              `}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>

            {/* Time Slots */}
            {selectedDate && (
                <div className="mt-6 border-t pt-4">
                    <p className="text-sm font-semibold text-gray-600 mb-3">
                        Available slots for{" "}
                        <span className="text-teal-700">
                            {MONTHS[selectedDate.getMonth()]} {selectedDate.getDate()}
                        </span>
                    </p>
                    {loadingSlots ? (
                        <div className="flex justify-center py-4">
                            <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : slots.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-3">No available slots on this day</p>
                    ) : (
                        <div className="grid grid-cols-3 gap-2">
                            {slots.map((slot) => (
                                <button
                                    key={slot}
                                    onClick={() => handleSlotClick(slot)}
                                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-all border
                    ${selectedSlot === slot
                                            ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                                            : "bg-white text-teal-700 border-teal-200 hover:border-teal-500 hover:bg-teal-50"
                                        }`}
                                >
                                    {formatTime(slot)}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
