import React from 'react';
import { useSettings } from '../context/SettingsContext';

export default function PrivacyPage() {
  const { settings } = useSettings();

  return (
    <div className="section">
      <div className="container" style={{ maxWidth: '800px' }}>
        <h1 style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '1rem' }}>
          Privacy Policy
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          Effective Date: October 2026 | Last Updated: October 2026
        </p>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', lineHeight: '1.7', color: '#334155' }}>
          <section>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '0.5rem' }}>
              1. Information We Collect
            </h2>
            <p>
              When you book an AC service or contact {settings.business_name || 'CoolAir Pro'}, we collect necessary personal details to fulfill your service request: your full name, service address, telephone number, email address, AC brand, and reported symptoms.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '0.5rem' }}>
              2. How We Use Your Information
            </h2>
            <p>
              Your information is used strictly to dispatch certified technicians to your address, provide booking status notifications via SMS or email, issue transparent quotes, process warranties, and provide customer support.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '0.5rem' }}>
              3. Protection of Customer Data
            </h2>
            <p>
              We implement industry-standard encryption protocols and secure database storage. We do not sell, rent, or trade your personal information to third-party advertisers or telemarketers.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '0.5rem' }}>
              4. Contact Us Regarding Privacy
            </h2>
            <p>
              If you have any questions about this Privacy Policy or wish to request data deletion, contact our privacy officer at {settings.business_email || 'support@coolairpro.com'}.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
