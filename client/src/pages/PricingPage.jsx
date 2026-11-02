import React from 'react';
import { Link } from 'react-router-dom';
import {
  Check,
  CalendarCheck,
  ShieldCheck,
  Phone,
  HelpCircle,
  Zap,
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export default function PricingPage() {
  const { settings } = useSettings();

  const servicePrices = [
    { name: 'Multi-Point Diagnostic & Problem Troubleshooting', price: '$79', note: 'Waived when repair is completed' },
    { name: 'Standard AC Servicing & Filter Deep Wash', price: '$59', note: 'Per indoor split unit' },
    { name: 'High-Pressure Jet Foam Chemical Coil Cleaning', price: '$89', note: 'Restores airflow & eliminates mold' },
    { name: 'R32 / R410A Eco Refrigerant Top-Up (Up to 1kg)', price: '$89', note: 'Includes electronic leak testing' },
    { name: 'Capacitor / Relay Replacement (OEM Part + Labor)', price: '$129', note: 'Backed by 1-year part warranty' },
    { name: 'Condensate Drain Line Unclog & Flushing', price: '$65', note: 'Stops indoor water leakage' },
    { name: 'New Inverter Split AC Installation & Mounting', price: '$149', note: 'Includes brackets & piping test' },
    { name: 'Smart Thermostat Installation & WiFi Calibration', price: '$95', note: 'Ecobee, Nest, Honeywell support' },
    { name: 'Emergency After-Hours & Weekend Dispatch', price: '$99', note: 'Guaranteed 60-minute dispatch' },
  ];

  const packages = [
    {
      name: 'Essential Tune-Up',
      price: '$99',
      period: 'per year',
      tag: 'Basic Care',
      popular: false,
      features: [
        '1 Annual Pre-Summer Inspection',
        'Indoor Air Filter Chemical Cleaning',
        'Refrigerant Pressure Gauge Verification',
        'Condenser Fan & Motor Inspection',
        '10% Discount on Spare Parts',
        'Standard Email Booking',
      ],
    },
    {
      name: 'Silver Protection',
      price: '$199',
      period: 'per year',
      tag: 'Most Popular',
      popular: true,
      features: [
        '2 Seasonal Visits (Summer & Winter prep)',
        'Antimicrobial Foam Coil Deep Wash',
        'Full Electrical & Capacitor Health Audit',
        'Condensate Drain Line Cleansing',
        '15% Discount on All Parts & Repairs',
        'Priority Same-Day Dispatch Slot',
        'Zero Diagnostic Fee on Repair Calls',
      ],
    },
    {
      name: 'Gold All-Season AMC',
      price: '$349',
      period: 'per year',
      tag: 'Complete Peace of Mind',
      popular: false,
      features: [
        '4 Quarterly Comprehensive Visits',
        'Unlimited Diagnostic Callouts',
        'Free Run-Capacitor Replacement included',
        '1 Full Refrigerant Top-up included',
        '25% Discount on Major Spare Parts',
        'Guaranteed 60-Minute Emergency Dispatch',
        'Dedicated Master Technician Assigned',
      ],
    },
    {
      name: 'Commercial Facility HVAC',
      price: '$699',
      period: 'starting / year',
      tag: 'Enterprise & Retail',
      popular: false,
      features: [
        'Custom Monthly Maintenance Schedule',
        'Multi-Zone VRV / VRF & Packaged Units',
        '2-Hour SLA Response Commitment',
        'Building Energy & CFM Airflow Reports',
        'Free Filter Replacement Cycles',
        'Dedicated Commercial Account Manager',
        'Customized Billing & Tax Invoicing',
      ],
    },
  ];

  return (
    <div>
      {/* Banner */}
      <section style={{ backgroundColor: 'var(--primary-navy)', color: '#ffffff', padding: '4rem 0', textAlign: 'center' }}>
        <div className="container">
          <span className="section-tag" style={{ backgroundColor: 'rgba(56, 189, 248, 0.2)', color: '#38BDF8' }}>
            Transparent & Honest Rates
          </span>
          <h1 style={{ fontSize: '2.8rem', fontWeight: 800, marginTop: '0.75rem', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            Transparent AC Service Pricing
          </h1>
          <p style={{ color: '#CBD5E1', fontSize: '1.1rem', maxWidth: '650px', margin: '0 auto' }}>
            Clear, honest rates with zero hidden charges. You receive a full upfront quote before any work starts.
          </p>
        </div>
      </section>

      {/* Annual Maintenance Packages */}
      <section className="section">
        <div className="container">
          <div className="section-title">
            <span className="section-tag">Save with Annual Plans</span>
            <h2 className="section-heading">AC Maintenance Packages (AMC)</h2>
            <p className="section-subtitle">
              Prevent costly breakdowns, improve cooling efficiency by up to 25%, and enjoy priority technician booking all year long.
            </p>
          </div>

          <div className="grid-4">
            {packages.map((pkg, idx) => (
              <div
                key={idx}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: pkg.popular ? '2px solid var(--primary-blue)' : '1px solid var(--border-color)',
                  position: 'relative',
                  backgroundColor: pkg.popular ? '#F0F9FF' : '#ffffff',
                }}
              >
                {pkg.popular && (
                  <div style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'var(--primary-blue)',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    padding: '0.2rem 0.8rem',
                    borderRadius: '9999px',
                    letterSpacing: '0.05em',
                  }}>
                    MOST POPULAR
                  </div>
                )}

                <div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-blue)', textTransform: 'uppercase' }}>
                    {pkg.tag}
                  </span>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary-navy)', margin: '0.4rem 0 0.75rem' }}>
                    {pkg.name}
                  </h3>

                  <div style={{ marginBottom: '1.5rem' }}>
                    <span style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--primary-navy)' }}>{pkg.price}</span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginLeft: '0.35rem' }}>/{pkg.period}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    {pkg.features.map((feat, fIdx) => (
                      <div key={fIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.875rem', color: '#334155' }}>
                        <Check size={16} color="#0284C7" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link
                  to={`/book?package=${encodeURIComponent(pkg.name)}`}
                  className={`btn ${pkg.popular ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ width: '100%' }}
                >
                  <CalendarCheck size={16} />
                  <span>Choose Plan</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Itemized Service Price Table */}
      <section className="section" style={{ backgroundColor: '#F8FAFC', borderTop: '1px solid var(--border-color)' }}>
        <div className="container" style={{ maxWidth: '900px' }}>
          <div className="section-title">
            <span className="section-tag">A La Carte Services</span>
            <h2 className="section-heading">Standard AC Service Price Guide</h2>
            <p className="section-subtitle">
              Estimated prices for standard residential single and multi-split cooling systems.
            </p>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.95rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--primary-navy)', color: '#ffffff' }}>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: 700 }}>Service Description</th>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: 700, width: '130px' }}>Estimated Price</th>
                  <th style={{ padding: '1rem 1.25rem', fontWeight: 700 }}>Details & Notes</th>
                </tr>
              </thead>
              <tbody>
                {servicePrices.map((item, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#F8FAFC',
                    }}
                  >
                    <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--primary-navy)' }}>
                      {item.name}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', fontWeight: 800, color: 'var(--primary-blue)', fontSize: '1.1rem' }}>
                      {item.price}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {item.note}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <Link to="/book" className="btn btn-primary btn-lg">
              <CalendarCheck size={18} />
              <span>Book An Appointment</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
