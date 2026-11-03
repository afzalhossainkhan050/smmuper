import React, { useState, useEffect } from 'react';
import {
  Mail, Send, Settings, Save, CheckCircle2,
  AlertCircle, Edit3, X, Eye, EyeOff, Loader2, Code
} from 'lucide-react';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminEmailSettingsPage() {
  const { showToast } = useAuth();

  const [activeTab, setActiveTab] = useState('smtp');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // SMTP Settings State
  const [smtpConfig, setSmtpConfig] = useState({
    mail_driver: 'smtp',
    mail_host: 'smtp.mailtrap.io',
    mail_port: '587',
    mail_username: '',
    mail_password: '',
    mail_encryption: 'tls',
    mail_from_address: 'support@smmuper.com',
    mail_from_name: 'SMMuper Notification'
  });

  // Templates State
  const [templates, setTemplates] = useState([]);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateFormData, setTemplateFormData] = useState({
    subject: '',
    body: '',
    status: 'active'
  });

  // Test Email Modal
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [emailRes, tplRes] = await Promise.all([
        api.admin.getEmailSettings(),
        api.admin.getEmailTemplates()
      ]);
      const savedConfig = emailRes.emailConfig || emailRes.email_settings;
      if (savedConfig) {
        setSmtpConfig(prev => ({ ...prev, ...savedConfig }));
      }
      if (tplRes.templates) {
        setTemplates(tplRes.templates);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load email settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSmtpSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.admin.updateEmailSettings(smtpConfig);
      showToast('SMTP settings updated successfully', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to save SMTP settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async (e) => {
    e.preventDefault();
    if (!testEmail) {
      showToast('Please enter a recipient email', 'error');
      return;
    }
    try {
      setTesting(true);
      const res = await api.admin.sendTestEmail(testEmail);
      showToast(res?.message || `Test email sent to ${testEmail}`, 'success');
      setIsTestModalOpen(false);
      setTestEmail('');
    } catch (err) {
      showToast(err.message || 'Failed to send test email', 'error');
    } finally {
      setTesting(false);
    }
  };

  const openEditTemplate = (tpl) => {
    setEditingTemplate(tpl);
    setTemplateFormData({
      subject: tpl.subject,
      body: tpl.body,
      status: tpl.status
    });
  };

  const handleTemplateSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.admin.updateEmailTemplate(editingTemplate.id, templateFormData);
      showToast('Email template updated successfully', 'success');
      setEditingTemplate(null);
      await loadData();
    } catch (err) {
      showToast(err.message || 'Failed to update template', 'error');
    } finally {
      setSaving(false);
    }
  };

  const insertShortcode = (code) => {
    setTemplateFormData(prev => ({
      ...prev,
      body: prev.body + ' ' + code
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-primary mr-2" size={24} />
        <span className="text-sm font-semibold text-muted-foreground">Loading email configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2.5">
            <Mail className="text-primary" size={24} />
            Email Settings & Dispatch
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure SMTP gateway, test transactional delivery, and customize email notification templates.
          </p>
        </div>
        <button
          onClick={() => setIsTestModalOpen(true)}
          className="saas-btn-secondary flex items-center gap-2 self-start sm:self-auto text-xs"
        >
          <Send size={14} />
          Send Test Email
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border-main">
        <button
          onClick={() => setActiveTab('smtp')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg transition-colors border-b-2 ${
            activeTab === 'smtp'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-text-primary'
          }`}
        >
          <Settings size={15} />
          SMTP Server Configuration
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg transition-colors border-b-2 ${
            activeTab === 'templates'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-text-primary'
          }`}
        >
          <Code size={15} />
          Notification Templates ({templates.length})
        </button>
      </div>

      {/* TAB 1: SMTP Settings Form */}
      {activeTab === 'smtp' && (
        <form onSubmit={handleSmtpSave} className="saas-card space-y-6">
          <div className="border-b border-border-main pb-3">
            <h2 className="text-base font-bold text-text-primary">Outbound Mail Server (SMTP)</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Used for account verification, password resets, payment notifications, and order completion receipts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="saas-label">Mail Driver</label>
              <select
                value={smtpConfig.mail_driver}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, mail_driver: e.target.value })}
                className="saas-input w-full text-xs"
              >
                <option value="smtp">SMTP (Recommended)</option>
                <option value="sendmail">Sendmail</option>
              </select>
            </div>

            <div>
              <label className="saas-label">Mail Host *</label>
              <input
                type="text"
                required
                value={smtpConfig.mail_host}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, mail_host: e.target.value })}
                className="saas-input w-full font-mono text-xs"
                placeholder="smtp.mailtrap.io"
              />
            </div>

            <div>
              <label className="saas-label">Mail Port *</label>
              <input
                type="number"
                required
                value={smtpConfig.mail_port}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, mail_port: e.target.value })}
                className="saas-input w-full font-mono text-xs"
                placeholder="587"
              />
            </div>

            <div>
              <label className="saas-label">Encryption Protocol</label>
              <select
                value={smtpConfig.mail_encryption}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, mail_encryption: e.target.value })}
                className="saas-input w-full text-xs uppercase"
              >
                <option value="tls">TLS (Standard)</option>
                <option value="ssl">SSL (Secure Socket)</option>
                <option value="none">None</option>
              </select>
            </div>

            <div>
              <label className="saas-label">SMTP Username</label>
              <input
                type="text"
                value={smtpConfig.mail_username}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, mail_username: e.target.value })}
                className="saas-input w-full text-xs"
                placeholder="smtp_user_apikey"
              />
            </div>

            <div>
              <label className="saas-label">SMTP Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={smtpConfig.mail_password}
                  onChange={(e) => setSmtpConfig({ ...smtpConfig, mail_password: e.target.value })}
                  className="saas-input w-full text-xs pr-9"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-text-primary"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="saas-label">From Email Address *</label>
              <input
                type="email"
                required
                value={smtpConfig.mail_from_address}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, mail_from_address: e.target.value })}
                className="saas-input w-full text-xs"
                placeholder="support@smmuper.com"
              />
            </div>

            <div>
              <label className="saas-label">From Display Name *</label>
              <input
                type="text"
                required
                value={smtpConfig.mail_from_name}
                onChange={(e) => setSmtpConfig({ ...smtpConfig, mail_from_name: e.target.value })}
                className="saas-input w-full text-xs"
                placeholder="SMMuper Notification"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-main">
            <button
              type="submit"
              disabled={saving}
              className="saas-btn-primary flex items-center gap-2 text-xs"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Save SMTP Configuration
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: Email Templates List */}
      {activeTab === 'templates' && (
        <div className="saas-card p-0 overflow-hidden">
          <div className="p-4 border-b border-border-main bg-bg-surface-elevated">
            <h2 className="text-base font-bold text-text-primary">Transactional Email Templates</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Customize automated email notifications with dynamic variable placeholders.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="saas-table w-full">
              <thead>
                <tr>
                  <th className="w-12 text-center">SL</th>
                  <th>Template Name</th>
                  <th>Subject Line</th>
                  <th>Available Shortcodes</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((tpl, idx) => (
                  <tr key={tpl.id}>
                    <td className="text-center font-mono text-xs text-muted-foreground">{idx + 1}</td>
                    <td className="font-semibold text-text-primary">
                      <div className="text-xs">{tpl.name}</div>
                      <div className="text-[10px] font-mono text-muted-foreground">{tpl.code}</div>
                    </td>
                    <td className="text-xs text-text-secondary max-w-xs truncate">{tpl.subject}</td>
                    <td>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(tpl.shortcodes || '').split(',').map((sc, i) => (
                          <span
                            key={i}
                            className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-bg-surface-subtle border border-border-subtle text-primary font-bold"
                          >
                            {sc.trim()}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {tpl.status}
                      </span>
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => openEditTemplate(tpl)}
                        className="saas-btn-secondary text-xs px-2.5 py-1 inline-flex items-center gap-1.5"
                      >
                        <Edit3 size={13} />
                        Edit Template
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Template Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="saas-card w-full max-w-2xl bg-surface p-6 shadow-2xl border border-border-main rounded-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-border-main">
              <div>
                <h2 className="text-base font-bold text-text-primary">Edit Template: {editingTemplate.name}</h2>
                <span className="text-[11px] font-mono text-muted-foreground">{editingTemplate.code}</span>
              </div>
              <button
                onClick={() => setEditingTemplate(null)}
                className="text-muted-foreground hover:text-text-primary p-1 rounded-md"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTemplateSave} className="space-y-4 pt-4">
              <div>
                <label className="saas-label">Email Subject *</label>
                <input
                  type="text"
                  required
                  value={templateFormData.subject}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, subject: e.target.value })}
                  className="saas-input w-full text-xs"
                />
              </div>

              <div>
                <label className="saas-label">Click Shortcode to Insert into Body:</label>
                <div className="flex flex-wrap gap-1.5 p-2.5 rounded-lg border border-border-subtle bg-bg-surface-elevated">
                  {(editingTemplate.shortcodes || '').split(',').map((sc, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => insertShortcode(sc.trim())}
                      className="font-mono text-xs px-2 py-1 rounded bg-bg-surface border border-border-main hover:border-primary text-text-primary hover:text-primary transition-colors cursor-pointer"
                    >
                      + {sc.trim()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="saas-label">Email Body (HTML Supported) *</label>
                <textarea
                  required
                  rows={8}
                  value={templateFormData.body}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, body: e.target.value })}
                  className="saas-input w-full font-mono text-xs leading-relaxed"
                />
              </div>

              <div>
                <label className="saas-label">Status</label>
                <select
                  value={templateFormData.status}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, status: e.target.value })}
                  className="saas-input w-full text-xs"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border-main">
                <button
                  type="button"
                  onClick={() => setEditingTemplate(null)}
                  className="saas-btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="saas-btn-primary text-xs flex items-center gap-1.5"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Test Email Modal */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="saas-card w-full max-w-sm bg-surface p-6 shadow-2xl border border-border-main rounded-xl">
            <div className="flex items-center justify-between pb-3 border-b border-border-main">
              <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                <Send size={16} className="text-primary" />
                Send Test Email
              </h2>
              <button
                onClick={() => setIsTestModalOpen(false)}
                className="text-muted-foreground hover:text-text-primary p-1 rounded-md"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSendTestEmail} className="space-y-4 pt-3">
              <div>
                <label className="saas-label">Recipient Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="admin@smmuper.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="saas-input w-full text-xs"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  A verification handshake email will be dispatched using your saved SMTP credentials.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-main">
                <button
                  type="button"
                  onClick={() => setIsTestModalOpen(false)}
                  className="saas-btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={testing}
                  className="saas-btn-primary text-xs flex items-center gap-1.5"
                >
                  {testing && <Loader2 size={14} className="animate-spin" />}
                  Dispatch Test
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

