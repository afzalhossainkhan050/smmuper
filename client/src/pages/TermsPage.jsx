import React from 'react';
import { useSettings } from '../context/SettingsContext';

export default function TermsPage() {
  const { settings } = useSettings();

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: '800px' }}>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '1rem' }}>
          Terms of Service
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          Effective Date: October 2026 | Last Updated: October 2026
        </p>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', lineHeight: '1.7', color: '#334155' }}>
          <section>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '0.5rem' }}>
              1. Scope of Services
            </h2>
            <p>
              {settings.business_name || 'CoolAir Pro'} provides residential and commercial air conditioning troubleshooting, gas refilling, jet cleaning, annual maintenance contracts, and equipment installation as detailed on this website.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '0.5rem' }}>
              2. Booking Requests vs. Confirmed Appointments
            </h2>
            <p>
              Submitting an online booking creates an appointment request with an assigned reference code (e.g., AC-XXXXXX). The booking request is pending until confirmed by our dispatch team based on technician availability and geographic routing.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '0.5rem' }}>
              3. 90-Day Workmanship & Parts Warranty
            </h2>
            <p>
              All non-preventative repairs and OEM parts installed by our technicians carry a 90-day warranty against defects. Damage resulting from external electrical power surges, customer tampering, or rodent damage is excluded from standard warranty coverage.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '0.5rem' }}>
              4. Cancellations and Rescheduling
            </h2>
            <p>
              Customers may reschedule or cancel scheduled appointments up to four (4) hours prior to the start of the scheduled arrival window without incurring any penalty.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
