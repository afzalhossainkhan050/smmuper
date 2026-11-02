import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarCheck,
  Wrench,
  Users,
  MessageSquare,
  Mail,
  Settings as SettingsIcon,
  CheckCircle2,
  Clock,
  UserCheck,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  DollarSign,
  Search,
  Filter,
  Save,
  RefreshCw,
  Phone,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import StatusBadge from '../components/StatusBadge';
import StarRating from '../components/StarRating';

export default function AdminDashboard() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { settings, refreshSettings } = useSettings();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [services, setServices] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [messages, setMessages] = useState([]);
  const [settingsForm, setSettingsForm] = useState({});

  const [loading, setLoading] = useState(true);
  const [bookingFilter, setBookingFilter] = useState('');
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionError, setActionError] = useState(null);

  // Modals / Edit states
  const [editingService, setEditingService] = useState(null);
  const [isAddingService, setIsAddingService] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    name: '',
    short_description: '',
    description: '',
    price_starting: '',
    price_label: 'Starting from',
    duration: '',
    category: 'residential',
    icon: 'wrench',
  });

  const [isAddingTech, setIsAddingTech] = useState(false);
  const [techForm, setTechForm] = useState({
    name: '',
    email: '',
    phone: '',
    specialization: '',
    experience_years: 5,
    bio: '',
    photo_url: '',
  });

  // Guard: Protect admin route
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/login');
    }
  }, [user, isAdmin, authLoading, navigate]);

  // Load all dashboard data
  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, bookingsRes, servicesRes, techsRes, reviewsRes, messagesRes] = await Promise.all([
        api.dashboard.getStats(),
        api.bookings.adminGetAll(bookingFilter ? `?status=${bookingFilter}` : ''),
        api.services.adminGetAll(),
        api.technicians.getAll(),
        api.reviews.adminGetAll(),
        api.contact.adminGetAll(),
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (bookingsRes.success) setBookings(bookingsRes.data?.bookings || []);
      if (servicesRes.success) setServices(servicesRes.data?.services || []);
      if (techsRes.success) setTechnicians(techsRes.data || []);
      if (reviewsRes.success) setReviews(reviewsRes.data?.reviews || []);
      if (messagesRes.success) setMessages(messagesRes.data?.messages || []);

      setSettingsForm(settings);
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
      setActionError(err.message || 'Failed to fetch dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin, bookingFilter]);

  const showNotification = (msg, isErr = false) => {
    if (isErr) {
      setActionError(msg);
      setTimeout(() => setActionError(null), 4000);
    } else {
      setActionSuccess(msg);
      setTimeout(() => setActionSuccess(null), 4000);
    }
  };

  // --- Booking Actions ---
  const handleUpdateBookingStatus = async (id, newStatus) => {
    try {
      const res = await api.bookings.updateStatus(id, newStatus);
      if (res.success) {
        showNotification(`Booking status updated to ${newStatus}`);
        loadData();
      }
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  const handleAssignTechnician = async (bookingId, techId) => {
    if (!techId) return;
    try {
      const res = await api.bookings.assignTechnician(bookingId, techId);
      if (res.success) {
        showNotification('Technician assigned successfully.');
        loadData();
      }
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  // --- Service Actions ---
  const handleSaveService = async (e) => {
    e.preventDefault();
    try {
      if (editingService) {
        await api.services.update(editingService.id, serviceForm);
        showNotification('Service updated successfully.');
      } else {
        await api.services.create(serviceForm);
        showNotification('New AC service created successfully.');
      }
      setEditingService(null);
      setIsAddingService(false);
      setServiceForm({
        name: '',
        short_description: '',
        description: '',
        price_starting: '',
        price_label: 'Starting from',
        duration: '',
        category: 'residential',
        icon: 'wrench',
      });
      loadData();
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  const handleDeleteService = async (id) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    try {
      await api.services.delete(id);
      showNotification('Service deleted.');
      loadData();
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  // --- Technician Actions ---
  const handleAddTechnician = async (e) => {
    e.preventDefault();
    try {
      await api.technicians.create(techForm);
      showNotification('Technician created and added to roster.');
      setIsAddingTech(false);
      setTechForm({
        name: '',
        email: '',
        phone: '',
        specialization: '',
        experience_years: 5,
        bio: '',
        photo_url: '',
      });
      loadData();
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  const handleToggleTechAvailability = async (id, currentVal) => {
    try {
      await api.technicians.update(id, { is_available: currentVal ? 0 : 1 });
      showNotification('Technician availability updated.');
      loadData();
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  // --- Review Actions ---
  const handleToggleReviewApprove = async (id, currentApproved) => {
    try {
      await api.reviews.toggleApproval(id, !currentApproved);
      showNotification(`Review ${currentApproved ? 'hidden' : 'approved'}.`);
      loadData();
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  const handleDeleteReview = async (id) => {
    if (!window.confirm('Delete this review permanently?')) return;
    try {
      await api.reviews.delete(id);
      showNotification('Review deleted.');
      loadData();
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  // --- Contact Actions ---
  const handleMarkMessageRead = async (id) => {
    try {
      await api.contact.markRead(id);
      showNotification('Message marked as read.');
      loadData();
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  const handleDeleteMessage = async (id) => {
    if (!window.confirm('Delete this inquiry?')) return;
    try {
      await api.contact.delete(id);
      showNotification('Message deleted.');
      loadData();
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  // --- Settings Actions ---
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await api.settings.update(settingsForm);
      await refreshSettings();
      showNotification('Business settings and website configuration updated successfully.');
    } catch (err) {
      showNotification(err.message, true);
    }
  };

  if (authLoading || (!user && loading)) {
    return (
      <div className="container" style={{ padding: '6rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading admin control portal...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '85vh', backgroundColor: '#F8FAFC', paddingBottom: '4rem' }}>
      {/* Admin Top Header */}
      <section style={{ backgroundColor: 'var(--primary-navy)', color: '#ffffff', padding: '2rem 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <LayoutDashboard size={24} color="#38BDF8" />
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Admin Management Portal</h1>
            </div>
            <p style={{ color: '#94A3B8', fontSize: '0.9rem', marginTop: '0.2rem' }}>
              Logged in as <strong>{user?.name}</strong> ({user?.email})
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={loadData} className="btn btn-secondary btn-sm" style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.2)' }}>
              <RefreshCw size={15} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </section>

      {/* Admin Tabs Bar */}
      <div style={{ backgroundColor: '#ffffff', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: '70px', zIndex: 90 }}>
        <div className="container" style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', padding: '0.5rem 1.25rem' }}>
          {[
            { id: 'overview', label: 'Dashboard Overview', icon: LayoutDashboard },
            { id: 'bookings', label: `Bookings (${bookings.length})`, icon: CalendarCheck },
            { id: 'services', label: `AC Services (${services.length})`, icon: Wrench },
            { id: 'technicians', label: `Technicians (${technicians.length})`, icon: Users },
            { id: 'reviews', label: `Reviews (${reviews.length})`, icon: MessageSquare },
            { id: 'messages', label: `Inquiries (${messages.length})`, icon: Mail },
            { id: 'settings', label: 'Site Settings', icon: SettingsIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                style={{ borderRadius: '6px', whiteSpace: 'nowrap' }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="container" style={{ marginTop: '2rem' }}>
        {/* Global Notifications */}
        {actionSuccess && (
          <div className="animate-fade-in" style={{ backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', padding: '0.85rem 1.25rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <CheckCircle2 size={18} />
            <span>{actionSuccess}</span>
          </div>
        )}

        {actionError && (
          <div className="animate-fade-in" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', padding: '0.85rem 1.25rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertCircle size={18} />
            <span>{actionError}</span>
          </div>
        )}

        {/* ================= TAB 1: OVERVIEW ================= */}
        {activeTab === 'overview' && stats && (
          <div className="animate-fade-in">
            {/* KPI Cards */}
            <div className="grid-4" style={{ marginBottom: '2rem' }}>
              <div className="card" style={{ borderLeft: '4px solid var(--warning-amber)' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Pending Bookings</div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--warning-amber)', margin: '0.25rem 0' }}>
                  {stats.bookings.pending}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Requires confirmation</div>
              </div>

              <div className="card" style={{ borderLeft: '4px solid var(--primary-blue)' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Confirmed & In Progress</div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--primary-blue)', margin: '0.25rem 0' }}>
                  {stats.bookings.confirmed + stats.bookings.assigned + stats.bookings.in_progress}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Active customer jobs</div>
              </div>

              <div className="card" style={{ borderLeft: '4px solid #10B981' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Completed Bookings</div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#10B981', margin: '0.25rem 0' }}>
                  {stats.bookings.completed}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Finished successfully</div>
              </div>

              <div className="card" style={{ borderLeft: '4px solid #7C3AED' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Estimated Revenue</div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#7C3AED', margin: '0.25rem 0' }}>
                  ${stats.bookings.total_revenue?.toFixed(2) || '0.00'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>From completed jobs</div>
              </div>
            </div>

            {/* Recent Bookings Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '2.5rem' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
                  Recent Appointment Requests
                </h3>
                <button onClick={() => setActiveTab('bookings')} className="btn btn-secondary btn-sm">
                  View All Bookings
                </button>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border-color)', color: '#64748B' }}>
                    <th style={{ padding: '0.85rem 1.25rem' }}>Reference</th>
                    <th style={{ padding: '0.85rem 1.25rem' }}>Customer</th>
                    <th style={{ padding: '0.85rem 1.25rem' }}>Service</th>
                    <th style={{ padding: '0.85rem 1.25rem' }}>Schedule</th>
                    <th style={{ padding: '0.85rem 1.25rem' }}>Status</th>
                    <th style={{ padding: '0.85rem 1.25rem' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.bookings.recent.map((b) => (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.85rem 1.25rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
                        {b.reference_code}
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        <div style={{ fontWeight: 600 }}>{b.customer_name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{b.customer_phone}</div>
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem' }}>{b.service_name}</td>
                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        <div>{b.preferred_date}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{b.preferred_time}</div>
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        <StatusBadge status={b.status} />
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        <select
                          value={b.status}
                          onChange={(e) => handleUpdateBookingStatus(b.id, e.target.value)}
                          className="form-select"
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.85rem', width: 'auto' }}
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="assigned">Assigned</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 2: BOOKINGS MANAGER ================= */}
        {activeTab === 'bookings' && (
          <div className="animate-fade-in card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
                All Customer Appointments ({bookings.length})
              </h3>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <Filter size={16} color="var(--text-muted)" />
                <select
                  value={bookingFilter}
                  onChange={(e) => setBookingFilter(e.target.value)}
                  className="form-select"
                  style={{ width: 'auto', padding: '0.4rem 0.8rem' }}
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border-color)', color: '#64748B' }}>
                  <th style={{ padding: '1rem 1.25rem' }}>Ref / Customer</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Service & Unit</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Location</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Schedule</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Status</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Assign Technician</th>
                  <th style={{ padding: '1rem 1.25rem' }}>Change Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ fontWeight: 800, color: 'var(--primary-navy)' }}>{b.reference_code}</div>
                      <div style={{ fontWeight: 600 }}>{b.customer_name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{b.customer_phone}</div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ fontWeight: 600 }}>{b.service_name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {b.ac_brand || 'Standard'} ({b.ac_type || 'AC'})
                      </div>
                      {b.problem_description && (
                        <div style={{ fontSize: '0.75rem', color: '#64748B', maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {b.problem_description}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem' }}>
                      <div>{b.address}</div>
                      <div style={{ color: 'var(--text-muted)' }}>{b.city}</div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem' }}>
                      <div style={{ fontWeight: 600 }}>{b.preferred_date}</div>
                      <div style={{ color: 'var(--text-muted)' }}>{b.preferred_time}</div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <StatusBadge status={b.status} />
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <select
                        value={b.technician_id || ''}
                        onChange={(e) => handleAssignTechnician(b.id, e.target.value)}
                        className="form-select"
                        style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem', width: 'auto' }}
                      >
                        <option value="">-- Assign Tech --</option>
                        {technicians.map((t) => (
                          <option key={t.user_id} value={t.user_id}>
                            {t.name} ({t.specialization?.split('&')[0]})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <select
                        value={b.status}
                        onChange={(e) => handleUpdateBookingStatus(b.id, e.target.value)}
                        className="form-select"
                        style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem', width: 'auto' }}
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="assigned">Assigned</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ================= TAB 3: AC SERVICES MANAGER ================= */}
        {activeTab === 'services' && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
                AC Services & Pricing Catalog
              </h3>
              <button
                onClick={() => {
                  setEditingService(null);
                  setIsAddingService(true);
                }}
                className="btn btn-primary btn-sm"
              >
                <Plus size={16} />
                <span>Add New Service</span>
              </button>
            </div>

            {/* Add / Edit Form Modal */}
            {(isAddingService || editingService) && (
              <div className="card" style={{ marginBottom: '2rem', border: '2px solid var(--primary-blue)' }}>
                <h4 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem' }}>
                  {editingService ? `Edit Service: ${editingService.name}` : 'Add New AC Service'}
                </h4>
                <form onSubmit={handleSaveService}>
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Service Name *</label>
                      <input
                        type="text"
                        value={serviceForm.name}
                        onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                        className="form-input"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Starting Price ($) *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={serviceForm.price_starting}
                        onChange={(e) => setServiceForm({ ...serviceForm, price_starting: e.target.value })}
                        className="form-input"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid-3">
                    <div className="form-group">
                      <label className="form-label">Price Label</label>
                      <input
                        type="text"
                        value={serviceForm.price_label}
                        onChange={(e) => setServiceForm({ ...serviceForm, price_label: e.target.value })}
                        placeholder="Starting from"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Estimated Duration</label>
                      <input
                        type="text"
                        value={serviceForm.duration}
                        onChange={(e) => setServiceForm({ ...serviceForm, duration: e.target.value })}
                        placeholder="1 - 2 Hours"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Category</label>
                      <select
                        value={serviceForm.category}
                        onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}
                        className="form-select"
                      >
                        <option value="residential">Residential</option>
                        <option value="commercial">Commercial</option>
                        <option value="both">Both</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Short Description</label>
                    <input
                      type="text"
                      value={serviceForm.short_description}
                      onChange={(e) => setServiceForm({ ...serviceForm, short_description: e.target.value })}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Full Service Description</label>
                    <textarea
                      value={serviceForm.description}
                      onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                      className="form-textarea"
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button type="submit" className="btn btn-primary btn-sm">
                      <Save size={15} /> Save Service
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingService(null);
                        setIsAddingService(false);
                      }}
                      className="btn btn-secondary btn-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border-color)', color: '#64748B' }}>
                    <th style={{ padding: '0.85rem 1.25rem' }}>Name</th>
                    <th style={{ padding: '0.85rem 1.25rem' }}>Category</th>
                    <th style={{ padding: '0.85rem 1.25rem' }}>Starting Price</th>
                    <th style={{ padding: '0.85rem 1.25rem' }}>Duration</th>
                    <th style={{ padding: '0.85rem 1.25rem' }}>Status</th>
                    <th style={{ padding: '0.85rem 1.25rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.85rem 1.25rem', fontWeight: 700, color: 'var(--primary-navy)' }}>
                        {s.name}
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem', textTransform: 'capitalize' }}>{s.category}</td>
                      <td style={{ padding: '0.85rem 1.25rem', fontWeight: 800, color: 'var(--primary-blue)' }}>
                        ${s.price_starting}
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem' }}>{s.duration || 'N/A'}</td>
                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: s.is_active ? '#10B981' : '#64748B', backgroundColor: s.is_active ? '#ECFDF5' : '#F1F5F9', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                          {s.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => {
                              setEditingService(s);
                              setServiceForm(s);
                              setIsAddingService(false);
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.3rem 0.6rem' }}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteService(s.id)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.3rem 0.6rem', color: '#EF4444' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= TAB 4: TECHNICIANS ================= */}
        {activeTab === 'technicians' && (
          <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
                Technician Staff & Dispatch Availability
              </h3>
              <button onClick={() => setIsAddingTech(true)} className="btn btn-primary btn-sm">
                <Plus size={16} />
                <span>Add Technician</span>
              </button>
            </div>

            {isAddingTech && (
              <div className="card" style={{ marginBottom: '2rem', border: '2px solid var(--primary-blue)' }}>
                <h4 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1rem' }}>
                  Register New Technician Profile
                </h4>
                <form onSubmit={handleAddTechnician}>
                  <div className="grid-3">
                    <div className="form-group">
                      <label className="form-label">Full Name *</label>
                      <input
                        type="text"
                        value={techForm.name}
                        onChange={(e) => setTechForm({ ...techForm, name: e.target.value })}
                        className="form-input"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email Address *</label>
                      <input
                        type="email"
                        value={techForm.email}
                        onChange={(e) => setTechForm({ ...techForm, email: e.target.value })}
                        className="form-input"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone Number *</label>
                      <input
                        type="tel"
                        value={techForm.phone}
                        onChange={(e) => setTechForm({ ...techForm, phone: e.target.value })}
                        className="form-input"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">Specialization</label>
                      <input
                        type="text"
                        value={techForm.specialization}
                        onChange={(e) => setTechForm({ ...techForm, specialization: e.target.value })}
                        placeholder="E.g., Inverter Split AC & Gas Diagnostics"
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Years of Experience</label>
                      <input
                        type="number"
                        value={techForm.experience_years}
                        onChange={(e) => setTechForm({ ...techForm, experience_years: e.target.value })}
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Short Bio / Credentials</label>
                    <textarea
                      value={techForm.bio}
                      onChange={(e) => setTechForm({ ...techForm, bio: e.target.value })}
                      className="form-textarea"
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button type="submit" className="btn btn-primary btn-sm">Save Technician</button>
                    <button type="button" onClick={() => setIsAddingTech(false)} className="btn btn-secondary btn-sm">Cancel</button>
                  </div>
                </form>
              </div>
            )}

            <div className="grid-2">
              {technicians.map((t) => (
                <div key={t.id} className="card" style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                  <img
                    src={t.photo_url || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=400&q=80'}
                    alt={t.name}
                    style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary-navy)' }}>{t.name}</h4>
                      <button
                        onClick={() => handleToggleTechAvailability(t.id, t.is_available)}
                        className={`badge ${t.is_available ? 'badge-completed' : 'badge-cancelled'}`}
                        style={{ cursor: 'pointer' }}
                      >
                        {t.is_available ? 'Available' : 'Busy / Off'}
                      </button>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--primary-blue)', fontWeight: 600 }}>{t.specialization}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.email} • {t.phone}</div>
                    <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                      Rating: <strong>{t.rating} ★</strong> | Completed Jobs: <strong>{t.jobs_completed}</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 5: REVIEWS MODERATION ================= */}
        {activeTab === 'reviews' && (
          <div className="animate-fade-in card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
                Customer Reviews Moderation ({reviews.length})
              </h3>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border-color)', color: '#64748B' }}>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Customer</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Rating</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Feedback Comment</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Status</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.85rem 1.25rem', fontWeight: 700 }}>
                      {r.customer_name}
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.service_name || 'General Service'}</div>
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      <StarRating rating={r.rating} size={15} />
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', color: '#334155', maxWidth: '300px' }}>
                      "{r.comment}"
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: r.is_approved ? '#10B981' : '#F59E0B', backgroundColor: r.is_approved ? '#ECFDF5' : '#FFFBEB', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                        {r.is_approved ? 'Approved' : 'Pending Moderation'}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleToggleReviewApprove(r.id, r.is_approved)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.3rem 0.6rem' }}
                        >
                          {r.is_approved ? 'Hide' : 'Approve'}
                        </button>
                        <button
                          onClick={() => handleDeleteReview(r.id)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.3rem 0.6rem', color: '#EF4444' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ================= TAB 6: CONTACT INQUIRIES ================= */}
        {activeTab === 'messages' && (
          <div className="animate-fade-in card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-navy)' }}>
                Customer Contact Submissions ({messages.length})
              </h3>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border-color)', color: '#64748B' }}>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Sender</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Subject</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Message</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Status</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((m) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      <div style={{ fontWeight: 700 }}>{m.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{m.email}</div>
                      {m.phone && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{m.phone}</div>}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem', fontWeight: 600 }}>{m.subject || 'Inquiry'}</td>
                    <td style={{ padding: '0.85rem 1.25rem', color: '#334155', maxWidth: '320px' }}>
                      {m.message}
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: m.is_read ? '#64748B' : '#EF4444', backgroundColor: m.is_read ? '#F1F5F9' : '#FEF2F2', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                        {m.is_read ? 'Read' : 'New'}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1.25rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {!m.is_read && (
                          <button
                            onClick={() => handleMarkMessageRead(m.id)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.3rem 0.6rem' }}
                          >
                            Mark Read
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteMessage(m.id)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.3rem 0.6rem', color: '#EF4444' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ================= TAB 7: SITE SETTINGS ================= */}
        {activeTab === 'settings' && (
          <div className="animate-fade-in card" style={{ padding: '2.5rem', maxWidth: '850px', margin: '0 auto' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-navy)', marginBottom: '0.5rem' }}>
              Configurable Business Details & Website Settings
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
              All phone numbers, company addresses, working hours, and emergency hotlines can be customized here dynamically without modifying source code.
            </p>

            <form onSubmit={handleSaveSettings}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Business Name</label>
                  <input
                    type="text"
                    value={settingsForm.business_name || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, business_name: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Business Tagline</label>
                  <input
                    type="text"
                    value={settingsForm.business_tagline || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, business_tagline: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="grid-3">
                <div className="form-group">
                  <label className="form-label">Business Phone</label>
                  <input
                    type="text"
                    value={settingsForm.business_phone || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, business_phone: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">24/7 Emergency Phone</label>
                  <input
                    type="text"
                    value={settingsForm.business_emergency_phone || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, business_emergency_phone: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">WhatsApp Contact Number</label>
                  <input
                    type="text"
                    value={settingsForm.business_whatsapp || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, business_whatsapp: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Customer Email</label>
                  <input
                    type="email"
                    value={settingsForm.business_email || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, business_email: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">HVAC Master License Number</label>
                  <input
                    type="text"
                    value={settingsForm.license_number || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, license_number: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Street Address</label>
                  <input
                    type="text"
                    value={settingsForm.business_address || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, business_address: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">City, State & Zip</label>
                  <input
                    type="text"
                    value={settingsForm.business_city || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, business_city: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Working & Dispatch Hours</label>
                <input
                  type="text"
                  value={settingsForm.business_hours || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, business_hours: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Service Area Radius Information</label>
                <input
                  type="text"
                  value={settingsForm.service_radius || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, service_radius: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Google Maps Embed URL</label>
                <input
                  type="text"
                  value={settingsForm.google_maps_embed || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, google_maps_embed: e.target.value })}
                  className="form-input"
                />
              </div>

              <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: '1rem' }}>
                <Save size={18} />
                <span>Save Website Settings</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
