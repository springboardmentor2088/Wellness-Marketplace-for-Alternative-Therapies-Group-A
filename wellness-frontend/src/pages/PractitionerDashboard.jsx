import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';
import { getAccessToken } from '../services/authService';
import { getCurrentUser, updateUser } from '../services/userService';
import { getSessionsForPractitioner, getAvailability, setAvailability } from '../services/sessionService';
import SessionCard from '../components/SessionCard';
import NotificationDropdown from '../components/NotificationDropdown';
import WalletWidget from '../components/WalletWidget';
import { getPendingEarnings, withdrawEarnings } from '../services/walletService';

export default function PractitionerDashboard() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [practitionerProfile, setPractitionerProfile] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [settingsData, setSettingsData] = useState({
    name: '', specialization: '', experience: '', qualifications: '',
    email: '', phone: ''
  });
  const [savingSettings, setSavingSettings] = useState(false);
  // Sessions & availability state
  const [practSessions, setPractSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [availability, setAvailabilityState] = useState([]);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  const [selectedDay, setSelectedDay] = useState('MONDAY');
  const [scheduleData, setScheduleData] = useState(
    DAYS.map((day, idx) => ({
      dayOfWeek: day,
      startTime: '09:00',
      endTime: '17:00',
      isAvailable: idx < 5,
      slotDuration: 60
    }))
  );
  const [slotDuration, setSlotDuration] = useState(60);

  // Earnings State
  const [earningsData, setEarningsData] = useState({ totalPending: 0, sessionCount: 0, earnings: [] });
  const [loadingEarnings, setLoadingEarnings] = useState(false);
  const [isWithdrawingEarnings, setIsWithdrawingEarnings] = useState(false);

  useEffect(() => {
    const initDashboard = async () => {
      try {
        const accessToken = getAccessToken();
        if (!accessToken) {
          navigate('/login');
          return;
        }

        // Check onboarding status
        const response = await fetch(
          '/api/practitioners/me/onboarding-status',
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );

        if (response.ok) {
          const onboardingStatus = await response.json();
          setIsVerified(!!onboardingStatus.verified);

          if (!onboardingStatus.profileExists) {
            navigate('/practitioner/onboarding');
            return;
          }

          // Fetch user profile
          let userId = null;
          let userName = '';
          let userEmail = '';
          let userPhone = '';
          try {
            const user = await getCurrentUser();
            setUserProfile(user);
            userId = user.id;
            userName = user.name || '';
            userEmail = user.email || '';
            userPhone = user.phone || '';
          } catch (err) {
            console.error('Error fetching user profile:', err);
          }

          // Fetch full practitioner profile using user ID
          let practProfile = null;
          if (userId) {
            try {
              const practRes = await axios.get(`/api/practitioners/user/${userId}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
              });
              practProfile = practRes.data;
              setPractitionerProfile(practProfile);
              setSettingsData({
                name: userName || practProfile.userName || '',
                specialization: practProfile.specialization || '',
                experience: practProfile.experience || '',
                qualifications: practProfile.qualifications || '',
                consultationFee: practProfile.consultationFee || '',
                email: userEmail,
                phone: userPhone
              });
            } catch (err) {
              console.error('Error fetching practitioner profile:', err);
              // Still set user data in settings even if practitioner fetch fails
              setSettingsData(prev => ({
                ...prev,
                name: userName,
                email: userEmail,
                phone: userPhone
              }));
            }
          }

          // Fetch sessions for this practitioner (Unified source of truth)
          const practId = practProfile?.id || practProfile?.practitionerId;
          if (practId) {
            try {
              const sessionsData = await getSessionsForPractitioner(practId);
              setPractSessions(sessionsData);
            } catch (err) {
              console.error('Error fetching sessions:', err);
            }
          }
        } else {
          navigate('/practitioner/onboarding');
          return;
        }

        setLoading(false);
      } catch (err) {
        console.error('Error initializing dashboard:', err);
        navigate('/practitioner/onboarding');
      }
    };

    initDashboard();
  }, [navigate]);

  // Derived stats from unified sessions
  const uniquePatients = [...new Map(practSessions.map(s => [s.userId, s])).values()];
  const pendingRequests = practSessions.filter(s => s.status === 'HOLD');
  const completedRequests = practSessions.filter(s => s.status === 'COMPLETED');
  const acceptedRequests = practSessions.filter(s => s.status === 'BOOKED');

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      // Update user profile
      if (userProfile?.id) {
        await updateUser(userProfile.id, {
          name: settingsData.name,
          phone: settingsData.phone || null
        });
      }
      // Update practitioner profile
      if (practitionerProfile?.id) {
        await axios.put(`/api/practitioners/${practitionerProfile.id}`, {
          specialization: settingsData.specialization,
          experience: settingsData.experience,
          qualifications: settingsData.qualifications,
          consultationFee: settingsData.consultationFee || null
        }, {
          headers: { Authorization: `Bearer ${getAccessToken()}` }
        });
      }
      toast.success('Settings saved successfully!');
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  // Fetch sessions when dashboard or sessions section is opened
  useEffect(() => {
    if ((activeSection === 'sessions' || activeSection === 'dashboard') && practitionerProfile?.id) {
      setLoadingSessions(true);
      getSessionsForPractitioner(practitionerProfile.id)
        .then(data => setPractSessions(data))
        .catch(err => console.error('Failed to load sessions:', err))
        .finally(() => setLoadingSessions(false));
    }
  }, [activeSection, practitionerProfile?.id]);

  // Fetch availability when availability or schedule section is opened
  useEffect(() => {
    if ((activeSection === 'availability' || activeSection === 'schedule') && practitionerProfile?.id) {
      getAvailability(practitionerProfile.id)
        .then(data => {
          setAvailabilityState(data);
          // Populate schedule form from saved availability
          if (data && data.length > 0) {
            setScheduleData(prev => prev.map(item => {
              const saved = data.find(d => d.dayOfWeek === item.dayOfWeek);
              if (saved) {
                return {
                  ...item,
                  startTime: saved.startTime?.substring(0, 5) || '09:00',
                  endTime: saved.endTime?.substring(0, 5) || '17:00',
                  isAvailable: saved.isAvailable !== false,
                  slotDuration: saved.slotDuration || 60
                };
              }
              return item;
            }));
            const firstSlot = data.find(d => d.slotDuration);
            if (firstSlot) setSlotDuration(firstSlot.slotDuration);
          }
        })
        .catch(err => console.error('Failed to load availability:', err));
    }
  }, [activeSection, practitionerProfile?.id]);

  // Fetch earnings when earnings section is opened
  useEffect(() => {
    if (activeSection === 'earnings') {
      setLoadingEarnings(true);
      getPendingEarnings()
        .then(data => setEarningsData(data))
        .catch(err => console.error('Failed to load earnings:', err))
        .finally(() => setLoadingEarnings(false));
    }
  }, [activeSection]);

  useEffect(() => {
    const handleWs = (e) => {
      const msg = e.detail;
      if (msg && (
        msg.type === 'PAYMENT_SUCCESS' ||
        msg.type === 'PAYMENT_RECEIVED' ||
        msg.type === 'REFUND_PROCESSED' ||
        msg.type === 'SESSION_CANCELLED' ||
        msg.type === 'SESSION_COMPLETED' ||
        msg.type === 'SESSION_BOOKED'
      )) {
        if (['sessions', 'earnings', 'dashboard'].includes(activeSection) && practitionerProfile?.id) {
          getSessionsForPractitioner(practitionerProfile.id)
            .then(data => setPractSessions(data))
            .catch(err => console.error('Failed to load sessions:', err));
        }

        if (activeSection === 'earnings') {
          getPendingEarnings()
            .then(data => setEarningsData(data))
            .catch(err => console.error('Failed to load earnings:', err));
        }
      }
    };
    window.addEventListener('wsNotification', handleWs);
    return () => window.removeEventListener('wsNotification', handleWs);
  }, [activeSection, practitionerProfile?.id]);

  // Save specific day availability
  const handleSaveDay = async () => {
    if (!practitionerProfile?.id) {
      toast.error('Practitioner profile not loaded');
      return;
    }
    setSavingSchedule(true);
    try {
      const activeData = scheduleData.find(d => d.dayOfWeek === selectedDay);
      await setAvailability(practitionerProfile.id, {
        dayOfWeek: activeData.dayOfWeek,
        startTime: activeData.startTime,
        endTime: activeData.endTime,
        slotDuration: activeData.slotDuration,
        isAvailable: activeData.isAvailable
      });
      // Refresh to ensure synced
      const updated = await getAvailability(practitionerProfile.id);
      setAvailabilityState(updated);
      toast.success(`${selectedDay.charAt(0) + selectedDay.slice(1).toLowerCase()} availability saved successfully!`);
    } catch (err) {
      console.error('Error saving availability:', err);
      toast.error(err.response?.data?.message || 'Failed to save availability');
    } finally {
      setSavingSchedule(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1f6f66] mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 w-64 h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center text-lg">
              🏥
            </div>
            <h1 className="text-xl font-bold">WellnessHub</h1>
          </div>
          {/* Verification Badge */}
          <div
            className={`mt-4 flex items-center gap-2 rounded-lg p-2 border ${isVerified
              ? 'bg-green-500/10 border-green-500/30'
              : 'bg-amber-500/10 border-amber-500/30'
              }`}
          >
            <svg
              className={`w-5 h-5 ${isVerified ? 'text-green-500' : 'text-amber-500'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={
                  isVerified
                    ? 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                    : 'M12 8v4m0 4h.01M12 2a10 10 0 100 20 10 10 0 000-20z'
                }
              />
            </svg>
            <span
              className={`text-xs font-semibold ${isVerified ? 'text-green-400' : 'text-amber-300'
                }`}
            >
              {isVerified ? 'Verified Practitioner' : 'Verification Pending'}
            </span>
          </div>
        </div>

        <nav className="py-6">
          <button
            onClick={() => setActiveSection('dashboard')}
            className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-all duration-200 ${activeSection === 'dashboard'
              ? 'text-white bg-green-500/15 border-l-4 border-green-500'
              : 'text-slate-300 hover:bg-white/5'
              }`}
          >
            <span>📊</span>
            <span>Dashboard</span>
          </button>


          <button
            onClick={() => setActiveSection('patients')}
            className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-all duration-200 ${activeSection === 'patients'
              ? 'text-white bg-green-500/15 border-l-4 border-green-500'
              : 'text-slate-300 hover:bg-white/5'
              }`}
          >
            <span>👥</span>
            <span>My Patients</span>
          </button>

          <button
            onClick={() => setActiveSection('sessions')}
            className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-all duration-200 ${activeSection === 'sessions'
              ? 'text-white bg-green-500/15 border-l-4 border-green-500'
              : 'text-slate-300 hover:bg-white/5'
              }`}
          >
            <span>📅</span>
            <span>Sessions</span>
          </button>

          <button
            onClick={() => setActiveSection('availability')}
            className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-all duration-200 ${activeSection === 'availability'
              ? 'text-white bg-green-500/15 border-l-4 border-green-500'
              : 'text-slate-300 hover:bg-white/5'
              }`}
          >
            <span>🗓️</span>
            <span>Availability</span>
          </button>

          <button
            onClick={() => setActiveSection('earnings')}
            className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-all duration-200 ${activeSection === 'earnings'
              ? 'text-white bg-green-500/15 border-l-4 border-green-500'
              : 'text-slate-300 hover:bg-white/5'
              }`}
          >
            <span>💰</span>
            <span>Earnings</span>
          </button>

          <button
            onClick={() => setActiveSection('messages')}
            className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-all duration-200 ${activeSection === 'messages'
              ? 'text-white bg-green-500/15 border-l-4 border-green-500'
              : 'text-slate-300 hover:bg-white/5'
              }`}
          >
            <span>💬</span>
            <span>Messages</span>
          </button>



          {/* ===== NEW: Community Forum ===== */}
          <button
            onClick={() => navigate('/community-forum')}
            className="w-full flex items-center gap-3 px-6 py-3 text-left transition-all duration-200 text-slate-300 hover:bg-white/5"
          >
            <span>💬</span>
            <span>Community Forum</span>
          </button>

          <button
            onClick={() => setActiveSection('settings')}
            className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-all duration-200 ${activeSection === 'settings'
              ? 'text-white bg-green-500/15 border-l-4 border-green-500'
              : 'text-slate-300 hover:bg-white/5'
              }`}
          >
            <span>⚙️</span>
            <span>Settings</span>
          </button>

          <div className="mt-8 pt-6 border-t border-white/10">
            <button
              onClick={() => {
                localStorage.removeItem('user');
                localStorage.removeItem('authToken');
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('userRole');
                localStorage.removeItem('adminLoggedIn');
                navigate('/login');
              }}
              className="w-full flex items-center gap-3 px-6 py-3 text-left transition-all duration-200 text-slate-300 hover:bg-red-500/20 hover:text-red-300 rounded-lg"
            >
              <span>🚪</span>
              <span>Logout</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className="ml-64 flex-1 p-8">
        {/* Top Header Bar */}
        <div className="flex justify-end items-center mb-6">
          <WalletWidget />
          <NotificationDropdown />
        </div>

        {/* Pending Verification Banner */}
        {!isVerified && (
          <div className="mb-6 bg-amber-50 border border-amber-300 rounded-xl p-5 flex items-start gap-4 shadow-sm">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-2xl flex-shrink-0">
              ⏳
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-amber-900">Pending Verification</h3>
              <p className="text-sm text-amber-800 mt-1">
                Your practitioner profile is currently under review by our admin team.
                Some features may be limited until your account is approved.
              </p>
              <span className="inline-block mt-2 px-3 py-1 bg-amber-200 text-amber-900 rounded-full text-xs font-semibold">
                Status: PENDING_VERIFICATION
              </span>
            </div>
          </div>
        )}
        {/* Dashboard Section */}
        {activeSection === 'dashboard' && (
          <>
            {/* Header */}
            <div className="mb-8 flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">Practitioner Dashboard</h2>
                <p className="text-slate-600 text-sm mt-2">Welcome back, Doctor! Manage your practice efficiently</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setActiveSection('availability')}
                  className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg text-sm font-semibold hover:shadow-lg transition-all"
                >
                  <span className="mr-2">📅</span>
                  Manage Schedule
                </button>
                <button
                  onClick={() => setActiveSection('patients')}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg text-sm font-semibold hover:shadow-lg transition-all"
                >
                  <span className="mr-2">👥</span>
                  View Patients
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-3xl font-bold text-slate-900">{uniquePatients.length}</div>
                    <div className="text-sm text-slate-600 font-medium">Total Patients</div>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center text-2xl">
                    👥
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-600">
                  <span>From {practSessions.length} total requests</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-3xl font-bold text-slate-900">{pendingRequests.length + acceptedRequests.length}</div>
                    <div className="text-sm text-slate-600 font-medium">Pending Requests</div>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center text-2xl">
                    📋
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-3xl font-bold text-slate-900">{practitionerProfile?.rating?.toFixed(1) || 'N/A'}</div>
                    <div className="text-sm text-slate-600 font-medium">Rating</div>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-xl flex items-center justify-center text-2xl">
                    ⭐
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-600">
                  <span>—</span>
                  <span>{completedRequests.length} completed sessions</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-3xl font-bold text-slate-900">{userProfile?.reputationScore || 0}</div>
                    <div className="text-sm text-slate-600 font-medium">Reputation</div>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-teal-100 to-teal-200 rounded-xl flex items-center justify-center text-2xl">
                    🏆
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-teal-600">
                  <span>Community expert points</span>
                </div>
              </div>
            </div>


            {/* Quick Overview Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Requests */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Requests</h3>
                <div className="space-y-3">
                  {practSessions.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <div className="text-4xl mb-2">📋</div>
                      <p className="text-sm">No sessions yet</p>
                    </div>
                  ) : practSessions.slice(0, 4).map((session) => (
                    <div key={session.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-white hover:shadow-sm transition-all">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {(session.userName || 'U').split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-slate-900">{session.userName || 'Patient'}</h4>
                            <p className="text-xs text-slate-600">{session.notes || 'Consultation Session'}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${session.status === 'HOLD' ? 'bg-purple-100 text-purple-800' :
                          session.status === 'BOOKED' ? 'bg-blue-100 text-blue-800' :
                            session.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                          }`}>
                          {session.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setActiveSection('sessions')}
                  className="w-full mt-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition-all"
                >
                  View All Sessions
                </button>
              </div>

              {/* Next Session */}
              {(() => {
                const todayStr = new Date().toISOString().split('T')[0];
                const upcoming = practSessions
                  .filter(s => s.sessionDate >= todayStr && s.status === 'BOOKED')
                  .sort((a, b) => new Date(`${a.sessionDate}T${a.startTime}`) - new Date(`${b.sessionDate}T${b.startTime}`));
                const nextSession = upcoming.length > 0 ? upcoming[0] : null;

                return (
                  <div className="bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-purple-900">Next Session</h3>
                      {nextSession && (
                        <span className="text-sm text-purple-700 font-medium whitespace-nowrap">
                          {nextSession.sessionDate === todayStr ? 'Today' : nextSession.sessionDate}
                        </span>
                      )}
                    </div>

                    {nextSession ? (
                      <>
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-800 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                            {(nextSession.userName || 'P').split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-base font-semibold text-purple-900 truncate">
                              {nextSession.userName || 'Patient'}
                            </h4>
                            <p className="text-sm text-purple-700 truncate">
                              {nextSession.notes || 'Wellness Consultation'}
                            </p>
                          </div>
                        </div>
                        <div className="pt-3 border-t border-purple-300/50 space-y-2">
                          <div className="flex items-center gap-2 text-purple-700 text-sm">
                            <span>📅</span>
                            <span>{new Date(`${nextSession.sessionDate}T${nextSession.startTime}`).toLocaleString('en-US', {
                              month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
                            })}</span>
                          </div>
                          <div className="flex items-center gap-2 text-purple-700 text-sm">
                            <span>📍</span>
                            <span>Video Call</span>
                          </div>
                        </div>
                        {(() => {
                          const sessionStart = new Date(`${nextSession.sessionDate}T${nextSession.startTime}`);
                          const canJoin = (sessionStart - new Date()) / 60000 <= 15;
                          return canJoin && nextSession.meetingLink ? (
                            <a
                              href={nextSession.meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full mt-4 py-3 bg-purple-700 text-white rounded-lg font-semibold hover:bg-purple-800 transition-all block text-center"
                            >
                              Join Session
                            </a>
                          ) : (
                            <div className="w-full mt-4 py-3 bg-purple-300 text-purple-100 rounded-lg font-semibold text-center cursor-not-allowed">
                              Join available 15 min before session
                            </div>
                          );
                        })()}
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 text-purple-800">
                        <div className="text-4xl mb-3">📭</div>
                        <p className="text-sm font-medium">No upcoming sessions</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </>
        )}


        {/* Sessions Section */}
        {activeSection === 'sessions' && (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900">My Sessions</h2>
              <p className="text-slate-600 text-sm mt-2">View and manage all booked therapy sessions</p>
            </div>

            {loadingSessions ? (
              <div className="flex justify-center py-16">
                <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : practSessions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
                <p className="text-5xl mb-4">📭</p>
                <p className="text-gray-500 font-medium">No sessions found</p>
                <p className="text-gray-400 text-sm mt-1">Sessions booked by patients will appear here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {practSessions.map(session => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    role="PRACTITIONER"
                    onRefresh={() => {
                      setLoadingSessions(true);
                      getSessionsForPractitioner(practitionerProfile.id)
                        .then(data => setPractSessions(data))
                        .catch(err => console.error('Failed to refresh sessions:', err))
                        .finally(() => setLoadingSessions(false));
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Patients Section */}
        {activeSection === 'patients' && (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900">My Patients</h2>
              <p className="text-slate-600 text-sm mt-2">View and manage your patient list</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-900">Patient List</h3>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Search patients..."
                    className="px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 transition-all">
                    Add Patient
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {uniquePatients.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">👥</div>
                    <h4 className="text-lg font-semibold text-slate-900 mb-2">No patients yet</h4>
                    <p className="text-slate-600 text-sm">Once patients send you requests, they will appear here</p>
                  </div>
                ) : uniquePatients.map((patient) => {
                  const patientRequests = practSessions.filter(r => r.userId === patient.userId);
                  const lastRequest = patientRequests[patientRequests.length - 1];
                  return (
                    <div key={patient.userId} className="p-5 bg-slate-50 rounded-lg border border-slate-200 hover:bg-white hover:shadow-md transition-all">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                            {(patient.userName || 'U').split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <h4 className="text-base font-semibold text-slate-900">{patient.userName || 'Patient'}</h4>
                            <div className="flex gap-4 text-sm text-slate-600 mt-1">
                              <span>{patientRequests.length} request{patientRequests.length !== 1 ? 's' : ''}</span>
                              <span>•</span>
                              <span>Last: {lastRequest?.createdAt ? new Date(lastRequest.createdAt).toLocaleDateString() : 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                            {patient.userEmail}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Earnings Section */}
        {activeSection === 'earnings' && (
          <>
            <div className="mb-8 flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">Earnings</h2>
                <p className="text-slate-600 text-sm mt-2">Track your pending payouts and session earnings</p>
              </div>
              <button
                disabled={isWithdrawingEarnings || earningsData.totalPending <= 0}
                onClick={async () => {
                  try {
                    setIsWithdrawingEarnings(true);
                    const res = await withdrawEarnings();
                    toast.success(res.message || "Withdrawal successful");
                    // Refresh earnings
                    const data = await getPendingEarnings();
                    setEarningsData(data);
                  } catch (err) {
                    console.error("Withdrawal error", err);
                    toast.error(err.response?.data?.error || "Withdrawal failed");
                  } finally {
                    setIsWithdrawingEarnings(false);
                  }
                }}
                className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all disabled:opacity-50"
              >
                {isWithdrawingEarnings ? 'Processing...' : `Withdraw ₹${(earningsData.totalPending || 0).toFixed(2)}`}
              </button>
            </div>

            {loadingEarnings ? (
              <div className="flex justify-center py-16">
                <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-600 mb-2">Pending Sessions</h3>
                      <p className="text-4xl font-bold text-slate-900">{pendingRequests.length}</p>
                    </div>
                    <div className="text-5xl opacity-80">📅</div>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-600 mb-2">Completed Sessions</h3>
                      <p className="text-4xl font-bold text-slate-900">{completedRequests.length}</p>
                    </div>
                    <div className="text-5xl opacity-80">✅</div>
                  </div>

                  <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-sm flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-green-100 mb-2">Ready for Payout</h3>
                      <p className="text-4xl font-bold">₹{(earningsData.totalPending || 0).toFixed(2)}</p>
                    </div>
                    <div className="text-5xl opacity-80">💰</div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 overflow-hidden">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Pending Transactions</h3>

                  {(!earningsData.earnings || earningsData.earnings.length === 0) ? (
                    <div className="text-center py-8 text-slate-500">
                      <div className="text-4xl mb-2">💸</div>
                      <p className="text-sm">No pending earnings to display</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {earningsData.earnings.map((earning, idx) => (
                        <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                          <div>
                            <h4 className="text-sm font-semibold text-slate-900">Session ID: #{earning.sessionId}</h4>
                            <p className="text-xs text-slate-600">Created: {new Date(earning.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-base font-bold text-slate-900">₹{earning.netAmount.toFixed(2)}</p>
                            <span className="text-xs font-semibold text-amber-600">PENDING</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {/* Messages Section */}
        {activeSection === 'messages' && (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900">Messages</h2>
              <p className="text-slate-600 text-sm mt-2">Communicate with your patients</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="text-center py-20">
                <div className="text-6xl mb-4">💬</div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">No messages yet</h3>
                <p className="text-slate-600 text-sm">Your conversations with patients will appear here</p>
              </div>
            </div>
          </>
        )}

        {/* Settings Section */}
        {activeSection === 'settings' && (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900">Settings</h2>
              <p className="text-slate-600 text-sm mt-2">Manage your profile and preferences</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="space-y-6">
                <div className="pb-6 border-b border-slate-200">
                  <h4 className="text-lg font-semibold text-slate-900 mb-4">Professional Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                      <input
                        type="text"
                        value={settingsData.name}
                        onChange={(e) => setSettingsData({ ...settingsData, name: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Specialization</label>
                      <input
                        type="text"
                        value={settingsData.specialization}
                        onChange={(e) => setSettingsData({ ...settingsData, specialization: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Qualifications</label>
                      <input
                        type="text"
                        value={settingsData.qualifications}
                        onChange={(e) => setSettingsData({ ...settingsData, qualifications: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Experience</label>
                      <input
                        type="text"
                        value={settingsData.experience}
                        onChange={(e) => setSettingsData({ ...settingsData, experience: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Consultation Fee (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={settingsData.consultationFee}
                        onChange={(e) => setSettingsData({ ...settingsData, consultationFee: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm"
                        placeholder="e.g. 500"
                      />
                    </div>
                  </div>
                </div>

                <div className="pb-6 border-b border-slate-200">
                  <h4 className="text-lg font-semibold text-slate-900 mb-4">Contact Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={settingsData.email}
                        disabled
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm bg-slate-100 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                      <input
                        type="tel"
                        value={settingsData.phone}
                        onChange={(e) => setSettingsData({ ...settingsData, phone: e.target.value })}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm"
                        placeholder="+1 234 567 8900"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-slate-900 mb-4">Account Actions</h4>
                  <div className="space-y-3">
                    <button
                      onClick={handleSaveSettings}
                      disabled={savingSettings}
                      className="w-full px-4 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-all disabled:opacity-50"
                    >
                      {savingSettings ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button className="w-full px-4 py-3 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 transition-all">
                      Change Password
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ============ SESSIONS SECTION ============ */}
        {activeSection === 'sessions' && (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900">My Sessions</h2>
              <p className="text-slate-600 text-sm mt-2">All therapy sessions booked with your patients</p>
            </div>

            {loadingSessions ? (
              <div className="flex justify-center py-16">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : practSessions.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
                <p className="text-5xl mb-4">📭</p>
                <p className="text-gray-500 font-medium">No sessions booked yet</p>
                <p className="text-gray-400 text-sm mt-1">Set your availability to start receiving bookings</p>
                <button
                  onClick={() => setActiveSection('availability')}
                  className="mt-4 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                >
                  Set Availability
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {practSessions.map(session => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    role="PRACTITIONER"
                    onRefresh={async () => {
                      if (practitionerProfile?.id) {
                        const data = await getSessionsForPractitioner(practitionerProfile.id);
                        setPractSessions(data);
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ============ AVAILABILITY SECTION ============ */}
        {activeSection === 'availability' && (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900">Manage Availability & Schedule</h2>
              <p className="text-slate-600 text-sm mt-2">Select a day to set your active working hours.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
              {/* LEFT COLUMN: Days List */}
              <div className="w-full lg:w-1/3 bg-white border border-slate-200 shadow-sm rounded-xl p-4 flex flex-col gap-2">
                {DAYS.map(day => {
                  const dayData = scheduleData.find(d => d.dayOfWeek === day);
                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      className={`p-4 text-left rounded-lg flex justify-between items-center transition-all ${selectedDay === day ? 'bg-green-50 border border-green-200' : 'hover:bg-slate-50 border border-transparent'}`}
                    >
                      <span className={`font-semibold ${selectedDay === day ? 'text-green-800' : 'text-slate-700'}`}>
                        {day.charAt(0) + day.slice(1).toLowerCase()}
                      </span>
                      <div className={`w-10 h-5 rounded-full transition-colors relative ${dayData?.isAvailable ? "bg-green-500" : "bg-slate-300"}`}>
                        <div className={`absolute top-0 w-5 h-5 bg-white rounded-full shadow transition-transform ${dayData?.isAvailable ? "translate-x-5" : "translate-x-0"}`} />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* RIGHT COLUMN: Timing details for Selected Day */}
              <div className="w-full lg:w-2/3 bg-white border border-slate-200 shadow-sm rounded-xl p-6">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                  <h3 className="text-xl font-bold text-slate-900 capitalize">
                    Timings for {selectedDay.charAt(0) + selectedDay.slice(1).toLowerCase()}
                  </h3>
                  <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => {
                      setScheduleData(prev => prev.map(item =>
                        item.dayOfWeek === selectedDay ? { ...item, isAvailable: !item.isAvailable } : item
                      ));
                    }}
                  >
                    <span className="text-sm font-medium text-slate-600">
                      {scheduleData.find(d => d.dayOfWeek === selectedDay)?.isAvailable ? "Available" : "Off"}
                    </span>
                  </div>
                </div>

                {scheduleData.find(d => d.dayOfWeek === selectedDay)?.isAvailable ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block">Start Time</label>
                        <input
                          type="time"
                          value={scheduleData.find(d => d.dayOfWeek === selectedDay)?.startTime || '09:00'}
                          onChange={(e) => setScheduleData(prev => prev.map(item => item.dayOfWeek === selectedDay ? { ...item, startTime: e.target.value } : item))}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block">End Time</label>
                        <input
                          type="time"
                          value={scheduleData.find(d => d.dayOfWeek === selectedDay)?.endTime || '17:00'}
                          onChange={(e) => setScheduleData(prev => prev.map(item => item.dayOfWeek === selectedDay ? { ...item, endTime: e.target.value } : item))}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700 mb-1 block">Slot Duration (mins)</label>
                      <select
                        value={scheduleData.find(d => d.dayOfWeek === selectedDay)?.slotDuration || 60}
                        onChange={(e) => setScheduleData(prev => prev.map(item => item.dayOfWeek === selectedDay ? { ...item, slotDuration: Number(e.target.value) } : item))}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value={30}>30 minutes</option>
                        <option value={45}>45 minutes</option>
                        <option value={60}>60 minutes</option>
                        <option value={90}>90 minutes</option>
                      </select>
                    </div>
                    <div className="pt-4">
                      <button
                        onClick={handleSaveDay}
                        disabled={savingSchedule}
                        className="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg text-sm font-bold shadow hover:shadow-md transition-all disabled:opacity-50"
                      >
                        {savingSchedule ? "Saving..." : "Save Timing"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-4xl mb-3">🛌</p>
                    <p className="font-medium text-slate-700">You are marked as away</p>
                    <p className="text-sm mt-1">Toggle availability above to accept bookings on this day</p>
                    <div className="pt-6">
                      <button
                        onClick={handleSaveDay}
                        disabled={savingSchedule}
                        className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-semibold transition-all shadow-sm"
                      >
                        {savingSchedule ? "Saving..." : "Save Settings"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
