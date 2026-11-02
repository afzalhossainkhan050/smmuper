import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, HelpCircle, Phone, CalendarCheck } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export default function FaqPage() {
  const { settings } = useSettings();
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = [
    {
      category: 'General & Scheduling',
      q: 'How fast can an AC technician arrive at my property?',
      a: 'For standard appointments, you can choose a convenient 2-hour window as early as same-day or next-day. For 24/7 emergencies (complete cooling breakdown or medical priorities), our dispatch team guarantees a technician arrival within 60 minutes across our coverage area.',
    },
    {
      category: 'General & Scheduling',
      q: 'How does the Booking Reference Code work?',
      a: 'When you submit a service request online, our system generates an instant reference code (e.g., AC-78A1B2). You can enter this code anytime on our "Track Booking" page to see real-time updates, assigned technician details, and scheduled times.',
    },
    {
      category: 'General & Scheduling',
      q: 'Can I cancel or reschedule my appointment?',
      a: 'Yes, cancellations and rescheduling are completely free of charge up to 4 hours before your scheduled appointment window. You can call dispatch or update via phone.',
    },
    {
      category: 'Pricing & Warranty',
      q: 'Are there any hidden costs or surprise diagnostic charges?',
      a: 'Never. Our technicians conduct an initial inspection, diagnose the root issue, and provide a clear, upfront written estimate detailing parts and labor. We never start repair work without your direct approval. If you proceed with repairs, our diagnostic fee is applied towards your service bill.',
    },
    {
      category: 'Pricing & Warranty',
      q: 'What does your 90-day service warranty cover?',
      a: 'Every repair, capacitor replacement, gas refilling, and installation is backed by our comprehensive 90-day parts and labor guarantee. If the same issue recurs within 90 days, we dispatch a technician back to your property free of charge.',
    },
    {
      category: 'Technical AC Problems',
      q: 'Why is my air conditioner blowing warm air?',
      a: 'Warm air is typically caused by low refrigerant gas from a leak, a failed dual-run capacitor, a frozen evaporator coil, or a clogged outdoor condenser preventing heat dissipation. Our technician uses digital gauges to pinpoint the exact failure.',
    },
    {
      category: 'Technical AC Problems',
      q: 'Why is water dripping or leaking from my indoor AC unit?',
      a: 'Indoor water leakage is almost always due to a clogged condensate drain line (algae or dirt buildup) or cracked drain pan. Our deep wash and drain flush clearing service cleans the drain line with high-pressure nitrogen to restore smooth gravity drainage.',
    },
    {
      category: 'Technical AC Problems',
      q: 'How often does an air conditioner need refrigerant gas refilling?',
      a: 'A properly sealed air conditioner should never lose refrigerant because it operates in a closed loop. If your system is low on gas, there is a leak that must be identified and sealed before adding new refrigerant (R32 or R410A). We conduct electronic leak tests before recharging.',
    },
    {
      category: 'Maintenance & AMC',
      q: 'What is the benefit of an Annual Maintenance Contract (AMC)?',
      a: 'Our AMC maintenance packages provide seasonal tune-ups, high-pressure foam wash, electrical audits, and up to 25% discount on parts. Regular servicing increases cooling performance, extends compressor life by 5-8 years, and lowers electricity bills by up to 25%.',
    },
  ];

  return (
    <div>
      {/* Banner */}
      <section style={{ backgroundColor: 'var(--primary-navy)', color: '#ffffff', padding: '4rem 0', textAlign: 'center' }}>
        <div className="container">
          <span className="section-tag" style={{ backgroundColor: 'rgba(56, 189, 248, 0.2)', color: '#38BDF8' }}>
            Got Questions? We Have Answers
          </span>
          <h1 style={{ fontSize: '2.8rem', fontWeight: 800, marginTop: '0.75rem', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            Frequently Asked Questions
          </h1>
          <p style={{ color: '#CBD5E1', fontSize: '1.1rem', maxWidth: '650px', margin: '0 auto' }}>
            Everything you need to know about our AC repair, appointment scheduling, pricing transparency, and maintenance packages.
          </p>
        </div>
      </section>

      {/* Accordion Section */}
      <section className="section">
        <div className="container" style={{ maxWidth: '820px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index;

              return (
                <div
                  key={index}
                  className="card"
                  style={{
                    padding: '1.5rem',
                    border: isOpen ? '2px solid var(--primary-blue)' : '1px solid var(--border-color)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      textAlign: 'left',
                      gap: '1rem',
                      fontWeight: 700,
                      fontSize: '1.1rem',
                      color: isOpen ? 'var(--primary-blue)' : 'var(--primary-navy)',
                    }}
                  >
                    <span>{faq.q}</span>
                    <span style={{ color: 'var(--primary-blue)', flexShrink: 0 }}>
                      {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </span>
                  </button>

                  {isOpen && (
                    <div style={{
                      marginTop: '1rem',
                      paddingTop: '1rem',
                      borderTop: '1px solid #F1F5F9',
                      color: '#475569',
                      fontSize: '0.975rem',
                      lineHeight: '1.65',
                    }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--primary-blue)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                        {faq.category}
                      </div>
                      <p>{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Still Need Help Box */}
          <div className="card" style={{
            marginTop: '3.5rem',
            textAlign: 'center',
            backgroundColor: '#F0F9FF',
            border: '2px dashed #BAE6FD',
            padding: '2.5rem',
          }}>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '0.5rem' }}>
              Still have questions about your AC?
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem', maxWidth: '520px', margin: '0 auto 1.5rem' }}>
              Our friendly HVAC dispatch coordinators are available 7 days a week to answer your technical questions or book your visit.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <a
                href={`tel:${settings.business_phone?.replace(/[^\d+]/g, '')}`}
                className="btn btn-primary"
              >
                <Phone size={16} />
                <span>Call Us: {settings.business_phone}</span>
              </a>
              <Link to="/contact" className="btn btn-secondary">
                Send a Message
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
