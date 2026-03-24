import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAccessToken } from '../services/authService';
import { getVerifiedPractitioners } from '../services/userService';
import SessionCalendar from '../components/SessionCalendar';
import BookingForm from '../components/BookingForm';
import { getPractitionerReviews } from '../services/reviewService';
import toast from 'react-hot-toast';

const SPECIALIZATIONS = ['All', 'Ayurveda', 'Physiotherapy', 'Yoga Therapy', 'Naturopathy', 'Meditation', 'Nutrition'];

export default function BrowseSessions() {
  const navigate = useNavigate();
  const [practitioners, setPractitioners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [specFilter, setSpecFilter] = useState('All');
  const [selectedPractitioner, setSelectedPractitioner] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) { navigate('/login'); return; }
    getVerifiedPractitioners()
      .then(data => setPractitioners(data))
      .catch(() => toast.error('Failed to load practitioners'))
      .finally(() => setLoading(false));
  }, [navigate]);

  const filtered = practitioners.filter(p => {
    const matchSearch = !search ||
      (p.userName || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.specialization || '').toLowerCase().includes(search.toLowerCase());
    const matchSpec = specFilter === 'All' ||
      (p.specialization || '').toLowerCase().includes(specFilter.toLowerCase());
    return matchSearch && matchSpec;
  });

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
  };

  // Load reviews when practitioner is selected
  useEffect(() => {
    if (!selectedPractitioner) { setReviews([]); return; }
    setReviewsLoading(true);
    getPractitionerReviews(selectedPractitioner.id)
      .then(data => setReviews(data))
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false));
  }, [selectedPractitioner]);

  const handleConfirmBooking = () => {
    if (!selectedSlot) {
      toast.error('Please select a time slot first');
      return;
    }
    setShowBookingForm(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
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
              <h1 className="text-xl font-bold text-slate-900">Browse Sessions</h1>
              <p className="text-xs text-slate-500">Find and book therapy sessions with verified practitioners</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span>{practitioners.length} practitioners available</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Search by name or specialization..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
            />
          </div>
        </div>

        {/* Specialization Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-8">
          {SPECIALIZATIONS.map(s => (
            <button
              key={s}
              onClick={() => setSpecFilter(s)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${specFilter === s
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-teal-300 hover:text-teal-700'
                }`}
            >
              {s}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {Array(4).fill(null).map((_, i) => (
              <div key={i} className="space-y-4 animate-pulse">
                <div className="bg-white rounded-2xl h-24 w-full shadow-sm" />
                <div className="bg-white rounded-2xl h-24 w-full shadow-sm" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* Left — Practitioners List */}
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                {filtered.length} Practitioners Found
              </h2>

              {filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center shadow-sm">
                  <div className="text-5xl mb-4">🔍</div>
                  <p className="text-slate-700 font-semibold">No practitioners found</p>
                  <p className="text-slate-400 text-sm mt-1">Try adjusting your search or filters</p>
                </div>
              ) : (
                filtered.map(p => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedPractitioner(p);
                      setSelectedSlot(null);
                    }}
                    className={`bg-white rounded-2xl border-2 p-5 cursor-pointer transition-all hover:shadow-lg ${selectedPractitioner?.id === p.id
                        ? 'border-teal-500 shadow-lg shadow-teal-100/50'
                        : 'border-transparent shadow-sm hover:border-teal-200'
                      }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-700 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {(p.userName || 'Dr').split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-bold text-slate-900 truncate">{p.userName || 'Practitioner'}</h3>
                          {selectedPractitioner?.id === p.id && (
                            <span className="flex-shrink-0 px-2 py-0.5 bg-teal-100 text-teal-700 text-xs font-semibold rounded-full">
                              Selected ✓
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-1.5">
                          <span className="px-2.5 py-0.5 bg-teal-50 text-teal-700 text-xs font-medium rounded-full border border-teal-100">
                            {p.specialization || 'General Wellness'}
                          </span>
                          {p.experience && (
                            <span className="px-2.5 py-0.5 bg-slate-50 text-slate-600 text-xs rounded-full border border-slate-100">
                              🎓 {p.experience}
                            </span>
                          )}
                          {p.rating && (
                            <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full border border-amber-100">
                              ⭐ {p.rating}
                            </span>
                          )}
                        </div>
                        {p.qualifications && (
                          <p className="text-xs text-slate-500 mt-1.5 line-clamp-1">📋 {p.qualifications}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-400">Click to view available slots</span>
                      <span className="text-xs font-semibold text-teal-600">
                        {selectedPractitioner?.id === p.id ? 'Pick a time slot →' : 'View slots →'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Right — Calendar + Slot Picker */}
            <div className="lg:sticky lg:top-24 self-start space-y-4">
              {!selectedPractitioner ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center shadow-sm">
                  <div className="text-5xl mb-4">👈</div>
                  <p className="text-slate-700 font-semibold">Select a practitioner</p>
                  <p className="text-slate-400 text-sm mt-1">Their available slots will appear here</p>
                </div>
              ) : (
                <>
                  {/* Practitioner Banner */}
                  <div className="bg-gradient-to-r from-teal-600 to-teal-700 p-4 rounded-2xl text-white flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold text-sm">
                      {(selectedPractitioner.userName || 'Dr').split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <h3 className="font-bold">{selectedPractitioner.userName}</h3>
                      <p className="text-teal-100 text-sm">{selectedPractitioner.specialization}</p>
                    </div>
                  </div>

                  {/* SessionCalendar */}
                  <SessionCalendar
                    practitionerId={selectedPractitioner.id}
                    onSlotSelect={handleSlotSelect}
                  />

                  {/* Confirm Booking */}
                  {selectedSlot && (
                    <div className="bg-white rounded-2xl border-2 border-teal-200 p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-teal-500"></div>
                        <p className="text-sm font-semibold text-slate-800">
                          Selected: {selectedSlot.date} at {selectedSlot.time}
                        </p>
                      </div>
                      <button
                        onClick={handleConfirmBooking}
                        className="w-full py-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-teal-200 transition-all"
                      >
                        Confirm Booking →
                      </button>
                    </div>
                  )}

                  {/* Reviews Section */}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                      ⭐ Reviews
                      {reviews.length > 0 && (
                        <span className="text-xs font-normal text-slate-500">({reviews.length})</span>
                      )}
                    </h3>
                    {reviewsLoading ? (
                      <p className="text-sm text-slate-400">Loading reviews...</p>
                    ) : reviews.length === 0 ? (
                      <p className="text-sm text-slate-400">No reviews yet</p>
                    ) : (
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {reviews.map(review => (
                          <div key={review.id} className="border-b border-slate-100 pb-3 last:border-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-semibold text-slate-800">{review.userName}</span>
                              <span className="text-xs text-amber-500 font-semibold">
                                {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                              </span>
                            </div>
                            {review.comment && (
                              <p className="text-xs text-slate-600 leading-relaxed">{review.comment}</p>
                            )}
                            <p className="text-xs text-slate-400 mt-1">
                              {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* BookingForm Modal */}
      {showBookingForm && selectedSlot && selectedPractitioner && (
        <BookingForm
          practitionerId={selectedPractitioner.id}
          practitionerName={selectedPractitioner.userName}
          consultationFee={selectedPractitioner.consultationFee}
          selectedSlot={selectedSlot}
          onSuccess={() => {
            toast.success('Session booked successfully!');
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
  );
}