import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getCurrentUser, updateUser, getVerifiedPractitioners, createAppointmentRequest } from '../services/userService';
import { getAccessToken } from '../services/authService';
import { getSessionsForUser } from '../services/sessionService';
import SessionCalendar from '../components/SessionCalendar';
import BookingForm from '../components/BookingForm';
import SessionCard from '../components/SessionCard';
import NotificationDropdown from '../components/NotificationDropdown';

export default function UserDashboard() {
  const navigate = useNavigate();
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
  const [calendarPractitioner, setCalendarPractitioner] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const _wsRef = useRef(null);
  // New state for Browse Sessions
  const [selectedPractitioner, setSelectedPractitioner] = useState(null);

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
          bio: user.bio || ''
        };

        setUserData(data);
        setEditData(data);

      } catch (err) {
        console.error('Error fetching user data:', err);
        if (err.response?.status === 401 || err.response?.status === 403) {
          navigate('/login');
        }
      }
    };

    fetchUserData();
  }, [navigate]);


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


  useEffect(() => {
    if (['sessions', 'my-bookings', 'calendar'].includes(activeSection) && userData.id) {
      fetchSessions();
    }
  }, [activeSection, userData.id, fetchSessions]);


  useEffect(() => {
    if (activeSection === 'find-doctors' && practitioners.length === 0) {

      const fetchPractitioners = async () => {
        setLoadingDoctors(true);
        try {
          const data = await getVerifiedPractitioners();
          setPractitioners(data);
        } catch (err) {
          console.error('Error fetching practitioners:', err);
          toast.error('Failed to load practitioners');
        } finally {
          setLoadingDoctors(false);
        }
      };

      fetchPractitioners();
    }
  }, [activeSection, practitioners.length]);

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

          {/* ===== NEW: Browse Sessions ===== */}
          <button
            onClick={() => setActiveSection('browse-sessions')}
            className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-all duration-200 ${activeSection === 'browse-sessions'
              ? 'text-white bg-green-500/15 border-l-4 border-green-500'
              : 'text-slate-300 hover:bg-white/5'
              }`}
          >
            <span>🗓️</span>
            <span>Browse Sessions</span>
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
            onClick={() => setActiveSection('orders')}
            className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-all duration-200 ${activeSection === 'orders'
              ? 'text-white bg-green-500/15 border-l-4 border-green-500'
              : 'text-slate-300 hover:bg-white/5'
              }`}
          >
            <span>🛍️</span>
            <span>Medicine Orders</span>
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
                  onClick={() => setActiveSection('orders')}
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
                    <div className="text-3xl font-bold text-slate-900">12</div>
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
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-3xl font-bold text-slate-900">5</div>
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
                    <div className="text-3xl font-bold text-slate-900">$485</div>
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
              <div className="bg-gradient-to-br from-purple-100 to-purple-200 p-6 rounded-xl">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-semibold text-purple-900">Next Session</h4>
                  <span className="text-sm text-purple-700 font-medium">In 2 days</span>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-800 rounded-full flex items-center justify-center text-white font-semibold">
                    RS
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-purple-900">Practitioner Name</h4>
                    <p className="text-sm text-purple-700">Ayurveda Consultation</p>
                  </div>
                </div>
                <div className="pt-3 border-t border-purple-300/50 space-y-2">
                  <div className="flex items-center gap-2 text-purple-700 text-sm">
                    <span>📅</span>
                    <span>February 15, 2026 at 10:00 AM</span>
                  </div>
                  <div className="flex items-center gap-2 text-purple-700 text-sm">
                    <span>📍</span>
                    <span>Video Call</span>
                  </div>
                </div>
                <button className="w-full mt-4 py-3 bg-purple-700 text-white rounded-lg font-semibold hover:bg-purple-800 transition-all">
                  Join Session
                </button>
              </div>

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

        {/* Find Doctors Section - UNCHANGED */}
        {activeSection === 'find-doctors' && (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900">Find Practitioners</h2>
              <p className="text-slate-600 text-sm mt-2">Search and book appointments with verified practitioners</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="p-6 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">Find & Book Practitioners</h3>
              </div>
              <div className="p-6">
                <div className="flex gap-3 mb-6">
                  <input
                    type="text"
                    placeholder="Search by name, specialization, or location..."
                    className="flex-1 px-4 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button className="px-8 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg text-sm font-semibold hover:shadow-lg transition-all">
                    Search
                  </button>
                </div>

                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {loadingDoctors ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500 mx-auto mb-4"></div>
                      <p className="text-slate-600">Loading practitioners...</p>
                    </div>
                  ) : practitioners.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-5xl mb-4">🔍</div>
                      <h4 className="text-lg font-semibold text-slate-900 mb-2">No practitioners found</h4>
                      <p className="text-slate-600 text-sm">No verified practitioners are available at the moment</p>
                    </div>
                  ) : practitioners.map((doctor) => (
                    <div key={doctor.id} className="p-5 bg-slate-50 rounded-lg border border-slate-200 hover:bg-white hover:border-green-500 hover:shadow-md transition-all">
                      <div className="flex gap-4 mb-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-2xl flex-shrink-0">
                          {(doctor.userName || 'Dr').split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-base font-semibold text-slate-900 mb-1">{doctor.userName || 'Practitioner'}</h4>
                          <div className="flex gap-2 flex-wrap mb-2">
                            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                              {doctor.specialization || 'General'}
                            </span>
                          </div>
                          <div className="flex gap-4 text-sm text-slate-600">
                            <span className="flex items-center gap-1">⭐ {doctor.rating || 'N/A'}</span>
                            <span className="flex items-center gap-1">🎓 {doctor.experience || 'N/A'}</span>
                            {doctor.qualifications && <span className="flex items-center gap-1">📋 {doctor.qualifications}</span>}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleBookAppointment(doctor.id)}
                        disabled={bookingPractitionerId === doctor.id}
                        className="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                      >
                        {bookingPractitionerId === doctor.id ? 'Sending Request...' : 'Book Appointment'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ===== NEW: Browse Sessions Section ===== */}
        {activeSection === 'browse-sessions' && (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900">Browse Available Sessions</h2>
              <p className="text-slate-600 text-sm mt-2">View practitioner calendars and book available time slots</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Practitioners List */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Select Practitioner</h3>
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {loadingDoctors ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-2"></div>
                      <p className="text-sm text-slate-600">Loading...</p>
                    </div>
                  ) : practitioners.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-2">👨‍⚕️</div>
                      <p className="text-sm text-slate-600">No practitioners available</p>
                    </div>
                  ) : practitioners.map((pract) => (
                    <div
                      key={pract.id}
                      onClick={() => setSelectedPractitioner(pract)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedPractitioner?.id === pract.id
                        ? 'border-green-500 bg-green-50'
                        : 'border-slate-200 hover:border-green-300 hover:bg-slate-50'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
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
            <div className="mb-8 flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">My Sessions</h2>
                <p className="text-slate-600 text-sm mt-2">View and manage your therapy sessions</p>
              </div>
              <button
                onClick={() => setActiveSection('browse-sessions')}
                className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg text-sm font-semibold hover:shadow-lg transition-all"
              >
                📅 Book New Session
              </button>
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
              const today = new Date().toISOString().split('T')[0];
              const filtered = sessions.filter(s => {
                if (sessionFilter === 'upcoming') return s.sessionDate >= today && s.status === 'BOOKED';
                if (sessionFilter === 'past') return s.sessionDate < today || s.status === 'COMPLETED';
                if (sessionFilter === 'cancelled') return s.status === 'CANCELLED' || s.status === 'RESCHEDULED';
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
                  {sessions.filter(s => s.status === 'BOOKED').length}
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-semibold text-slate-600 uppercase mb-2">Completed</h3>
                <p className="text-3xl font-bold text-blue-600">
                  {sessions.filter(s => s.status === 'COMPLETED').length}
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-semibold text-slate-600 uppercase mb-2">Cancelled</h3>
                <p className="text-3xl font-bold text-red-600">
                  {sessions.filter(s => s.status === 'CANCELLED').length}
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
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${booking.status === 'BOOKED' ? 'bg-green-100 text-green-800' :
                          booking.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                            booking.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                          }`}>
                          {booking.status}
                        </span>
                        <p className="text-sm font-bold text-slate-900 mt-2">
                          ${booking.price || '75'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ===== NEW: Calendar View Section ===== */}
        {activeSection === 'calendar' && (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900">Calendar View</h2>
              <p className="text-slate-600 text-sm mt-2">Visual calendar of all your sessions and appointments</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="mb-6 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {sessions.filter(s => s.status === 'BOOKED').length} upcoming sessions
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-all">
                    ← Previous
                  </button>
                  <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-all">
                    Next →
                  </button>
                  <button
                    onClick={() => setActiveSection('browse-sessions')}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 transition-all"
                  >
                    + Book Session
                  </button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {/* Day Headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center font-semibold text-slate-700 text-sm py-2">
                    {day}
                  </div>
                ))}

                {/* Calendar Days */}
                {Array.from({ length: 35 }, (_, i) => {
                  const today = new Date();
                  const dayDate = new Date(today.getFullYear(), today.getMonth(), i - today.getDay() + 1);
                  const dayNum = dayDate.getDate();
                  const isToday = dayDate.toDateString() === today.toDateString();
                  const hasSession = sessions.some(s =>
                    s.sessionDate && new Date(s.sessionDate).toDateString() === dayDate.toDateString()
                  );

                  return (
                    <div
                      key={i}
                      className={`aspect-square border rounded-lg p-2 transition-all ${isToday ? 'border-green-500 bg-green-50' :
                        hasSession ? 'border-blue-300 bg-blue-50' :
                          'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                        } cursor-pointer`}
                    >
                      <div className="text-right">
                        <span className={`text-sm font-medium ${isToday ? 'text-green-700' : 'text-slate-700'
                          }`}>
                          {dayNum}
                        </span>
                      </div>
                      {hasSession && (
                        <div className="mt-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mx-auto"></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-6 flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-50 border-2 border-green-500 rounded"></div>
                  <span className="text-slate-600">Today</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-50 border-2 border-blue-300 rounded flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  </div>
                  <span className="text-slate-600">Has Session</span>
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
                    const today = new Date();
                    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                    return sessionDate >= today && sessionDate <= weekFromNow;
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
                            {session.sessionDate && new Date(session.sessionDate).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric'
                            })}
                            {session.sessionTime && ` • ${session.sessionTime}`}
                          </p>
                        </div>
                      </div>
                      <button className="px-4 py-2 bg-green-500 text-white rounded-lg text-xs font-semibold hover:bg-green-600 transition-all">
                        View Details
                      </button>
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
        )}

        {/* All other existing sections remain UNCHANGED */}
        {/* Orders, Wellness, Messages, Profile, Settings sections stay exactly as they were */}

        {activeSection === 'orders' && (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900">Medicine Orders</h2>
              <p className="text-slate-600 text-sm mt-2">Track your medicine orders and purchase history</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-900">Order History</h3>
                <div className="flex gap-2">
                  {['All', 'In Transit', 'Delivered'].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setOrderFilter(filter.toLowerCase().replace(' ', '-'))}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${orderFilter === filter.toLowerCase().replace(' ', '-')
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
                {[
                  { id: 'ORD-2024', product: 'Organic Ashwagandha Supplement', qty: '2 bottles', date: 'Feb 8, 2026', price: 89.99, status: 'in-transit', icon: '🌿' },
                  { id: 'ORD-2018', product: 'Premium Yoga Mat Bundle', qty: '1 set', date: 'Feb 3, 2026', price: 129.99, status: 'delivered', icon: '🧘' },
                  { id: 'ORD-2012', product: 'Turmeric Curcumin Capsules', qty: '3 bottles', date: 'Jan 25, 2026', price: 54.99, status: 'delivered', icon: '💊' },
                  { id: 'ORD-2005', product: 'Essential Oil Diffuser Set', qty: '1 set', date: 'Jan 15, 2026', price: 79.99, status: 'delivered', icon: '🌸' },
                ].map((order, idx) => (
                  <div key={idx} className="p-5 bg-slate-50 rounded-lg border border-slate-200 hover:bg-white hover:shadow-md transition-all">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm font-bold text-slate-900">{order.id}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${order.status === 'in-transit'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                        }`}>
                        {order.status === 'in-transit' ? 'In Transit' : 'Delivered'}
                      </span>
                    </div>
                    <div className="flex gap-4 mb-4">
                      <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-lg flex items-center justify-center text-3xl flex-shrink-0">
                        {order.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-base font-semibold text-slate-900 mb-1">{order.product}</h4>
                        <p className="text-sm text-slate-600 mb-2">Quantity: {order.qty}</p>
                        <p className="text-xs text-slate-500">Ordered on {order.date}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                      <span className="text-xl font-bold text-slate-900">${order.price}</span>
                      <button className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${order.status === 'in-transit'
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-green-500 text-white hover:bg-green-600'
                        }`}>
                        {order.status === 'in-transit' ? 'Track Order' : 'Reorder'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeSection === 'wellness' && (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-slate-900">Wellness Tracking</h2>
              <p className="text-slate-600 text-sm mt-2">Monitor your wellness journey and progress</p>
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
              <h2 className="text-3xl font-bold text-slate-900">Messages</h2>
              <p className="text-slate-600 text-sm mt-2">Chat with your practitioners and support team</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="text-center py-20">
                <div className="text-6xl mb-4">💬</div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">No messages yet</h3>
                <p className="text-slate-600 text-sm">Your conversations with practitioners will appear here</p>
              </div>
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
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Address</label>
                      <textarea
                        value={editData.address}
                        onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[80px] resize-none"
                        placeholder="Enter your address"
                      />
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
    </div>
  );
}