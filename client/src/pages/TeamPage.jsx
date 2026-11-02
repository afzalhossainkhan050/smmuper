import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarCheck,
  Award,
  ShieldCheck,
  Star,
  CheckCircle2,
  Briefcase,
  Phone,
} from 'lucide-react';
import api from '../services/api';
import StarRating from '../components/StarRating';

export default function TeamPage() {
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTechs() {
      try {
        const res = await api.technicians.getAll();
        if (res.success && res.data) {
          setTechnicians(res.data);
        }
      } catch (err) {
        console.error('Failed to load technicians:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchTechs();
  }, []);

  return (
    <div>
      {/* Banner */}
      <section style={{ backgroundColor: 'var(--primary-navy)', color: '#ffffff', padding: '4rem 0', textAlign: 'center' }}>
        <div className="container">
          <span className="section-tag" style={{ backgroundColor: 'rgba(56, 189, 248, 0.2)', color: '#38BDF8' }}>
            Certified Masters of Climate Control
          </span>
          <h1 style={{ fontSize: '2.8rem', fontWeight: 800, marginTop: '0.75rem', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
            Meet Our HVAC Technicians
          </h1>
          <p style={{ color: '#CBD5E1', fontSize: '1.1rem', maxWidth: '650px', margin: '0 auto' }}>
            Our team consists of EPA universal certified, background-checked master technicians dedicated to precision air conditioning solutions.
          </p>
        </div>
      </section>

      {/* Technicians Grid */}
      <section className="section">
        <div className="container">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
              Loading team roster...
            </div>
          ) : (
            <div className="grid-2">
              {technicians.map((tech) => (
                <div key={tech.id} className="card card-interactive" style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                  <img
                    src={tech.photo_url || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=400&q=80'}
                    alt={tech.name}
                    style={{
                      width: '130px',
                      height: '130px',
                      borderRadius: '12px',
                      objectFit: 'cover',
                      border: '2px solid #BAE6FD',
                      flexShrink: 0,
                    }}
                  />

                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem' }}>
                      <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
                        {tech.name}
                      </h3>
                      {tech.is_available ? (
                        <span style={{ fontSize: '0.75rem', backgroundColor: '#ECFDF5', color: '#10B981', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                          ● On Call
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', backgroundColor: '#F1F5F9', color: '#64748B', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                          In Service
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.9rem', color: 'var(--primary-blue)', fontWeight: 700, marginBottom: '0.5rem' }}>
                      {tech.specialization}
                    </div>

                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: '1.5', marginBottom: '1rem' }}>
                      {tech.bio}
                    </p>

                    <div style={{
                      display: 'flex',
                      gap: '1.5rem',
                      borderTop: '1px solid var(--border-color)',
                      paddingTop: '0.75rem',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                    }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Experience</div>
                        <div style={{ fontWeight: 800, color: 'var(--primary-navy)', fontSize: '0.95rem' }}>
                          {tech.experience_years} Years
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rating</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <StarRating rating={tech.rating || 5} size={14} />
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-navy)' }}>
                            {tech.rating}
                          </span>
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Jobs Done</div>
                        <div style={{ fontWeight: 800, color: 'var(--primary-navy)', fontSize: '0.95rem' }}>
                          {tech.jobs_completed}+
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Standards & Certifications */}
          <div style={{
            marginTop: '4rem',
            backgroundColor: '#F8FAFC',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            padding: '2.5rem',
          }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-navy)', textAlign: 'center', marginBottom: '1.5rem' }}>
              Our Strict Technician Hiring & Safety Standards
            </h3>
            <div className="grid-3">
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <ShieldCheck size={24} color="#0284C7" style={{ flexShrink: 0 }} />
                <div>
                  <h4 style={{ fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '0.25rem' }}>Full Background Checks</h4>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Every employee undergoes thorough criminal background screening and continuous drug testing.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Award size={24} color="#0284C7" style={{ flexShrink: 0 }} />
                <div>
                  <h4 style={{ fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '0.25rem' }}>EPA Section 608 Universal</h4>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Certified for all high-pressure and low-pressure eco-friendly refrigerants with zero venting.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Briefcase size={24} color="#0284C7" style={{ flexShrink: 0 }} />
                <div>
                  <h4 style={{ fontWeight: 700, color: 'var(--primary-navy)', marginBottom: '0.25rem' }}>Annual Factory Training</h4>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>100+ annual training hours directly with leading manufacturers: Daikin, Carrier, and Mitsubishi.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
