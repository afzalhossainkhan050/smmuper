import React, { useState, useEffect } from 'react';
import {
  Bell, Save, Settings, Edit3, X, CheckCircle,
  Smartphone, AlertCircle, Loader2, Code
} from 'lucide-react';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminNotificationSettingsPage() {
  const { showToast } = useAuth();

  const [activeTab, setActiveTab] = useState('fcm');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // FCM Settings State
  const [fcmConfig, setFcmConfig] = useState({
    firebase_server_key: '',
    firebase_project_id: '',
    firebase_app_id: '',
    firebase_messaging_sender_id: '',
    push_notification_enabled: '1'
  });

  // Notification Templates
  const [templates, setTemplates] = useState([]);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateFormData, setTemplateFormData] = useState({
    title: '',
    body: '',
    status: 'active'
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [notifRes, tplRes] = await Promise.all([
        api.admin.getNotificationSettings(),
        api.admin.getNotificationTemplates()
      ]);
      if (notifRes.data?.notification_settings) {
        setFcmConfig(prev => ({ ...prev, ...notifRes.data.notification_settings }));
      }
      if (tplRes.data?.templates) {
        setTemplates(tplRes.data.templates);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load notification settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFcmSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.admin.updateNotificationSettings(fcmConfig);
      showToast('Push notification configuration saved', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openEditTemplate = (tpl) => {
    setEditingTemplate(tpl);
    setTemplateFormData({
      title: tpl.title,
      body: tpl.body,
      status: tpl.status
    });
  };

  const handleTemplateSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.admin.updateNotificationTemplate(editingTemplate.id, templateFormData);
      showToast('Notification template updated successfully', 'success');
      setEditingTemplate(null);
      await loadData();
    } catch (err) {
      showToast(err.message || 'Failed to update template', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-primary mr-2" size={24} />
        <span className="text-sm font-semibold text-muted-foreground">Loading notification settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2.5">
          <Bell className="text-primary" size={24} />
          Notification Settings & Push Engine
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure Firebase Cloud Messaging (FCM) credentials, mobile app notifications, and automated alerts.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border-main">
        <button
          onClick={() => setActiveTab('fcm')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg transition-colors border-b-2 ${
            activeTab === 'fcm'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-text-primary'
          }`}
        >
          <Smartphone size={15} />
          Firebase Push Configuration
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
          Alert Templates ({templates.length})
        </button>
      </div>

      {/* TAB 1: Firebase Push Settings */}
      {activeTab === 'fcm' && (
        <form onSubmit={handleFcmSave} className="saas-card space-y-6">
          <div className="border-b border-border-main pb-3">
            <h2 className="text-base font-bold text-text-primary">Firebase Cloud Messaging (FCM) Credentials</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enables real-time push notification delivery directly to users' browsers and mobile devices.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="saas-label">Firebase Server Key (Cloud Messaging)</label>
              <input
                type="text"
                value={fcmConfig.firebase_server_key}
                onChange={(e) => setFcmConfig({ ...fcmConfig, firebase_server_key: e.target.value })}
                className="saas-input w-full font-mono text-xs"
                placeholder="AAAA...YOUR_FIREBASE_SERVER_KEY"
              />
            </div>

            <div>
              <label className="saas-label">Firebase Project ID</label>
              <input
                type="text"
                value={fcmConfig.firebase_project_id}
                onChange={(e) => setFcmConfig({ ...fcmConfig, firebase_project_id: e.target.value })}
                className="saas-input w-full text-xs"
                placeholder="smmuper-app"
              />
            </div>

            <div>
              <label className="saas-label">Messaging Sender ID</label>
              <input
                type="text"
                value={fcmConfig.firebase_messaging_sender_id}
                onChange={(e) => setFcmConfig({ ...fcmConfig, firebase_messaging_sender_id: e.target.value })}
                className="saas-input w-full text-xs font-mono"
                placeholder="109283921092"
              />
            </div>

            <div className="md:col-span-2">
              <label className="saas-label">Firebase Web App ID</label>
              <input
                type="text"
                value={fcmConfig.firebase_app_id}
                onChange={(e) => setFcmConfig({ ...fcmConfig, firebase_app_id: e.target.value })}
                className="saas-input w-full font-mono text-xs"
                placeholder="1:109283921092:web:78a3c20..."
              />
            </div>

            <div className="md:col-span-2 p-4 rounded-xl border border-border-main bg-bg-surface-elevated flex items-center justify-between">
              <div>
                <div className="font-bold text-xs text-text-primary">Push Notification Engine</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Send instant in-browser and mobile push notifications for order progress and balance updates.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFcmConfig({
                  ...fcmConfig,
                  push_notification_enabled: fcmConfig.push_notification_enabled === '1' ? '0' : '1'
                })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  fcmConfig.push_notification_enabled === '1' ? 'bg-primary' : 'bg-zinc-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    fcmConfig.push_notification_enabled === '1' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-main">
            <button
              type="submit"
              disabled={saving}
              className="saas-btn-primary flex items-center gap-2 text-xs"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              Save Notification Settings
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: Push Alert Templates */}
      {activeTab === 'templates' && (
        <div className="saas-card p-0 overflow-hidden">
          <div className="p-4 border-b border-border-main bg-bg-surface-elevated">
            <h2 className="text-base font-bold text-text-primary">In-App & Push Notification Templates</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Customize title and payload text for automated browser notifications.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="saas-table w-full">
              <thead>
                <tr>
                  <th className="w-12 text-center">SL</th>
                  <th>Template Name</th>
                  <th>Notification Title</th>
                  <th>Body Preview</th>
                  <th>Shortcodes</th>
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
                    <td className="text-xs text-text-secondary">{tpl.title}</td>
                    <td className="text-xs text-muted-foreground max-w-xs truncate">{tpl.body}</td>
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
                        Edit
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
          <div className="saas-card w-full max-w-md bg-surface p-6 shadow-2xl border border-border-main rounded-xl">
            <div className="flex items-center justify-between pb-4 border-b border-border-main">
              <h2 className="text-base font-bold text-text-primary">Edit Alert: {editingTemplate.name}</h2>
              <button
                onClick={() => setEditingTemplate(null)}
                className="text-muted-foreground hover:text-text-primary p-1 rounded-md"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTemplateSave} className="space-y-4 pt-4">
              <div>
                <label className="saas-label">Alert Title *</label>
                <input
                  type="text"
                  required
                  value={templateFormData.title}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, title: e.target.value })}
                  className="saas-input w-full text-xs"
                />
              </div>

              <div>
                <label className="saas-label">Alert Message Body *</label>
                <textarea
                  required
                  rows={4}
                  value={templateFormData.body}
                  onChange={(e) => setTemplateFormData({ ...templateFormData, body: e.target.value })}
                  className="saas-input w-full text-xs leading-relaxed"
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
                  Save Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

