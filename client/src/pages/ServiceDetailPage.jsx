import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Phone,
  ArrowLeft,
  Wrench,
  Sparkles,
  Gauge,
  Flame,
  Building2,
  AlertCircle,
} from 'lucide-react';
import api from '../services/api';
import { useSettings } from '../context/SettingsContext';
import StarRating from '../components/StarRating';

export default function ServiceDetailPage() {
  const { slug } = useParams();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const [service, setService] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadService() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.services.getBySlug(slug);
        if (res.success && res.data) {
          setService(res.data);
          // Load service reviews
          const reviewsRes = await api.reviews.getApproved(res.data.id);
          if (reviewsRes.success) {
            setReviews(reviewsRes.data?.reviews || []);
          }
        } else {
          setError('Service not found.');
        }
      } catch (err) {
        setError('Failed to load service details.');
      } finally {
        setLoading(false);
      }
    }
    loadService();
  }, [slug]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '6rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading service details...
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="container" style={{ padding: '6rem 0', textAlign: 'center' }}>
        <AlertCircle size={48} color="#EF4444" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '0.5rem' }}>
          Service Not Found
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          The requested AC service could not be located or may have been renamed.
        </p>
        <Link to="/services" className="btn btn-primary">
          <ArrowLeft size={16} /> Back to Services
        </Link>
      </div>
    );
  }

  // Work inclusions based on service type
  const inclusions = [
    'Complete system multi-point safety & diagnostic audit',
    'Certified EPA & NATE technician with fully equipped service van',
    'Inspection of electrical contacts, capacitors, and fan motor',
    'Testing suction and discharge refrigerant operating pressures',
    'Indoor air filter inspection and dust sanitization',
    'Thermometer temperature differential verification across vents',
    '90-Day complete warranty on all labor and installed parts',
  ];

  return (
    <div>
      {/* Breadcrumb / Top Bar */}
      <section style={{ backgroundColor: 'var(--primary-navy)', color: '#ffffff', padding: '3.5rem 0' }}>
        <div className="container">
          <Link
            to="/services"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#38BDF8', fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem' }}
          >
            <ArrowLeft size={16} /> Back to all services
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span className="badge badge-confirmed">
              {service.category === 'both' ? 'Residential & Commercial' : service.category.toUpperCase()}
            </span>
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.75rem' }}>
            {service.name}
          </h1>
          <p style={{ color: '#CBD5E1', fontSize: '1.1rem', maxWidth: '750px' }}>
            {service.short_description}
          </p>
        </div>
      </section>

      {/* Main Details & Booking Sidebar */}
      <section className="section">
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '3rem',
            alignItems: 'start',
          }}>
            {/* Left Content */}
            <div>
              <div className="card" style={{ marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '1rem' }}>
                  Service Overview & Scope of Work
                </h2>
                <p style={{ color: '#334155', fontSize: '1.05rem', lineHeight: '1.7', marginBottom: '1.5rem' }}>
                  {service.description}
                </p>

                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '1rem' }}>
                  What's Included in This Service:
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {inclusions.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                      <CheckCircle2 size={20} color="#10B981" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span style={{ fontSize: '0.95rem', color: '#1E293B' }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Service Reviews */}
              {reviews.length > 0 && (
                <div className="card">
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '1rem' }}>
                    Customer Feedback for this Service ({reviews.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {reviews.map((rev) => (
                      <div key={rev.id} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                          <span style={{ fontWeight: 700, color: 'var(--primary-navy)' }}>{rev.customer_name}</span>
                          <StarRating rating={rev.rating} />
                        </div>
                        <p style={{ fontSize: '0.9rem', color: '#475569', fontStyle: 'italic' }}>
                          "{rev.comment}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Action / Pricing Card */}
            <div style={{ position: 'sticky', top: '90px' }}>
              <div className="card" style={{ border: '2px solid #BAE6FD', boxShadow: 'var(--card-shadow-hover)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{service.price_label}</span>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
                      ${service.price_starting}
                    </span>
                  </div>
                </div>

                <div style={{ backgroundColor: '#F8FAFC', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {service.duration && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Estimated Duration:</span>
                      <strong style={{ color: 'var(--primary-navy)' }}>{service.duration}</strong>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Warranty:</span>
                    <strong style={{ color: '#10B981' }}>90-Day Guarantee</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Technician:</span>
                    <strong style={{ color: 'var(--primary-navy)' }}>Certified Master HVAC</strong>
                  </div>
                </div>

                <Link
                  to={`/book?service=${service.id}`}
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%', marginBottom: '0.75rem' }}
                >
                  <CalendarCheck size={20} />
                  <span>Book This Service</span>
                </Link>

                <a
                  href={`tel:${settings.business_phone?.replace(/[^\d+]/g, '')}`}
                  className="btn btn-secondary"
                  style={{ width: '100%' }}
                >
                  <Phone size={18} />
                  <span>Call: {settings.business_phone}</span>
                </a>

                <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#64748B', fontSize: '0.85rem' }}>
                  <ShieldCheck size={18} color="#10B981" />
                  <span>Transparent upfront quote. No work without your approval.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
