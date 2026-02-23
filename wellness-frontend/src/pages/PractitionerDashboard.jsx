import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';
import { getAccessToken } from '../services/authService';
import { getCurrentUser, updateUser } from '../services/userService';
import { getRequestsForPractitioner, acceptRequest, rejectRequest, completeRequest, cancelRequest } from '../services/requestService';
import { getSessionsForPractitioner, getAvailability, setAvailability } from '../services/sessionService';
import SessionCard from '../components/SessionCard';
import AvailabilityDayCard from '../components/AvailabilityDayCard';

export default function PractitionerDashboard() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [appointmentFilter, setAppointmentFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [practitionerProfile, setPractitionerProfile] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [settingsData, setSettingsData] = useState({
    name: '', specialization: '', experience: '', qualifications: '',
    email: '', phone: ''
  });
  const [savingSettings, setSavingSettings] = useState(false);
  // Sessions & availability state
  const [practSessions, setPractSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [availability, setAvailabilityState] = useState([]);
  const [savingAvail, setSavingAvail] = useState(false);
  const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

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

          // Fetch requests for this practitioner
          const practId = practProfile?.id || practProfile?.practitionerId;
          if (practId) {
            try {
              const reqData = await getRequestsForPractitioner(practId);
              setRequests(Array.isArray(reqData) ? reqData : (reqData.data || []));
            } catch (err) {
              console.error('Error fetching requests:', err);
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

  // Derived stats from requests
  const uniquePatients = [...new Map(requests.map(r => [r.userId, r])).values()];
  const pendingRequests = requests.filter(r => r.status === 'PENDING');
  const completedRequests = requests.filter(r => r.status === 'COMPLETED');
  const acceptedRequests = requests.filter(r => r.status === 'ACCEPTED');

  // Handle request status changes
  const handleAcceptRequest = async (requestId) => {
    try {
      await acceptRequest(requestId);
      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'ACCEPTED' } : r));
      toast.success('Request accepted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept request');
    }
  };

  const handleCompleteRequest = async (requestId) => {
    try {
      await completeRequest(requestId);
      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'COMPLETED' } : r));
      toast.success('Request marked as completed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete request');
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await rejectRequest(requestId);
      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'REJECTED' } : r));
      toast.success('Request rejected');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject request');
    }
  };

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
          qualifications: settingsData.qualifications
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

  // Fetch sessions when sessions section is opened
  useEffect(() => {
    if (activeSection === 'sessions' && practitionerProfile?.id) {
      setLoadingSessions(true);
      getSessionsForPractitioner(practitionerProfile.id)
        .then(data => setPractSessions(data))
        .catch(err => console.error('Failed to load sessions:', err))
        .finally(() => setLoadingSessions(false));
    }
  }, [activeSection, practitionerProfile?.id]);

  // Fetch availability when availability section is opened
  useEffect(() => {
    if (activeSection === 'availability' && practitionerProfile?.id) {
      getAvailability(practitionerProfile.id)
        .then(data => setAvailabilityState(data))
        .catch(err => console.error('Failed to load availability:', err));
    }
  }, [activeSection, practitionerProfile?.id]);


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
            onClick={() => setActiveSection('appointments')}
            className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-all duration-200 ${activeSection === 'appointments'
              ? 'text-white bg-green-500/15 border-l-4 border-green-500'
              : 'text-slate-300 hover:bg-white/5'
              }`}
          >
            <span>📅</span>
            <span>Appointments</span>
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
            onClick={() => setActiveSection('schedule')}
            className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-all duration-200 ${activeSection === 'schedule'
              ? 'text-white bg-green-500/15 border-l-4 border-green-500'
              : 'text-slate-300 hover:bg-white/5'
              }`}
          >
            <span>🗓️</span>
            <span>Schedule</span>
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
        </nav>
      </div>

      {/* Main Content */}
      <div className="ml-64 flex-1 p-8">
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
                  onClick={() => setActiveSection('schedule')}
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
                  <span>From {requests.length} total requests</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-3xl font-bold text-slate-900">{pendingRequests.length}</div>
                    <div className="text-sm text-slate-600 font-medium">Pending Requests</div>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center text-2xl">
                    📋
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-blue-600">
                  <span>{acceptedRequests.length} accepted</span>
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
                    <div className="text-3xl font-bold text-slate-900">{completedRequests.length}</div>
                    <div className="text-sm text-slate-600 font-medium">Completed</div>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center text-2xl">
                    ✅
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <span>Total completed requests</span>
                </div>
              </div>
            </div>

            {/* Quick Overview Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Requests */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Requests</h3>
                <div className="space-y-3">
                  {requests.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <div className="text-4xl mb-2">📋</div>
                      <p className="text-sm">No requests yet</p>
                    </div>
                  ) : requests.slice(0, 4).map((req) => (
                    <div key={req.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-white hover:shadow-sm transition-all">
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                            {(req.userName || 'U').split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-slate-900">{req.userName || 'Patient'}</h4>
                            <p className="text-xs text-slate-600">{req.description || 'No description'}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${req.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                          req.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-800' :
                            req.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                          }`}>
                          {req.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setActiveSection('appointments')}
                  className="w-full mt-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition-all"
                >
                  View All Requests
                </button>
              </div>

              {/* Recent Activity */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-green-900 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {requests.length === 0 ? (
                    <div className="text-center py-8 text-green-700">
                      <div className="text-4xl mb-2">📭</div>
                      <p className="text-sm">No activity yet</p>
                    </div>
                  ) : requests.slice(0, 4).map((req) => (
                    <div key={req.id} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-green-200">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center text-xl">
                        {req.status === 'COMPLETED' ? '✅' : req.status === 'ACCEPTED' ? '📅' : req.status === 'PENDING' ? '🔔' : '❌'}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900">
                          {req.status === 'PENDING' ? 'New request' : req.status === 'ACCEPTED' ? 'Request accepted' : req.status === 'COMPLETED' ? 'Session completed' : 'Request ' + req.status.toLowerCase()}
                        </p>
                        <p className="text-xs text-slate-600">{req.userName || 'Patient'} • {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : 'Recently'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Appointments Section */}
        {activeSection === 'appointments' && (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900">Appointments</h2>
              <p className="text-slate-600 text-sm mt-2">Manage your upcoming and past appointments</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-900">All Appointments</h3>
                <div className="flex gap-2">
                  {['All', 'Upcoming', 'Completed', 'Cancelled'].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setAppointmentFilter(filter.toLowerCase())}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${appointmentFilter === filter.toLowerCase()
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-green-500 hover:text-white'
                        }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-6 space-y-4">
                {requests.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-4">📋</div>
                    <h4 className="text-lg font-semibold text-slate-900 mb-2">No requests yet</h4>
                    <p className="text-slate-600 text-sm">Patient requests will appear here</p>
                  </div>
                ) : requests
                  .filter(r => appointmentFilter === 'all' || r.status === appointmentFilter.toUpperCase())
                  .map((req) => (
                    <div key={req.id} className="p-5 bg-slate-50 rounded-lg border border-slate-200 hover:bg-white hover:shadow-md transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {(req.userName || 'U').split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <h4 className="text-base font-semibold text-slate-900">{req.userName || 'Patient'}</h4>
                            <p className="text-sm text-slate-600">{req.description || 'No description'}</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${req.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                          req.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-800' :
                            req.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                          }`}>
                          {req.status}
                        </span>
                      </div>
                      <div className="flex gap-6 text-sm text-slate-600 mb-4">
                        <span className="flex items-center gap-1">📅 {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : 'N/A'}</span>
                        <span className="flex items-center gap-1">🔖 {req.priority || 'MEDIUM'}</span>
                        <span className="flex items-center gap-1">📧 {req.userEmail || ''}</span>
                      </div>
                      {req.status === 'PENDING' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptRequest(req.id)}
                            className="flex-1 py-2.5 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-all"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleRejectRequest(req.id)}
                            className="px-4 py-2.5 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200 transition-all"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {req.status === 'ACCEPTED' && (
                        <button
                          onClick={() => handleCompleteRequest(req.id)}
                          className="w-full py-2.5 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-all"
                        >
                          Mark as Completed
                        </button>
                      )}
                      {(req.status === 'COMPLETED' || req.status === 'REJECTED' || req.status === 'CANCELLED') && (
                        <div className="text-sm text-slate-500 italic">This request is {req.status.toLowerCase()}</div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
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
                  const patientRequests = requests.filter(r => r.userId === patient.userId);
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

        {/* Schedule Section */}
        {activeSection === 'schedule' && (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900">Schedule Management</h2>
              <p className="text-slate-600 text-sm mt-2">Set your availability and manage your calendar</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Working Hours</h3>
                <div className="space-y-3">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium text-slate-900">{day}</span>
                      <div className="flex items-center gap-3">
                        <input
                          type="time"
                          className="px-3 py-1 border border-slate-300 rounded text-sm"
                          defaultValue="09:00"
                        />
                        <span className="text-slate-600">to</span>
                        <input
                          type="time"
                          className="px-3 py-1 border border-slate-300 rounded text-sm"
                          defaultValue="17:00"
                        />
                        <input type="checkbox" className="w-5 h-5" defaultChecked={idx < 5} />
                      </div>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-4 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-all">
                  Save Schedule
                </button>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-green-900 mb-4">Availability Settings</h3>
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <label className="block text-sm font-medium text-slate-900 mb-2">Session Duration</label>
                    <select className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                      <option>30 minutes</option>
                      <option>45 minutes</option>
                      <option>60 minutes</option>
                      <option>90 minutes</option>
                    </select>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <label className="block text-sm font-medium text-slate-900 mb-2">Buffer Time</label>
                    <select className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                      <option>No buffer</option>
                      <option>5 minutes</option>
                      <option>10 minutes</option>
                      <option>15 minutes</option>
                    </select>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <label className="block text-sm font-medium text-slate-900 mb-2">Advance Booking</label>
                    <select className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                      <option>1 day</option>
                      <option>3 days</option>
                      <option>1 week</option>
                      <option>2 weeks</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Earnings Section */}
        {activeSection === 'earnings' && (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900">Earnings</h2>
              <p className="text-slate-600 text-sm mt-2">Track your income and financial performance</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-600 mb-2">This Month</h3>
                <p className="text-3xl font-bold text-slate-900">$2,450</p>
                <p className="text-xs text-green-600 mt-2">↑ 12% from last month</p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-600 mb-2">Total Earned</h3>
                <p className="text-3xl font-bold text-slate-900">$18,950</p>
                <p className="text-xs text-slate-600 mt-2">Lifetime earnings</p>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-600 mb-2">Pending Payout</h3>
                <p className="text-3xl font-bold text-slate-900">$680</p>
                <p className="text-xs text-blue-600 mt-2">Available Feb 20</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Transactions</h3>
              <div className="space-y-3">
                {[
                  { patient: 'John Smith', date: 'Feb 14, 2026', amount: 75, status: 'completed' },
                  { patient: 'Sarah Johnson', date: 'Feb 13, 2026', amount: 75, status: 'completed' },
                  { patient: 'Michael Brown', date: 'Feb 12, 2026', amount: 75, status: 'pending' },
                  { patient: 'Emily Davis', date: 'Feb 10, 2026', amount: 75, status: 'completed' },
                ].map((transaction, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">{transaction.patient}</h4>
                      <p className="text-xs text-slate-600">{transaction.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-slate-900">${transaction.amount}</p>
                      <span className={`text-xs font-semibold ${transaction.status === 'completed' ? 'text-green-600' : 'text-blue-600'
                        }`}>
                        {transaction.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
              <h2 className="text-3xl font-bold text-slate-900">Manage Availability</h2>
              <p className="text-slate-600 text-sm mt-2">Set your weekly schedule so patients can book sessions</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {DAYS.map((day) => (
                <AvailabilityDayCard
                  key={day}
                  day={day}
                  existing={availability.find(a => a.dayOfWeek === day) || {}}
                  practitionerId={practitionerProfile?.id}
                  onSaved={async () => {
                    if (practitionerProfile?.id) {
                      const updated = await getAvailability(practitionerProfile.id);
                      setAvailabilityState(updated);
                    }
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
