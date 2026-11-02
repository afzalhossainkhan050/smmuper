import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSystem } from '../../contexts/SystemContext';
import api from '../../utils/api';
import Breadcrumbs from '../../components/ui/Breadcrumbs';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import {
  MessageSquare, Search, Filter, Eye, CheckCircle2,
  Clock, AlertCircle, X, Send, Shield, User, ArrowRight,
  CheckCircle, Lock, RefreshCw, Sparkles
} from 'lucide-react';

export default function AdminTicketsPage() {
  const { showToast } = useAuth();
  const { formatPrice } = useSystem();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'open' | 'answered' | 'closed'
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Selected Ticket for Drawer/Modal
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [activeTicket, setActiveTicket] = useState(null);
  const [ticketReplies, setTicketReplies] = useState([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [staffReply, setStaffReply] = useState('');
  const [newStatus, setNewStatus] = useState('answered');
  const [sendingReply, setSendingReply] = useState(false);

  const messagesEndRef = useRef(null);

  const loadTickets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (activeTab !== 'all') {
        params.append('status', activeTab);
      }
      if (priorityFilter) {
        params.append('priority', priorityFilter);
      }
      if (search.trim()) {
        params.append('search', search.trim());
      }
      params.append('limit', '50');

      const res = await api.admin.getTickets(params.toString());
      setTickets(res.data?.tickets || res.tickets || []);
    } catch (err) {
      console.error('Failed to load admin tickets:', err);
      showToast(err.message || 'Failed to load support tickets', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [activeTab, priorityFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadTickets();
  };

  // Open Conversation Thread
  const openTicketThread = async (id) => {
    setSelectedTicketId(id);
    setLoadingThread(true);
    try {
      const res = await api.admin.getTicketById(id);
      setActiveTicket(res.data?.ticket || res.ticket);
      setTicketReplies(res.data?.replies || res.replies || []);
      setNewStatus(res.data?.ticket?.status === 'closed' ? 'closed' : 'answered');
    } catch (err) {
      showToast(err.message || 'Failed to load conversation thread', 'error');
      setSelectedTicketId(null);
    } finally {
      setLoadingThread(false);
    }
  };

  useEffect(() => {
    if (activeTicket) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [ticketReplies, activeTicket]);

  const handleSendStaffReply = async (e) => {
    e.preventDefault();
    if (!staffReply.trim()) {
      showToast('Please type a message before sending', 'error');
      return;
    }
    setSendingReply(true);
    try {
      await api.admin.replyTicket(selectedTicketId, { message: staffReply.trim() });
      if (newStatus && newStatus !== activeTicket.status) {
        await api.admin.updateTicket(selectedTicketId, { status: newStatus });
      }
      showToast('Reply dispatched successfully!', 'success');
      setStaffReply('');
      // Reload current thread & table
      await openTicketThread(selectedTicketId);
      loadTickets();
    } catch (err) {
      showToast(err.message || 'Failed to submit staff reply', 'error');
    } finally {
      setSendingReply(false);
    }
  };

  const handleStatusChangeOnly = async (status) => {
    try {
      await api.admin.updateTicket(selectedTicketId, { status });
      showToast(`Ticket status updated to ${status}`, 'success');
      await openTicketThread(selectedTicketId);
      loadTickets();
    } catch (err) {
      showToast(err.message || 'Failed to update ticket status', 'error');
    }
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
          <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Ticket Panel', href: '/admin/tickets' }, { label: 'Support Tickets' }]} />
          <h1 className="dashboard-page-title mt-1 flex items-center gap-2">
            <MessageSquare size={24} className="text-primary" />
            <span>Support <span className="gradient-text">Ticket Management</span></span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Review customer assistance requests, answer order questions, and resolve technical tickets.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-bg-surface hover:bg-bg-surface-elevated text-muted-foreground hover:text-text-primary border border-border-main'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Priority Select */}
        <div className="flex items-center gap-2">
          <select
            className="form-control text-xs py-1.5 sm:w-36"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <form onSubmit={handleSearchSubmit} className="flex items-center gap-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Search ticket / user..."
                className="form-control text-xs py-1.5 pl-8 pr-3 sm:w-48"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
            <button type="submit" className="btn btn-secondary btn-sm py-1.5 px-2.5 text-xs">
              Filter
            </button>
          </form>
        </div>
      </div>

      {/* Tickets Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">
              <LoadingSpinner />
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-xs space-y-2">
              <MessageSquare size={36} className="mx-auto opacity-30 text-primary" />
              <p className="font-semibold">No support tickets found.</p>
              <p className="text-[11px]">There are currently no tickets matching the chosen filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-bg-surface-elevated text-muted-foreground uppercase tracking-wider text-[10px] border-b border-border-main">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Subject & Summary</th>
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
                        <div className="font-semibold text-text-primary">
                          {t.username || `User #${t.user_id}`}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                          {t.email}
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-[300px]">
                        <div className="font-bold text-text-primary truncate">
                          {t.subject}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate line-clamp-1 mt-0.5">
                          {t.message}
                        </div>
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
                        <button
                          onClick={() => openTicketThread(t.id)}
                          className="btn btn-primary btn-sm py-1 px-3 text-xs inline-flex items-center gap-1.5"
                        >
                          <Eye size={13} />
                          <span>Reply & Review</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversation Thread Drawer Modal */}
      {selectedTicketId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="saas-card max-w-3xl w-full h-[90vh] bg-surface border border-border-main flex flex-col shadow-2xl overflow-hidden rounded-2xl">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-border-main bg-bg-surface-elevated flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary">#{activeTicket?.id}</span>
                  <h3 className="font-extrabold text-sm sm:text-base text-text-primary">
                    {activeTicket?.subject || 'Loading conversation...'}
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                  <span>Customer: <strong className="text-text-primary">{activeTicket?.username}</strong> ({activeTicket?.email})</span>
                  <span>Wallet: <strong className="text-emerald-400">{formatPrice(activeTicket?.user_balance || 0)}</strong></span>
                  <span>Opened: {activeTicket?.created_at && new Date(activeTicket.created_at).toLocaleString()}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicketId(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-text-primary hover:bg-bg-surface"
              >
                <X size={20} />
              </button>
            </div>

            {/* Conversation Thread Messages */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-bg-surface/50">
              {loadingThread ? (
                <div className="h-full flex items-center justify-center">
                  <LoadingSpinner />
                </div>
              ) : (
                <>
                  {/* Initial Customer Request */}
                  <div className="saas-card p-4 sm:p-5 bg-surface border border-border-main">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-border-subtle">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-bg-surface-elevated text-muted-foreground flex items-center justify-center font-bold text-xs">
                          <User size={14} />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-text-primary">{activeTicket?.username}</span>
                          <span className="text-[10px] text-muted-foreground ml-1.5">(Customer Original Ticket)</span>
                        </div>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {new Date(activeTicket?.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-xs text-text-primary whitespace-pre-wrap leading-relaxed">
                      {activeTicket?.message}
                    </div>
                  </div>

                  {/* Replies List */}
                  {ticketReplies.map((r) => {
                    const isStaff = r.role === 'admin' || r.role === 'staff' || r.is_admin;
                    return (
                      <div
                        key={r.id}
                        className={`saas-card p-4 sm:p-5 border ${
                          isStaff
                            ? 'bg-indigo-950/25 border-indigo-500/40 ml-4 sm:ml-8'
                            : 'bg-surface border-border-main mr-4 sm:mr-8'
                        }`}
                      >
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-border-subtle">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                              isStaff ? 'bg-indigo-600 text-white shadow-sm' : 'bg-bg-surface-elevated text-muted-foreground'
                            }`}>
                              {isStaff ? <Shield size={14} /> : <User size={14} />}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-text-primary">
                                {r.username}
                              </span>
                              {isStaff && (
                                <span className="ml-1.5 px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-extrabold text-[9px] uppercase">
                                  Staff Support
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            {new Date(r.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-xs text-text-primary whitespace-pre-wrap leading-relaxed">
                          {r.message}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Staff Reply Box */}
            <div className="p-4 bg-surface border-t border-border-main">
              <form onSubmit={handleSendStaffReply} className="space-y-3">
                <textarea
                  rows={3}
                  required
                  placeholder="Type your response to the customer..."
                  className="form-control text-xs"
                  value={staffReply}
                  onChange={(e) => setStaffReply(e.target.value)}
                />

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-bold text-muted-foreground">
                      Set Status:
                    </label>
                    <select
                      className="form-control text-xs py-1 sm:w-32"
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                    >
                      <option value="answered">Answered</option>
                      <option value="pending">Pending</option>
                      <option value="closed">Closed</option>
                    </select>

                    {activeTicket?.status !== 'closed' && (
                      <button
                        type="button"
                        onClick={() => handleStatusChangeOnly('closed')}
                        className="btn btn-secondary btn-sm py-1 px-2.5 text-xs text-rose-400 hover:text-rose-300 border-rose-500/30 ml-2"
                      >
                        <Lock size={12} className="mr-1" /> Close Ticket
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedTicketId(null)}
                      className="btn btn-secondary btn-sm text-xs"
                    >
                      Close Window
                    </button>
                    <button
                      type="submit"
                      disabled={sendingReply || !staffReply.trim()}
                      className="btn btn-primary btn-sm text-xs flex items-center gap-1.5 font-bold"
                    >
                      <Send size={13} />
                      <span>{sendingReply ? 'Sending...' : 'Send Staff Reply'}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

