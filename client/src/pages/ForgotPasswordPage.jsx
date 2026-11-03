import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import Logo from '../components/brand/Logo';
import { api } from '../utils/api';

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sentMessage, setSentMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim()) {
      setError('Please enter your email address or username.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.auth.forgotPassword({ email: identifier.trim() });
      setSentMessage(res?.message || 'If an account exists for that email, a reset link is on its way.');
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-75px)] py-12 px-4 flex items-center justify-center relative overflow-hidden bg-bg-app">
      <div className="hero-bg-effects">
        <div className="hero-orb hero-orb-1 opacity-25" />
        <div className="hero-orb hero-orb-2 opacity-25" />
      </div>

      <div className="w-full max-w-md relative z-10 glass-card bg-surface/95 border border-border-main p-6 sm:p-8 rounded-3xl shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col items-center text-center mb-6">
          <Logo size="lg" to="/" />
          <h1 className="text-2xl font-extrabold text-text-primary mt-4 tracking-tight">
            Forgot your <span className="gradient-text">password?</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-xs">
            Enter your email address or username and we will email you a link to choose a new password.
          </p>
        </div>

        {sentMessage ? (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-start gap-2.5">
              <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" />
              <span>{sentMessage}</span>
            </div>
            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              The link works for 1 hour. If nothing arrives in a few minutes, check your spam folder or try again.
            </p>
            <Link
              to="/login"
              className="btn-gradient w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg"
            >
              <ArrowLeft size={16} />
              <span>Back to Sign In</span>
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-danger-bg border border-danger/30 text-danger text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="forgot-identifier" className="text-xs font-semibold text-text-secondary flex items-center gap-1.5 mb-1.5">
                  <Mail size={14} className="text-muted-foreground" />
                  <span>Email Address or Username</span>
                </label>
                <input
                  id="forgot-identifier"
                  type="text"
                  required
                  autoFocus
                  autoComplete="username"
                  className="w-full py-3 px-4 rounded-xl bg-bg-surface-elevated border border-border-main text-text-primary text-sm focus:outline-none focus:border-primary shadow-inner"
                  placeholder="you@example.com"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
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
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <span>Send reset link</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <Link
                to="/login"
                className="w-full py-2 text-xs text-muted-foreground hover:text-text-primary flex items-center justify-center gap-1.5 transition-colors"
              >
                <ArrowLeft size={14} /> Back to Sign In
              </Link>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
