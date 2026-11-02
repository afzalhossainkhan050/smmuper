import React, { useState } from 'react';
import {
  Mail, Send, Users, User, CheckCircle, AlertCircle,
  Loader2, Info
} from 'lucide-react';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminMailUsersPage() {
  const { showToast } = useAuth();

  const [formData, setFormData] = useState({
    target: 'all', // all, active, inactive, single
    userId: '',
    subject: '',
    message: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const shortcodes = ['[[username]]', '[[email]]', '[[site_name]]', '[[login_url]]'];

  const insertShortcode = (sc) => {
    setFormData(prev => ({
      ...prev,
      message: prev.message + ' ' + sc
    }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.message.trim()) {
      showToast('Please provide both subject and message', 'error');
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirmSend = async () => {
    try {
      setSubmitting(true);
      const res = await api.admin.sendMail(formData);
      showToast(res.message || 'Broadcast email dispatched successfully', 'success');
      setShowConfirm(false);
      setFormData({
        target: 'all',
        userId: '',
        subject: '',
        message: ''
      });
    } catch (err) {
      showToast(err.message || 'Failed to dispatch email broadcast', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2.5">
          <Mail className="text-primary" size={24} />
          Mail To Users
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Broadcast announcements, maintenance updates, or customized notifications to your platform users.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Compose Card */}
        <div className="lg:col-span-2 saas-card">
          <form onSubmit={handleFormSubmit} className="space-y-5">
            <div>
              <label className="saas-label">Target Audience *</label>
              <select
                value={formData.target}
                onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                className="saas-input w-full text-xs font-semibold"
              >
                <option value="all">All Registered Customers (Broadcast)</option>
                <option value="active">Active Accounts Only</option>
                <option value="inactive">Inactive / Suspended Accounts</option>
                <option value="single">Single Specific Customer</option>
              </select>
            </div>

            {formData.target === 'single' && (
              <div>
                <label className="saas-label">Target Customer ID or Username *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1 or demo"
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  className="saas-input w-full text-xs"
                />
              </div>
            )}

            <div>
              <label className="saas-label">Email Subject *</label>
              <input
                type="text"
                required
                placeholder="Important Announcement: Server Upgrades & Lower API Rates"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="saas-input w-full text-xs font-medium"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="saas-label mb-0">Message Content (HTML Allowed) *</label>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-muted-foreground mr-1">Insert Shortcode:</span>
                  {shortcodes.map((sc) => (
                    <button
                      key={sc}
                      type="button"
                      onClick={() => insertShortcode(sc)}
                      className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-bg-surface-elevated border border-border-main hover:border-primary text-text-primary hover:text-primary transition-colors cursor-pointer"
                    >
                      {sc}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                required
                rows={9}
                placeholder="Hello [[username]],&#10;&#10;We are thrilled to announce that SMMuper has reduced wholesale pricing across all high-speed Instagram and YouTube services..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="saas-input w-full font-mono text-xs leading-relaxed"
              />
            </div>

            <div className="pt-2 flex items-center justify-end">
              <button
                type="submit"
                className="saas-btn-primary flex items-center gap-2 text-xs"
              >
                <Send size={15} />
                Send Email Broadcast
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar Info & Safety Tips */}
        <div className="space-y-5">
          <div className="saas-card bg-bg-surface-elevated border-primary/20">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 mb-2">
              <Info size={16} className="text-primary" />
              Email Best Practices
            </h3>
            <ul className="text-xs text-muted-foreground space-y-2 leading-relaxed">
              <li>• Shortcodes like <code className="text-primary font-bold">[[username]]</code> will be automatically replaced with the recipient's real details.</li>
              <li>• High-volume broadcasts run asynchronously via our background queue to avoid SMTP rate limiting.</li>
              <li>• Always test email formatting by sending a copy to yourself first from Email Settings.</li>
            </ul>
          </div>

          <div className="saas-card bg-bg-surface-elevated border-border-main">
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 mb-2">
              <Users size={16} className="text-secondary" />
              Segmentation
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Target inactive accounts to offer re-engagement promo credits, or broadcast major provider maintenance notices to all users.
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="saas-card w-full max-w-sm bg-surface p-6 shadow-2xl border border-primary/30 rounded-xl">
            <div className="flex items-center gap-3 text-primary pb-3 border-b border-border-main">
              <Send size={20} />
              <h2 className="text-base font-bold text-text-primary">Confirm Email Dispatch</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Are you sure you want to dispatch this email to <strong className="text-text-primary">{formData.target === 'all' ? 'All Customers' : formData.target}</strong>?
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-4 mt-2">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="saas-btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSend}
                disabled={submitting}
                className="saas-btn-primary text-xs flex items-center gap-1.5"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                Confirm & Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

