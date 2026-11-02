import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  CheckCircle2,
  Clock,
  User,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
  Wrench,
  Star,
  Send,
  ShieldCheck,
} from 'lucide-react';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import StarRating from '../components/StarRating';
import { useSettings } from '../context/SettingsContext';

export default function BookingStatusPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRef = searchParams.get('ref') || '';

  const { settings } = useSettings();
  const [referenceCode, setReferenceCode] = useState(initialRef);
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Review submission state for completed bookings
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  useEffect(() => {
    if (initialRef) {
      handleSearch(initialRef);
    }
  }, [initialRef]);

  const handleSearch = async (codeToSearch) => {
    const code = (codeToSearch || referenceCode).trim().toUpperCase();
    if (!code) {
      setError('Please enter a booking reference code.');
      return;
    }

    setError(null);
    setLoading(true);
    setReviewSuccess(false);

    try {
      const res = await api.bookings.getStatus(code);
      if (res.success && res.data) {
        setBooking(res.data);
        setSearchParams({ ref: code });
      } else {
        setError(`No booking found matching reference "${code}".`);
        setBooking(null);
      }
    } catch (err) {
      setError(err.message || `No booking found for code "${code}".`);
      setBooking(null);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!booking) return;

    setReviewSubmitting(true);
    try {
      const res = await api.reviews.submit({
        booking_id: booking.id,
        reference_code: booking.reference_code,
        service_id: booking.service_id,
        customer_name: booking.customer_name,
        rating: reviewRating,
        comment: reviewComment,
      });

      if (res.success) {
        setReviewSuccess(true);
        setReviewComment('');
      }
    } catch (err) {
      alert(err.message || 'Failed to submit review.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Status progression mapping
  const statuses = ['pending', 'confirmed', 'assigned', 'in_progress', 'completed'];
  const currentStep = statuses.indexOf(booking?.status?.toLowerCase()) >= 0
    ? statuses.indexOf(booking?.status?.toLowerCase())
    : 0;

  return (
    <div>
      {/* Banner */}
      <section style={{ backgroundColor: 'var(--primary-navy)', color: '#ffffff', padding: '3.5rem 0', textAlign: 'center' }}>
        <div className="container">
          <span className="section-tag" style={{ backgroundColor: 'rgba(56, 189, 248, 0.2)', color: '#38BDF8' }}>
            Live Appointment Tracking
          </span>
          <h1 style={{ fontSize: '2.6rem', fontWeight: 800, marginTop: '0.75rem', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
            Check Your Booking Status
          </h1>
          <p style={{ color: '#CBD5E1', fontSize: '1.05rem', maxWidth: '600px', margin: '0 auto' }}>
            Enter your booking reference code (e.g. <strong>AC-78A1B2</strong>) to view scheduled appointment updates and assigned technician details.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ maxWidth: '820px' }}>
          {/* Search Box */}
          <div className="card" style={{ marginBottom: '2.5rem', padding: '1.75rem' }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch(referenceCode);
              }}
              style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}
            >
              <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
                <input
                  type="text"
                  value={referenceCode}
                  onChange={(e) => setReferenceCode(e.target.value)}
                  placeholder="Enter Reference (e.g. AC-78A1B2)"
                  className="form-input"
                  style={{ textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}
                />
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '0.75rem 1.75rem' }}>
                <Search size={18} />
                <span>{loading ? 'Searching...' : 'Track Status'}</span>
              </button>
            </form>

            {error && (
              <div style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#991B1B',
                padding: '0.85rem 1rem',
                borderRadius: '8px',
                marginTop: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                fontSize: '0.9rem',
              }}>
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Booking Result View */}
          {booking && (
            <div className="card animate-fade-in" style={{ padding: '2.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Booking Reference</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary-navy)', letterSpacing: '0.05em' }}>
                    {booking.reference_code}
                  </div>
                </div>
                <div>
                  <StatusBadge status={booking.status} />
                </div>
              </div>

              {/* Progress Stepper */}
              {booking.status !== 'cancelled' && booking.status !== 'rejected' && (
                <div style={{ marginBottom: '2.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginBottom: '1.5rem' }}>
                    {/* Background line */}
                    <div style={{
                      position: 'absolute',
                      top: '18px',
                      left: '10%',
                      right: '10%',
                      height: '4px',
                      backgroundColor: '#E2E8F0',
                      zIndex: 0,
                    }}>
                      <div style={{
                        height: '100%',
                        backgroundColor: '#10B981',
                        width: `${(currentStep / (statuses.length - 1)) * 100}%`,
                        transition: 'width 0.3s ease',
                      }} />
                    </div>

                    {['Requested', 'Confirmed', 'Assigned', 'In Progress', 'Completed'].map((label, idx) => {
                      const isPast = idx <= currentStep;
                      const isCurrent = idx === currentStep;

                      return (
                        <div key={label} style={{ textAlign: 'center', zIndex: 1 }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: isPast ? '#10B981' : '#ffffff',
                            color: isPast ? '#ffffff' : '#94A3B8',
                            border: isCurrent ? '3px solid #0284C7' : isPast ? '2px solid #10B981' : '2px solid #E2E8F0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 0.5rem',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                          }}>
                            {isPast ? '✓' : idx + 1}
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: isCurrent ? 800 : 600, color: isCurrent ? 'var(--primary-navy)' : 'var(--text-muted)' }}>
                            {label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Appointment Details Grid */}
              <div className="grid-2" style={{ marginBottom: '2rem' }}>
                <div style={{ backgroundColor: '#F8FAFC', padding: '1.25rem', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Booked Service</div>
                  <div style={{ fontWeight: 800, color: 'var(--primary-navy)', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                    {booking.service_name}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#475569' }}>
                    Unit: {booking.ac_brand || 'Standard'} ({booking.ac_type || 'AC'})
                  </div>
                  {booking.total_price && (
                    <div style={{ fontSize: '0.9rem', color: 'var(--primary-blue)', fontWeight: 700, marginTop: '0.5rem' }}>
                      Estimated Fee: ${booking.total_price}
                    </div>
                  )}
                </div>

                <div style={{ backgroundColor: '#F8FAFC', padding: '1.25rem', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Scheduled Time & Location</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '0.35rem' }}>
                    <Calendar size={16} color="var(--primary-blue)" />
                    <span>{booking.preferred_date}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', color: '#475569', marginBottom: '0.35rem' }}>
                    <Clock size={16} color="var(--primary-blue)" />
                    <span>{booking.preferred_time}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', color: '#475569' }}>
                    <MapPin size={16} color="var(--primary-blue)" />
                    <span>{booking.address}, {booking.city}</span>
                  </div>
                </div>
              </div>

              {/* Problem Description */}
              {booking.problem_description && (
                <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#F1F5F9', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Problem Notes:</span>
                  <p style={{ fontSize: '0.95rem', color: '#334155', marginTop: '0.25rem' }}>
                    {booking.problem_description}
                  </p>
                </div>
              )}

              {/* Assigned Technician Card */}
              {booking.technician ? (
                <div style={{
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  marginBottom: '2rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--primary-blue)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={24} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-blue)', textTransform: 'uppercase' }}>
                        Assigned Master Technician
                      </span>
                      <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
                        {booking.technician.name}
                      </h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Certified HVAC Specialist</p>
                    </div>
                  </div>

                  {booking.technician.phone && (
                    <a
                      href={`tel:${booking.technician.phone.replace(/[^\d+]/g, '')}`}
                      className="btn btn-primary btn-sm"
                    >
                      <Phone size={15} />
                      <span>Call Technician</span>
                    </a>
                  )}
                </div>
              ) : (
                <div style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', fontSize: '0.9rem', color: '#92400E' }}>
                  Technician assignment is in progress. You will receive an SMS/call once assigned.
                </div>
              )}

              {/* Leave Review Prompt if Completed */}
              {booking.status === 'completed' && (
                <div style={{ borderTop: '2px dashed var(--border-color)', paddingTop: '2rem', marginTop: '2rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '0.5rem' }}>
                    How Was Your AC Service?
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                    Share your experience with our technician to help us maintain 5-star service standards.
                  </p>

                  {reviewSuccess ? (
                    <div style={{ backgroundColor: '#ECFDF5', color: '#065F46', padding: '1rem', borderRadius: '8px', fontWeight: 600 }}>
                      ✓ Thank you! Your review has been submitted and posted to our website.
                    </div>
                  ) : (
                    <form onSubmit={handleReviewSubmit}>
                      <div className="form-group">
                        <label className="form-label">Rate Your Experience</label>
                        <StarRating rating={reviewRating} interactive onRate={setReviewRating} size={24} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Comments & Feedback</label>
                        <textarea
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="Tell us how the technician performed, coolness of air, punctuality..."
                          className="form-textarea"
                          required
                        />
                      </div>
                      <button type="submit" disabled={reviewSubmitting} className="btn btn-primary btn-sm">
                        <Send size={15} />
                        <span>{reviewSubmitting ? 'Submitting...' : 'Post Verified Review'}</span>
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Need Help Box */}
              <div style={{ textAlign: 'center', marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Need to reschedule or update your address? Call dispatch directly at{' '}
                <a href={`tel:${settings.business_phone?.replace(/[^\d+]/g, '')}`} style={{ color: 'var(--primary-blue)', fontWeight: 700 }}>
                  {settings.business_phone}
                </a>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
