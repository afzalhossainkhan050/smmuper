import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarCheck,
  Phone,
  ShieldCheck,
  Clock,
  Sparkles,
  Wrench,
  Gauge,
  Flame,
  Building2,
  CheckCircle2,
  Star,
  ArrowRight,
  ShieldAlert,
  ThumbsUp,
  Award,
  Zap,
} from 'lucide-react';
import api from '../services/api';
import { useSettings } from '../context/SettingsContext';
import StarRating from '../components/StarRating';

export default function Home() {
  const { settings } = useSettings();
  const [services, setServices] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [servicesRes, reviewsRes] = await Promise.all([
          api.services.getAll(),
          api.reviews.getApproved(),
        ]);
        if (servicesRes.success) setServices(servicesRes.data || []);
        if (reviewsRes.success) setReviews(reviewsRes.data?.reviews?.slice(0, 3) || []);
      } catch (err) {
        console.error('Failed to load home data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const getServiceIcon = (iconName) => {
    switch (iconName) {
      case 'wrench': return <Wrench size={24} color="#0284C7" />;
      case 'sparkles': return <Sparkles size={24} color="#0284C7" />;
      case 'gauge': return <Gauge size={24} color="#0284C7" />;
      case 'flame': return <Flame size={24} color="#EF4444" />;
      case 'building-2': return <Building2 size={24} color="#0284C7" />;
      default: return <Wrench size={24} color="#0284C7" />;
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <section style={{
        background: 'linear-gradient(135deg, #0B2545 0%, #134E5E 50%, #0B2545 100%)',
        color: '#ffffff',
        padding: '5.5rem 0 6rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle decorative circles */}
        <div style={{
          position: 'absolute',
          top: '-10%',
          right: '-5%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, rgba(2, 132, 199, 0) 70%)',
          pointerEvents: 'none',
        }} />

        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            alignItems: 'center',
            gap: '3rem',
          }}>
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                padding: '0.4rem 1rem',
                borderRadius: '9999px',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#38BDF8',
                marginBottom: '1.25rem',
              }}>
                <Zap size={15} />
                <span>FAST & CERTIFIED AIR CONDITIONING SERVICES</span>
              </div>

              <h1 style={{
                fontSize: '3.1rem',
                fontWeight: 800,
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
                marginBottom: '1.25rem',
              }}>
                Expert AC Repair, <br />
                <span style={{
                  background: 'linear-gradient(to right, #38BDF8, #818CF8)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  Installation & Servicing
                </span>
              </h1>

              <p style={{
                fontSize: '1.15rem',
                color: '#CBD5E1',
                lineHeight: 1.6,
                marginBottom: '2.25rem',
                maxWidth: '540px',
              }}>
                Keep your home and commercial facility cool all year long. Licensed HVAC technicians, guaranteed upfront pricing, and rapid same-day response.
              </p>

              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }} className="hero-buttons">
                <Link to="/book" className="btn btn-primary btn-lg">
                  <CalendarCheck size={20} />
                  <span>Book a Service Now</span>
                </Link>

                <a
                  href={`tel:${settings.business_phone?.replace(/[^\d+]/g, '')}`}
                  className="btn btn-secondary btn-lg"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.2)' }}
                >
                  <Phone size={20} />
                  <span>Call: {settings.business_phone}</span>
                </a>
              </div>

              {/* Trust Badges Bar */}
              <div style={{
                display: 'flex',
                gap: '2rem',
                marginTop: '3rem',
                paddingTop: '2rem',
                borderTop: '1px solid rgba(255,255,255,0.1)',
                flexWrap: 'wrap',
              }}>
                <div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#38BDF8' }}>15,000+</div>
                  <div style={{ fontSize: '0.825rem', color: '#94A3B8' }}>AC Units Serviced</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#38BDF8' }}>4.9 / 5.0</div>
                  <div style={{ fontSize: '0.825rem', color: '#94A3B8' }}>Customer Rating</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#38BDF8' }}>60 Mins</div>
                  <div style={{ fontSize: '0.825rem', color: '#94A3B8' }}>Emergency Dispatch</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#38BDF8' }}>100%</div>
                  <div style={{ fontSize: '0.825rem', color: '#94A3B8' }}>Licensed & Insured</div>
                </div>
              </div>
            </div>

            {/* Hero Quick Booking Card / Visual Teaser */}
            <div style={{
              background: '#ffffff',
              borderRadius: '1.25rem',
              padding: '2.25rem',
              color: 'var(--text-main)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
              border: '1px solid #E2E8F0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <span className="badge badge-confirmed" style={{ fontSize: '0.8rem' }}>Fast Appointment Booking</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Zero Booking Fee</span>
              </div>

              <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '0.5rem' }}>
                Need Immediate AC Assistance?
              </h3>
              <p style={{ fontSize: '0.925rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Select your service, choose an available time slot, and our certified technician will be at your doorstep.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', color: '#334155' }}>
                  <CheckCircle2 size={18} color="#10B981" />
                  <span>EPA & NATE Certified Technicians</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', color: '#334155' }}>
                  <CheckCircle2 size={18} color="#10B981" />
                  <span>90-Day Comprehensive Service Warranty</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', color: '#334155' }}>
                  <CheckCircle2 size={18} color="#10B981" />
                  <span>Transparent Quotes with Zero Hidden Costs</span>
                </div>
              </div>

              <Link to="/book" className="btn btn-primary" style={{ width: '100%', padding: '0.85rem' }}>
                <CalendarCheck size={18} />
                <span>Start Online Booking</span>
              </Link>

              <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Already booked? <Link to="/status" style={{ color: 'var(--primary-blue)', fontWeight: 700 }}>Track your appointment</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 24/7 Emergency AC Repair Callout Banner */}
      <section style={{
        backgroundColor: '#FEF2F2',
        borderBottom: '1px solid #FECACA',
        padding: '1.25rem 0',
      }}>
        <div className="container" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#EF4444',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <ShieldAlert size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 800, color: '#991B1B', fontSize: '1rem' }}>
                Emergency AC Breakdown? We Are On Call 24/7!
              </div>
              <div style={{ fontSize: '0.85rem', color: '#B91C1C' }}>
                {settings.emergency_guarantee || 'Guaranteed 60-Minute Rapid Response for Critical Cooling Failures'}
              </div>
            </div>
          </div>

          <a
            href={`tel:${settings.business_emergency_phone?.replace(/[^\d+]/g, '')}`}
            className="btn btn-emergency btn-sm"
            style={{ fontWeight: 700 }}
          >
            <Phone size={15} />
            <span>Call Hotline: {settings.business_emergency_phone}</span>
          </a>
        </div>
      </section>

      {/* Featured Services Section */}
      <section className="section">
        <div className="container">
          <div className="section-title">
            <span className="section-tag">Comprehensive Solutions</span>
            <h2 className="section-heading">Our Professional AC Services</h2>
            <p className="section-subtitle">
              From routine deep foam cleaning to major compressor overhauls and complete commercial setups, we cover all cooling requirements.
            </p>
          </div>

          <div className="grid-3">
            {services.slice(0, 6).map((service) => (
              <div key={service.id} className="card card-interactive" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      backgroundColor: '#E0F2FE',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {getServiceIcon(service.icon)}
                    </div>
                    <span style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: 'var(--primary-blue)',
                      backgroundColor: '#F0F9FF',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '6px',
                    }}>
                      {service.category === 'both' ? 'Residential & Commercial' : service.category.toUpperCase()}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '0.6rem' }}>
                    {service.name}
                  </h3>

                  <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', marginBottom: '1.25rem', lineHeight: '1.55' }}>
                    {service.short_description}
                  </p>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{service.price_label}</span>
                    <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
                      ${service.price_starting}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Link
                      to={`/services/${service.slug}`}
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1 }}
                    >
                      Learn More
                    </Link>
                    <Link
                      to={`/book?service=${service.id}`}
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1 }}
                    >
                      Book Now
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <Link to="/services" className="btn btn-secondary" style={{ padding: '0.75rem 2rem', fontWeight: 700 }}>
              <span>View All 7 AC Services</span>
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="section" style={{ backgroundColor: '#F1F5F9' }}>
        <div className="container">
          <div className="section-title">
            <span className="section-tag">Quality Assurance</span>
            <h2 className="section-heading">Why Customers Choose CoolAir Pro</h2>
            <p className="section-subtitle">
              We combine years of hands-on technical HVAC excellence with dependable, customer-first service.
            </p>
          </div>

          <div className="grid-3">
            <div className="card">
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284C7', marginBottom: '1rem' }}>
                <Award size={24} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '0.5rem' }}>
                Licensed & EPA Certified
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                All of our technicians hold verified HVAC licenses and EPA Section 608 universal refrigerant certifications.
              </p>
            </div>

            <div className="card">
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284C7', marginBottom: '1rem' }}>
                <ShieldCheck size={24} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '0.5rem' }}>
                90-Day Repair Warranty
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Every repair and component replacement is backed by our full 90-day parts and labor peace-of-mind guarantee.
              </p>
            </div>

            <div className="card">
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284C7', marginBottom: '1rem' }}>
                <Clock size={24} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '0.5rem' }}>
                Punctual & Same-Day Dispatch
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                We respect your time. Our technician arrives in the agreed 2-hour window with fully equipped service trucks.
              </p>
            </div>

            <div className="card">
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284C7', marginBottom: '1rem' }}>
                <ThumbsUp size={24} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '0.5rem' }}>
                Upfront Honest Pricing
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No surprise fees or unnecessary upsells. You approve the transparent written estimate before any work begins.
              </p>
            </div>

            <div className="card">
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284C7', marginBottom: '1rem' }}>
                <Sparkles size={24} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '0.5rem' }}>
                Clean & Tidy Work
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Our team wears shoe covers, lays protective floor mats, and cleans up every trace of dust before leaving.
              </p>
            </div>

            <div className="card">
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284C7', marginBottom: '1rem' }}>
                <ShieldAlert size={24} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '0.5rem' }}>
                24/7 Heatwave Emergency Line
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Round-the-clock emergency dispatch during scorching summer days and sudden system outages.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4-Step Booking Process Walkthrough */}
      <section className="section">
        <div className="container">
          <div className="section-title">
            <span className="section-tag">Easy & Streamlined</span>
            <h2 className="section-heading">How Booking Works</h2>
            <p className="section-subtitle">
              Get your air conditioner inspected and repaired in four straightforward steps.
            </p>
          </div>

          <div className="grid-4">
            <div style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary-blue)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.35rem',
                fontWeight: 800,
                margin: '0 auto 1.25rem',
              }}>
                1
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '0.5rem' }}>
                Select AC Service
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Choose installation, troubleshooting, jet cleaning, or refrigerant recharge.
              </p>
            </div>

            <div style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary-blue)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.35rem',
                fontWeight: 800,
                margin: '0 auto 1.25rem',
              }}>
                2
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '0.5rem' }}>
                Pick Date & Slot
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Select your preferred appointment date and time window that fits your schedule.
              </p>
            </div>

            <div style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary-blue)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.35rem',
                fontWeight: 800,
                margin: '0 auto 1.25rem',
              }}>
                3
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '0.5rem' }}>
                Technician Arrives
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                A certified HVAC expert arrives on time with diagnostic tools and parts.
              </p>
            </div>

            <div style={{ textAlign: 'center', padding: '1rem' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary-blue)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.35rem',
                fontWeight: 800,
                margin: '0 auto 1.25rem',
              }}>
                4
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '0.5rem' }}>
                Enjoy Clean Cool Air
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Restored efficiency, verified temperature drop, and full 90-day warranty.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Verified Customer Reviews Carousel / Highlights */}
      <section className="section" style={{ backgroundColor: '#F8FAFC', borderTop: '1px solid var(--border-color)' }}>
        <div className="container">
          <div className="section-title">
            <span className="section-tag">Testimonials</span>
            <h2 className="section-heading">What Our Customers Say</h2>
            <p className="section-subtitle">
              Read real feedback from homeowners and businesses who rely on CoolAir Pro for climate comfort.
            </p>
          </div>

          <div className="grid-3">
            {reviews.map((review) => (
              <div key={review.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <StarRating rating={review.rating} />
                    <span style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 700, backgroundColor: '#ECFDF5', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                      Verified Booking
                    </span>
                  </div>
                  <p style={{ color: '#334155', fontSize: '0.95rem', fontStyle: 'italic', marginBottom: '1.25rem', lineHeight: '1.6' }}>
                    "{review.comment}"
                  </p>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 700, color: 'var(--primary-navy)', fontSize: '0.925rem' }}>
                    {review.customer_name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--primary-blue)', fontWeight: 600 }}>
                    {review.service_name || 'AC Service'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <Link to="/reviews" className="btn btn-secondary">
              <span>Read All Customer Reviews</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Bottom Conversion Banner */}
      <section style={{
        background: 'linear-gradient(135deg, #0284C7 0%, #0369A1 100%)',
        color: '#ffffff',
        padding: '4.5rem 0',
        textAlign: 'center',
      }}>
        <div className="container" style={{ maxWidth: '750px' }}>
          <h2 style={{ fontSize: '2.3rem', fontWeight: 800, marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            Beat the Heat. Restore Your Comfort Today.
          </h2>
          <p style={{ fontSize: '1.1rem', color: '#E0F2FE', marginBottom: '2rem' }}>
            Book your service online in under 60 seconds or call our friendly dispatch team now.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link to="/book" className="btn btn-secondary btn-lg" style={{ color: '#0369A1', fontWeight: 800 }}>
              <CalendarCheck size={20} />
              <span>Book Appointment Now</span>
            </Link>
            <a
              href={`tel:${settings.business_phone?.replace(/[^\d+]/g, '')}`}
              className="btn btn-secondary btn-lg"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.3)' }}
            >
              <Phone size={20} />
              <span>{settings.business_phone}</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
