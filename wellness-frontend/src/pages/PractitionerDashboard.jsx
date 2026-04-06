import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';
import { getAccessToken } from '../services/authService';
import { getCurrentUser, updateUser } from '../services/userService';
import { getSessionsForPractitioner, getAvailability, setAvailability } from '../services/sessionService';
import SessionCard from '../components/SessionCard';
import { getPendingEarnings, withdrawEarnings } from '../services/walletService';
import { getIssuedPrescriptions, getPatientLogs, getAllMedicines, searchMedicines } from '../services/practitionerService';
import PractitionerHeader from '../components/PractitionerHeader';

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
  const [phoneError, setPhoneError] = useState('');
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

  const [earningsData, setEarningsData] = useState({ totalPending: 0, sessionCount: 0, earnings: [] });
  const [loadingEarnings, setLoadingEarnings] = useState(false);
  const [isWithdrawingEarnings, setIsWithdrawingEarnings] = useState(false);

  // New History & Medicines State
  const [issuedPrescriptions, setIssuedPrescriptions] = useState([]);
  const [patientLogs, setPatientLogs] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [medicineSearch, setMedicineSearch] = useState('');
  const [detailsProduct, setDetailsProduct] = useState(null);

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

  useEffect(() => {
    if (activeSection === 'messages') {
      const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
          const data = await getIssuedPrescriptions();
          setIssuedPrescriptions(data);
        } catch (err) {
          toast.error("Failed to fetch prescription history");
        } finally {
          setLoadingHistory(false);
        }
      };
      fetchHistory();
    }
    if (activeSection === 'patient-logs') {
      const fetchLogs = async () => {
        setLoadingHistory(true);
        try {
          const data = await getPatientLogs();
          setPatientLogs(data);
        } catch (err) {
          toast.error("Failed to fetch patient logs");
        } finally {
          setLoadingHistory(false);
        }
      };
      fetchLogs();
    }
    if (activeSection === 'medicines') {
      const fetchMeds = async () => {
        setLoadingHistory(true);
        try {
          const data = await getAllMedicines();
          setMedicines(data);
        } catch (err) {
          toast.error("Failed to fetch medicines");
        } finally {
          setLoadingHistory(false);
        }
      };
      fetchMeds();
    }
  }, [activeSection]);

  const handleMedicineSearch = async (e) => {
    const query = e.target.value;
    setMedicineSearch(query);
    if (query.length > 2) {
      try {
        const data = await searchMedicines(query);
        setMedicines(data);
      } catch (err) {
        console.error("Search failed", err);
      }
    } else if (query.length === 0) {
      try {
        const data = await getAllMedicines();
        setMedicines(data);
      } catch (err) {
        console.error("Fetch meds failed", err);
      }
    }
  };

  const copyMedicineSuggestion = (med) => {
    const text = `Medicine Suggestion:
Name: ${med.name}
Category: ${med.category}
Details: ${med.description}
(Available in Wellness Marketplace)`;
    
    navigator.clipboard.writeText(text);
    toast.success("Suggestion copied to clipboard!");
  };

  const handleSaveSettings = async () => {
    if (settingsData.phone && settingsData.phone.length !== 10) {
      setPhoneError('Phone number must be exactly 10 digits');
      toast.error('Please fix phone number errors before saving');
      return;
    }
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
    <div className="flex min-h-screen bg-slate-50 font-sans relative overflow-x-hidden">
      {/* Mesh Background Element (Static) */}
      <div className="fixed top-0 right-0 -mr-32 -mt-32 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="fixed bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#1f6f66]/5 rounded-full blur-[120px] pointer-events-none opacity-50"></div>

      {/* Sidebar - Glassmorphic / Static */}
      <div className="fixed left-0 top-0 w-64 h-screen bg-slate-900 border-r border-slate-800 z-50 overflow-y-auto hidden md:block">
        <div className="p-8 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1f6f66] rounded-xl flex items-center justify-center text-xl shadow-lg shadow-[#1f6f66]/20">
              🏥
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-black tracking-tight leading-none uppercase text-white">Wellness</h1>
              <p className="text-[10px] font-bold text-[#1f6f66] uppercase tracking-[0.2em] mt-1">Practitioner Hub</p>
            </div>
          </div>
          {/* Verification Badge */}
          <div className={`mt-6 flex items-center gap-2 rounded-xl p-3 border ${isVerified ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}>
            <span className={`text-[10px] font-black uppercase tracking-widest ${isVerified ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isVerified ? '✓ Verified' : '⌚ Pending Review'}
            </span>
          </div>
        </div>

        <nav className="py-8 px-4 space-y-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'patients', label: 'My Patients', icon: '👥' },
            { id: 'sessions', label: 'Sessions', icon: '📅' },
            { id: 'availability', label: 'Availability', icon: '🗓️' },
            { id: 'earnings', label: 'Wallet & Finances', icon: '💰' },
            { id: 'messages', label: 'Medical Documents', icon: '📜' },
            { id: 'patient-logs', label: 'Patient Logs', icon: '📝' },
            { id: 'medicines', label: 'Medicines', icon: '💊' },
            { id: 'settings', label: 'Settings', icon: '⚙️' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 ${activeSection === tab.id
                ? 'text-white bg-[#1f6f66] shadow-lg shadow-[#1f6f66]/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}

          <div className="pt-6 pb-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-5">Community</div>
          <button
            onClick={() => navigate('/community-forum')}
            className="w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all outline-none"
          >
            <span className="text-lg">💬</span>
            <span>Community Forum</span>
          </button>

          <div className="mt-8 pt-8 border-t border-white/5">
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
              className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-black uppercase tracking-widest text-red-400 hover:bg-red-500/10 transition-all border border-red-500/10"
            >
              <span>🚪</span>
              <span>Sign Out</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Main Content - Full Page Canvas */}
      <div className="md:ml-64 flex-1 p-6 md:p-10 max-w-[1750px] mx-auto w-full relative z-10 transition-all duration-500">
        {/* Top Header Bar */}
        <PractitionerHeader />

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
                              Link active 15m before start
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

        {/* Issued Prescriptions (Messages) Section */}
        {activeSection === 'messages' && (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900">Issued Prescriptions</h2>
              <p className="text-slate-600 text-sm mt-2">History of documents issued to your patients</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-sm">
              {loadingHistory ? (
                <div className="flex justify-center py-16">
                  <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : issuedPrescriptions.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-5xl mb-4">📜</div>
                  <h3 className="text-lg font-semibold text-slate-900">No prescriptions issued</h3>
                  <p className="text-slate-500">Completed sessions with issued documents will appear here</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 font-bold text-slate-700">Date</th>
                        <th className="px-6 py-4 font-bold text-slate-700">Time</th>
                        <th className="px-6 py-4 font-bold text-slate-700">Patient Name</th>
                        <th className="px-6 py-4 font-bold text-slate-700">Document</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {issuedPrescriptions.map((px) => (
                        <tr key={px.sessionId} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-slate-900 font-medium">{new Date(px.date).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-slate-600 font-mono">{px.time}</td>
                          <td className="px-6 py-4 text-slate-900 font-bold">{px.patientName}</td>
                          <td className="px-6 py-4">
                            <a 
                              href={px.documentUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-bold underline decoration-indigo-200"
                            >
                              <span>📂</span> View Document
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Patient Logs Section */}
        {activeSection === 'patient-logs' && (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900">Patient Logs</h2>
              <p className="text-slate-600 text-sm mt-2">Review documents and notes shared by your patients</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-sm">
              {loadingHistory ? (
                <div className="flex justify-center py-16">
                  <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : patientLogs.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-5xl mb-4">📓</div>
                  <h3 className="text-lg font-semibold text-slate-900">No logs found</h3>
                  <p className="text-slate-500">Patient-uploaded documents and notes will appear here</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-4 font-bold text-slate-700">Date</th>
                        <th className="px-6 py-4 font-bold text-slate-700">Time</th>
                        <th className="px-6 py-4 font-bold text-slate-700">Patient Name</th>
                        <th className="px-6 py-4 font-bold text-slate-700">Note / Document</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {patientLogs.map((log) => (
                        <tr key={log.sessionId} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-slate-900 font-medium">{new Date(log.date).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-slate-600 font-mono">{log.time}</td>
                          <td className="px-6 py-4 text-slate-900 font-bold">{log.patientName}</td>
                          <td className="px-6 py-4">
                            {log.documentUrl.startsWith('http') ? (
                              <a 
                                href={log.documentUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-800 font-bold underline"
                              >
                                <span>📄</span> View Shared File
                              </a>
                            ) : (
                              <div className="p-2 bg-slate-100 rounded text-slate-700 italic border border-slate-200">
                                "{log.documentUrl}"
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Medicines Catalog Section */}
        {activeSection === 'medicines' && (
          <>
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">Medicines Catalog</h2>
                <p className="text-slate-600 text-sm mt-2">Browse and suggest products from the Wellness Marketplace</p>
              </div>
              <div className="relative w-full md:w-80">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40">🔍</span>
                <input 
                  type="text"
                  placeholder="Search medicines..."
                  value={medicineSearch}
                  onChange={handleMedicineSearch}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 shadow-sm"
                />
              </div>
            </div>

            {loadingHistory ? (
              <div className="flex justify-center py-16">
                <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : medicines.length === 0 ? (
              <div className="bg-white rounded-xl p-16 text-center border border-slate-200">
                <p className="text-5xl mb-4">💊</p>
                <p className="text-slate-500">No medicines match your search</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {medicines.map((med) => (
                  <div key={med.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col group hover:shadow-lg transition-all">
                    <div className="h-40 bg-slate-100 relative overflow-hidden">
                      {med.imageUrl ? (
                        <img src={med.imageUrl} alt={med.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl opacity-20">📦</div>
                      )}
                      <div className="absolute top-2 right-2 px-2 py-1 bg-white/90 backdrop-blur rounded text-[10px] font-black uppercase tracking-widest text-slate-600 shadow-sm">
                        {med.category}
                      </div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <h4 className="font-bold text-slate-900 text-lg mb-1 line-clamp-1">{med.name}</h4>
                      <p className="text-slate-500 text-xs line-clamp-2 italic mb-4 h-8">
                        {med.description || 'No description available'}
                      </p>
                      <button 
                        onClick={() => setDetailsProduct(med)}
                        className="mt-auto w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        <span>🔍</span> View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Medicine Details Modal */}
            {detailsProduct && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] transition-all p-4">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-300">
                  <div className="relative h-64 bg-slate-100">
                    {detailsProduct.imageUrl ? (
                      <img src={detailsProduct.imageUrl} alt={detailsProduct.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-6xl opacity-20">📦</div>
                    )}
                    <button 
                      onClick={() => setDetailsProduct(null)}
                      className="absolute top-4 right-4 w-10 h-10 bg-white/80 backdrop-blur rounded-full flex items-center justify-center text-slate-900 hover:bg-white transition-all shadow-lg"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="p-8">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 inline-block">
                          {detailsProduct.category}
                        </span>
                        <h3 className="text-2xl font-black text-slate-900">{detailsProduct.name}</h3>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-slate-900">₹{detailsProduct.price}</div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase">Current MRP</div>
                      </div>
                    </div>

                    <p className="text-slate-600 text-sm leading-relaxed mb-8 border-l-4 border-slate-200 pl-4 py-2 bg-slate-50 rounded-r-xl">
                      {detailsProduct.description || "No detailed description available for this product."}
                    </p>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Availability</div>
                        <div className={`text-sm font-bold ${detailsProduct.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {detailsProduct.stock > 0 ? `In Stock (${detailsProduct.stock})` : 'Out of Stock'}
                        </div>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Marketplace ID</div>
                        <div className="text-sm font-bold text-slate-900">#{detailsProduct.id}</div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button 
                        onClick={() => {
                          copyMedicineSuggestion(detailsProduct);
                          setDetailsProduct(null);
                        }}
                        className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-slate-500/20"
                      >
                        <span>📋</span> Copy Suggestion
                      </button>
                      <button 
                        onClick={() => setDetailsProduct(null)}
                        className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          setSettingsData({ ...settingsData, phone: value });
                          if (value.length > 0 && value.length !== 10) {
                            setPhoneError('Phone number must be exactly 10 digits');
                          } else {
                            setPhoneError('');
                          }
                        }}
                        className={`w-full px-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${phoneError ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-green-500'}`}
                        placeholder="Enter 10-digit phone number"
                        maxLength="10"
                      />
                      {phoneError && <p className="text-red-600 text-xs mt-1">{phoneError}</p>}
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
