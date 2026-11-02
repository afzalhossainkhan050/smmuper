import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/brand/Logo';
import GoogleSignInButton from '../components/ui/GoogleSignInButton';
import {
  User, Mail, Lock, UserPlus, Eye, EyeOff, AlertCircle,
  ShieldCheck, ArrowRight, Shield, Sparkles, Check
} from 'lucide-react';

export default function RegisterPage() {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: true,
  });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleGoogleCredential = async (credential) => {
    setError('');
    setLoading(true);
    try {
      const res = await loginWithGoogle(credential);
      if (res && res.requires_2fa) {
        setError('This account uses two-factor authentication. Please sign in from the Login page.');
        return;
      }
      navigate(res?.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Google sign-up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.username.trim() || !form.email.trim() || !form.password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (form.username.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!form.agreeTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy.');
      return;
    }

    setLoading(true);
    try {
      await register(form.username.trim(), form.email.trim(), form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed. Username or email may already be registered.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-75px)] py-12 px-4 flex items-center justify-center relative overflow-hidden bg-bg-app">
      {/* Background Glowing Ambient Orbs */}
      <div className="hero-bg-effects">
        <div className="hero-orb hero-orb-1 opacity-25" />
        <div className="hero-orb hero-orb-3 opacity-25" />
      </div>

      <div className="w-full max-w-md relative z-10 glass-card bg-surface/95 border border-border-main p-6 sm:p-8 rounded-3xl shadow-2xl backdrop-blur-xl">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <Logo size="lg" to="/" />
          <h1 className="text-2xl font-extrabold text-text-primary mt-4 tracking-tight">
            Create Your <span className="gradient-text">Account</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-xs">
            Join thousands of resellers, creators, and agencies growing social media at wholesale rates.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-danger-bg border border-danger/30 text-danger text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5 mb-1.5">
              <User size={14} className="text-muted-foreground" />
              <span>Username</span>
            </label>
            <input
              type="text"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-bg-surface-elevated border border-border-main text-text-primary text-xs sm:text-sm focus:outline-none focus:border-primary transition-all"
              placeholder="e.g. alex_reseller"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5 mb-1.5">
              <Mail size={14} className="text-muted-foreground" />
              <span>Email Address</span>
            </label>
            <input
              type="email"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-bg-surface-elevated border border-border-main text-text-primary text-xs sm:text-sm focus:outline-none focus:border-primary transition-all"
              placeholder="name@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5 mb-1.5">
              <Lock size={14} className="text-muted-foreground" />
              <span>Password</span>
            </label>
            <div className="relative flex items-center">
              <input
                type={showPass ? 'text' : 'password'}
                required
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-bg-surface-elevated border border-border-main text-text-primary text-xs sm:text-sm focus:outline-none focus:border-primary transition-all"
                placeholder="At least 6 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 text-muted-foreground hover:text-text-primary transition-colors"
                tabIndex={-1}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5 mb-1.5">
              <Lock size={14} className="text-muted-foreground" />
              <span>Confirm Password</span>
            </label>
            <input
              type={showPass ? 'text' : 'password'}
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-bg-surface-elevated border border-border-main text-text-primary text-xs sm:text-sm focus:outline-none focus:border-primary transition-all"
              placeholder="Re-enter your password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            />
          </div>

          <div className="pt-1">
            <label className="flex items-start gap-2 cursor-pointer select-none text-xs text-muted-foreground">
              <input
                type="checkbox"
                required
                checked={form.agreeTerms}
                onChange={(e) => setForm({ ...form, agreeTerms: e.target.checked })}
                className="rounded border-border-main text-primary focus:ring-primary w-4 h-4 mt-0.5 bg-bg-surface-elevated flex-shrink-0"
              />
              <span>
                I agree to the <Link to="/services" className="text-primary hover:underline">Terms of Service</Link> and <Link to="/services" className="text-primary hover:underline">Privacy Policy</Link>
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-gradient w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-primary/30 transition-all mt-4"
          >
            {loading ? (
              <span>Creating Account...</span>
            ) : (
              <>
                <UserPlus size={18} />
                <span>Create My Account</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <GoogleSignInButton text="signup_with" onCredential={handleGoogleCredential} disabled={loading} />

        {/* Login Link */}
        <div className="mt-6 text-center text-xs text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-primary hover:underline">
            Sign In Here
          </Link>
        </div>

        {/* Security Trust Indicators */}
        <div className="mt-6 pt-4 border-t border-border-main/50 flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Shield size={12} className="text-emerald-400" /> 256-Bit SSL Encrypted
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Sparkles size={12} className="text-primary" /> Free Instant API Access
          </span>
        </div>
      </div>
    </div>
  );
}
