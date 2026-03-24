import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getCurrentUser, updateUser, getVerifiedPractitioners, createAppointmentRequest } from '../services/userService';
import { getAccessToken } from '../services/authService';
import { getSessionsForUser, downloadPrescribedDocument } from '../services/sessionService';
import SessionCalendar from '../components/SessionCalendar';
import BookingForm from '../components/BookingForm';
import SessionCard from '../components/SessionCard';
import NotificationDropdown from '../components/NotificationDropdown';
import WalletWidget from '../components/WalletWidget';
import WalletPage from './WalletPage';
import ReviewForm from '../components/ReviewForm';
import { getWalletBalance, getWalletTransactions, withdrawFunds, depositFunds } from '../services/walletService';
import { getOrderHistory } from '../services/orderService';

// Helper for parsing structured addresses
const parseStructuredAddress = (addr) => {
  const match = (addr || "").match(/House No: (.*?), Area: (.*?), District: (.*?), State: (.*)/);
  if (match) return { houseNo: match[1], area: match[2], district: match[3], state: match[4] };
  return { houseNo: '', area: addr || '', district: '', state: '' };
};

export default function UserDashboard() {
  const navigate = useNavigate();
  const todayStr = new Date().toISOString().split('T')[0];
  const [activeSection, setActiveSection] = useState('dashboard');
  const [orderFilter, setOrderFilter] = useState('all');
  const [userData, setUserData] = useState({
    id: null,
    name: '',
    email: '',
    role: 'user',
    phone: '',
    dateOfBirth: '',
    address: '',
    bio: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(userData);
  const [userDataLoading, setUserDataLoading] = useState(true);
  const [phoneError, setPhoneError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [practitioners, setPractitioners] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [bookingPractitionerId, setBookingPractitionerId] = useState(null);
  // Sessions state
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionFilter, setSessionFilter] = useState('all');
  const [reviewSession, setReviewSession] = useState(null);
  // Orders state
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  
  const [calendarPractitioner, setCalendarPractitioner] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const _wsRef = useRef(null);
  // Merged state for Find Doctors & Browse Sessions
  const [selectedPractitioner, setSelectedPractitioner] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [specializationFilter, setSpecializationFilter] = useState('All');
  const SPECIALIZATIONS = ['All', 'Ayurveda', 'Physiotherapy', 'Yoga Therapy', 'Naturopathy', 'Meditation', 'Nutrition'];

  // Calendar View State
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  // Wallet State
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = getAccessToken();
        if (!token) {
          navigate('/login');
          return;
        }

        const user = await getCurrentUser();

        const data = {
          id: user.id,
          name: user.name || '',
          email: user.email || '',
          role: user.role || 'PATIENT',
          phone: user.phone || '',
          dateOfBirth: user.dateOfBirth || '',
          address: user.address || '',
          bio: user.bio || '',
          reputationScore: user.reputationScore || 0
        };

        setUserData(data);
        setEditData(data);

      } catch (err) {
        console.error('Error fetching user data:', err);
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate('/login');
        }
      } finally {
        setUserDataLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  const fetchUserDataAndRefresh = async () => {
    try {
      if (!userData.id) {
        setUserDataLoading(true);
        const data = await getCurrentUser();
        setUserData({ ...data });
        setEditData({ ...data });
      }
    } catch (err) {
      console.error('Failed to fetch user data:', err);
    } finally {
      setUserDataLoading(false);
    }
  };

  const handleDownloadDocument = async (sessionId, practitionerName) => {
    try {
      toast.loading("Downloading...", { id: "download" });
      const blob = await downloadPrescribedDocument(sessionId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Prescription_${practitionerName ? practitionerName.replace(/\s+/g, '_') : 'Doc'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Download complete", { id: "download" });
    } catch (err) {
      toast.error("Failed to download document", { id: "download" });
    }
  };

  // userDataLoading block moved to the end of component before main return

  const fetchSessions = useCallback(async () => {
    if (!userData.id) return;

    setLoadingSessions(true);
    try {
      const data = await getSessionsForUser(userData.id);
      setSessions(data);
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  }, [userData.id]);
  
  const fetchPractitioners = useCallback(async () => {
    setLoadingDoctors(true);
    try {
      const data = await getVerifiedPractitioners();
      setPractitioners(data);
    } catch (err) {
      console.error('Error fetching practitioners:', err);
      // Don't show toast error on every background refresh
    } finally {
      setLoadingDoctors(false);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    if (!userData.id) return;

    setLoadingOrders(true);
    try {
      const data = await getOrderHistory();
      setOrders(data);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  }, [userData.id]);

  useEffect(() => {
    let intervalId;

    const loadData = () => {
      if (['dashboard', 'sessions', 'my-bookings', 'calendar'].includes(activeSection) && userData.id) {
        fetchSessions();
        fetchOrders();
      }
    };

    loadData();

    // Set up an interval to poll for updates every 10 seconds while on the dashboard
    if (['dashboard', 'sessions', 'my-bookings', 'calendar'].includes(activeSection) && userData.id) {
      intervalId = setInterval(loadData, 10000);
    }

    // Refresh data when the window gains focus (e.g. user switches tabs or comes back from another page)
    window.addEventListener('focus', loadData);

    return () => {
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener('focus', loadData);
    };
  }, [activeSection, userData.id, fetchSessions, fetchOrders]);

  useEffect(() => {
    if (activeSection === 'find-doctors' && practitioners.length === 0) {
      fetchPractitioners();
    }
  }, [activeSection, practitioners.length, fetchPractitioners]);

  useEffect(() => {
    if (activeSection === 'wallet') {
      const fetchWalletDetails = async () => {
        setLoadingWallet(true);
        try {
          const balanceData = await getWalletBalance();
          setWalletBalance(balanceData.balance);

          const transactionsData = await getWalletTransactions();
          setWalletTransactions(transactionsData.content || transactionsData);
        } catch (err) {
          console.error('Failed to fetch wallet info', err);
          toast.error('Failed to load wallet data');
        } finally {
          setLoadingWallet(false);
        }
      }
      fetchWalletDetails();
    }
  }, [activeSection]);

  useEffect(() => {
    const handleWs = (e) => {
      const msg = e.detail;
      if (msg && (msg.type === 'PAYMENT_SUCCESS' || msg.type === 'REFUND_PROCESSED' || msg.type === 'SESSION_CANCELLED' || msg.type === 'SESSION_COMPLETED')) {
        if (['dashboard', 'sessions', 'my-bookings', 'calendar', 'find-doctors'].includes(activeSection)) {
          fetchSessions();
          fetchPractitioners();
        }
        if (activeSection === 'wallet') {
          getWalletBalance().then(r => setWalletBalance(r.balance)).catch(console.error);
          getWalletTransactions().then(r => setWalletTransactions(r.content || r)).catch(console.error);
        }
      }
    };
    window.addEventListener('wsNotification', handleWs);
    return () => window.removeEventListener('wsNotification', handleWs);
  }, [activeSection, fetchSessions]);

  const handleBookAppointment = async (practitionerId) => {
    setBookingPractitionerId(practitionerId);
    try {
      await createAppointmentRequest(practitionerId, {
        description: 'Appointment request from patient dashboard',
        priority: 'MEDIUM'
      });
      toast.success('Appointment request sent successfully!');
    } catch (err) {
      console.error('Error booking appointment:', err);
      toast.error(err.response?.data?.message || 'Failed to book appointment');
    } finally {
      setBookingPractitionerId(null);
    }
  };

  const handleSaveProfile = async () => {
    if (editData.phone && editData.phone.length !== 10) {
      setPhoneError('Phone number must be exactly 10 digits');
      setSaveError('Please fix the errors before saving');
      return;
    }
    try {
      const updatePayload = {
        name: editData.name,
        bio: editData.bio,
        phone: editData.phone || null,
        dateOfBirth: editData.dateOfBirth || null,
        address: editData.address || null
      };
      const updatedUser = await updateUser(userData.id, updatePayload);
      const newData = {
        id: updatedUser.id,
        name: updatedUser.name || '',
        email: updatedUser.email || '',
        role: updatedUser.role || 'PATIENT',
        phone: updatedUser.phone || '',
        dateOfBirth: updatedUser.dateOfBirth || '',
        address: updatedUser.address || '',
        bio: updatedUser.bio || ''
      };
      setUserData(newData);
      setEditData(newData);
      setIsEditing(false);
      setPhoneError('');
      setSaveError('');
      setSaveSuccess(true);
      toast.success('Profile updated successfully!');
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
      setSaveError(err.response?.data?.message || 'Failed to save profile');
      toast.error('Failed to save profile');
    }
  };

  const filteredPractitioners = practitioners.filter(p => {
    const matchSearch = !searchQuery ||
      (p.userName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.specialization || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchSpec = specializationFilter === 'All' ||
      (p.specialization || '').toLowerCase().includes(specializationFilter.toLowerCase());
    return matchSearch && matchSpec;
  });

  if (userDataLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 w-64 h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white overflow-y-auto">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center text-lg">
              🏥
            </div>
            <h1 className="text-xl font-bold">WellnessHub</h1>
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

          {/* ===== MERGED: Find Doctors & Browse Sessions ===== */}
          <button
            onClick={() => setActiveSection('find-doctors')}
            className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-all duration-200 ${activeSection === 'find-doctors'
              ? 'text-white bg-green-500/15 border-l-4 border-green-500'
              : 'text-slate-300 hover:bg-white/5'
              }`}
          >
            <span>🔍</span>
            <span>Find Doctors</span>
          </button>

          <button
            onClick={() => setActiveSection('sessions')}
            className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-all duration-200 ${activeSection === 'sessions'
              ? 'text-white bg-green-500/15 border-l-4 border-green-500'
              : 'text-slate-300 hover:bg-white/5'
              }`}
          >
            <span>📅</span>
            <span>My Sessions</span>
          </button>

          {/* ===== NEW: My Bookings ===== */}
          <button
            onClick={() => setActiveSection('my-bookings')}
            className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-all duration-200 ${activeSection === 'my-bookings'
              ? 'text-white bg-green-500/15 border-l-4 border-green-500'
              : 'text-slate-300 hover:bg-white/5'
              }`}
          >
            <span>📋</span>
            <span>My Bookings</span>
          </button>

          {/* ===== NEW: Wallet ===== */}
          <button
            onClick={() => setActiveSection('wallet')}
            className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-all duration-200 ${activeSection === 'wallet'
              ? 'text-white bg-green-500/15 border-l-4 border-green-500'
              : 'text-slate-300 hover:bg-white/5'
              }`}
          >
            <span>💳</span>
            <span>Wallet & Refunds</span>
          </button>

          {/* ===== NEW: Calendar View ===== */}
          <button
            onClick={() => setActiveSection('calendar')}
            className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-all duration-200 ${activeSection === 'calendar'
              ? 'text-white bg-green-500/15 border-l-4 border-green-500'
              : 'text-slate-300 hover:bg-white/5'
              }`}
          >
            <span>📆</span>
            <span>Calendar</span>
          </button>

          <button
            onClick={() => navigate('/products')}
            className="w-full flex items-center gap-3 px-6 py-3 text-left transition-all duration-200 text-slate-300 hover:bg-white/5"
          >
            <span>🛍️</span>
            <span>Order Medicine</span>
          </button>

          <button
            onClick={() => navigate('/user/orders')}
            className="w-full flex items-center gap-3 px-6 py-3 text-left transition-all duration-200 text-slate-300 hover:bg-white/5"
          >
            <span>📦</span>
            <span>My Orders</span>
          </button>

          <button
            onClick={() => setActiveSection('wellness')}
            className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-all duration-200 ${activeSection === 'wellness'
              ? 'text-white bg-green-500/15 border-l-4 border-green-500'
              : 'text-slate-300 hover:bg-white/5'
              }`}
          >
            <span>💚</span>
            <span>Wellness</span>
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
            onClick={() => setActiveSection('profile')}
            className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-all duration-200 ${activeSection === 'profile'
              ? 'text-white bg-green-500/15 border-l-4 border-green-500'
              : 'text-slate-300 hover:bg-white/5'
              }`}
          >
            <span>👤</span>
            <span>Profile</span>
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

        {/* Dashboard Section - UNCHANGED */}
        {activeSection === 'dashboard' && (
          <>
            <div className="mb-8 flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">Patient Dashboard</h2>
                <p className="text-slate-600 text-sm mt-2">Manage your appointments, sessions, and wellness journey</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setActiveSection('find-doctors')}
                  className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg text-sm font-semibold hover:shadow-lg transition-all"
                >
                  <span className="mr-2">📅</span>
                  Book Appointment
                </button>
                <button
                  onClick={() => navigate('/products')}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg text-sm font-semibold hover:shadow-lg transition-all"
                >
                  <span className="mr-2">🛍️</span>
                  Order Medicine
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-3xl font-bold text-slate-900">{loadingSessions ? '...' : sessions.length}</div>
                    <div className="text-sm text-slate-600 font-medium">Total Sessions</div>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center text-2xl">
                    📅
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <span>↑ 25%</span>
                  <span>vs last month</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer">
                <div onClick={() => navigate('/user/orders')} className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-3xl font-bold text-slate-900">{loadingOrders ? '...' : orders.length}</div>
                    <div className="text-sm text-slate-600 font-medium">Medicine Orders</div>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center text-2xl">
                    📦
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <span>↑ 2</span>
                  <span>this month</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-3xl font-bold text-slate-900">70%</div>
                    <div className="text-sm text-slate-600 font-medium">Wellness Score</div>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center text-2xl">
                    💚
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <span>↑ 5%</span>
                  <span>improving</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-3xl font-bold text-slate-900">
                      ₹{
                        loadingSessions || loadingOrders ? '...' : 
                        (
                          sessions.filter(s => s.paymentStatus?.toString().toUpperCase().trim() === 'PAID').reduce((sum, s) => sum + Number(s.feeAmount || 0), 0) +
                          orders.filter(o => o.paymentStatus?.toString().toUpperCase().trim() === 'PAID').reduce((sum, o) => sum + Number(o.totalAmount || 0), 0)
                        ).toFixed(2)
                      }
                    </div>
                    <div className="text-sm text-slate-600 font-medium">Total Spent</div>
                  </div>
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center text-2xl">
                    💰
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-600">
                  <span>—</span>
                  <span>lifetime</span>
                </div>
              </div>

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {(() => {
                const todayStr = new Date().toISOString().split('T')[0];
                const upcoming = sessions
                  .filter(s => s.sessionDate >= todayStr && s.status?.toUpperCase() === 'BOOKED')
                  .sort((a, b) => new Date(`${a.sessionDate}T${a.startTime}`) - new Date(`${b.sessionDate}T${b.startTime}`));

                const past = sessions
                  .filter(s => (s.sessionDate < todayStr || s.status?.toUpperCase() === 'COMPLETED') && s.status?.toUpperCase() === 'COMPLETED')
                  .sort((a, b) => new Date(`${b.sessionDate}T${b.startTime}`) - new Date(`${a.sessionDate}T${a.startTime}`));

                const nextSession = upcoming.length > 0 ? upcoming[0] : null;
                const lastCompleted = past.length > 0 ? past[0] : null;

                return (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-purple-100 to-purple-200 p-6 rounded-xl shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg font-semibold text-purple-900">Next Session</h4>
                        {nextSession && (
                          <span className="text-sm text-purple-700 font-medium whitespace-nowrap">
                            {nextSession.sessionDate === todayStr ? 'Today' : nextSession.sessionDate}
                          </span>
                        )}
                      </div>

                      {nextSession ? (
                        <>
                          <div className="flex items-center gap-4 mb-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-purple-800 rounded-full flex items-center justify-center text-white font-semibold text-lg flex-shrink-0 shadow-md">
                              {(nextSession.practitionerName || 'Dr').split(' ').map(n => n[0]).join('')}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-base font-bold text-purple-900 truncate">
                                {nextSession.practitionerName || 'Practitioner Name'}
                              </h4>
                              <p className="text-sm text-purple-700 truncate opacity-90">
                                {nextSession.notes || 'Wellness Consultation'}
                              </p>
                            </div>
                          </div>
                          <div className="pt-4 border-t border-purple-300/50 space-y-3">
                            <div className="flex items-center gap-3 text-purple-800 text-sm font-medium">
                              <span className="bg-purple-200/50 p-1.5 rounded-lg">📅</span>
                              <span>{new Date(`${nextSession.sessionDate}T${nextSession.startTime}`).toLocaleString('en-US', {
                                month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
                              })}</span>
                            </div>
                            <div className="flex items-center gap-3 text-purple-800 text-sm font-medium">
                              <span className="bg-purple-200/50 p-1.5 rounded-lg">📍</span>
                              <span>Video Consultation</span>
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
                                className="w-full mt-5 py-3.5 bg-purple-700 text-white rounded-xl font-bold hover:bg-purple-800 transition-all block text-center shadow-md active:scale-95"
                              >
                                Join Session
                              </a>
                            ) : (
                              <div className="w-full mt-5 py-3.5 bg-purple-300 text-purple-100 rounded-xl font-bold text-center cursor-not-allowed border border-purple-200">
                                Join available 15 min before
                              </div>
                            );
                          })()}
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-purple-800 border-2 border-dashed border-purple-300 rounded-xl">
                          <div className="text-5xl mb-3 opacity-50">📭</div>
                          <p className="text-sm font-bold opacity-75 uppercase tracking-wide">No upcoming sessions</p>
                          <button 
                            onClick={() => setActiveSection('find-doctors')}
                            className="mt-4 text-purple-700 font-bold hover:underline"
                          >
                            Book now →
                          </button>
                        </div>
                      )}
                    </div>

                    {lastCompleted && !lastCompleted.reviewed && (
                      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-6 rounded-xl shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center text-white shadow-sm flex-shrink-0">
                            ⭐
                          </div>
                          <div className="flex-1">
                            <h4 className="text-base font-bold text-amber-900">Share your feedback!</h4>
                            <p className="text-sm text-amber-800 opacity-90">
                              How was your session with {lastCompleted.practitionerName}?
                            </p>
                            <button
                              onClick={() => setReviewSession(lastCompleted)}
                              className="mt-3 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-lg transition-all shadow-md active:scale-95"
                            >
                              Leave a Review
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-6">Wellness Score Overview</h3>
                <div className="text-center mb-6">
                  <div className="w-32 h-32 mx-auto mb-4 rounded-full flex items-center justify-center"
                    style={{ background: 'conic-gradient(#10b981 0deg, #10b981 252deg, #e2e8f0 252deg)' }}>
                    <div className="w-28 h-28 bg-white rounded-full flex flex-col items-center justify-center">
                      <div className="text-3xl font-bold text-green-600">70%</div>
                      <div className="text-sm text-slate-600">Great!</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    { name: 'Sessions', value: 85, color: 'bg-green-500' },
                    { name: 'Consistency', value: 65, color: 'bg-amber-500' },
                    { name: 'Progress', value: 72, color: 'bg-indigo-500' },
                  ].map((metric, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-slate-600">{metric.name}</span>
                        <span className={`text-sm font-semibold ${metric.color.replace('bg-', 'text-')}`}>{metric.value}%</span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full ${metric.color} rounded-full`} style={{ width: `${metric.value}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ===== MERGED: Find Doctors & Browse Sessions ===== */}
        {activeSection === 'find-doctors' && (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900">Find Doctors & Book Sessions</h2>
              <p className="text-slate-600 text-sm mt-2">Search, filter by specialization, and book appointments with verified practitioners</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
                  <input
                    type="text"
                    placeholder="Search by name or specialization..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 bg-white shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                  />
                </div>
              </div>

              {/* Specialization Filter */}
              <div className="flex gap-2 overflow-x-auto pb-2">
                {SPECIALIZATIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => setSpecializationFilter(s)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${specializationFilter === s
                      ? 'bg-green-600 text-white shadow-md'
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-green-300 hover:text-green-700'
                      }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Practitioners List */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Select Practitioner</h3>
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {loadingDoctors ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-2"></div>
                      <p className="text-sm text-slate-600">Loading...</p>
                    </div>
                  ) : filteredPractitioners.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-2">👨‍⚕️</div>
                      <p className="text-sm text-slate-600">No practitioners found</p>
                    </div>
                  ) : filteredPractitioners.map((pract) => (
                    <div
                      key={pract.id}
                      onClick={() => setSelectedPractitioner(pract)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedPractitioner?.id === pract.id
                        ? 'border-green-500 bg-green-50'
                        : 'border-slate-200 hover:border-green-300 hover:bg-slate-50'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                          {(pract.userName || 'Dr').split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-slate-900 truncate">{pract.userName}</h4>
                          <p className="text-xs text-slate-600 truncate">{pract.specialization}</p>
                          <p className="text-xs text-green-600 font-medium mt-1">⭐ {pract.rating || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Calendar View */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                {selectedPractitioner ? (
                  <>
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {selectedPractitioner.userName}'s Calendar
                      </h3>
                      <p className="text-sm text-slate-600 mt-1">
                        Select an available time slot to book a session
                      </p>
                    </div>
                    <SessionCalendar
                      practitionerId={selectedPractitioner.id}
                      onSlotSelect={(slot) => {
                        setSelectedSlot(slot);
                        setCalendarPractitioner(selectedPractitioner);
                        setShowBookingForm(true);
                      }}
                    />
                  </>
                ) : (
                  <div className="flex items-center justify-center h-[500px]">
                    <div className="text-center">
                      <div className="text-6xl mb-4">📅</div>
                      <h4 className="text-lg font-semibold text-slate-900 mb-2">Select a Practitioner</h4>
                      <p className="text-slate-600 text-sm">Choose a practitioner from the list to view their available slots</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Booking Form Modal */}
            {showBookingForm && selectedSlot && calendarPractitioner && (
              <BookingForm
                practitionerId={calendarPractitioner.id}
                practitionerName={calendarPractitioner.userName}
                consultationFee={calendarPractitioner.consultationFee}
                selectedSlot={selectedSlot}
                onSuccess={() => {
                  fetchSessions();
                  setShowBookingForm(false);
                  setSelectedSlot(null);
                }}
                onClose={() => {
                  setShowBookingForm(false);
                  setSelectedSlot(null);
                }}
              />
            )}
          </>
        )}

        {/* My Sessions Section - UNCHANGED */}
        {activeSection === 'sessions' && (
          <>
            <div className="mb-8">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">My Sessions</h2>
                <p className="text-slate-600 text-sm mt-2">View and manage your therapy sessions</p>
              </div>
            </div>
            <div className="flex gap-2 mb-6">
              {['all', 'upcoming', 'past', 'cancelled'].map((f) => (
                <button
                  key={f}
                  onClick={() => setSessionFilter(f)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${sessionFilter === f
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-green-300'
                    }`}
                >
                  {f === 'all' ? '📋 All' : f === 'upcoming' ? '📅 Upcoming' : f === 'past' ? '✅ Past' : '❌ Cancelled'}
                </button>
              ))}
            </div>

            {loadingSessions ? (
              <div className="flex justify-center py-16">
                <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (() => {
              const filtered = sessions.filter(s => {
                const status = s.status?.toUpperCase();
                if (sessionFilter === 'upcoming') return s.sessionDate >= todayStr && status === 'BOOKED';
                if (sessionFilter === 'past') return s.sessionDate < todayStr || status === 'COMPLETED';
                if (sessionFilter === 'cancelled') return status === 'CANCELLED' || status === 'RESCHEDULED';
                return true;
              });
              return filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
                  <p className="text-5xl mb-4">📭</p>
                  <p className="text-gray-500 font-medium">No sessions found</p>
                  <p className="text-gray-400 text-sm mt-1">Book a session with a practitioner to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {filtered.map(session => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      role="USER"
                      onRefresh={fetchSessions}
                      onReview={(s) => setReviewSession(s)}
                    />
                  ))}
                </div>
              );
            })()}
          </>
        )}

        {/* ===== NEW: My Bookings Section ===== */}
        {activeSection === 'my-bookings' && (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900">My Bookings</h2>
              <p className="text-slate-600 text-sm mt-2">Track all your appointment bookings and requests</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-semibold text-slate-600 uppercase mb-2">Total Bookings</h3>
                <p className="text-3xl font-bold text-slate-900">{sessions.length}</p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-semibold text-slate-600 uppercase mb-2">Confirmed</h3>
                <p className="text-3xl font-bold text-green-600">
                  {sessions.filter(s => s.status?.toUpperCase() === 'BOOKED').length}
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-semibold text-slate-600 uppercase mb-2">Completed</h3>
                <p className="text-3xl font-bold text-blue-600">
                  {sessions.filter(s => s.status?.toUpperCase() === 'COMPLETED').length}
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-semibold text-slate-600 uppercase mb-2">Cancelled</h3>
                <p className="text-3xl font-bold text-red-600">
                  {sessions.filter(s => s.status?.toUpperCase() === 'CANCELLED').length}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="p-6 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">Booking History</h3>
              </div>
              <div className="divide-y divide-slate-200">
                {loadingSessions ? (
                  <div className="p-12 text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500 mx-auto mb-4"></div>
                    <p className="text-slate-600">Loading bookings...</p>
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="text-5xl mb-4">📋</div>
                    <h4 className="text-lg font-semibold text-slate-900 mb-2">No bookings yet</h4>
                    <p className="text-slate-600 text-sm mb-4">Start by booking a session with a practitioner</p>
                    <button
                      onClick={() => setActiveSection('browse-sessions')}
                      className="px-6 py-2.5 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-all"
                    >
                      Browse Sessions
                    </button>
                  </div>
                ) : sessions.map((booking) => (
                  <div key={booking.id} className="p-6 hover:bg-slate-50 transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                          {booking.practitionerName ? booking.practitionerName.split(' ').map(n => n[0]).join('') : 'Dr'}
                        </div>
                        <div>
                          <h4 className="text-base font-semibold text-slate-900">{booking.practitionerName || 'Practitioner'}</h4>
                          <p className="text-sm text-slate-600">
                            {booking.sessionDate && new Date(booking.sessionDate).toLocaleDateString('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                            {booking.sessionTime && ` at ${booking.sessionTime}`}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-slate-500">📍 {booking.sessionMode || 'Online'}</span>
                            <span className="text-xs text-slate-500">⏱️ {booking.duration || '60'} min</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${booking.status?.toUpperCase() === 'BOOKED' ? 'bg-green-100 text-green-800' :
                          booking.status?.toUpperCase() === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                            booking.status?.toUpperCase() === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                          }`}>
                          {booking.status}
                        </span>
                        <p className="text-sm font-bold text-slate-900 mt-2">
                          ₹{booking.feeAmount != null ? Number(booking.feeAmount).toFixed(2) : '0.00'}
                        </p>
                        {booking.status?.toUpperCase() === 'COMPLETED' && !booking.reviewed && (
                          <button
                            onClick={() => setReviewSession(booking)}
                            className="mt-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition-all shadow-sm"
                          >
                            ⭐ Leave Review
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ===== NEW: Calendar View Section ===== */}
        {activeSection === 'calendar' && (() => {
          const todayDate = new Date();
          const calMonth = calendarMonth ?? todayDate.getMonth();
          const calYear = calendarYear ?? todayDate.getFullYear();
          const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
          const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
          const prevMonthDays = new Date(calYear, calMonth, 0).getDate();
          const totalCells = firstDayOfWeek + daysInMonth;
          const totalRows = Math.ceil(totalCells / 7);
          const gridCells = totalRows * 7;
          const monthLabel = new Date(calYear, calMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

          const isCurrentMonth = calMonth === todayDate.getMonth() && calYear === todayDate.getFullYear();
          const bookedCount = sessions.filter(s => {
            if (s.status !== 'BOOKED' || !s.sessionDate) return false;
            const d = new Date(s.sessionDate);
            return d.getMonth() === calMonth && d.getFullYear() === calYear;
          }).length;

          const formatSlotTime = (t) => {
            if (!t) return '';
            const [h, m] = t.split(':');
            const hour = parseInt(h);
            return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
          };

          return (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900">Calendar View</h2>
              <p className="text-slate-600 text-sm mt-2">Visual calendar of all your sessions and appointments</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{monthLabel}</h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {bookedCount} session{bookedCount !== 1 ? 's' : ''} this month
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!isCurrentMonth && (
                    <button
                      onClick={() => { setCalendarMonth(todayDate.getMonth()); setCalendarYear(todayDate.getFullYear()); }}
                      className="px-3 py-1.5 text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition"
                    >
                      Today
                    </button>
                  )}
                  <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 p-0.5">
                    <button
                      onClick={() => {
                        const prev = new Date(calYear, calMonth - 1, 1);
                        setCalendarMonth(prev.getMonth());
                        setCalendarYear(prev.getFullYear());
                      }}
                      className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition text-gray-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <div className="w-px h-4 bg-gray-200 mx-1"></div>
                    <button
                      onClick={() => {
                        const next = new Date(calYear, calMonth + 1, 1);
                        setCalendarMonth(next.getMonth());
                        setCalendarYear(next.getFullYear());
                      }}
                      className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition text-gray-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                  <button
                    onClick={() => setActiveSection('find-doctors')}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 transition-all"
                  >
                    + Book Session
                  </button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Day Headers */}
                <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <div key={day} className="text-center font-semibold text-slate-500 text-xs py-3 uppercase tracking-wider">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Cells */}
                <div className="grid grid-cols-7 bg-gray-200 gap-px">
                  {Array.from({ length: gridCells }, (_, i) => {
                    let dayNum, isCurrentMonthDay;
                    if (i < firstDayOfWeek) {
                      // Previous month
                      dayNum = prevMonthDays - firstDayOfWeek + i + 1;
                      isCurrentMonthDay = false;
                    } else if (i >= firstDayOfWeek + daysInMonth) {
                      // Next month
                      dayNum = i - firstDayOfWeek - daysInMonth + 1;
                      isCurrentMonthDay = false;
                    } else {
                      dayNum = i - firstDayOfWeek + 1;
                      isCurrentMonthDay = true;
                    }

                    const cellDate = isCurrentMonthDay
                      ? new Date(calYear, calMonth, dayNum)
                      : (i < firstDayOfWeek ? new Date(calYear, calMonth - 1, dayNum) : new Date(calYear, calMonth + 1, dayNum));
                    const cellDateStr = `${cellDate.getFullYear()}-${String(cellDate.getMonth() + 1).padStart(2, '0')}-${String(cellDate.getDate()).padStart(2, '0')}`;
                    const isToday = cellDate.toDateString() === todayDate.toDateString();
                    const isPast = isCurrentMonthDay && cellDate < new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());
                    const daySessions = sessions.filter(s => s.sessionDate === cellDateStr);

                    return (
                      <div
                        key={i}
                        className={`min-h-[90px] p-2 transition-all flex flex-col
                          ${!isCurrentMonthDay ? 'bg-gray-50/70' : isToday ? 'bg-green-50/60' : isPast ? 'bg-white/80' : 'bg-white'}
                          ${isToday ? 'ring-2 ring-inset ring-green-400 z-10' : ''}
                        `}
                      >
                        {/* Day Number */}
                        <div className="flex justify-end mb-1">
                          <span className={`
                            inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold
                            ${!isCurrentMonthDay ? 'text-gray-400' : ''}
                            ${isCurrentMonthDay && isToday ? 'bg-green-600 text-white' : ''}
                            ${isCurrentMonthDay && !isToday && isPast ? 'text-gray-400' : ''}
                            ${isCurrentMonthDay && !isToday && !isPast ? 'text-slate-700' : ''}
                          `}>
                            {dayNum}
                          </span>
                        </div>

                        {/* Session Indicators */}
                        {isCurrentMonthDay && daySessions.length > 0 && (
                          <div className="flex-1 space-y-1 overflow-hidden">
                            {daySessions.slice(0, 2).map((s, si) => (
                              <div
                                key={si}
                                className={`text-xs px-1.5 py-0.5 rounded truncate font-medium ${
                                  s.status === 'BOOKED' ? 'bg-blue-100 text-blue-800' :
                                  s.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                  s.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                                  'bg-purple-100 text-purple-800'
                                }`}
                                title={`${s.practitionerName || 'Session'} - ${formatSlotTime(s.startTime)} - ${s.status}`}
                              >
                                {formatSlotTime(s.startTime)} {s.practitionerName?.split(' ')[0] || ''}
                              </div>
                            ))}
                            {daySessions.length > 2 && (
                              <div className="text-xs text-slate-500 px-1.5 font-medium">+{daySessions.length - 2} more</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="mt-5 flex flex-wrap items-center gap-5 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-green-600"></div>
                  <span className="text-slate-600">Today</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-blue-100 border border-blue-300"></div>
                  <span className="text-slate-600">Booked</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-green-100 border border-green-300"></div>
                  <span className="text-slate-600">Completed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-purple-100 border border-purple-300"></div>
                  <span className="text-slate-600">On Hold</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-red-100 border border-red-300"></div>
                  <span className="text-slate-600">Cancelled</span>
                </div>
              </div>
            </div>

            {/* Upcoming Sessions List */}
            <div className="mt-6 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Upcoming This Week</h3>
              <div className="space-y-3">
                {sessions
                  .filter(s => {
                    if (!s.sessionDate || s.status !== 'BOOKED') return false;
                    const sessionDate = new Date(s.sessionDate);
                    const weekFromNow = new Date(todayDate.getTime() + 7 * 24 * 60 * 60 * 1000);
                    return sessionDate >= todayDate && sessionDate <= weekFromNow;
                  })
                  .slice(0, 5)
                  .map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-white hover:shadow-sm transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {session.practitionerName ? session.practitionerName.split(' ').map(n => n[0]).join('') : 'Dr'}
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900">{session.practitionerName}</h4>
                          <p className="text-xs text-slate-600">
                            {session.sessionDate && new Date(session.sessionDate + 'T00:00:00').toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric'
                            })}
                            {session.startTime && ` • ${formatSlotTime(session.startTime)}`}
                          </p>
                        </div>
                      </div>
                      <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                        {session.status}
                      </span>
                    </div>
                  ))}
                {sessions.filter(s => s.status === 'BOOKED').length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">📅</div>
                    <p className="text-sm text-slate-600">No upcoming sessions this week</p>
                  </div>
                )}
              </div>
            </div>
          </>
          );
        })()}


        {activeSection === 'wallet' && (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900">Wallet & Refunds</h2>
              <p className="text-slate-600 text-sm mt-2">Manage your funds and track your refunds</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-8 text-white shadow-lg overflow-hidden relative">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                <div className="relative z-10">
                  <p className="text-emerald-100 font-medium mb-1 uppercase tracking-wider text-sm">Available Balance</p>
                  <h3 className="text-5xl font-bold">₹{parseFloat(walletBalance).toFixed(2)}</h3>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Withdraw Funds</h3>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                    <input
                      type="number"
                      min="1"
                      max={walletBalance}
                      step="0.01"
                      placeholder="0.00"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-lg border border-slate-300"
                      required
                    />
                  </div>
                  <button
                    disabled={isWithdrawing || walletBalance <= 0}
                    onClick={async () => {
                      if (!withdrawAmount || isNaN(withdrawAmount) || withdrawAmount <= 0) {
                        toast.error("Enter a valid amount");
                        return;
                      }
                      if (withdrawAmount > walletBalance) {
                        toast.error("Insufficient balance");
                        return;
                      }
                      setIsWithdrawing(true);
                      try {
                        await withdrawFunds(withdrawAmount);
                        toast.success("Withdrawal successful");
                        setWithdrawAmount('');
                        // Refresh Wallet Data
                        getWalletBalance().then(r => setWalletBalance(r.balance)).catch(console.error);
                        getWalletTransactions().then(r => setWalletTransactions(r.content || r)).catch(console.error);
                      } catch (err) {
                        toast.error(err.response?.data?.error || "Withdrawal failed");
                      } finally {
                        setIsWithdrawing(false);
                      }
                    }}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {isWithdrawing ? 'Processing...' : 'Withdraw'}
                  </button>
                </div>

                {/* Add Funds */}
                <h3 className="text-lg font-semibold text-slate-800 mt-6 mb-4 border-t border-slate-100 pt-6">Add Funds</h3>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder="0.00"
                      value={addAmount}
                      onChange={(e) => setAddAmount(e.target.value)}
                      className="w-full pl-8 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-lg border border-slate-300"
                      required
                    />
                  </div>
                  <button
                    disabled={isAdding}
                    onClick={async () => {
                      if (!addAmount || isNaN(addAmount) || addAmount <= 0) {
                        toast.error("Enter a valid amount");
                        return;
                      }
                      setIsAdding(true);
                      try {
                        await depositFunds(addAmount);
                        toast.success("Funds added successfully");
                        setAddAmount('');
                        // Refresh Wallet Data
                        getWalletBalance().then(r => setWalletBalance(r.balance)).catch(console.error);
                        getWalletTransactions().then(r => setWalletTransactions(r.content || r)).catch(console.error);
                      } catch (err) {
                        toast.error(err.response?.data?.error || "Deposit failed");
                      } finally {
                        setIsAdding(false);
                      }
                    }}
                    className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {isAdding ? 'Processing...' : 'Add'}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="p-6 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">Transaction History</h3>
              </div>
              <div className="p-0">
                {loadingWallet ? (
                  <div className="flex justify-center p-12">
                    <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : walletTransactions.length === 0 ? (
                  <div className="p-12 text-center text-slate-500">
                    <span className="text-4xl mb-4 block">💸</span>
                    No transactions yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-[500px] overflow-auto">
                    {walletTransactions.map((tx) => (
                      <div key={tx.id} className="flex justify-between items-center p-4 hover:bg-slate-50 transition">
                        <div>
                          <p className="text-sm font-semibold text-slate-900 mb-1">
                            {tx.type === 'REFUND' ? 'Refund for Cancelled Session' : (tx.type === 'DEPOSIT' ? 'Deposit' : 'Payment')}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(tx.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${tx.type === 'REFUND' || tx.type === 'DEPOSIT' ? 'text-green-600' : 'text-slate-900'}`}>
                            {tx.type === 'REFUND' || tx.type === 'DEPOSIT' ? '+' : '-'}₹{parseFloat(tx.amount).toFixed(2)}
                          </p>
                          {tx.status && (
                            <span className="text-xs text-slate-500">{tx.status}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}



        {/* ===== NEW: Missing Wellness Section fixed ===== */}
        {activeSection === 'wellness' && (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900">Wellness Dashboard</h2>
              <p className="text-slate-600 text-sm mt-2">Track your wellness goals and overall progress</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
                <h3 className="text-xl font-semibold text-slate-900 mb-6">Overall Wellness Score</h3>
                <div className="text-center mb-8">
                  <div className="w-40 h-40 mx-auto mb-4 rounded-full flex items-center justify-center"
                    style={{ background: 'conic-gradient(#10b981 0deg, #10b981 252deg, #e2e8f0 252deg)' }}>
                    <div className="w-36 h-36 bg-white rounded-full flex flex-col items-center justify-center">
                      <div className="text-4xl font-bold text-green-600">70%</div>
                      <div className="text-sm text-slate-600 mt-1">Great Progress!</div>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">Based on your activity & sessions</p>
                </div>

                <div className="space-y-5">
                  {[
                    { name: 'Session Attendance', value: 85, color: 'bg-green-500', desc: 'Excellent consistency' },
                    { name: 'Weekly Consistency', value: 65, color: 'bg-amber-500', desc: 'Room for improvement' },
                    { name: 'Progress Rate', value: 72, color: 'bg-indigo-500', desc: 'Steady improvement' },
                    { name: 'Goal Achievement', value: 78, color: 'bg-purple-500', desc: 'On track' },
                  ].map((metric, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-lg">
                      <div className="flex justify-between mb-2">
                        <div>
                          <span className="text-sm font-semibold text-slate-900">{metric.name}</span>
                          <p className="text-xs text-slate-500 mt-0.5">{metric.desc}</p>
                        </div>
                        <span className={`text-lg font-bold ${metric.color.replace('bg-', 'text-')}`}>{metric.value}%</span>
                      </div>
                      <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full ${metric.color} rounded-full transition-all`} style={{ width: `${metric.value}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-green-900 mb-4">Wellness Goals</h4>
                  <div className="space-y-3">
                    {[
                      { goal: 'Attend 4 sessions this month', progress: 75, current: 3, total: 4 },
                      { goal: 'Practice yoga 3 times a week', progress: 66, current: 2, total: 3 },
                      { goal: 'Improve wellness score to 80%', progress: 87, current: 70, total: 80 },
                    ].map((item, idx) => (
                      <div key={idx} className="bg-white rounded-lg p-4 border border-green-200">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-slate-900">{item.goal}</span>
                          <span className="text-xs font-semibold text-green-600">{item.current}/{item.total}</span>
                        </div>
                        <div className="h-2 bg-green-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${item.progress}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <h4 className="text-lg font-semibold text-slate-900 mb-4">Recent Milestones</h4>
                  <div className="space-y-3">
                    {[
                      { title: '10 Sessions Completed', date: 'Feb 12, 2026', icon: '🎉' },
                      { title: 'Wellness Score 70%', date: 'Feb 8, 2026', icon: '⭐' },
                      { title: '30 Day Streak', date: 'Feb 1, 2026', icon: '🔥' },
                    ].map((milestone, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center text-xl">
                          {milestone.icon}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{milestone.title}</p>
                          <p className="text-xs text-slate-500">{milestone.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeSection === 'messages' && (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900">Messages & Documents</h2>
              <p className="text-slate-600 text-sm mt-2">View prescribed documents from your practitioners</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              {sessions.filter(s => s.status === 'COMPLETED' && s.prescribedDocumentUrl).length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-6xl mb-4">💬</div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">No messages or documents yet</h3>
                  <p className="text-slate-600 text-sm">Prescribed documents from your practitioners will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sessions
                    .filter(s => s.status === 'COMPLETED' && s.prescribedDocumentUrl)
                    .map(session => (
                      <div key={session.id} className="p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                          <div className="flex gap-4 items-center">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-xl">📄</div>
                            <div>
                              <h4 className="font-semibold text-slate-900">Prescription from {session.practitionerName}</h4>
                              <p className="text-sm text-slate-500">
                                Session on {new Date(session.sessionDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDownloadDocument(session.id, session.practitionerName)}
                            className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-100 transition"
                          >
                            Download PDF
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeSection === 'profile' && (
          <>
            <div className="mb-8 flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">My Profile</h2>
                <p className="text-slate-600 text-sm mt-2">View and manage your personal information</p>
              </div>
              <button
                onClick={() => {
                  setIsEditing(!isEditing);
                  if (isEditing) {
                    setEditData(userData);
                  }
                }}
                className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${isEditing
                  ? 'bg-slate-300 text-slate-700 hover:bg-slate-400'
                  : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
              >
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white text-4xl mb-4 font-bold">
                  {userData.name ? userData.name.split(' ').map(n => n[0]).join('') : 'U'}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">{userData.name || 'User'}</h3>
                <p className="text-slate-600 text-sm mb-4">{userData.email}</p>
                <div className="w-full pt-4 border-t border-slate-200">
                  <span className="inline-block px-4 py-1.5 bg-green-100 text-green-800 rounded-full text-xs font-semibold uppercase">
                    {userData.role}
                  </span>
                </div>
              </div>

              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-8">
                {!isEditing ? (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">Full Name</h4>
                      <p className="text-lg text-slate-900 font-medium">{userData.name || 'Not provided'}</p>
                    </div>
                    <div className="border-t border-slate-200 pt-6">
                      <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">Email Address</h4>
                      <p className="text-lg text-slate-900 font-medium">{userData.email || 'Not provided'}</p>
                    </div>
                    <div className="border-t border-slate-200 pt-6">
                      <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">Phone Number</h4>
                      <p className="text-lg text-slate-900 font-medium">{userData.phone || 'Not provided'}</p>
                    </div>
                    <div className="border-t border-slate-200 pt-6">
                      <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">Date of Birth</h4>
                      <p className="text-lg text-slate-900 font-medium">{userData.dateOfBirth || 'Not provided'}</p>
                    </div>
                    <div className="border-t border-slate-200 pt-6">
                      <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">Address</h4>
                      <p className="text-lg text-slate-900 font-medium">{userData.address || 'Not provided'}</p>
                    </div>
                    <div className="border-t border-slate-200 pt-6">
                      <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">Bio</h4>
                      <p className="text-lg text-slate-900 font-medium">{userData.bio || 'Not provided'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {saveError && (
                      <div className="p-4 bg-red-50 border border-red-300 rounded-lg">
                        <p className="text-red-800 text-sm font-medium">{saveError}</p>
                      </div>
                    )}
                    {saveSuccess && (
                      <div className="p-4 bg-green-50 border border-green-300 rounded-lg">
                        <p className="text-green-800 text-sm font-medium">✓ Profile updated successfully!</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
                      <input
                        type="text"
                        value={editData.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                      <input
                        type="email"
                        value={editData.email}
                        disabled
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm bg-slate-50 text-slate-500 cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Phone Number</label>
                      <input
                        type="tel"
                        value={editData.phone}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          setEditData({ ...editData, phone: value });
                          if (value.length > 0 && value.length !== 10) {
                            setPhoneError('Phone number must be exactly 10 digits');
                          } else {
                            setPhoneError('');
                          }
                        }}
                        className={`w-full px-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 ${phoneError
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-slate-300 focus:ring-green-500'
                          }`}
                        placeholder="Enter 10-digit phone number"
                        maxLength="10"
                      />
                      {phoneError && <p className="text-red-600 text-xs mt-1">{phoneError}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Date of Birth</label>
                      <input
                        type="date"
                        value={editData.dateOfBirth}
                        onChange={(e) => setEditData({ ...editData, dateOfBirth: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div className="border border-slate-300 rounded-lg p-4 bg-slate-50">
                      <label className="block text-sm font-semibold text-slate-700 mb-3">Address</label>
                      {(() => {
                        const addrInfo = parseStructuredAddress(editData.address);
                        const updateAddr = (field, val) => {
                          const newInfo = { ...addrInfo, [field]: val };
                          const newAddrStr = `House No: ${newInfo.houseNo}, Area: ${newInfo.area}, District: ${newInfo.district}, State: ${newInfo.state}`;
                          setEditData({ ...editData, address: newAddrStr });
                        };
                        return (
                          <div className="space-y-3">
                            <div className="flex gap-3">
                              <div className="flex-1">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">House No. / Flat</label>
                                <input
                                  type="text"
                                  value={addrInfo.houseNo}
                                  onChange={(e) => updateAddr('houseNo', e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                              </div>
                              <div className="flex-[2]">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Area / Village Name</label>
                                <input
                                  type="text"
                                  value={addrInfo.area}
                                  onChange={(e) => updateAddr('area', e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                              </div>
                            </div>
                            <div className="flex gap-3">
                              <div className="flex-1">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">District</label>
                                <input
                                  type="text"
                                  value={addrInfo.district}
                                  onChange={(e) => updateAddr('district', e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                              </div>
                              <div className="flex-1">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">State</label>
                                <input
                                  type="text"
                                  value={addrInfo.state}
                                  onChange={(e) => updateAddr('state', e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Bio</label>
                      <textarea
                        value={editData.bio}
                        onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[80px] resize-none"
                        placeholder="Tell us about yourself"
                      />
                    </div>
                    <div className="flex gap-3 pt-4 border-t border-slate-200">
                      <button
                        onClick={handleSaveProfile}
                        className="flex-1 px-4 py-2.5 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-all"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={() => {
                          setEditData(userData);
                          setIsEditing(false);
                          setPhoneError('');
                          setSaveError('');
                        }}
                        className="flex-1 px-4 py-2.5 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 transition-all"
                      >
                        Discard
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}



        {activeSection === 'settings' && (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900">Settings</h2>
              <p className="text-slate-600 text-sm mt-2">Manage your account preferences and settings</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="space-y-6">
                <div className="pb-6 border-b border-slate-200">
                  <h4 className="text-lg font-semibold text-slate-900 mb-4">Profile Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                      <input type="text" className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm" placeholder="John Doe" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                      <input type="email" className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm" placeholder="john@example.com" />
                    </div>
                  </div>
                </div>

                <div className="pb-6 border-b border-slate-200">
                  <h4 className="text-lg font-semibold text-slate-900 mb-4">Notifications</h4>
                  <div className="space-y-3">
                    {['Email notifications', 'SMS reminders', 'Push notifications'].map((setting, idx) => (
                      <label key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100">
                        <span className="text-sm text-slate-700">{setting}</span>
                        <input type="checkbox" className="w-5 h-5 text-green-500" defaultChecked />
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-slate-900 mb-4">Account Actions</h4>
                  <div className="space-y-3">
                    <button className="w-full px-4 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 transition-all">
                      Save Changes
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
            fetchPractitioners();
          }}
          onClose={() => setReviewSession(null)}
        />
      )}
    </div >
  );
}