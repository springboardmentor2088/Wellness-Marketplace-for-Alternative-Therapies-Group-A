import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';

export default function NotificationDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const {
        notifications,
        unreadCount,
        hasMore,
        loading,
        loadMoreNotifications,
        markAsRead
    } = useNotifications();

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleScroll = (e) => {
        const bottom = e.target.scrollHeight - e.target.scrollTop === e.target.clientHeight;
        if (bottom && hasMore && !loading) {
            loadMoreNotifications();
        }
    };

    const getIconForType = (type) => {
        switch (type) {
            case 'SESSION_BOOKED': return '📅';
            case 'SESSION_REMINDER':
            case 'REMINDER_30_MIN': return '⏳';
            case 'SESSION_CANCELLED': return '❌';
            case 'PAYMENT_RECEIVED': return '💰';
            default: return '🔔';
        }
    };

    return (
        <div className="relative z-50" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full hover:bg-slate-100 transition-colors focus:outline-none"
            >
                <span className="text-2xl">🔔</span>
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[500px]">
                    <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                        <h3 className="font-semibold text-slate-800">Notifications</h3>
                        {unreadCount > 0 && (
                            <span className="text-xs bg-slate-200 text-slate-700 px-2 py-1 rounded-full">{unreadCount} unread</span>
                        )}
                    </div>

                    <div
                        className="overflow-y-auto flex-1 p-2 space-y-1"
                        onScroll={handleScroll}
                    >
                        {notifications.length === 0 ? (
                            <div className="p-6 text-center text-slate-500">
                                <div className="text-3xl mb-2">📭</div>
                                <p className="text-sm">No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    onClick={() => !notif.isRead && markAsRead(notif.id)}
                                    className={`p-3 rounded-lg flex items-start gap-3 transition-colors ${notif.isRead || notif.read ? 'bg-white hover:bg-slate-50' : 'bg-blue-50 cursor-pointer hover:bg-blue-100'}`}
                                >
                                    <div className="text-2xl flex-shrink-0">
                                        {getIconForType(notif.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm ${notif.isRead || notif.read ? 'text-slate-600' : 'text-slate-800 font-medium'}`}>
                                            {notif.message}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {notif.createdAt ? new Date(notif.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : 'Just now'}
                                        </p>
                                    </div>
                                    {(!notif.isRead && !notif.read) && (
                                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                                    )}
                                </div>
                            ))
                        )}

                        {loading && (
                            <div className="text-center py-2">
                                <span className="text-xs text-slate-500">Loading...</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
