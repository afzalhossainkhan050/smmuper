import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSystem } from '../contexts/SystemContext';
import api from '../utils/api';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import {
  User, Mail, Phone, MapPin, Lock, Key, Save, Copy,
  Eye, EyeOff, ShieldCheck, ShieldAlert, RefreshCw, AlertCircle,
  CheckCircle2, Smartphone, Check, ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ProfilePage() {
  const { user, updateProfile, regenerateApiKey, showToast, fetchProfile } = useAuth();
  const { formatPrice } = useSystem();

  // Profile Form
  const [profileForm, setProfileForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || ''
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // API Key State
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [regeneratingKey, setRegeneratingKey] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);

  // 2FA State
  const [twoFactorActive, setTwoFactorActive] = useState(!!user?.two_factor_enabled);
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
  const [twoFactorSetupData, setTwoFactorSetupData] = useState(null); // { secret, qr_code_url, otpauth_uri }
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [loading2FA, setLoading2FA] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // 2FA Disable State
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disableForm, setDisableForm] = useState({ password: '', code: '' });
  const [disabling2FA, setDisabling2FA] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileForm({
        username: user.username || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || ''
      });
      setTwoFactorActive(!!user.two_factor_enabled);
    }
  }, [user]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile({
        phone: profileForm.phone,
        address: profileForm.address
      });
    } catch (err) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword.length < 6) {
      showToast('New password must be at least 6 characters long', 'error');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }
    setSavingPassword(true);
    try {
      await updateProfile({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      showToast(err.message || 'Failed to change password', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleCopyApiKey = () => {
    const key = user?.api_key || 'No API key';
    navigator.clipboard.writeText(key);
    setCopiedKey(true);
    showToast('API key copied to clipboard!');
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleRegenerateKey = async () => {
    setRegeneratingKey(true);
    try {
      await regenerateApiKey();
      setShowRegenConfirm(false);
      await fetchProfile();
    } catch (err) {
      showToast(err.message || 'Failed to regenerate API key', 'error');
    } finally {
      setRegeneratingKey(false);
    }
  };

  // 2FA Setup Workflow
  const handleStart2FASetup = async () => {
    setLoading2FA(true);
    try {
      const res = await api.auth.generate2FA();
      setTwoFactorSetupData(res.data || res);
      setShowTwoFactorSetup(true);
    } catch (err) {
      showToast(err.message || 'Failed to initialize 2FA setup', 'error');
    } finally {
      setLoading2FA(false);
    }
  };

  const handleConfirm2FA = async (e) => {
    e.preventDefault();
    if (!twoFactorCode || twoFactorCode.trim().length !== 6) {
      showToast('Please enter the 6-digit verification code', 'error');
      return;
    }
    setLoading2FA(true);
    try {
      await api.auth.enable2FA({
        code: twoFactorCode.trim(),
        secret: twoFactorSetupData.secret
      });
      showToast('Two-Factor Authentication enabled successfully!', 'success');
      setShowTwoFactorSetup(false);
      setTwoFactorCode('');
      setTwoFactorActive(true);
      await fetchProfile();
    } catch (err) {
      showToast(err.message || 'Invalid 2FA code. Please check your authenticator app.', 'error');
    } finally {
      setLoading2FA(false);
    }
  };

  const handleDisable2FA = async (e) => {
    e.preventDefault();
    if (!disableForm.password || !disableForm.code) {
      showToast('Please provide your current password and 6-digit 2FA code', 'error');
      return;
    }
    setDisabling2FA(true);
    try {
      await api.auth.disable2FA({
        password: disableForm.password,
        code: disableForm.code.trim()
      });
      showToast('Two-Factor Authentication has been disabled', 'success');
      setShowDisableModal(false);
      setDisableForm({ password: '', code: '' });
      setTwoFactorActive(false);
      await fetchProfile();
    } catch (err) {
      showToast(err.message || 'Failed to disable 2FA. Verify password and code.', 'error');
    } finally {
      setDisabling2FA(false);
    }
  };

  const handleCopySecret = () => {
    if (!twoFactorSetupData?.secret) return;
    navigator.clipboard.writeText(twoFactorSetupData.secret);
    setCopiedSecret(true);
    showToast('Secret key copied!');
    setTimeout(() => setCopiedSecret(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="dashboard-page-header">
        <div>
          <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'My Profile' }]} />
          <h1 className="dashboard-page-title mt-1 flex items-center gap-2">
            <User size={24} className="text-primary" />
            <span>Account & <span className="gradient-text">Security Settings</span></span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your personal profile, credentials, two-factor authentication, and reseller API keys.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User size={18} className="text-primary" />
              <span>Personal Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-group mb-0">
                  <label className="form-label text-xs">Username</label>
                  <input
                    type="text"
                    disabled
                    className="form-control bg-bg-surface-elevated cursor-not-allowed opacity-75 font-mono text-xs"
                    value={profileForm.username}
                  />
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">
                    Fixed customer identifier
                  </span>
                </div>

                <div className="form-group mb-0">
                  <label className="form-label text-xs">Email Address</label>
                  <input
                    type="email"
                    disabled
                    className="form-control bg-bg-surface-elevated cursor-not-allowed opacity-75 text-xs"
                    value={profileForm.email}
                  />
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">
                    Registered email
                  </span>
                </div>
              </div>

              <div className="form-group mb-0">
                <label className="form-label flex items-center gap-1.5 text-xs">
                  <Phone size={13} className="text-muted-foreground" />
                  <span>Phone Number</span>
                </label>
                <input
                  type="text"
                  placeholder="+880 1XXXXXXXXX or international format"
                  className="form-control text-xs"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                />
              </div>

              <div className="form-group mb-0">
                <label className="form-label flex items-center gap-1.5 text-xs">
                  <MapPin size={13} className="text-muted-foreground" />
                  <span>Billing Address</span>
                </label>
                <input
                  type="text"
                  placeholder="Street address, City, Country"
                  className="form-control text-xs"
                  value={profileForm.address}
                  onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="btn btn-primary btn-sm flex items-center gap-2"
                >
                  <Save size={14} />
                  <span>{savingProfile ? 'Saving Changes...' : 'Save Profile'}</span>
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lock size={18} className="text-indigo-400" />
              <span>Change Password</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="form-group mb-0">
                <label className="form-label text-xs">Current Password</label>
                <div className="relative flex items-center">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    required
                    className="form-control pr-10 text-xs"
                    placeholder="Enter current password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 text-muted-foreground hover:text-text-primary"
                  >
                    {showCurrentPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-group mb-0">
                  <label className="form-label text-xs">New Password</label>
                  <div className="relative flex items-center">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      required
                      className="form-control pr-10 text-xs"
                      placeholder="Min. 6 characters"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-3 text-muted-foreground hover:text-text-primary"
                    >
                      {showNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="form-group mb-0">
                  <label className="form-label text-xs">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    className="form-control text-xs"
                    placeholder="Repeat new password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingPassword}
                  className="btn btn-secondary btn-sm flex items-center gap-2"
                >
                  <Lock size={14} />
                  <span>{savingPassword ? 'Updating Password...' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Two-Factor Authentication (2FA) */}
        <Card className="border-indigo-500/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck size={18} className="text-indigo-400" />
              <span>Two-Factor Authentication (2FA)</span>
            </CardTitle>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                twoFactorActive
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-muted/30 text-muted-foreground border border-border-main'
              }`}
            >
              {twoFactorActive ? <CheckCircle2 size={12} /> : <ShieldAlert size={12} />}
              {twoFactorActive ? 'Active' : 'Disabled'}
            </span>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Standard RFC 6238 TOTP two-factor security protects your account balance and API keys. Compatible with Google Authenticator, Microsoft Authenticator, and 1Password.
            </p>

            {twoFactorActive ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-text-primary">2FA Protection Enabled</h5>
                    <p className="text-[11px] text-muted-foreground">Every sign-in requires a 6-digit TOTP code</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDisableModal(true)}
                  className="btn btn-sm btn-danger text-xs font-semibold"
                >
                  Disable 2FA
                </button>
              </div>
            ) : (
              <div>
                {!showTwoFactorSetup ? (
                  <button
                    type="button"
                    onClick={handleStart2FASetup}
                    disabled={loading2FA}
                    className="btn btn-primary btn-sm flex items-center gap-2"
                  >
                    <Smartphone size={15} />
                    <span>{loading2FA ? 'Generating Secret...' : 'Setup Two-Factor Authentication'}</span>
                  </button>
                ) : (
                  <div className="p-4 rounded-xl bg-bg-surface-elevated border border-border-main space-y-4">
                    <div className="flex items-start justify-between">
                      <h5 className="font-extrabold text-xs text-text-primary">
                        Scan QR Code or Enter Manual Secret
                      </h5>
                      <button
                        type="button"
                        onClick={() => setShowTwoFactorSetup(false)}
                        className="text-xs text-muted-foreground hover:text-text-primary"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      {twoFactorSetupData?.qr_code_url ? (
                        <div className="p-2 bg-white rounded-xl shadow-md border border-slate-200 flex-shrink-0">
                          <img
                            src={twoFactorSetupData.qr_code_url}
                            alt="2FA QR Code"
                            className="w-32 h-32"
                          />
                        </div>
                      ) : (
                        <div className="w-32 h-32 bg-slate-800 rounded-xl flex items-center justify-center text-xs text-muted-foreground">
                          QR Preview
                        </div>
                      )}

                      <div className="space-y-2 flex-1 w-full text-xs">
                        <label className="text-[11px] font-bold text-muted-foreground block">
                          Manual Base32 Secret Key:
                        </label>
                        <div className="flex items-center gap-2 bg-bg-surface p-2 rounded-lg border border-border-subtle font-mono text-[11px] select-all">
                          <span className="truncate flex-1 text-primary font-bold">
                            {twoFactorSetupData?.secret}
                          </span>
                          <button
                            type="button"
                            onClick={handleCopySecret}
                            className="p-1 text-muted-foreground hover:text-text-primary"
                          >
                            {copiedSecret ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                          </button>
                        </div>
                        <p className="text-[10px] text-muted-foreground leading-normal">
                          Scan the QR code with your mobile authenticator or copy the secret manually.
                        </p>
                      </div>
                    </div>

                    {/* Verification Code Input */}
                    <form onSubmit={handleConfirm2FA} className="pt-2 border-t border-border-subtle flex flex-col sm:flex-row items-stretch gap-2">
                      <input
                        type="text"
                        required
                        maxLength={6}
                        inputMode="numeric"
                        placeholder="000000"
                        className="form-control text-center font-mono font-bold tracking-[0.3em] text-sm sm:w-40"
                        value={twoFactorCode}
                        onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                      />
                      <button
                        type="submit"
                        disabled={loading2FA || twoFactorCode.length !== 6}
                        className="btn btn-primary btn-sm flex-1 font-bold"
                      >
                        {loading2FA ? 'Verifying...' : 'Verify & Enable 2FA'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reseller API Key Management */}
        <Card className="border-cyan-500/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Key size={18} className="text-cyan-400" />
              <span>Reseller API Key</span>
            </CardTitle>
            <Link
              to="/dashboard/api-docs"
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              <span>API Docs</span>
              <ArrowRight size={13} />
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Use this secret key to authenticate SMM Standard v2 protocol API requests from your custom panel, Telegram bot, or automation backend.
            </p>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-muted-foreground block">
                Active API Key
              </label>
              <div className="flex items-center gap-2 bg-bg-surface-elevated p-2.5 rounded-xl border border-border-main">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  readOnly
                  className="bg-transparent border-0 font-mono text-xs text-text-primary flex-1 outline-none select-all"
                  value={user?.api_key || 'No API key generated'}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="p-1.5 text-muted-foreground hover:text-text-primary rounded-lg hover:bg-bg-surface"
                  title={showApiKey ? 'Hide API Key' : 'Reveal API Key'}
                >
                  {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
                <button
                  type="button"
                  onClick={handleCopyApiKey}
                  className={`btn btn-sm py-1 px-3 text-xs flex items-center gap-1.5 ${
                    copiedKey ? 'bg-emerald-600 text-white' : 'btn-secondary'
                  }`}
                >
                  {copiedKey ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <span className="text-[11px] text-muted-foreground">
                Never share your key in client-side code.
              </span>
              <button
                type="button"
                onClick={() => setShowRegenConfirm(true)}
                className="btn btn-secondary btn-sm flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 border-amber-500/30"
              >
                <RefreshCw size={13} />
                <span>Regenerate Key</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Modal for Regenerate API Key */}
      {showRegenConfirm && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="saas-card max-w-md w-full p-6 bg-surface border border-border-main space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <AlertCircle size={24} />
            </div>
            <div>
              <h4 className="font-extrabold text-base text-text-primary">
                Regenerate Reseller API Key?
              </h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Regenerating your key invalidates the current key immediately. Any active orders submitted via third-party systems or external panels using the old key will fail until updated.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRegenConfirm(false)}
                className="btn btn-secondary btn-sm text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={regeneratingKey}
                onClick={handleRegenerateKey}
                className="btn btn-primary btn-sm text-xs flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white"
              >
                <RefreshCw size={14} />
                <span>{regeneratingKey ? 'Regenerating...' : 'Yes, Regenerate Key'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disable 2FA Modal */}
      {showDisableModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="saas-card max-w-md w-full p-6 bg-surface border border-border-main space-y-4">
            <div className="w-12 h-12 rounded-xl bg-danger-bg text-danger flex items-center justify-center">
              <ShieldAlert size={24} />
            </div>
            <div>
              <h4 className="font-extrabold text-base text-text-primary">
                Disable Two-Factor Authentication?
              </h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Confirm your account credentials to turn off two-factor authentication.
              </p>
            </div>
            <form onSubmit={handleDisable2FA} className="space-y-3">
              <div className="form-group mb-0">
                <label className="form-label text-xs">Current Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter your login password"
                  className="form-control text-xs"
                  value={disableForm.password}
                  onChange={(e) => setDisableForm({ ...disableForm, password: e.target.value })}
                />
              </div>

              <div className="form-group mb-0">
                <label className="form-label text-xs">Current 6-Digit 2FA Code</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="000000"
                  className="form-control text-center font-mono font-bold tracking-[0.3em] text-sm"
                  value={disableForm.code}
                  onChange={(e) => setDisableForm({ ...disableForm, code: e.target.value.replace(/\D/g, '') })}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowDisableModal(false);
                    setDisableForm({ password: '', code: '' });
                  }}
                  className="btn btn-secondary btn-sm text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={disabling2FA}
                  className="btn btn-danger btn-sm text-xs"
                >
                  {disabling2FA ? 'Disabling...' : 'Confirm Disable 2FA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
