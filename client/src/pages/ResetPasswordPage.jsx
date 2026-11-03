import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import Logo from '../components/brand/Logo';
import { api } from '../utils/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await api.auth.resetPassword({ token, password });
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 3500);
    } catch (err) {
      setError(err.message || 'Could not reset your password. Please request a new link.');
    } finally {
      setLoading(false);
    }
  };

  const shell = (children) => (
    <div className="min-h-[calc(100vh-75px)] py-12 px-4 flex items-center justify-center relative overflow-hidden bg-bg-app">
      <div className="hero-bg-effects">
        <div className="hero-orb hero-orb-1 opacity-25" />
        <div className="hero-orb hero-orb-2 opacity-25" />
      </div>
      <div className="w-full max-w-md relative z-10 glass-card bg-surface/95 border border-border-main p-6 sm:p-8 rounded-3xl shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col items-center text-center mb-6">
          <Logo size="lg" to="/" />
          <h1 className="text-2xl font-extrabold text-text-primary mt-4 tracking-tight">
            Choose a <span className="gradient-text">new password</span>
          </h1>
        </div>
        {children}
      </div>
    </div>
  );

  if (!token) {
    return shell(
      <div className="space-y-5 text-center">
        <div className="p-4 rounded-xl bg-danger-bg border border-danger/30 text-danger text-xs font-semibold flex items-start gap-2.5 text-left">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <span>This reset link is incomplete. Please request a new one.</span>
        </div>
        <Link to="/forgot-password" className="btn-gradient w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg">
          <span>Request a new link</span>
          <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  if (done) {
    return shell(
      <div className="space-y-5">
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-start gap-2.5">
          <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" />
          <span>Your password has been updated. Taking you to the sign in page...</span>
        </div>
        <Link to="/login" className="btn-gradient w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg">
          <span>Sign in now</span>
          <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return shell(
    <>
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-danger-bg border border-danger/30 text-danger text-xs font-semibold flex items-center gap-2">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="reset-password" className="text-xs font-semibold text-text-secondary flex items-center gap-1.5 mb-1.5">
            <Lock size={14} className="text-muted-foreground" />
            <span>New password</span>
          </label>
          <div className="relative flex items-center">
            <input
              id="reset-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoFocus
              minLength={8}
              autoComplete="new-password"
              className="w-full py-3 pl-4 pr-11 rounded-xl bg-bg-surface-elevated border border-border-main text-text-primary text-sm focus:outline-none focus:border-primary shadow-inner"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 text-muted-foreground hover:text-text-primary"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="reset-confirm" className="text-xs font-semibold text-text-secondary flex items-center gap-1.5 mb-1.5">
            <Lock size={14} className="text-muted-foreground" />
            <span>Confirm new password</span>
          </label>
          <input
            id="reset-confirm"
            type={showPassword ? 'text' : 'password'}
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full py-3 px-4 rounded-xl bg-bg-surface-elevated border border-border-main text-text-primary text-sm focus:outline-none focus:border-primary shadow-inner"
            placeholder="Type it again"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-gradient w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <span>Update password</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>
    </>
  );
}
