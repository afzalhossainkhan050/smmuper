import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  CalendarCheck,
  CheckCircle2,
  Clock,
  Phone,
  MapPin,
  AlertCircle,
  Copy,
  Check,
  ShieldAlert,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

export default function BookingPage() {
  const [searchParams] = useSearchParams();
  const preselectedServiceId = searchParams.get('service');
  const packageName = searchParams.get('package');

  const { user } = useAuth();
  const { settings } = useSettings();

  const [services, setServices] = useState([]);
  const [loadingServices, setLoadingServices] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    service_id: preselectedServiceId || '',
    customer_name: user?.name || '',
    customer_email: user?.email || '',
    customer_phone: user?.phone || '',
    address: '',
    city: settings.business_city || 'Metro City',
    preferred_date: '',
    preferred_time: '10:00 AM - 12:00 PM',
    ac_brand: 'Daikin',
    ac_type: 'Split AC',
    problem_description: packageName ? `Inquiry / Booking for ${packageName} AMC Package` : '',
    is_emergency: false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [bookingSuccess, setBookingSuccess] = useState(null);
  const [copied, setCopied] = useState(false);

  // Tomorrow's date string for min date in picker
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDateStr = tomorrow.toISOString().split('T')[0];

  useEffect(() => {
    async function fetchServices() {
      try {
        const res = await api.services.getAll();
        if (res.success && res.data) {
          setServices(res.data);
          if (!formData.service_id && res.data.length > 0) {
            setFormData((prev) => ({
              ...prev,
              service_id: preselectedServiceId || String(res.data[0].id),
            }));
          }
        }
      } catch (err) {
        console.error('Failed to load services for booking:', err);
      } finally {
        setLoadingServices(false);
      }
    }
    fetchServices();
  }, [preselectedServiceId]);

  // Update user prefill if user logs in
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        customer_name: prev.customer_name || user.name || '',
        customer_email: prev.customer_email || user.email || '',
        customer_phone: prev.customer_phone || user.phone || '',
      }));
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (!formData.service_id) {
        throw new Error('Please select an AC service.');
      }
      if (!formData.preferred_date) {
        throw new Error('Please select an appointment date.');
      }

      // If emergency is flagged, note in problem description
      const payload = {
        ...formData,
        problem_description: formData.is_emergency
          ? `[EMERGENCY PRIORITY] ${formData.problem_description}`
          : formData.problem_description,
      };

      const res = await api.bookings.create(payload);
      if (res.success && res.data) {
        setBookingSuccess(res.data);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        throw new Error(res.message || 'Booking submission failed.');
      }
    } catch (err) {
      setError(err.message || 'Failed to submit appointment. Please check all fields.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const timeSlots = [
    '08:00 AM - 10:00 AM',
    '10:00 AM - 12:00 PM',
    '01:00 PM - 03:00 PM',
    '03:00 PM - 05:00 PM',
    '05:00 PM - 07:00 PM',
    'Emergency / As Soon As Possible',
  ];

  const acBrands = ['Daikin', 'Carrier', 'Mitsubishi Electric', 'LG', 'Trane', 'Samsung', 'Panasonic', 'Voltas', 'York', 'Other / Unsure'];
  const acTypes = ['Split AC', 'Window AC', 'Multi-Split System', 'Central Ducted HVAC', 'Cassette Ceiling AC', 'Package Unit'];

  const selectedService = services.find((s) => String(s.id) === String(formData.service_id));

  return (
    <div>
      {/* Banner */}
      <section style={{ backgroundColor: 'var(--primary-navy)', color: '#ffffff', padding: '3.5rem 0', textAlign: 'center' }}>
        <div className="container">
          <span className="section-tag" style={{ backgroundColor: 'rgba(56, 189, 248, 0.2)', color: '#38BDF8' }}>
            Hassle-Free Online Booking
          </span>
          <h1 style={{ fontSize: '2.6rem', fontWeight: 800, marginTop: '0.75rem', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
            Book Your AC Service Appointment
          </h1>
          <p style={{ color: '#CBD5E1', fontSize: '1.05rem', maxWidth: '620px', margin: '0 auto' }}>
            Complete the form below to schedule a certified HVAC technician. You will receive an instant booking reference code.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container" style={{ maxWidth: '850px' }}>
          {/* Success Screen */}
          {bookingSuccess ? (
            <div className="card animate-fade-in" style={{ textAlign: 'center', padding: '3.5rem 2rem', border: '2px solid #A7F3D0' }}>
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                backgroundColor: '#ECFDF5',
                color: '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem',
              }}>
                <CheckCircle2 size={44} />
              </div>

              <span className="badge badge-pending" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                Booking Request Submitted (Pending Confirmation)
              </span>

              <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '0.75rem' }}>
                Thank You, {bookingSuccess.customer_name}!
              </h2>

              <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '580px', margin: '0 auto 2rem', lineHeight: '1.6' }}>
                Your appointment request for <strong>{bookingSuccess.service_name}</strong> on <strong>{bookingSuccess.preferred_date}</strong> ({bookingSuccess.preferred_time}) has been received. Our dispatch team is reviewing technician availability and will confirm shortly.
              </p>

              {/* Reference Box */}
              <div style={{
                backgroundColor: '#F8FAFC',
                border: '2px dashed #0284C7',
                borderRadius: '12px',
                padding: '1.5rem',
                maxWidth: '450px',
                margin: '0 auto 2.5rem',
              }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Your Booking Reference Code
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-navy)', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                  {bookingSuccess.reference_code}
                </div>
                <button
                  onClick={() => copyToClipboard(bookingSuccess.reference_code)}
                  className="btn btn-secondary btn-sm"
                  style={{ gap: '0.4rem', margin: '0 auto' }}
                >
                  {copied ? <Check size={16} color="#10B981" /> : <Copy size={16} />}
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Reference Code'}</span>
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <Link
                  to={`/status?ref=${bookingSuccess.reference_code}`}
                  className="btn btn-primary"
                  style={{ padding: '0.75rem 1.75rem' }}
                >
                  <CalendarCheck size={18} />
                  <span>Track Appointment Live</span>
                </Link>
                <button
                  onClick={() => {
                    setBookingSuccess(null);
                    setFormData((prev) => ({ ...prev, problem_description: '' }));
                  }}
                  className="btn btn-secondary"
                >
                  Book Another Service
                </button>
              </div>
            </div>
          ) : (
            /* Booking Form */
            <form onSubmit={handleSubmit} className="card" style={{ padding: '2.5rem' }}>
              {error && (
                <div style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  color: '#991B1B',
                  padding: '1rem',
                  borderRadius: '8px',
                  marginBottom: '1.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  fontSize: '0.925rem',
                }}>
                  <AlertCircle size={20} />
                  <span>{error}</span>
                </div>
              )}

              {/* Step 1: Service Selection */}
              <div style={{ marginBottom: '2.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--primary-blue)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
                    1
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
                    Select AC Service & Equipment Details
                  </h3>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Required AC Service *</label>
                    <select
                      name="service_id"
                      value={formData.service_id}
                      onChange={handleChange}
                      className="form-select"
                      required
                    >
                      <option value="">-- Choose an AC Service --</option>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (${s.price_starting}+)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">AC Brand</label>
                    <select
                      name="ac_brand"
                      value={formData.ac_brand}
                      onChange={handleChange}
                      className="form-select"
                    >
                      {acBrands.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">AC Unit Type</label>
                    <select
                      name="ac_type"
                      value={formData.ac_type}
                      onChange={handleChange}
                      className="form-select"
                    >
                      {acTypes.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {selectedService && (
                    <div style={{
                      backgroundColor: '#F0F9FF',
                      border: '1px solid #BAE6FD',
                      borderRadius: '8px',
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Estimated Service Base:</span>
                      <strong style={{ fontSize: '1.2rem', color: 'var(--primary-navy)' }}>
                        ${selectedService.price_starting} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)' }}>({selectedService.price_label})</span>
                      </strong>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Describe the AC Problem or Special Request</label>
                  <textarea
                    name="problem_description"
                    value={formData.problem_description}
                    onChange={handleChange}
                    className="form-textarea"
                    placeholder="E.g., AC is making rattling sound, blowing warm air, or leaking water down the wall..."
                  />
                </div>

                {/* Emergency Flag */}
                <div style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  padding: '0.85rem 1.25rem',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}>
                  <input
                    type="checkbox"
                    id="is_emergency"
                    name="is_emergency"
                    checked={formData.is_emergency}
                    onChange={handleChange}
                    style={{ width: '18px', height: '18px', accentColor: '#EF4444' }}
                  />
                  <label htmlFor="is_emergency" style={{ fontSize: '0.9rem', color: '#991B1B', fontWeight: 600, cursor: 'pointer' }}>
                    This is an Emergency (Extreme heatwave, medical priority, or complete cooling breakdown). Dispatch ASAP.
                  </label>
                </div>
              </div>

              {/* Step 2: Date & Time */}
              <div style={{ marginBottom: '2.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--primary-blue)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
                    2
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
                    Preferred Appointment Schedule
                  </h3>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Preferred Date *</label>
                    <input
                      type="date"
                      name="preferred_date"
                      min={minDateStr}
                      value={formData.preferred_date}
                      onChange={handleChange}
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Preferred Time Window *</label>
                    <select
                      name="preferred_time"
                      value={formData.preferred_time}
                      onChange={handleChange}
                      className="form-select"
                      required
                    >
                      {timeSlots.map((slot) => (
                        <option key={slot} value={slot}>{slot}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Step 3: Customer Information & Address */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--primary-blue)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem' }}>
                    3
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
                    Your Contact & Service Location
                  </h3>
                </div>

                <div className="grid-3">
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input
                      type="text"
                      name="customer_name"
                      value={formData.customer_name}
                      onChange={handleChange}
                      placeholder="E.g. Sarah Jenkins"
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone Number *</label>
                    <input
                      type="tel"
                      name="customer_phone"
                      value={formData.customer_phone}
                      onChange={handleChange}
                      placeholder="+1 (555) 000-0000"
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <input
                      type="email"
                      name="customer_email"
                      value={formData.customer_email}
                      onChange={handleChange}
                      placeholder="sarah@example.com"
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Street Address *</label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="E.g. 742 Evergreen Terrace, Apt 4B"
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">City / Area</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="Metro City"
                      className="form-input"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.75rem' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%', padding: '1rem', fontSize: '1.15rem' }}
                >
                  <CalendarCheck size={22} />
                  <span>{submitting ? 'Confirming Appointment...' : 'Submit Booking Request'}</span>
                </button>

                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', marginTop: '1.25rem', fontSize: '0.85rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                  <span>✓ No upfront payment required</span>
                  <span>✓ Free cancellation up to 4h prior</span>
                  <span>✓ Instant reference code</span>
                </div>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
