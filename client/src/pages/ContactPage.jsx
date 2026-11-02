import React, { useState } from 'react';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageCircle,
  ShieldAlert,
  Send,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import api from '../services/api';
import { useSettings } from '../context/SettingsContext';

export default function ContactPage() {
  const { settings } = useSettings();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'General AC Inquiry',
    message: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await api.contact.submit(formData);
      if (res.success) {
        setSuccess(true);
        setFormData({
          name: '',
          email: '',
          phone: '',
          subject: 'General AC Inquiry',
          message: '',
        });
      } else {
        throw new Error(res.message || 'Failed to submit inquiry.');
      }
    } catch (err) {
      setError(err.message || 'Failed to send message. Please call us directly.');
    } finally {
      setSubmitting(false);
    }
  };

  const phoneClean = (settings.business_phone || '').replace(/[^\d+]/g, '');
  const emergencyClean = (settings.business_emergency_phone || '').replace(/[^\d+]/g, '');
  const whatsappClean = (settings.business_whatsapp || '15553214321').replace(/[^\d]/g, '');

  return (
    <div>
      {/* Banner */}
      <section style={{ backgroundColor: 'var(--primary-navy)', color: '#ffffff', padding: '4rem 0', textAlign: 'center' }}>
        <div className="container">
          <span className="section-tag" style={{ backgroundColor: 'rgba(56, 189, 248, 0.2)', color: '#38BDF8' }}>
            Get in Touch With Dispatch
          </span>
          <h1 style={{ fontSize: '2.8rem', fontWeight: 800, marginTop: '0.75rem', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            Contact CoolAir Pro Technicians
          </h1>
          <p style={{ color: '#CBD5E1', fontSize: '1.1rem', maxWidth: '650px', margin: '0 auto' }}>
            Have a question, need an urgent technician dispatch, or want a commercial HVAC quote? We are ready to assist.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '3rem',
            alignItems: 'start',
          }}>
            {/* Contact Information & Channels */}
            <div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '1rem' }}>
                Contact Details & Operations
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: '1.6', marginBottom: '2rem' }}>
                Reach our customer dispatch team via phone, WhatsApp, or the inquiry form. For emergencies, please call our 24/7 hotline directly.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
                <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#E0F2FE', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Phone size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Main Office Phone</div>
                    <a href={`tel:${phoneClean}`} style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
                      {settings.business_phone}
                    </a>
                  </div>
                </div>

                <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid #FECACA', backgroundColor: '#FEF2F2' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#EF4444', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldAlert size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#991B1B', fontWeight: 700 }}>24/7 Heatwave Emergency Line</div>
                    <a href={`tel:${emergencyClean}`} style={{ fontSize: '1.15rem', fontWeight: 800, color: '#991B1B' }}>
                      {settings.business_emergency_phone}
                    </a>
                  </div>
                </div>

                <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#E0F2FE', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Mail size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Customer Support Email</div>
                    <a href={`mailto:${settings.business_email}`} style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary-navy)' }}>
                      {settings.business_email}
                    </a>
                  </div>
                </div>

                <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#E0F2FE', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MapPin size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Headquarters & Fleet Depot</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary-navy)' }}>
                      {settings.business_address}, {settings.business_city}
                    </div>
                  </div>
                </div>

                <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#E0F2FE', color: '#0284C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Clock size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Dispatch Hours</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--primary-navy)' }}>
                      {settings.business_hours}
                    </div>
                  </div>
                </div>
              </div>

              {/* Instant WhatsApp Action */}
              <a
                href={`https://wa.me/${whatsappClean}?text=Hello%20CoolAir%20Pro,%20I%20have%20an%20inquiry%20regarding%20AC%20service.`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-whatsapp btn-lg"
                style={{ width: '100%' }}
              >
                <MessageCircle size={22} />
                <span>Chat Instantly on WhatsApp</span>
              </a>
            </div>

            {/* Contact Form */}
            <div>
              <div className="card" style={{ padding: '2.5rem' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '0.5rem' }}>
                  Send an Online Inquiry
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.75rem' }}>
                  Fill out this form and our support coordinators will get back to you within 24 hours.
                </p>

                {success && (
                  <div style={{
                    backgroundColor: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    color: '#065F46',
                    padding: '1rem',
                    borderRadius: '8px',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                  }}>
                    <CheckCircle2 size={20} />
                    <span>Your message was sent successfully! We will contact you shortly.</span>
                  </div>
                )}

                {error && (
                  <div style={{
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#991B1B',
                    padding: '1rem',
                    borderRadius: '8px',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                  }}>
                    <AlertCircle size={20} />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="E.g. Gregory Higgins"
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Email Address *</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="greg@example.com"
                        className="form-input"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Phone Number</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+1 (555) 000-0000"
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Subject</label>
                    <select
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                      className="form-select"
                    >
                      <option value="General AC Inquiry">General AC Inquiry</option>
                      <option value="Commercial HVAC Contract">Commercial HVAC Contract / Quote</option>
                      <option value="Pricing / Maintenance AMC">Pricing / Maintenance AMC Question</option>
                      <option value="Emergency Booking Follow-up">Emergency Booking Follow-up</option>
                      <option value="Customer Feedback">Customer Feedback</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Your Message *</label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Describe your property, AC model, or questions..."
                      className="form-textarea"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-primary btn-lg"
                    style={{ width: '100%' }}
                  >
                    <Send size={18} />
                    <span>{submitting ? 'Sending Message...' : 'Submit Inquiry'}</span>
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Google Maps Embed Section */}
          <div style={{ marginTop: '4rem' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '1rem', textAlign: 'center' }}>
              Service Area & Headquarters Location
            </h3>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              {settings.service_radius || 'Serving Metro City & Surrounding 35-mile Metropolitan Radius'}
            </p>

            <div className="card" style={{ padding: 0, overflow: 'hidden', height: '380px' }}>
              <iframe
                title="Office Location Map"
                src={settings.google_maps_embed || 'https://maps.google.com/maps?q=40.712776,-74.005974&hl=en&z=13&output=embed'}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
