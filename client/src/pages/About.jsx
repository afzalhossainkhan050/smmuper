import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Award,
  Clock,
  Wrench,
  ThumbsUp,
  MapPin,
  CalendarCheck,
  CheckCircle2,
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export default function About() {
  const { settings } = useSettings();

  return (
    <div>
      {/* Banner */}
      <section style={{ backgroundColor: 'var(--primary-navy)', color: '#ffffff', padding: '4rem 0', textAlign: 'center' }}>
        <div className="container">
          <span className="section-tag" style={{ backgroundColor: 'rgba(56, 189, 248, 0.2)', color: '#38BDF8' }}>
            Trusted Climate Engineering
          </span>
          <h1 style={{ fontSize: '2.8rem', fontWeight: 800, marginTop: '0.75rem', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            About CoolAir Pro Services
          </h1>
          <p style={{ color: '#CBD5E1', fontSize: '1.1rem', maxWidth: '650px', margin: '0 auto' }}>
            Delivering precision air conditioning repair, high-efficiency system installations, and seasonal maintenance across the metropolitan region.
          </p>
        </div>
      </section>

      {/* Main Story & Values */}
      <section className="section">
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '3.5rem',
            alignItems: 'center',
          }}>
            <div>
              <span className="section-tag">Our Mission & Standards</span>
              <h2 className="section-heading" style={{ textAlign: 'left', marginBottom: '1.25rem' }}>
                Engineered for Reliability. Built on Customer Trust.
              </h2>
              <p style={{ color: '#334155', fontSize: '1.05rem', lineHeight: '1.7', marginBottom: '1.25rem' }}>
                At {settings.business_name || 'CoolAir Pro'}, we understand that an air conditioning breakdown during a sweltering summer isn't just uncomfortable — it disrupts your daily life and productivity.
              </p>
              <p style={{ color: '#64748B', fontSize: '0.975rem', lineHeight: '1.7', marginBottom: '1.5rem' }}>
                Founded by veteran HVAC engineers, our company was created to solve the most common frustrations in the trade: late arrivals, vague quotes, and band-aid fixes. We equip our technicians with aerospace-grade digital manifold gauges, infrared thermal diagnostic cameras, and genuine OEM parts to fix issues right the first time.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <CheckCircle2 size={20} color="#10B981" />
                  <span style={{ fontWeight: 600, color: 'var(--primary-navy)' }}>Zero Subcontractors — 100% In-House Certified Technicians</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <CheckCircle2 size={20} color="#10B981" />
                  <span style={{ fontWeight: 600, color: 'var(--primary-navy)' }}>EPA Universal Section 608 Compliance & Safe Gas Recovery</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <CheckCircle2 size={20} color="#10B981" />
                  <span style={{ fontWeight: 600, color: 'var(--primary-navy)' }}>90-Day Unconditional Parts & Labor Guarantee</span>
                </div>
              </div>

              <Link to="/book" className="btn btn-primary btn-lg">
                <CalendarCheck size={18} />
                <span>Book an Appointment</span>
              </Link>
            </div>

            <div>
              <div className="card" style={{ backgroundColor: '#F0F9FF', border: '2px solid #BAE6FD', padding: '2.5rem' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '1.25rem' }}>
                  Our Company by the Numbers
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-blue)' }}>15,000+</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Homes & Offices Cooled</div>
                  </div>
                  <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-blue)' }}>99.2%</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>First-Visit Fix Rate</div>
                  </div>
                  <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-blue)' }}>60 Mins</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Emergency Dispatch</div>
                  </div>
                  <div style={{ backgroundColor: '#ffffff', padding: '1.25rem', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-blue)' }}>$2M</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Liability Insurance</div>
                  </div>
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                  License: <strong>{settings.license_number || 'Master HVAC NY-884920-A'}</strong>. Serving residential and commercial clients across {settings.service_radius}.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Equipment & Technology */}
      <section className="section" style={{ backgroundColor: '#F8FAFC', borderTop: '1px solid var(--border-color)' }}>
        <div className="container">
          <div className="section-title">
            <span className="section-tag">Modern Diagnostic Equipment</span>
            <h2 className="section-heading">How We Ensure Precision Quality</h2>
            <p className="section-subtitle">
              We invest in state-of-the-art diagnostic machinery so you never pay for guesswork.
            </p>
          </div>

          <div className="grid-3">
            <div className="card">
              <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284C7', marginBottom: '1.25rem' }}>
                <Wrench size={24} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '0.5rem' }}>
                Digital Manifold Gauges
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Accurately reads subcooling and superheat temperatures down to 0.1°F, guaranteeing maximum thermodynamic efficiency and lower utility bills.
              </p>
            </div>

            <div className="card">
              <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284C7', marginBottom: '1.25rem' }}>
                <ShieldCheck size={24} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '0.5rem' }}>
                Ultrasonic Refrigerant Detectors
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Detects microscopic gas leaks emitting down to 0.1 oz/year. Prevents recurring gas leak issues and protects compressor lifespan.
              </p>
            </div>

            <div className="card">
              <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284C7', marginBottom: '1.25rem' }}>
                <Award size={24} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '0.5rem' }}>
                High-Pressure Coil Jet Washers
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                Non-destructive high-pressure wash systems designed specifically for delicate aluminum fins and antimicrobial sterilization.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
