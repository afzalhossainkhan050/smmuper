import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import StatusBadge from '../components/ui/StatusBadge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import {
  MessageSquare, Plus, Eye, Clock, CheckCircle, AlertCircle,
  X, Send, ArrowRight, ShieldCheck, HelpCircle, Filter
} from 'lucide-react';

export default function TicketsPage() {
  const { showToast } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  // New Ticket Modal State
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    subject: '',
    priority: 'medium',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [statusFilter]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const queryParam = statusFilter !== 'all' ? `status=${statusFilter}` : '';
      const data = await api.tickets.getAll(queryParam);
      setTickets(data.tickets || data || []);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
      showToast(err.message || 'Failed to load tickets', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim()) {
      showToast('Please provide a subject and message', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.tickets.create(form);
      showToast('Ticket created successfully! Support will respond shortly.');
      setShowCreate(false);
      setForm({ subject: '', priority: 'medium', message: '' });
      fetchTickets();
    } catch (err) {
      showToast(err.message || 'Failed to create ticket', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open' || t.status === 'pending').length,
    answered: tickets.filter(t => t.status === 'answered').length,
    closed: tickets.filter(t => t.status === 'closed').length
  };

  const tabs = [
    { id: 'all', label: 'All Tickets' },
    { id: 'open', label: 'Open / Pending' },
    { id: 'answered', label: 'Answered' },
    { id: 'closed', label: 'Closed' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="dashboard-page-header">
        <div>
          <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Support Tickets' }]} />
          <h1 className="dashboard-page-title mt-1 flex items-center gap-2">
            <MessageSquare size={24} className="text-primary" />
            <span>Support <span className="gradient-text">Tickets</span></span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Submit issues regarding orders, refill requests, payment inquiries, or custom wholesale volume.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn btn-primary btn-sm flex items-center gap-2"
        >
          <Plus size={16} />
          <span>New Ticket</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="hover:border-primary/40">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Total Tickets
              </div>
              <div className="text-xl font-extrabold text-text-primary mt-0.5">
                {stats.total}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center">
              <MessageSquare size={20} />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-amber-400/40">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Open / Pending
              </div>
              <div className="text-xl font-extrabold text-amber-400 mt-0.5">
                {stats.open}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
              <Clock size={20} />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-cyan-400/40">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Answered
              </div>
              <div className="text-xl font-extrabold text-cyan-400 mt-0.5">
                {stats.answered}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-500 flex items-center justify-center">
              <CheckCircle size={20} />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-border-main">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Resolved / Closed
              </div>
              <div className="text-xl font-extrabold text-muted-foreground mt-0.5">
                {stats.closed}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-muted/20 text-muted-foreground flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Filter */}
      <div className="flex items-center gap-2 border-b border-border-main pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              statusFilter === tab.id
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted-foreground hover:text-text-primary hover:bg-bg-surface'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tickets Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">
              <LoadingSpinner />
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-xs space-y-3">
              <MessageSquare size={36} className="mx-auto opacity-30 text-primary" />
              <p className="font-semibold">No tickets found.</p>
              <p className="text-[11px]">Need help with an order or account setting? Create a ticket below.</p>
              <button
                onClick={() => setShowCreate(true)}
                className="btn btn-primary btn-sm inline-flex items-center gap-1.5 mt-2"
              >
                <Plus size={14} /> Open Support Ticket
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-bg-surface-elevated text-muted-foreground uppercase tracking-wider text-[10px] border-b border-border-main">
                  <tr>
                    <th className="px-4 py-3">Ticket ID</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Last Updated</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {tickets.map((t) => (
                    <tr key={t.id} className="hover:bg-bg-surface-hover/50">
                      <td className="px-4 py-3 font-mono font-bold text-text-primary">
                        #{t.id}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/dashboard/tickets/${t.id}`}
                          className="font-semibold text-text-primary hover:text-primary transition-colors block max-w-[320px] truncate"
                        >
                          {t.subject}
                        </Link>
                        <span className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                          {t.message}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          t.priority === 'urgent'
                            ? 'bg-rose-500/20 text-rose-400'
                            : t.priority === 'high'
                            ? 'bg-amber-500/20 text-amber-400'
                            : t.priority === 'medium'
                            ? 'bg-indigo-500/20 text-indigo-400'
                            : 'bg-muted/30 text-muted-foreground'
                        }`}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-[11px]">
                        {new Date(t.updated_at || t.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/dashboard/tickets/${t.id}`}
                          className="btn btn-secondary btn-sm py-1 px-3 text-xs inline-flex items-center gap-1.5"
                        >
                          <Eye size={13} />
                          <span>View Thread</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Ticket Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="saas-card max-w-lg w-full p-6 bg-surface border border-border-main space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <MessageSquare size={18} className="text-primary" />
                <h4 className="font-extrabold text-base text-text-primary">
                  Open Support Ticket
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="text-muted-foreground hover:text-text-primary"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div className="form-group mb-0">
                <label className="form-label text-xs">Subject / Issue Summary</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Order #1234 Drop Refill Request"
                  className="form-control text-xs"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                />
              </div>

              <div className="form-group mb-0">
                <label className="form-label text-xs">Priority</label>
                <select
                  className="form-control text-xs"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  <option value="low">Low - General Question</option>
                  <option value="medium">Medium - Regular Order Inquiry</option>
                  <option value="high">High - Order Failure or Balance Issue</option>
                  <option value="urgent">Urgent - Payment Dispute or API Service Down</option>
                </select>
              </div>

              <div className="form-group mb-0">
                <label className="form-label text-xs">Detailed Message</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Explain your inquiry in detail. Include Order IDs or transaction hashes if applicable."
                  className="form-control text-xs"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="btn btn-secondary btn-sm text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary btn-sm text-xs flex items-center gap-1.5"
                >
                  <Send size={14} />
                  <span>{submitting ? 'Submitting...' : 'Submit Ticket'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
