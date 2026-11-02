import React, { useEffect, useState } from 'react';
import {
  Star,
  CheckCircle2,
  Send,
  MessageSquare,
  ThumbsUp,
  Award,
  AlertCircle,
} from 'lucide-react';
import api from '../services/api';
import StarRating from '../components/StarRating';

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ average_rating: 4.9, total_reviews: 4 });
  const [loading, setLoading] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    customer_name: '',
    reference_code: '',
    rating: 5,
    comment: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await api.reviews.getApproved();
      if (res.success && res.data) {
        setReviews(res.data.reviews || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await api.reviews.submit({
        customer_name: formData.customer_name,
        reference_code: formData.reference_code,
        rating: formData.rating,
        comment: formData.comment,
      });

      if (res.success) {
        setSuccessMsg('Thank you! Your review has been submitted and published successfully.');
        setFormData({ customer_name: '', reference_code: '', rating: 5, comment: '' });
        fetchReviews();
      } else {
        throw new Error(res.message || 'Failed to submit review.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Please provide your booking reference code to verify your review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Banner */}
      <section style={{ backgroundColor: 'var(--primary-navy)', color: '#ffffff', padding: '4rem 0', textAlign: 'center' }}>
        <div className="container">
          <span className="section-tag" style={{ backgroundColor: 'rgba(56, 189, 248, 0.2)', color: '#38BDF8' }}>
            Verified Homeowner Testimonials
          </span>
          <h1 style={{ fontSize: '2.8rem', fontWeight: 800, marginTop: '0.75rem', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            Customer Reviews & Ratings
          </h1>
          <p style={{ color: '#CBD5E1', fontSize: '1.1rem', maxWidth: '650px', margin: '0 auto' }}>
            Discover why thousands of homeowners and businesses count on CoolAir Pro for reliable cooling solutions.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {/* Rating Summary Bar */}
          <div className="card" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            flexWrap: 'wrap',
            gap: '2rem',
            padding: '2.5rem',
            marginBottom: '3.5rem',
            backgroundColor: '#F0F9FF',
            border: '2px solid #BAE6FD',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3.2rem', fontWeight: 800, color: 'var(--primary-navy)', lineHeight: 1 }}>
                {stats.average_rating || '4.9'}
              </div>
              <div style={{ margin: '0.5rem 0' }}>
                <StarRating rating={stats.average_rating || 5} size={20} />
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Based on {stats.total_reviews || reviews.length} verified reviews
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '240px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}>
                <CheckCircle2 size={18} color="#10B981" />
                <span>99% On-Time Arrival Guarantee</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}>
                <CheckCircle2 size={18} color="#10B981" />
                <span>100% Licensed & EPA Certified Staff</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}>
                <CheckCircle2 size={18} color="#10B981" />
                <span>90-Day Parts & Labor Warranty</span>
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '3rem',
            alignItems: 'start',
          }}>
            {/* Reviews List */}
            <div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '1.5rem' }}>
                Recent Customer Reviews ({reviews.length})
              </h2>

              {loading ? (
                <div style={{ color: 'var(--text-muted)' }}>Loading reviews...</div>
              ) : reviews.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  No reviews submitted yet. Be the first to share your experience!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {reviews.map((rev) => (
                    <div key={rev.id} className="card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div>
                          <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
                            {rev.customer_name}
                          </h4>
                          <span style={{ fontSize: '0.8rem', color: 'var(--primary-blue)', fontWeight: 600 }}>
                            {rev.service_name || 'AC Service'}
                          </span>
                        </div>
                        <StarRating rating={rev.rating} size={18} />
                      </div>

                      <p style={{ color: '#334155', fontSize: '0.95rem', lineHeight: '1.6', fontStyle: 'italic', marginBottom: '0.75rem' }}>
                        "{rev.comment}"
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#10B981', fontWeight: 700 }}>
                        <CheckCircle2 size={14} />
                        <span>Verified Service Booking</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Review Card */}
            <div style={{ position: 'sticky', top: '90px' }}>
              <div className="card" style={{ border: '2px solid #E2E8F0' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '0.5rem' }}>
                  Leave a Service Review
                </h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  Have you recently booked with CoolAir Pro? Enter your booking reference (e.g. <strong>AC-78A1B2</strong>) to share your feedback.
                </p>

                {successMsg && (
                  <div style={{ backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', padding: '0.85rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
                    {successMsg}
                  </div>
                )}

                {errorMsg && (
                  <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', padding: '0.85rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.9rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <AlertCircle size={16} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label className="form-label">Your Name *</label>
                    <input
                      type="text"
                      value={formData.customer_name}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                      placeholder="E.g. Helena Troy"
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Booking Reference Code (or ID) *</label>
                    <input
                      type="text"
                      value={formData.reference_code}
                      onChange={(e) => setFormData({ ...formData, reference_code: e.target.value })}
                      placeholder="E.g. AC-44K7L8 or AC-78A1B2"
                      className="form-input"
                      style={{ textTransform: 'uppercase' }}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Your Rating (1 to 5 Stars)</label>
                    <StarRating rating={formData.rating} interactive onRate={(r) => setFormData({ ...formData, rating: r })} size={24} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Your Review & Comments *</label>
                    <textarea
                      value={formData.comment}
                      onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                      placeholder="How was the AC repair? Was the technician polite and on time?"
                      className="form-textarea"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '0.85rem' }}
                  >
                    <Send size={16} />
                    <span>{submitting ? 'Submitting Review...' : 'Publish Customer Review'}</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
