import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import StatusBadge from '../components/ui/StatusBadge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import {
  ArrowLeft, Send, MessageSquare, User, Shield, CheckCircle2,
  Clock, AlertCircle, XCircle, Lock
} from 'lucide-react';

export default function TicketDetailPage() {
  const { id } = useParams();
  const { user, showToast } = useAuth();

  const [ticket, setTicket] = useState(null);
  const [replies, setReplies] = useState([]);
  const [replyMessage, setReplyMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchTicket();
  }, [id]);

  const fetchTicket = async () => {
    try {
      const data = await api.tickets.getById(id);
      setTicket(data.ticket || data);
      setReplies(data.replies || []);
    } catch (err) {
      console.error('Failed to fetch ticket:', err);
      showToast(err.message || 'Failed to load ticket details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replies]);

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim()) {
      showToast('Please type a response', 'error');
      return;
    }
    setSending(true);
    try {
      await api.tickets.reply(id, { message: replyMessage.trim() });
      setReplyMessage('');
      showToast('Reply submitted successfully!');
      await fetchTicket();
    } catch (err) {
      showToast(err.message || 'Failed to send reply', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!window.confirm('Are you sure you want to close this ticket?')) return;
    setClosing(true);
    try {
      await api.tickets.close(id);
      showToast('Ticket marked as closed');
      await fetchTicket();
    } catch (err) {
      showToast(err.message || 'Failed to close ticket', 'error');
    } finally {
      setClosing(false);
    }
  };

  if (loading) return <LoadingSpinner fullPage />;
  if (!ticket) {
    return (
      <div className="p-12 text-center text-muted-foreground space-y-4">
        <AlertCircle size={40} className="mx-auto text-danger" />
        <h3 className="font-extrabold text-base text-text-primary">Ticket Not Found</h3>
        <Link to="/dashboard/tickets" className="btn btn-primary btn-sm">
          Return to Tickets
        </Link>
      </div>
    );
  }

  const isClosed = ticket.status === 'closed';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="dashboard-page-header">
        <div>
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Tickets', href: '/dashboard/tickets' },
              { label: `#${ticket.id}` }
            ]}
          />
          <div className="flex items-center gap-3 mt-1">
            <Link
              to="/dashboard/tickets"
              className="p-1.5 rounded-lg bg-bg-surface-elevated hover:bg-bg-surface-hover text-muted-foreground hover:text-text-primary border border-border-main"
            >
              <ArrowLeft size={16} />
            </Link>
            <h1 className="dashboard-page-title">
              {ticket.subject}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isClosed && (
            <button
              onClick={handleCloseTicket}
              disabled={closing}
              className="btn btn-secondary btn-sm flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 border-rose-500/30"
            >
              <XCircle size={14} />
              <span>{closing ? 'Closing...' : 'Close Ticket'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Ticket Meta Summary Card */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Status
              </span>
              <div className="mt-1">
                <StatusBadge status={ticket.status} />
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Priority
              </span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold uppercase mt-1 inline-block ${
                ticket.priority === 'urgent'
                  ? 'bg-rose-500/20 text-rose-400'
                  : ticket.priority === 'high'
                  ? 'bg-amber-500/20 text-amber-400'
                  : ticket.priority === 'medium'
                  ? 'bg-indigo-500/20 text-indigo-400'
                  : 'bg-muted/30 text-muted-foreground'
              }`}>
                {ticket.priority}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Opened On
              </span>
              <span className="text-xs text-text-primary font-medium mt-1 inline-block">
                {new Date(ticket.created_at).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="text-xs text-muted-foreground font-mono">
            Ticket ID: <strong className="text-text-primary">#{ticket.id}</strong>
          </div>
        </CardContent>
      </Card>

      {/* Conversation Thread */}
      <div className="space-y-4">
        {/* Initial Customer Message */}
        <div className="saas-card p-5 bg-surface border border-border-main">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-border-subtle">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                <User size={16} />
              </div>
              <div>
                <span className="text-xs font-bold text-text-primary block">
                  {user?.username || 'You (Customer)'}
                </span>
                <span className="text-[10px] text-muted-foreground">Original Inquiry</span>
              </div>
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">
              {new Date(ticket.created_at).toLocaleString()}
            </span>
          </div>
          <div className="text-xs text-text-primary whitespace-pre-wrap leading-relaxed">
            {ticket.message}
          </div>
        </div>

        {/* Replies List */}
        {replies.map((reply) => {
          const isStaff = reply.role === 'admin' || reply.role === 'staff' || reply.is_admin;
          return (
            <div
              key={reply.id}
              className={`saas-card p-5 border transition-all ${
                isStaff
                  ? 'bg-indigo-950/20 border-indigo-500/30'
                  : 'bg-surface border-border-main'
              }`}
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-border-subtle">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                    isStaff
                      ? 'bg-indigo-500 text-white shadow-sm'
                      : 'bg-bg-surface-elevated text-muted-foreground'
                  }`}>
                    {isStaff ? <Shield size={16} /> : <User size={16} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-text-primary">
                        {reply.username || (isStaff ? 'Staff Support' : 'Customer')}
                      </span>
                      {isStaff && (
                        <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-extrabold text-[10px] uppercase">
                          Staff
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {isStaff ? 'SMMuper Customer Success' : 'Customer Response'}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {new Date(reply.created_at).toLocaleString()}
                </span>
              </div>
              <div className="text-xs text-text-primary whitespace-pre-wrap leading-relaxed">
                {reply.message}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Form or Closed State Banner */}
      {isClosed ? (
        <div className="p-4 rounded-xl bg-bg-surface-elevated border border-border-main text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs font-bold">
            <Lock size={16} />
            <span>This ticket is closed</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            No further replies can be posted to closed tickets. If your issue persists, please open a new support ticket.
          </p>
        </div>
      ) : (
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Send size={15} className="text-primary" />
              <span>Submit a Response</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendReply} className="space-y-3">
              <textarea
                required
                rows={4}
                placeholder="Write your reply to support..."
                className="form-control text-xs"
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
              />
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-muted-foreground">
                  Our team typically responds in under 15 minutes.
                </span>
                <button
                  type="submit"
                  disabled={sending || !replyMessage.trim()}
                  className="btn btn-primary btn-sm flex items-center gap-1.5 text-xs font-bold"
                >
                  <Send size={14} />
                  <span>{sending ? 'Sending...' : 'Send Reply'}</span>
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
