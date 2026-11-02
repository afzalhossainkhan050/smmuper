import React, { useState, useEffect } from 'react';
import {
  Sliders, Save, RefreshCw, Shield, Globe, Palette,
  Cpu, Bell, CheckCircle, AlertTriangle, Loader2
} from 'lucide-react';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { useSystem } from '../../contexts/SystemContext';

export default function AdminSettingsPage() {
  const { showToast } = useAuth();
  const { fetchSystemData } = useSystem();

  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await api.admin.getSettings();
      setSettings(res.data?.settings || {});
    } catch (err) {
      showToast(err.message || 'Failed to load system settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleChange = (key, val) => {
    setSettings(prev => ({ ...prev, [key]: val }));
  };

  const handleToggle = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: prev[key] === '1' || prev[key] === true ? '0' : '1'
    }));
  };

  const isChecked = (key, defaultVal = false) => {
    if (settings[key] === undefined) return defaultVal;
    return settings[key] === '1' || settings[key] === 'true' || settings[key] === true;
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      await api.admin.updateSettings(settings);
      showToast('System configuration saved successfully', 'success');
      if (fetchSystemData) fetchSystemData();
    } catch (err) {
      showToast(err.message || 'Failed to update settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General & Basic Controls', icon: Globe },
    { id: 'branding', label: 'Brand Styling & Themes', icon: Palette },
    { id: 'security', label: 'Security & Access Toggles', icon: Shield },
    { id: 'smm', label: 'SMM Engine Automation', icon: Cpu },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-primary mr-2" size={24} />
        <span className="text-sm font-semibold text-muted-foreground">Loading control panel settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2.5">
            <Sliders className="text-primary" size={24} />
            Control Panel
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Global configuration, operational switches, platform branding, and security policies for SMMuper.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={loadSettings}
            className="saas-btn-secondary flex items-center gap-1.5 text-xs"
            title="Reload settings from database"
          >
            <RefreshCw size={14} />
            Reset
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="saas-btn-primary flex items-center gap-2 text-xs"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Save Settings
          </button>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border-main overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted-foreground hover:text-text-primary hover:bg-bg-surface-hover'
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: General & Basic Controls */}
      {activeTab === 'general' && (
        <div className="saas-card space-y-6">
          <div className="border-b border-border-main pb-3">
            <h2 className="text-base font-bold text-text-primary">Platform Information & Meta</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Basic brand parameters displayed on customer invoices, emails, and header.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="saas-label">Platform Title *</label>
              <input
                type="text"
                value={settings.site_title || 'SMMuper'}
                onChange={(e) => handleChange('site_title', e.target.value)}
                className="saas-input w-full text-xs"
                placeholder="SMMuper - Ultimate SMM Reseller Panel"
              />
            </div>

            <div>
              <label className="saas-label">Support Email *</label>
              <input
                type="email"
                value={settings.site_email || 'support@smmuper.com'}
                onChange={(e) => handleChange('site_email', e.target.value)}
                className="saas-input w-full text-xs"
                placeholder="support@smmuper.com"
              />
            </div>

            <div>
              <label className="saas-label">Contact Phone / WhatsApp</label>
              <input
                type="text"
                value={settings.site_phone || '+880 1700 000000'}
                onChange={(e) => handleChange('site_phone', e.target.value)}
                className="saas-input w-full text-xs"
                placeholder="+880 1700 000000"
              />
            </div>

            <div>
              <label className="saas-label">Timezone</label>
              <select
                value={settings.timezone || 'UTC'}
                onChange={(e) => handleChange('timezone', e.target.value)}
                className="saas-input w-full text-xs"
              >
                <option value="UTC">UTC (Universal Coordinated Time)</option>
                <option value="Asia/Dhaka">Asia/Dhaka (GMT+6)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST)</option>
              </select>
            </div>

            <div>
              <label className="saas-label">Base Currency Code</label>
              <input
                type="text"
                value={settings.base_currency || 'USD'}
                onChange={(e) => handleChange('base_currency', e.target.value.toUpperCase())}
                className="saas-input w-full font-mono text-xs uppercase"
              />
            </div>

            <div>
              <label className="saas-label">Base Currency Symbol</label>
              <input
                type="text"
                value={settings.currency_symbol || '$'}
                onChange={(e) => handleChange('currency_symbol', e.target.value)}
                className="saas-input w-full font-bold text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Brand Styling & Colors */}
      {activeTab === 'branding' && (
        <div className="saas-card space-y-6">
          <div className="border-b border-border-main pb-3">
            <h2 className="text-base font-bold text-text-primary">Theme & Color Tokens</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Tailor the visual aesthetic across the customer portal and public pages.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="saas-label">Primary Brand Accent Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={settings.primary_color || '#4f46e5'}
                  onChange={(e) => handleChange('primary_color', e.target.value)}
                  className="w-12 h-10 rounded border border-border-main cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={settings.primary_color || '#4f46e5'}
                  onChange={(e) => handleChange('primary_color', e.target.value)}
                  className="saas-input font-mono text-xs uppercase flex-1"
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Used for primary buttons, active links, and brand gradients.
              </p>
            </div>

            <div>
              <label className="saas-label">Secondary / Cyan Accent Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={settings.secondary_color || '#06b6d4'}
                  onChange={(e) => handleChange('secondary_color', e.target.value)}
                  className="w-12 h-10 rounded border border-border-main cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={settings.secondary_color || '#06b6d4'}
                  onChange={(e) => handleChange('secondary_color', e.target.value)}
                  className="saas-input font-mono text-xs uppercase flex-1"
                />
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                Highlights, badge indicators, and graph series colors.
              </p>
            </div>

            <div>
              <label className="saas-label">Default Theme Mode</label>
              <select
                value={settings.theme_default || 'dark'}
                onChange={(e) => handleChange('theme_default', e.target.value)}
                className="saas-input w-full text-xs"
              >
                <option value="dark">Dark Theme (Default SaaS)</option>
                <option value="light">Light Theme (Clean White)</option>
              </select>
            </div>

            <div>
              <label className="saas-label">Footer Copyright Notice</label>
              <input
                type="text"
                value={settings.copyright_text || 'Copyright © 2026 SMMuper. All rights reserved.'}
                onChange={(e) => handleChange('copyright_text', e.target.value)}
                className="saas-input w-full text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Security & Access Toggles */}
      {activeTab === 'security' && (
        <div className="saas-card space-y-6">
          <div className="border-b border-border-main pb-3">
            <h2 className="text-base font-bold text-text-primary">System Access & Security Controls</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Toggle customer registration, email verification, and maintenance lockdown.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* User Registration Toggle */}
            <div className="p-4 rounded-xl border border-border-main bg-bg-surface-elevated flex items-center justify-between">
              <div>
                <div className="font-bold text-xs text-text-primary">User Registration</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Allow public visitors to create new customer accounts.</div>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('user_registration')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isChecked('user_registration', true) ? 'bg-primary' : 'bg-zinc-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isChecked('user_registration', true) ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Email Verification Toggle */}
            <div className="p-4 rounded-xl border border-border-main bg-bg-surface-elevated flex items-center justify-between">
              <div>
                <div className="font-bold text-xs text-text-primary">Email Verification</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Require users to confirm their email before placing orders.</div>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('email_verification')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isChecked('email_verification', false) ? 'bg-primary' : 'bg-zinc-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isChecked('email_verification', false) ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Maintenance Mode Toggle */}
            <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 flex items-center justify-between">
              <div>
                <div className="font-bold text-xs text-red-500 flex items-center gap-1.5">
                  <AlertTriangle size={14} />
                  Maintenance Mode
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Locks customer portal while administrators retain access.</div>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('maintenance_mode')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isChecked('maintenance_mode', false) ? 'bg-red-500' : 'bg-zinc-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isChecked('maintenance_mode', false) ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Public Services List Toggle */}
            <div className="p-4 rounded-xl border border-border-main bg-bg-surface-elevated flex items-center justify-between">
              <div>
                <div className="font-bold text-xs text-text-primary">Public Services Catalog</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Allow unauthenticated guests to browse service rates at /services.</div>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('public_services')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isChecked('public_services', true) ? 'bg-primary' : 'bg-zinc-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isChecked('public_services', true) ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SMM Engine Controls */}
      {activeTab === 'smm' && (
        <div className="saas-card space-y-6">
          <div className="border-b border-border-main pb-3">
            <h2 className="text-base font-bold text-text-primary">Automated Dispatch & Wallet Thresholds</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Manage minimum deposit bounds and wholesale provider auto-submission.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="saas-label">Minimum Wallet Deposit ($)</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={settings.min_deposit || '5.00'}
                onChange={(e) => handleChange('min_deposit', e.target.value)}
                className="saas-input w-full font-mono text-xs"
              />
            </div>

            <div>
              <label className="saas-label">Maximum Single Deposit ($)</label>
              <input
                type="number"
                step="10"
                value={settings.max_deposit || '5000.00'}
                onChange={(e) => handleChange('max_deposit', e.target.value)}
                className="saas-input w-full font-mono text-xs"
              />
            </div>

            <div className="p-4 rounded-xl border border-border-main bg-bg-surface-elevated flex items-center justify-between md:col-span-2">
              <div>
                <div className="font-bold text-xs text-text-primary">Automatic Order Forwarding (Phase 3/4)</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  When enabled, valid customer orders are dispatched directly to the mapped API provider without manual approval.
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleToggle('auto_order_processing')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isChecked('auto_order_processing', true) ? 'bg-primary' : 'bg-zinc-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isChecked('auto_order_processing', true) ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Save Bar */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="saas-btn-primary flex items-center gap-2 text-xs"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Save All Changes
        </button>
      </div>
    </div>
  );
}

