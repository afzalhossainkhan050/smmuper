import React, { useState, useEffect } from 'react';
import { LogIn, Save, Loader2, Copy, ExternalLink, AlertTriangle, CheckCircle2, CircleOff } from 'lucide-react';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

const ORIGINS = ['https://smmuper.com', 'https://www.smmuper.com'];

function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
        checked ? 'bg-emerald-500' : 'bg-zinc-600'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default function AdminGoogleLoginPage() {
  const { showToast } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    enabled: false,
    client_id: '',
    allow_signup: true,
    allow_staff: false,
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await api.admin.getGoogleSettings();
        if (res?.settings) setForm((prev) => ({ ...prev, ...res.settings }));
      } catch (err) {
        showToast(err.message || 'Failed to load Google login settings', 'error');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.admin.updateGoogleSettings({ ...form, client_id: form.client_id.trim() });
      showToast('Google login settings saved', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to save Google login settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('Copied', 'success');
    } catch {
      showToast('Copy failed. Select the text and copy it manually.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-primary mr-2" size={24} />
        <span className="text-sm font-semibold text-muted-foreground">Loading Google login settings...</span>
      </div>
    );
  }

  const live = form.enabled && form.client_id.trim();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2.5">
            <LogIn className="text-primary" size={24} />
            Google login
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Let customers sign in or sign up with their Google account. Changes apply as soon as you save.
          </p>
        </div>
        <div
          className={`self-start sm:self-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${
            live
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-zinc-500/10 border-zinc-500/30 text-muted-foreground'
          }`}
        >
          {live ? <CheckCircle2 size={14} /> : <CircleOff size={14} />}
          {live ? 'Google button is showing on Login and Register' : 'Google button is hidden'}
        </div>
      </div>

      <form onSubmit={handleSave} className="saas-card space-y-6">
        <div className="border-b border-border-main pb-3">
          <h2 className="text-base font-bold text-text-primary">Settings</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            You only need the Client ID from Google. No client secret or redirect address is required.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-border-main bg-bg-surface-elevated flex items-center justify-between gap-4">
          <div>
            <div className="font-bold text-xs text-text-primary">Enable Google login</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Shows "Sign in with Google" on the Login page and "Sign up with Google" on the Register page.
            </div>
          </div>
          <Switch checked={form.enabled} onChange={(v) => setForm({ ...form, enabled: v })} label="Enable Google login" />
        </div>

        <div>
          <label className="saas-label" htmlFor="google-client-id">Google Client ID</label>
          <input
            id="google-client-id"
            type="text"
            value={form.client_id}
            onChange={(e) => setForm({ ...form, client_id: e.target.value })}
            className="saas-input w-full font-mono text-xs"
            placeholder="123456789012-abcdefg.apps.googleusercontent.com"
            autoComplete="off"
            spellCheck={false}
          />
          <p className="text-[11px] text-muted-foreground mt-1.5">
            It ends with .apps.googleusercontent.com. It is safe to show publicly, so it is not hidden here.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-border-main bg-bg-surface-elevated flex items-center justify-between gap-4">
            <div>
              <div className="font-bold text-xs text-text-primary">Allow new accounts</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                A visitor with no account gets one created when they sign in with Google. If off, only existing customers can use Google.
              </div>
            </div>
            <Switch checked={form.allow_signup} onChange={(v) => setForm({ ...form, allow_signup: v })} label="Allow new accounts" />
          </div>

          <div className="p-4 rounded-xl border border-border-main bg-bg-surface-elevated flex items-center justify-between gap-4">
            <div>
              <div className="font-bold text-xs text-text-primary">Allow admin and staff accounts</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                Keep this off so admin and staff must use their password. Turning it on lets anyone who controls the matching Google email sign in as that admin.
              </div>
            </div>
            <Switch checked={form.allow_staff} onChange={(v) => setForm({ ...form, allow_staff: v })} label="Allow admin and staff accounts" />
          </div>
        </div>

        {form.allow_staff && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold flex items-start gap-2">
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
            <span>Admin and staff can now sign in with Google. Make sure each admin email belongs to a Google account only that person controls.</span>
          </div>
        )}

        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="saas-btn-primary flex items-center gap-2 text-xs">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </form>

      <div className="saas-card space-y-4">
        <div className="border-b border-border-main pb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-text-primary">How to get your Client ID</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Takes about five minutes. You need a Google account.</p>
          </div>
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noopener noreferrer"
            className="saas-btn-secondary flex items-center gap-2 text-xs flex-shrink-0"
          >
            Open Google Cloud
            <ExternalLink size={14} />
          </a>
        </div>

        <ol className="space-y-3 text-xs text-text-secondary list-decimal pl-5 leading-relaxed">
          <li>In Google Cloud Console, create a project (or choose an existing one).</li>
          <li>
            Open <strong>APIs &amp; Services → OAuth consent screen</strong>. Choose <strong>External</strong>, enter your app name and support email, then save.
            Set the publishing status to <strong>In production</strong>, otherwise only test users you list can sign in.
          </li>
          <li>
            Open <strong>Credentials → Create credentials → OAuth client ID</strong> and choose <strong>Web application</strong>.
          </li>
          <li>
            Under <strong>Authorized JavaScript origins</strong>, add both addresses below. Leave the redirect URIs empty.
            <div className="mt-2 space-y-2">
              {ORIGINS.map((origin) => (
                <div key={origin} className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 rounded-lg bg-bg-surface-elevated border border-border-main font-mono text-[11px] text-text-primary">
                    {origin}
                  </code>
                  <button
                    type="button"
                    onClick={() => copy(origin)}
                    className="saas-btn-secondary flex items-center gap-1.5 text-[11px]"
                    aria-label={`Copy ${origin}`}
                  >
                    <Copy size={12} /> Copy
                  </button>
                </div>
              ))}
            </div>
          </li>
          <li>Create it, copy the <strong>Client ID</strong>, paste it above, turn on <strong>Enable Google login</strong>, and save.</li>
        </ol>
      </div>
    </div>
  );
}
