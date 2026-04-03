import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getCurrentUser, updateUser, getVerifiedPractitioners, createAppointmentRequest, getOnboardingStatus } from '../services/userService';
import { getAccessToken } from '../services/authService';
import { getSessionsForUser, downloadPrescribedDocument } from '../services/sessionService';
import SessionCalendar from '../components/SessionCalendar';
import BookingForm from '../components/BookingForm';
import SessionCard from '../components/SessionCard';
import UserHeader from '../components/UserHeader';
import WalletPage from './WalletPage';
import ReviewForm from '../components/ReviewForm';
import { getWalletBalance, getWalletTransactions, withdrawFunds, depositFunds } from '../services/walletService';
import { getOrderHistory } from '../services/orderService';
import TriageAssistant from '../components/TriageAssistant';

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
  const SPECIALIZATIONS = ['All', 'Cardiology', 'Neurology', 'Endocrinology', 'Gastroenterology', 'Nephrology', 'Pulmonology', 'Rheumatology', 'ENT', 'Dentistry', 'Psychiatry', 'Gynecology', 'Obstetrics', 'Neonatology', 'Dermatology', 'General Doctor'];

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
  const [onboardingData, setOnboardingData] = useState({ hasProfile: false, verified: false });
  const [isTriageModalOpen, setIsTriageModalOpen] = useState(false);

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

        // Fetch practitioner onboarding status for pending banner
        if (data.role === 'PATIENT' || data.role === 'USER') {
          const status = await getOnboardingStatus();
          setOnboardingData(status);
        }

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
      <div className="flex justify-center items-center min-h-screen bg-slate-50">
        <div className="relative">
          <div className="w-32 h-32 border-4 border-slate-200 border-t-[#1f6f66] rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-3xl">🧬</div>
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
      <div className="fixed left-0 top-0 w-64 h-screen bg-slate-900 border-r border-slate-800 z-50">
        <div className="p-8 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1f6f66] rounded-xl flex items-center justify-center text-xl shadow-lg shadow-[#1f6f66]/20">
              🧪
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-black tracking-tight leading-none uppercase">Wellness</h1>
              <p className="text-[10px] font-bold text-[#1f6f66] uppercase tracking-[0.2em] mt-1">Platform Hub</p>
            </div>
          </div>
        </div>

        <nav className="py-8 px-4 space-y-1">
          <button
            onClick={() => setActiveSection('dashboard')}
            className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 ${activeSection === 'dashboard'
              ? 'text-white bg-[#1f6f66] shadow-lg shadow-[#1f6f66]/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
          >
            <span className="text-lg">📊</span>
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveSection('find-doctors')}
            className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 ${activeSection === 'find-doctors'
              ? 'text-white bg-[#1f6f66] shadow-lg shadow-[#1f6f66]/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
          >
            <span className="text-lg">🔬</span>
            <span>Book Session</span>
          </button>

          <button
            onClick={() => setActiveSection('sessions')}
            className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 ${activeSection === 'sessions'
              ? 'text-white bg-[#1f6f66] shadow-lg shadow-[#1f6f66]/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
          >
            <span className="text-lg">📅</span>
            <span>Clinical History</span>
          </button>

          <button
            onClick={() => setActiveSection('my-bookings')}
            className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 ${activeSection === 'my-bookings'
              ? 'text-white bg-[#1f6f66] shadow-lg shadow-[#1f6f66]/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
          >
            <span className="text-lg">📎</span>
            <span>Booking Queue</span>
          </button>

          <button
            onClick={() => setActiveSection('wallet')}
            className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 ${activeSection === 'wallet'
              ? 'text-white bg-[#1f6f66] shadow-lg shadow-[#1f6f66]/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
          >
            <span className="text-lg">💳</span>
            <span>Wallet Ledger</span>
          </button>

          <button
            onClick={() => setActiveSection('calendar')}
            className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 ${activeSection === 'calendar'
              ? 'text-white bg-[#1f6f66] shadow-lg shadow-[#1f6f66]/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
          >
            <span className="text-lg">📆</span>
            <span>My Calendar</span>
          </button>

          <div className="pt-6 pb-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-5">Orders & Pharmacy</div>

          <button
            onClick={() => navigate('/products')}
            className="w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all outline-none"
          >
            <span className="text-lg">💊</span>
            <span>Pharmacy Suite</span>
          </button>

          <button
            onClick={() => navigate('/user/orders')}
            className="w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all outline-none"
          >
            <span className="text-lg">📦</span>
            <span>Pharmacy History</span>
          </button>

          <div className="pt-6 pb-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-5">Social & Profile</div>

          <button
            onClick={() => navigate('/community-forum')}
            className="w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-sm font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all outline-none"
          >
            <span className="text-lg">💬</span>
            <span>Community Forum</span>
          </button>

          <button
            onClick={() => setActiveSection('profile')}
            className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 ${activeSection === 'profile'
              ? 'text-white bg-[#1f6f66] shadow-lg shadow-[#1f6f66]/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
          >
            <span className="text-lg">👤</span>
            <span>Profile</span>
          </button>

          <button
            onClick={() => setActiveSection('settings')}
            className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 ${activeSection === 'settings'
              ? 'text-white bg-[#1f6f66] shadow-lg shadow-[#1f6f66]/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
          >
            <span className="text-lg">⚙️</span>
            <span>Settings</span>
          </button>

          <div className="mt-8 pt-8 border-t border-white/5">
            <button
              onClick={() => {
                localStorage.clear();
                navigate('/login');
              }}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-black uppercase tracking-widest text-red-400 hover:bg-red-500/10 transition-all border border-red-500/10"
            >
              <span>🚪</span>
              <span>Deactivate Session</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Main Content - Full Page Canvas */}
      <div className="ml-64 flex-1 p-10 max-w-[1750px] mx-auto w-full relative z-10 transition-all duration-500">
        {/* Top Header Bar */}
        <UserHeader />

        {/* Practitioner Pending Banner */}
        {userData.role === 'PATIENT' && onboardingData.hasProfile && !onboardingData.verified && (
          <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-4 shadow-sm">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-xl">⏳</div>
            <div className="flex-1">
              <h4 className="font-semibold text-amber-900">Practitioner Application Pending</h4>
              <p className="text-amber-700 text-sm">Our admin team is reviewing your documents. You'll gain access once verified!</p>
            </div>
            <button
              onClick={() => navigate('/practitioner/onboarding')}
              className="px-4 py-2 bg-amber-200 text-amber-900 text-sm font-semibold rounded-lg hover:bg-amber-300 transition-colors"
            >
              Check Details
            </button>
          </div>
        )}

        {/* Diagnostic Dashboard */}
        {activeSection === 'dashboard' && (
          <div className="block">
            <div className="mb-10 flex justify-between items-end border-b border-slate-100 pb-10">
              <div>
                <div className="text-[10px] font-black text-[#1f6f66] uppercase tracking-[0.2em] mb-2 px-1">Health Platform</div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">Diagnostic Overview</h2>
                <p className="text-slate-400 text-[10px] mt-2 font-bold uppercase tracking-widest">Protocol Version 2.0.0-FLASH</p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setIsTriageModalOpen(true)}
                  className="px-8 py-4 bg-[#1f6f66] text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-[#1f6f66] hover:bg-white hover:text-[#1f6f66]"
                >
                  Start Triage
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm group">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl border border-slate-100 group-hover:bg-slate-900 group-hover:text-white">
                    🧬
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-slate-900 leading-none mb-1">{sessions.length}</div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">Clinical Events</div>
                  </div>
                </div>
                <div className="h-1 bg-slate-50 rounded-full overflow-hidden">
                  <div className="w-[85%] h-full bg-[#1f6f66]"></div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm group">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl border border-slate-100 group-hover:bg-slate-900 group-hover:text-white">
                    🏦
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-[#1f6f66] leading-none mb-1">₹{walletBalance}</div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">Available Asset</div>
                  </div>
                </div>
                <div className="h-1 bg-slate-50 rounded-full overflow-hidden">
                  <div className="w-[100%] h-full bg-[#1f6f66]/30"></div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm group hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-500 hover:-translate-y-1">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl border border-slate-100 group-hover:bg-slate-900 group-hover:text-white">
                    💊
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-slate-900 leading-none mb-1">
                      {orders.reduce((sum, order) => sum + (order.items?.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0) || 0), 0)}
                    </div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">Medicines Ordered</div>
                  </div>
                </div>
                <div className="h-1 bg-slate-50 rounded-full overflow-hidden">
                  <div className="w-[100%] h-full bg-[#1f6f66]"></div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm group hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-500 hover:-translate-y-1">
                <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-3xl border border-rose-100 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                    💸
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-slate-900 leading-none mb-1">
                      ₹{(orders.reduce((sum, order) => sum + (+order.totalPrice || +order.totalAmount || 0), 0) + sessions.filter(s => ['BOOKED', 'COMPLETED'].includes(s.status?.toUpperCase())).reduce((sum, s) => sum + (+s.feeAmount || +s.consultationFee || +s.amount || 0), 0)).toFixed(2).replace(/\.00$/, '')}
                    </div>
                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">Total Money Spent</div>
                  </div>
                </div>
                <div className="h-1 bg-slate-50 rounded-full overflow-hidden">
                  <div className="w-full h-full bg-rose-500"></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {(() => {
                const totalMedicinesOrdered = orders.reduce((sum, order) => {
                  return sum + (order.items?.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0) || 0);
                }, 0);

                const todayStr = new Date().toISOString().split('T')[0];
                const upcoming = sessions
                  .filter(s => s.sessionDate >= todayStr && s.status?.toUpperCase() === 'BOOKED')
                  .sort((a, b) => new Date(`${a.sessionDate}T${a.startTime}`) - new Date(`${b.sessionDate}T${b.startTime}`));

                const past = sessions
                  .filter(s => (s.sessionDate < todayStr || s.status?.toUpperCase() === 'COMPLETED') && s.status?.toUpperCase() === 'COMPLETED')
                  .sort((a, b) => new Date(`${b.sessionDate}T${b.startTime}`) - new Date(`${a.sessionDate}T${a.startTime}`));

                const nextSession = upcoming.length > 0 ? upcoming[0] : null;

                return (
                  <div className="space-y-8">
                    <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-500 hover:-translate-y-1">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
                      <div className="flex justify-between items-center mb-10 relative">
                        <span className="bg-[#1f6f66] text-white px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em]">Upcoming Session</span>
                        {nextSession && (
                          <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest border-b border-slate-100">
                            {nextSession.sessionDate === todayStr ? 'Scheduled Today' : nextSession.sessionDate}
                          </span>
                        )}
                      </div>

                      {nextSession ? (
                        <>
                          <div className="flex items-center gap-8 mb-10 relative">
                            <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center text-white font-black text-2xl shadow-xl">
                              {(nextSession.practitionerName || 'Dr').split(' ').map(n => n[0]).join('')}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-3xl font-black text-slate-900 tracking-tight truncate leading-none mb-2">
                                {nextSession.practitionerName || 'Practitioner'}
                              </h4>
                              <p className="text-[11px] text-[#1f6f66] font-black uppercase tracking-[0.2em]">
                                {nextSession.notes || 'Medical Consultation'}
                              </p>
                            </div>
                          </div>
                          <div className="pt-8 border-t border-slate-50 flex gap-10 relative">
                            <div className="flex items-center gap-4 text-slate-900 text-xs font-black uppercase tracking-widest">
                              <span className="text-xl">📅</span>
                              {nextSession.sessionDate}
                            </div>
                            <div className="flex items-center gap-4 text-slate-900 text-xs font-black uppercase tracking-widest">
                              <span className="text-xl">📍</span>
                              Virtual Link
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
                                className="w-full mt-10 py-5 bg-[#1f6f66] text-white rounded-2xl font-black uppercase tracking-widest text-[10px] block text-center shadow-xl shadow-teal-900/10"
                              >
                                Join Session
                              </a>
                            ) : (
                              <div className="w-full mt-10 py-5 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px] text-center border border-slate-100">
                                Link available 15m before start
                              </div>
                            );
                          })()}
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-200 border-2 border-dashed border-slate-100 rounded-[2rem]">
                          <div className="text-6xl mb-6 opacity-20">📡</div>
                          <p className="text-[11px] font-black uppercase tracking-[0.2em]">No Upcoming Sessions</p>
                          <button
                            onClick={() => setActiveSection('find-doctors')}
                            className="mt-6 text-[#1f6f66] text-[10px] font-black uppercase tracking-widest border-b border-[#1f6f66]"
                          >
                            Book Now
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10 relative overflow-hidden hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-500 hover:-translate-y-1">
                <div className="absolute top-0 right-0 w-40 h-40 bg-slate-50 rounded-full -mr-20 -mt-20 opacity-50"></div>
                <h3 className="text-[10px] font-black text-[#1f6f66] uppercase tracking-[0.2em] mb-12 px-1">Health Progress</h3>
                <div className="text-center mb-12 relative px-4">
                  <div className="w-48 h-48 mx-auto mb-8 rounded-full flex items-center justify-center p-2 bg-slate-50 border border-slate-100 shadow-inner">
                    <div className="w-40 h-40 bg-white rounded-full flex flex-col items-center justify-center shadow-lg border border-slate-100">
                      <div className="text-5xl font-black text-slate-900">70%</div>
                      <div className="text-[10px] font-black text-[#1f6f66] uppercase tracking-widest mt-2">Optimal</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-8 relative">
                  {[
                    { name: 'Completed sessions', value: 85, color: 'bg-[#1f6f66]' },
                    { name: 'Schedule Adherence', value: 65, color: 'bg-slate-900' },
                    { name: 'Wellness Factor', value: 72, color: 'bg-[#1f6f66]' },
                  ].map((metric, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between mb-3 px-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{metric.name}</span>
                        <span className="text-[10px] font-black text-slate-900">{metric.value}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                        <div className={`h-full ${metric.color}`} style={{ width: `${metric.value}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== Logic Discovery / Find Doctors ===== */}
        {activeSection === 'find-doctors' && (
          <div className="block">
            {/* Unified Intelligent Practitioners Header */}
            <div className="mb-12">
              <div className="relative overflow-hidden rounded-[3rem] bg-white border border-slate-100 shadow-sm p-1">
                <div className="relative px-10 py-12 bg-white rounded-[2.8rem] border border-slate-50">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-12">
                    {/* Left Column: Branding */}
                    <div className="text-center md:text-left flex-1">
                      <button
                        onClick={() => setActiveSection('dashboard')}
                        className="text-[#1f6f66] text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 mb-6 border-b border-transparent hover:border-[#1f6f66]"
                      >
                        ← Return to Base
                      </button>
                      <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter leading-none mb-4">
                        Book <span className="text-[#1f6f66]">Session.</span>
                      </h2>
                      <p className="text-slate-400 text-sm font-medium tracking-wide uppercase tracking-[0.1em]">Find and book your next appointment</p>
                    </div>

                    {/* Center Column: The AI Bridge (Static) */}
                    <div className="flex-[1.2] max-w-lg w-full">
                      <button
                        onClick={() => setIsTriageModalOpen(true)}
                        className="w-full relative p-1 rounded-[2.5rem] bg-slate-100 border border-slate-200"
                      >
                        <div className="relative bg-slate-900 rounded-[2.2rem] px-8 py-6 flex items-center gap-6 border border-slate-800 transition-all hover:bg-slate-800 hover:scale-[1.02] group/ai">
                          <span className="text-4xl group-hover/ai:scale-110 transition-transform">🧠</span>
                          <div className="text-left border-l border-white/10 pl-6">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                              <p className="text-[#1f6f66] font-black uppercase tracking-[0.2em] text-[10px] mb-1">AI Health Assistant</p>
                            </div>
                            <p className="text-white font-black text-2xl leading-none uppercase tracking-tighter mb-1">Chat with AI</p>
                            <p className="text-white/40 text-[10px] font-medium tracking-wider">Automated specialist matching</p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>



            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 mb-10">
              <div className="flex flex-col sm:flex-row gap-6 mb-8">
                <div className="relative flex-1">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 text-lg">🔍</span>
                  <input
                    type="text"
                    placeholder="Search specialists, institutions, or health concerns..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-16 pr-8 py-5 rounded-[1.5rem] border border-slate-100 bg-slate-50 text-xs font-bold focus:outline-none focus:border-[#1f6f66] focus:bg-white placeholder:text-slate-300 uppercase tracking-widest"
                  />
                </div>
              </div>

              {/* Specialization Filter */}
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {SPECIALIZATIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => setSpecializationFilter(s)}
                    className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex-shrink-0 ${specializationFilter === s
                      ? 'bg-slate-900 text-white border border-slate-900'
                      : 'bg-white border border-slate-100 text-slate-400 hover:border-[#1f6f66] hover:text-[#1f6f66]'
                      }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
              {/* Practitioners List */}
              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
                <h3 className="text-[10px] font-black text-[#1f6f66] uppercase tracking-[0.2em] mb-8 px-1">Specialist Directory</h3>
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-3 scrollbar-v-teal">
                  {loadingDoctors ? (
                    <div className="text-center py-20 flex flex-col items-center">
                      <div className="w-10 h-10 border-4 border-slate-100 border-t-[#1f6f66] rounded-full animate-spin mb-4"></div>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none">Searching...</p>
                    </div>
                  ) : filteredPractitioners.length === 0 ? (
                    <div className="text-center py-20 opacity-30">
                      <div className="text-5xl mb-4">🔭</div>
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-none">No specialist active in this sector</p>
                    </div>
                  ) : filteredPractitioners.map((pract) => (
                    <div
                      key={pract.id}
                      onClick={() => setSelectedPractitioner(pract)}
                      className={`p-5 rounded-3xl border-2 cursor-pointer transition-all duration-300 group ${selectedPractitioner?.id === pract.id
                        ? 'border-[#1f6f66] bg-teal-50 shadow-xl shadow-[#1f6f66]/5'
                        : 'border-slate-50 bg-white hover:border-[#1f6f66]/20'
                        }`}
                    >
                      <div className="flex items-center gap-5">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg transition-transform duration-500 group-hover:scale-110 ${selectedPractitioner?.id === pract.id ? 'bg-[#1f6f66]' : 'bg-slate-900 group-hover:bg-[#1f6f66]'}`}>
                          {(pract.userName || 'Dr').split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-base font-black text-slate-900 truncate tracking-tight">{pract.userName}</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate mb-1">{pract.specialization}</p>
                          <div className="flex items-center gap-2">
                            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">★ {pract.rating || 'N/A'}</span>
                            <span className="text-[9px] text-[#1f6f66] font-black uppercase tracking-[0.1em]">Verified Profile</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Calendar View */}
              <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
                {selectedPractitioner ? (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-700">
                    <div className="mb-10 flex justify-between items-start">
                      <div>
                        <h3 className="text-[10px] font-black text-[#1f6f66] uppercase tracking-[0.2em] mb-2 px-1">Appointment Scheduler</h3>
                        <h4 className="text-3xl font-black text-slate-900 tracking-tighter leading-none mb-1">
                          {selectedPractitioner.userName}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          Select an available slot for your session
                        </p>
                      </div>
                      <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-900/10">
                        ₹{selectedPractitioner.consultationFee} / Call
                      </div>
                    </div>
                    <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-50">
                      <SessionCalendar
                        practitionerId={selectedPractitioner.id}
                        onSlotSelect={(slot) => {
                          setSelectedSlot(slot);
                          setCalendarPractitioner(selectedPractitioner);
                          setShowBookingForm(true);
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-center">
                    <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center mb-8 border border-slate-100 animate-pulse">
                      <span className="text-6xl grayscale opacity-30">📅</span>
                    </div>
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">No Specialist Selected</h4>
                    <p className="text-xs text-slate-300 font-bold max-w-xs uppercase leading-relaxed">Select a specialist from the directory to view their availability.</p>
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
          </div>
        )}

        {/* My Sessions Section */}
        {activeSection === 'sessions' && (
          <div className="block">
            <div className="mb-10">
              <div className="text-[10px] font-black text-[#1f6f66] uppercase tracking-[0.2em] mb-2 px-1">Session History</div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">Medical Records</h2>
              <p className="text-slate-400 text-[10px] mt-3 font-bold uppercase tracking-widest">Archive of your past clinical interactions and diagnostic sessions.</p>
            </div>

            <div className="flex flex-wrap gap-4 mb-10">
              {['all', 'upcoming', 'past', 'cancelled'].map((f) => (
                <button
                  key={f}
                  onClick={() => setSessionFilter(f)}
                  className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest ${sessionFilter === f
                    ? 'bg-slate-900 text-white'
                    : 'bg-white text-slate-400 border border-slate-100 hover:border-[#1f6f66] hover:text-[#1f6f66]'
                    }`}
                >
                  {f === 'all' ? '📜 All Sessions' : f === 'upcoming' ? '📅 Scheduled' : f === 'past' ? '✅ Completed' : '❌ Terminated'}
                </button>
              ))}
            </div>

            {loadingSessions ? (
              <div className="flex flex-col justify-center items-center py-24 bg-white rounded-[2.5rem] border border-slate-100">
                <div className="w-12 h-12 border-4 border-slate-100 border-t-[#1f6f66] rounded-full animate-spin mb-4" />
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Syncing History</p>
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
                <div className="bg-white rounded-[2.5rem] border border-slate-100 p-24 text-center">
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8 text-6xl grayscale opacity-20">📭</div>
                  <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">No Records Found</h4>
                  <p className="text-xs text-slate-300 font-bold max-w-xs mx-auto leading-relaxed">The clinical ledger is currently empty. Initialize a session to populate this database.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                  {filtered.map(session => (
                    <div key={session.id} className="transform transition-all active:scale-95">
                      <SessionCard
                        session={session}
                        role="USER"
                        onRefresh={fetchSessions}
                        onReview={(s) => setReviewSession(s)}
                      />
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* My Bookings Section */}
        {activeSection === 'my-bookings' && (
          <div className="block">
            <div className="mb-10">
              <div className="text-[10px] font-black text-[#1f6f66] uppercase tracking-[0.2em] mb-2 px-1">Appointment Status</div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">My Bookings</h2>
              <p className="text-slate-400 text-[10px] mt-3 font-bold uppercase tracking-widest">Track the status of your appointment requests and confirmations.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
              <div className="bg-gradient-to-br from-white to-slate-50 p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100/50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 relative z-10">Total Entries</h3>
                <div className="flex items-end gap-2 relative z-10">
                  <p className="text-5xl font-black text-slate-900 leading-none">{sessions.length}</p>
                  <span className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">Records</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-white to-teal-50/30 p-8 rounded-[2rem] border border-teal-100/50 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                <h3 className="text-[10px] font-black text-[#1f6f66] uppercase tracking-[0.2em] mb-4 relative z-10">Confirmed</h3>
                <div className="flex items-end gap-2 relative z-10">
                  <p className="text-5xl font-black text-[#1f6f66] leading-none">
                    {sessions.filter(s => s.status?.toUpperCase() === 'BOOKED').length}
                  </p>
                  <span className="text-[10px] font-bold text-[#1f6f66]/60 mb-1 uppercase tracking-widest">Active</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-white to-slate-50 p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-900/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] mb-4 relative z-10">Finalized</h3>
                <div className="flex items-end gap-2 relative z-10">
                  <p className="text-5xl font-black text-slate-900 leading-none">
                    {sessions.filter(s => s.status?.toUpperCase() === 'COMPLETED').length}
                  </p>
                  <span className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">History</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-white to-red-50/30 p-8 rounded-[2rem] border border-red-100/50 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                <h3 className="text-[10px] font-black text-red-600 uppercase tracking-[0.2em] mb-4 relative z-10">Dropped</h3>
                <div className="flex items-end gap-2 relative z-10">
                  <p className="text-5xl font-black text-red-600 leading-none">
                    {sessions.filter(s => s.status?.toUpperCase() === 'CANCELLED').length}
                  </p>
                  <span className="text-[10px] font-bold text-red-400 mb-1 uppercase tracking-widest">Void</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-white/50 backdrop-blur-sm">
                <div className="flex flex-col">
                  <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Booking History</h3>
                  <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1">Detailed Log of Appointment Requests</p>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 px-5 py-2.5 rounded-full border border-slate-100">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                  <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Interface Active</span>
                </div>
              </div>
              <div className="divide-y divide-slate-50">
                {loadingSessions ? (
                  <div className="p-24 text-center">
                    <div className="w-12 h-12 border-4 border-slate-100 border-t-[#1f6f66] rounded-full animate-spin mx-auto mb-6"></div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Pulling Ledger Data</p>
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="p-24 text-center">
                    <div className="text-7xl mb-6 grayscale opacity-20">🔬</div>
                    <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">No Booking History</h4>
                    <p className="text-xs text-slate-300 font-bold mb-8 uppercase tracking-wide">You haven't booked any sessions yet.</p>
                    <button
                      onClick={() => setActiveSection('find-doctors')}
                      className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl active:scale-95"
                    >
                      Browse Specialists
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50/50">
                        <tr>
                          <th className="px-10 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Identified Specialist</th>
                          <th className="px-10 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Timestamp</th>
                          <th className="px-10 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Status Code</th>
                          <th className="px-10 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {sessions.map((booking) => (
                          <tr key={booking.id} className="group hover:bg-slate-50/50 transition-colors">
                            <td className="px-10 py-6">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-xs group-hover:bg-[#1f6f66] transition-colors">
                                  {booking.practitionerName ? booking.practitionerName.split(' ').map(n => n[0]).join('') : 'DR'}
                                </div>
                                <div>
                                  <h4 className="text-lg font-black text-slate-900 tracking-tight leading-none mb-1">{booking.practitionerName || 'Unknown Specialist'}</h4>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{booking.sessionMode || 'Virtual Interface'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-10 py-6 text-xs text-slate-500 font-bold">
                              {booking.sessionDate || 'Pending'} <span className="text-[#1f6f66]/50 mx-1">•</span> {booking.sessionTime || 'TBD'}
                            </td>
                            <td className="px-10 py-6">
                              <span className={`inline-block px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest ${booking.status?.toUpperCase() === 'BOOKED' ? 'bg-teal-50 text-[#1f6f66]' :
                                  booking.status?.toUpperCase() === 'COMPLETED' ? 'bg-slate-900 text-white' :
                                    booking.status?.toUpperCase() === 'CANCELLED' ? 'bg-red-50 text-red-600' :
                                      'bg-amber-50 text-amber-700'
                                }`}>
                                {booking.status}
                              </span>
                            </td>
                            <td className="px-10 py-6 text-sm font-black text-slate-900">
                              ₹{booking.feeAmount ? Number(booking.feeAmount).toFixed(0) : '0'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== Health Roadmap / Calendar Section ===== */}
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
            <div className="block">
              <div className="mb-10">
                <div className="text-[10px] font-black text-[#1f6f66] uppercase tracking-[0.2em] mb-2 px-1">My Calendar</div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">My Schedule</h2>
                <p className="text-slate-400 text-[10px] mt-3 font-bold uppercase tracking-widest">View and manage your upcoming medical appointments.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-8">
                  <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10">
                    <div className="mb-10 flex justify-between items-center">
                      <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{monthLabel}</h3>
                        <p className="text-[10px] text-[#1f6f66] font-black uppercase tracking-widest mt-1">
                          {bookedCount} Active Missions Found
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center bg-slate-50 rounded-2xl border border-slate-100 p-1">
                          <button
                            onClick={() => {
                              const prev = new Date(calYear, calMonth - 1, 1);
                              setCalendarMonth(prev.getMonth());
                              setCalendarYear(prev.getFullYear());
                            }}
                            className="p-3 hover:bg-white rounded-xl text-slate-900"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                          </button>
                          <div className="w-px h-6 bg-slate-200 mx-2"></div>
                          <button
                            onClick={() => {
                              const next = new Date(calYear, calMonth + 1, 1);
                              setCalendarMonth(next.getMonth());
                              setCalendarYear(next.getFullYear());
                            }}
                            className="p-3 hover:bg-white rounded-xl text-slate-900"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                          </button>
                        </div>
                        {!isCurrentMonth && (
                          <button
                            onClick={() => { setCalendarMonth(todayDate.getMonth()); setCalendarYear(todayDate.getFullYear()); }}
                            className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-[#1f6f66] bg-teal-50 rounded-2xl border border-teal-100"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="rounded-[2.5rem] border border-slate-50 overflow-hidden shadow-inner bg-slate-50">
                      <div className="grid grid-cols-7 bg-white border-b border-slate-100">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                          <div key={day} className="text-center font-black text-slate-300 text-[9px] py-4 uppercase tracking-[0.2em]">
                            {day}
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-7 gap-px">
                        {Array.from({ length: gridCells }, (_, i) => {
                          let dayNum, isCurrentMonthDay;
                          if (i < firstDayOfWeek) {
                            dayNum = prevMonthDays - firstDayOfWeek + i + 1;
                            isCurrentMonthDay = false;
                          } else if (i >= firstDayOfWeek + daysInMonth) {
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
                          const daySessions = sessions.filter(s => s.sessionDate === cellDateStr && s.status === 'BOOKED');

                          return (
                            <div
                              key={i}
                              className={`min-h-[140px] p-4 flex flex-col border border-transparent hover:border-[#1f6f66]/20 bg-white
                                ${!isCurrentMonthDay ? 'opacity-30' : ''}
                                ${isToday ? 'bg-teal-50/10' : ''}
                              `}
                            >
                              <div className="flex justify-end mb-4">
                                <span className={`
                                  inline-flex items-center justify-center w-8 h-8 rounded-xl text-xs font-black
                                  ${isToday ? 'bg-[#1f6f66] text-white shadow-lg shadow-teal-900/10' : 'text-slate-400'}
                                `}>
                                  {dayNum}
                                </span>
                              </div>

                              <div className="flex-1 space-y-2 overflow-hidden">
                                {isCurrentMonthDay && daySessions.map((s, si) => (
                                  <div
                                    key={si}
                                    className="text-[9px] px-3 py-2 rounded-xl border border-slate-100 bg-slate-50 text-slate-900 font-bold uppercase tracking-tight truncate flex items-center gap-2"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#1f6f66]"></span>
                                    {formatSlotTime(s.startTime)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-xl shadow-slate-900/10 border border-slate-800">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1f6f66] mb-8">Uplink Status</h3>
                    <div className="space-y-6">
                      {sessions
                        .filter(s => {
                          if (!s.sessionDate || s.status !== 'BOOKED') return false;
                          const d = new Date(s.sessionDate);
                          return d >= todayDate;
                        })
                        .slice(0, 3)
                        .map((s, idx) => (
                          <div key={idx} className="pb-6 border-b border-white/5 last:border-0">
                            <h4 className="text-lg font-black leading-none truncate mb-2">{s.practitionerName}</h4>
                            <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-slate-500">
                              <span className="text-[#1f6f66]">📅 {s.sessionDate}</span>
                              <span>🕒 {formatSlotTime(s.startTime)}</span>
                            </div>
                          </div>
                        ))}
                      {sessions.filter(s => s.status === 'BOOKED').length === 0 && (
                        <div className="py-10 text-center border-2 border-dashed border-white/5 rounded-3xl opacity-20">
                          <div className="text-4xl mb-4 text-[#1f6f66]">📡</div>
                          <p className="text-[9px] font-black uppercase tracking-[0.2em]">No Upcoming Sessions</p>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setActiveSection('find-doctors')}
                      className="w-full mt-10 py-5 bg-[#1f6f66] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-teal-900/10 border border-transparent hover:bg-slate-900 hover:border-[#1f6f66]"
                    >
                      New Protocol
                    </button>
                  </div>

                  <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50 rounded-full -mr-16 -mt-16 opacity-30"></div>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1f6f66] mb-8 px-1">Calendar Legend</h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <div className="w-4 h-4 rounded-lg bg-[#1f6f66] shadow-sm"></div>
                        <span>Confirmed Session</span>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <div className="w-4 h-4 rounded-lg bg-teal-50 border border-teal-100 shadow-sm"></div>
                        <span>Available Date</span>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <div className="w-4 h-4 rounded-lg bg-slate-50 border border-slate-100 shadow-sm"></div>
                        <span>Past/Unavailable</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}


        {activeSection === 'wallet' && (
          <>
            <div className="mb-10">
              <div className="text-[10px] font-black text-[#1f6f66] uppercase tracking-[0.2em] mb-2 px-1">My Funds</div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-3">Wallet</h2>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">Complete history of your wallet transactions and balances.</p>
            </div>

            <div className="mb-12">
              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-teal-50 rounded-full -mr-32 -mt-32 opacity-50 transition-transform group-hover:scale-110"></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div>
                    <p className="text-[10px] font-black text-[#1f6f66] uppercase tracking-[0.2em] mb-4">Available Balance</p>
                    <div className="flex items-baseline gap-4">
                      <span className="text-6xl font-black text-slate-900 leading-none tracking-tighter">₹{parseFloat(walletBalance).toFixed(2)}</span>
                      <span className="text-slate-300 text-sm font-bold uppercase tracking-widest leading-none">INR</span>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="px-8 py-5 bg-slate-50 border border-slate-100 rounded-3xl text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                      <p className="text-xs font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
                        Active
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-10 border-b border-slate-50 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter leading-none mb-1">Transaction History</h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">Real-time update of your spending</p>
                </div>
                <span className="px-4 py-1.5 bg-slate-900 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg shadow-slate-900/10">Full History</span>
              </div>
              <div className="p-0">
                {loadingWallet ? (
                  <div className="flex flex-col justify-center items-center p-24">
                    <div className="w-10 h-10 border-4 border-slate-100 border-t-[#1f6f66] rounded-full animate-spin mb-4"></div>
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Syncing Ledger...</p>
                  </div>
                ) : walletTransactions.length === 0 ? (
                  <div className="p-24 text-center opacity-20 group">
                    <div className="text-7xl mb-6 grayscale transition-all group-hover:grayscale-0">💸</div>
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] mb-2 leading-none">No Transactions Found</h4>
                    <p className="text-xs text-slate-600 font-bold uppercase tracking-widest leading-none">Transactions will appear here once you book a session or buy medicine.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50 max-h-[600px] overflow-auto scrollbar-v-teal">
                    {walletTransactions.map((tx) => (
                      <div key={tx.id} className="flex justify-between items-center px-10 py-8 hover:bg-slate-50/80 transition-all group relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-[#1f6f66] transition-all"></div>
                        <div className="flex items-center gap-8 relative z-10">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-sm transition-transform group-hover:scale-110 ${
                            tx.type === 'REFUND' || tx.type === 'DEPOSIT'
                              ? 'bg-emerald-50 text-emerald-500 border border-emerald-100'
                              : 'bg-rose-50 text-rose-500 border border-rose-100'
                          }`}>
                            {tx.type === 'REFUND' ? '🔄' : (tx.type === 'DEPOSIT' ? '➕' : '📉')}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1 group-hover:text-[#1f6f66] transition-colors">
                              {(() => {
                                if (tx.description) return tx.description;
                                const type = tx.type?.toUpperCase();
                                const ref = tx.referenceType?.toUpperCase();
                                if (type === 'DEPOSIT') return 'Money Added to Wallet';
                                if (type === 'REFUND') return ref === 'SESSION' ? 'Refund for Session' : 'Refund Issued';
                                if (type === 'PAYMENT') {
                                  if (ref === 'ORDER') return 'Spent for Medicine';
                                  if (ref === 'SESSION') return 'Spent for Session';
                                  return 'Service Payment';
                                }
                                return 'Transaction Update';
                              })()}
                            </p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.15em]">
                              {new Date(tx.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })} • {new Date(tx.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2 relative z-10 transition-transform group-hover:translate-x-[-4px]">
                          <p className={`text-lg font-black tracking-tighter ${
                            tx.type === 'REFUND' || tx.type === 'DEPOSIT' ? 'text-emerald-500' : 'text-slate-900'
                          }`}>
                            {tx.type === 'REFUND' || tx.type === 'DEPOSIT' ? '+' : '-'}₹{parseFloat(tx.amount).toFixed(2)}
                          </p>
                          {tx.status && (
                            <span className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[8px] font-black text-slate-400 uppercase tracking-widest transition-colors group-hover:bg-white group-hover:border-[#1f6f66]/20 group-hover:text-[#1f6f66]">
                              {tx.status}
                            </span>
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
        {/* Wellness Section */}
        {activeSection === 'wellness' && (
          <div className="animate-in fade-in duration-700">
            <div className="mb-10">
              <div className="text-[10px] font-black text-[#1f6f66] uppercase tracking-[0.2em] mb-2 px-1">Health Integrity</div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">Bio-Telemetry Analysis</h2>
              <p className="text-slate-400 text-xs mt-3 font-medium">Monitoring your biological stability and wellness performance metrics.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10 hover:shadow-2xl hover:shadow-slate-100 transition-all group">
                <h3 className="text-[10px] font-black text-[#1f6f66] uppercase tracking-[0.2em] mb-10 px-1">Stability Coefficient</h3>
                <div className="text-center mb-10 relative">
                  <div className="w-52 h-52 mx-auto mb-6 rounded-full flex items-center justify-center p-2 border-8 border-slate-50 shadow-inner group-hover:scale-105 transition-transform duration-700"
                    style={{ background: 'conic-gradient(#1f6f66 0deg, #1f6f66 252deg, #f1f5f9 252deg)' }}>
                    <div className="w-40 h-40 bg-white rounded-full flex flex-col items-center justify-center shadow-xl">
                      <div className="text-6xl font-black text-slate-900">70<span className="text-2xl font-bold not-italic text-[#1f6f66]">%</span></div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Optimal Range</div>
                    </div>
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mt-8">Computed via Active Sessions & Biometric Data</p>
                </div>

                <div className="space-y-6">
                  {[
                    { name: 'Session Attendance', value: 85, color: 'bg-[#1f6f66]', desc: 'Protocol Adherence' },
                    { name: 'Weekly Consistency', value: 65, color: 'bg-slate-900', desc: 'Sync Stability' },
                    { name: 'Progress Rate', value: 72, color: 'bg-[#1f6f66]', desc: 'Growth Vector' },
                    { name: 'Goal Achievement', value: 78, color: 'bg-slate-900', desc: 'Objective Completion' },
                  ].map((metric, idx) => (
                    <div key={idx} className="p-5 border border-slate-50 rounded-2xl group/item hover:bg-slate-50 transition-colors">
                      <div className="flex justify-between mb-3 px-1">
                        <div>
                          <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{metric.name}</span>
                          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-1">{metric.desc}</p>
                        </div>
                        <span className="text-[10px] font-black text-[#1f6f66] group-hover/item:scale-110 transition-transform">{metric.value}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${metric.color} rounded-full transition-all duration-1000`} style={{ width: `${metric.value}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-8">
                <div className="bg-slate-900 rounded-[2.5rem] p-10 shadow-2xl shadow-slate-900/20 relative overflow-hidden group">
                  <div className="absolute bottom-0 right-0 w-40 h-40 bg-[#1f6f66] rounded-full -mr-20 -mb-20 opacity-20 blur-3xl"></div>
                  <h4 className="text-[10px] font-black text-[#1f6f66] uppercase tracking-[0.2em] mb-8 px-1">Protocol Targets</h4>
                  <div className="space-y-6">
                    {[
                      { goal: 'Attend 4 sessions this month', progress: 75, current: 3, total: 4 },
                      { goal: 'Practice yoga 3 times a week', progress: 66, current: 2, total: 3 },
                      { goal: 'Improve wellness score to 80%', progress: 87, current: 70, total: 80 },
                    ].map((item, idx) => (
                      <div key={idx} className="bg-white/5 rounded-2xl p-6 border border-white/5 backdrop-blur-md group/goal hover:bg-white/10 transition-all">
                        <div className="flex justify-between items-center mb-4">
                          <span className="text-xs font-black text-white uppercase tracking-wider">{item.goal}</span>
                          <span className="text-[10px] font-black text-[#1f6f66] bg-teal-50 px-3 py-1 rounded-full">{item.current}/{item.total}</span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-[#1f6f66] rounded-full group-hover/goal:bg-teal-400 transition-colors duration-500" style={{ width: `${item.progress}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10 hover:shadow-xl transition-all">
                  <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] mb-8 px-1">Archive Milestones</h4>
                  <div className="space-y-4">
                    {[
                      { title: '10 Sessions Finalized', date: 'Feb 12, 2026', icon: '🧬' },
                      { title: 'Stability Threshold 70%', date: 'Feb 8, 2026', icon: '🧩' },
                      { title: '30 Day Compliance Streak', date: 'Feb 1, 2026', icon: '🔋' },
                    ].map((milestone, idx) => (
                      <div key={idx} className="flex items-center gap-5 p-5 bg-slate-50/50 rounded-2xl border border-slate-50 hover:bg-white hover:shadow-lg hover:border-slate-100 transition-all cursor-default">
                        <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                          {milestone.icon}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 uppercase tracking-widest">{milestone.title}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">{milestone.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Prescriptions Section */}
        {activeSection === 'messages' && (
          <div className="animate-in fade-in duration-700">
            <div className="mb-10">
              <div className="text-[10px] font-black text-[#1f6f66] uppercase tracking-[0.2em] mb-2 px-1">Pharmacy History</div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">Medical Documents</h2>
              <p className="text-slate-400 text-xs mt-3 font-medium">Your personal repository of digital prescriptions and medical records.</p>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10">
              {sessions.filter(s => s.status === 'COMPLETED' && s.prescribedDocumentUrl).length === 0 ? (
                <div className="text-center py-24 opacity-20">
                  <div className="text-7xl mb-6">📜</div>
                  <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] mb-2">No Documents Found</h4>
                  <p className="text-xs text-slate-600 font-black uppercase tracking-widest leading-none">Your medical document archive is currently empty.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {sessions
                    .filter(s => s.status === 'COMPLETED' && s.prescribedDocumentUrl)
                    .map(session => (
                      <div key={session.id} className="p-8 border border-slate-50 rounded-[2rem] bg-slate-50/50 hover:bg-white hover:shadow-xl hover:border-slate-100 transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-teal-50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110 opacity-50"></div>
                        <div className="flex flex-col gap-6 relative">
                          <div className="flex gap-5 items-center">
                            <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-3xl shadow-lg group-hover:rotate-6 transition-transform">📄</div>
                            <div>
                              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1f6f66] mb-1">Prescription Code</h4>
                              <h4 className="text-lg font-black text-slate-900 tracking-tight">By {session.practitionerName}</h4>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                                Issued: {new Date(session.sessionDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDownloadDocument(session.id, session.practitionerName)}
                            className="w-full py-4 bg-[#1f6f66] text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-900 shadow-xl shadow-[#1f6f66]/10 transition-all active:scale-95"
                          >
                            Download Prescription
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
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

            {/* Role application banner removed from here as per user request */}
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


                <div>
                  <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                    <div>
                      <h4 className="text-xl font-black text-slate-900 tracking-tight uppercase">Join the Mission</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Scale your impact beyond patient care</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
                    {[
                      {
                        role: 'Practitioner',
                        desc: 'Provide expert medical consultations & sessions.',
                        icon: '👨‍⚕️',
                        path: '/practitioner/onboarding',
                        theme: 'emerald',
                        grad: 'from-emerald-500/10 to-teal-500/5',
                        border: 'border-emerald-200',
                        label: 'Provide Care'
                      },
                      {
                        role: 'Delivery Agent',
                        desc: 'Vital logistics for critical medicine distribution.',
                        icon: '🛵',
                        path: '#',
                        theme: 'blue',
                        grad: 'from-blue-500/10 to-indigo-500/5',
                        border: 'border-blue-200',
                        label: 'Manage Logistics'
                      },
                      {
                        role: 'Product Seller',
                        desc: 'List and showcase your wellness innovations.',
                        icon: '🏪',
                        path: '#',
                        theme: 'purple',
                        grad: 'from-purple-500/10 to-pink-500/5',
                        border: 'border-purple-200',
                        label: 'Market Health'
                      }
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => item.path !== '#' && navigate(item.path)}
                        className={`group p-8 rounded-[2rem] border ${item.border} bg-gradient-to-br ${item.grad} cursor-pointer transition-all duration-500 hover:shadow-2xl hover:shadow-${item.theme}-500/20 hover:-translate-y-2 relative overflow-hidden`}
                      >
                        <div className={`absolute top-0 right-0 w-24 h-24 bg-${item.theme}-500 rounded-full -mr-12 -mt-12 opacity-10 group-hover:scale-150 transition-transform duration-700`}></div>

                        <div className={`w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-3xl mb-6 border border-${item.theme}-100 transition-all duration-500 group-hover:bg-slate-900 group-hover:shadow-xl group-hover:border-transparent`}>
                          {item.icon}
                        </div>

                        <h5 className={`text-lg font-black text-slate-900 tracking-tight mb-2 uppercase group-hover:text-${item.theme}-700 transition-colors`}>{item.role}</h5>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed mb-8">{item.desc}</p>

                        <div className="flex items-center gap-2 text-[#1f6f66] text-[9px] font-black uppercase tracking-[0.2em] group-hover:gap-4 transition-all">
                          {item.label} <span className="text-base text-[#1f6f66] group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pb-6 border-b border-slate-200">
                  <h4 className="text-lg font-semibold text-slate-900 mb-4 font-black uppercase tracking-tight">Notifications</h4>
                  <div className="space-y-3">
                    {['Email notifications', 'SMS reminders', 'Push notifications'].map((setting, idx) => (
                      <label key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100">
                        <span className="text-sm font-bold text-slate-700 uppercase tracking-widest text-[10px]">{setting}</span>
                        <input type="checkbox" className="w-5 h-5 accent-[#1f6f66]" defaultChecked />
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

      <TriageAssistant
        isOpen={isTriageModalOpen}
        setIsOpen={setIsTriageModalOpen}
        onSelectPractitioner={(practitioner) => {
          setSelectedPractitioner(practitioner);
          setActiveSection('find-doctors');
        }}
      />
    </div >
  );
}