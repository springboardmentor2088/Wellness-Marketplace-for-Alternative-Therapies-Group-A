import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAccessToken } from '../services/authService';
import { getCurrentUser } from '../services/userService';
import { getSessionsForUser } from '../services/sessionService';
import SessionCard from '../components/SessionCard';
import ReviewForm from '../components/ReviewForm';
import toast from 'react-hot-toast';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const STATUS_STYLES = {
  BOOKED:      { bg: 'bg-teal-500',   light: 'bg-teal-100 text-teal-800',   label: 'Booked' },
  COMPLETED:   { bg: 'bg-emerald-500',light: 'bg-emerald-100 text-emerald-800', label: 'Completed' },
  CANCELLED:   { bg: 'bg-red-500',    light: 'bg-red-100 text-red-800',     label: 'Cancelled' },
  RESCHEDULED: { bg: 'bg-amber-500',  light: 'bg-amber-100 text-amber-800', label: 'Rescheduled' },
  PENDING:     { bg: 'bg-blue-500',   light: 'bg-blue-100 text-blue-800',   label: 'Pending' },
};

export default function MyBookings() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
  const [reviewSession, setReviewSession] = useState(null); // session to review

  // Calendar state
  const today = new Date();
  const [calendarDate, setCalendarDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedCalDate, setSelectedCalDate] = useState(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) { navigate('/login'); return; }
    getCurrentUser()
      .then(user => setUserId(user.id))
      .catch(() => navigate('/login'));
  }, [navigate]);

  const fetchSessions = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await getSessionsForUser(userId);
      setSessions(data);
    } catch {
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Filter logic
  const todayStr = today.toISOString().split('T')[0];
  const filteredSessions = sessions.filter(s => {
    if (filter === 'upcoming') return s.sessionDate >= todayStr && s.status?.toUpperCase() === 'BOOKED';
    if (filter === 'past')     return s.sessionDate < todayStr || s.status?.toUpperCase() === 'COMPLETED';
    if (filter === 'cancelled') return s.status?.toUpperCase() === 'CANCELLED' || s.status?.toUpperCase() === 'RESCHEDULED';
    return true;
  });

  // Stats
  const upcoming  = sessions.filter(s => s.sessionDate >= todayStr && s.status === 'BOOKED').length;
  const completed = sessions.filter(s => s.status === 'COMPLETED').length;
  const cancelled = sessions.filter(s => s.status === 'CANCELLED' || s.status === 'RESCHEDULED').length;

  // Next session
  const nextSession = sessions
    .filter(s => s.sessionDate >= todayStr && s.status === 'BOOKED')
    .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate))[0];

  // Calendar helpers
  const daysInMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate();
  const firstDay    = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1).getDay();

  const getSessionsForDay = (day) => {
    const dateStr = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    return sessions.filter(s => s.sessionDate === dateStr);
  };

  const selectedDaySessions = selectedCalDate
    ? sessions.filter(s => s.sessionDate === selectedCalDate)
    : [];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600 font-bold text-lg"
            >
              ←
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">My Bookings</h1>
              <p className="text-xs text-slate-500">View and manage all your sessions</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/browse-sessions')}
            className="px-4 py-2 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-xl text-sm font-semibold hover:shadow-lg transition-all"
          >
            + Book New Session
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Sessions', value: sessions.length, icon: '📅', color: 'from-slate-600 to-slate-700' },
            { label: 'Upcoming',       value: upcoming,         icon: '🔔', color: 'from-teal-500 to-teal-700' },
            { label: 'Completed',      value: completed,        icon: '✅', color: 'from-emerald-500 to-emerald-700' },
            { label: 'Cancelled',      value: cancelled,        icon: '❌', color: 'from-red-400 to-red-600' },
          ].map((stat, i) => (
            <div key={i} className={`bg-gradient-to-br ${stat.color} text-white rounded-2xl p-5`}>
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-3xl font-bold">{stat.value}</div>
              <div className="text-white/80 text-sm mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Next Session Banner */}
        {nextSession && (
          <div className="bg-gradient-to-r from-teal-600 to-teal-700 rounded-2xl p-5 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">
                🗓️
              </div>
              <div>
                <p className="text-teal-100 text-xs font-semibold uppercase tracking-wider">Next Session</p>
                <h3 className="font-bold text-lg">{nextSession.practitionerName || 'Practitioner'}</h3>
                <p className="text-teal-100 text-sm">
                  {nextSession.sessionDate} • {nextSession.startTime || nextSession.time || ''} • {nextSession.sessionType || 'Video Call'}
                </p>
              </div>
            </div>
            <button className="px-5 py-2.5 bg-white text-teal-700 rounded-xl font-bold text-sm hover:bg-teal-50 transition-colors flex-shrink-0">
              Join Session →
            </button>
          </div>
        )}

        {/* Filter Tabs + View Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Filter tabs */}
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'all',       label: '📋 All' },
              { key: 'upcoming',  label: '📅 Upcoming' },
              { key: 'past',      label: '✅ Past' },
              { key: 'cancelled', label: '❌ Cancelled' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  filter === f.key
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-teal-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* View toggle */}
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 gap-1 shadow-sm self-start">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                viewMode === 'list' ? 'bg-teal-600 text-white' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              ☰ List
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                viewMode === 'calendar' ? 'bg-teal-600 text-white' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              📆 Calendar
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : viewMode === 'list' ? (
          /* ---- LIST VIEW ---- */
          filteredSessions.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center shadow-sm">
              <div className="text-5xl mb-4">📭</div>
              <p className="text-slate-700 font-semibold text-lg">No sessions found</p>
              <p className="text-slate-400 text-sm mt-1">
                {filter === 'all' ? 'Book your first session to get started' : `No ${filter} sessions`}
              </p>
              <button
                onClick={() => navigate('/browse-sessions')}
                className="mt-5 px-6 py-2.5 bg-teal-600 text-white rounded-xl font-semibold text-sm hover:bg-teal-700 transition-colors"
              >
                Browse Sessions
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredSessions.map(session => (
                <SessionCard
                  key={session.id}
                  session={session}
                  role="USER"
                  onRefresh={fetchSessions}
                  onReview={(s) => setReviewSession(s)}
                />
              ))}
            </div>
          )
        ) : (
          /* ---- CALENDAR VIEW ---- */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar Grid */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              {/* Month Nav */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
                  className="p-2 hover:bg-slate-100 rounded-lg transition"
                >
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <h3 className="text-lg font-bold text-slate-800">
                  {MONTHS[calendarDate.getMonth()]} {calendarDate.getFullYear()}
                </h3>
                <button
                  onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
                  className="p-2 hover:bg-slate-100 rounded-lg transition"
                >
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 mb-2">
                {DAYS_SHORT.map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">{d}</div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1">
                {Array(firstDay).fill(null).map((_, i) => <div key={`e-${i}`} />)}
                {Array(daysInMonth).fill(null).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                  const daySessions = getSessionsForDay(day);
                  const isToday = day === today.getDate() && calendarDate.getMonth() === today.getMonth() && calendarDate.getFullYear() === today.getFullYear();
                  const isSelected = selectedCalDate === dateStr;

                  return (
                    <div
                      key={day}
                      onClick={() => setSelectedCalDate(isSelected ? null : dateStr)}
                      className={`min-h-[60px] p-1 rounded-xl cursor-pointer transition-all border ${
                        isSelected
                          ? 'bg-teal-50 border-teal-400'
                          : isToday
                          ? 'border-teal-300 bg-teal-50/50'
                          : 'border-transparent hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mx-auto mb-1 ${
                        isToday && !isSelected ? 'bg-teal-600 text-white' :
                        isSelected ? 'bg-teal-600 text-white' :
                        'text-slate-700'
                      }`}>
                        {day}
                      </div>
                      <div className="space-y-0.5">
                        {daySessions.slice(0, 2).map((s, si) => {
                          const style = STATUS_STYLES[s.status] || STATUS_STYLES.BOOKED;
                          return (
                            <div key={si} className={`h-1.5 rounded-full ${style.bg} w-full`} />
                          );
                        })}
                        {daySessions.length > 2 && (
                          <div className="text-xs text-slate-400 text-center">+{daySessions.length - 2}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-3">
                {Object.entries(STATUS_STYLES).map(([status, style]) => (
                  <div key={status} className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${style.bg}`} />
                    <span className="text-xs text-slate-500">{style.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Selected Day Panel */}
            <div className="space-y-4">
              {selectedCalDate ? (
                <>
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <h3 className="font-bold text-slate-900 mb-1">
                      {new Date(selectedCalDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {selectedDaySessions.length} session{selectedDaySessions.length !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {selectedDaySessions.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
                      <p className="text-3xl mb-2">📭</p>
                      <p className="text-slate-500 text-sm">No sessions on this day</p>
                      <button
                        onClick={() => navigate('/browse-sessions')}
                        className="mt-3 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition"
                      >
                        Book a Session
                      </button>
                    </div>
                  ) : (
                    selectedDaySessions.map(s => {
                      const style = STATUS_STYLES[s.status] || STATUS_STYLES.BOOKED;
                      return (
                        <div key={s.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${style.bg}`}>
                              {(s.practitionerName || 'P').split(' ').map(n => n[0]).join('').slice(0,2)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="font-semibold text-slate-900 text-sm truncate">{s.practitionerName || 'Practitioner'}</h4>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${style.light}`}>
                                  {style.label}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">{s.startTime || s.time || ''}</p>
                              {s.sessionType && <p className="text-xs text-slate-400">{s.sessionType}</p>}
                            </div>
                          </div>
                          {s.status === 'BOOKED' && (
                            <button className="w-full mt-3 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition">
                              Join Session
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
                  <p className="text-3xl mb-2">📆</p>
                  <p className="text-slate-500 text-sm font-medium">Click a date</p>
                  <p className="text-slate-400 text-xs mt-1">to see sessions for that day</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Review Form Modal */}
      {reviewSession && (
        <ReviewForm
          practitionerId={reviewSession.practitionerId}
          practitionerName={reviewSession.practitionerName || 'Practitioner'}
          sessionId={reviewSession.id}
          onSuccess={() => {
            setReviewSession(null);
            fetchSessions();
          }}
          onClose={() => setReviewSession(null)}
        />
      )}
    </div>
  );
}