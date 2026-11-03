import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/brand/Logo';
import GoogleSignInButton from '../components/ui/GoogleSignInButton';
import {
  Mail, Lock, LogIn, Eye, EyeOff, ShieldCheck,
  AlertCircle, KeyRound, ArrowLeft, ArrowRight, Sparkles, Shield
} from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 2FA Challenge State
  const [twoFactorChallenge, setTwoFactorChallenge] = useState(null); // { temp_token, username }
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const { login, loginWithGoogle, verify2FA } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please provide your email address and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await login(email.trim(), password, rememberMe);
      if (res && res.requires_2fa) {
        setTwoFactorChallenge({
          temp_token: res.temp_token,
          username: res.user?.username || email
        });
        setLoading(false);
        return;
      }
      
      const defaultPath = res?.role === 'admin' ? '/admin' : '/dashboard';
      const redirectPath = location.state?.from?.pathname || defaultPath;
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    setError('');

    if (!twoFactorCode.trim() || twoFactorCode.trim().length !== 6) {
      setError('Please enter the 6-digit verification code from your authenticator app.');
      return;
    }

    setLoading(true);
    try {
      const user = await verify2FA(twoFactorChallenge.temp_token, twoFactorCode.trim());
      const defaultPath = user?.role === 'admin' ? '/admin' : '/dashboard';
      const redirectPath = location.state?.from?.pathname || defaultPath;
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid or expired 2FA code. Please check your authenticator clock.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (credential) => {
    setError('');
    setLoading(true);
    try {
      const res = await loginWithGoogle(credential);
      if (res && res.requires_2fa) {
        setTwoFactorChallenge({
          temp_token: res.temp_token,
          username: res.user?.username || 'your account'
        });
        return;
      }
      const defaultPath = res?.role === 'admin' ? '/admin' : '/dashboard';
      const redirectPath = location.state?.from?.pathname || defaultPath;
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setError(err.message || 'Google sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-75px)] py-12 px-4 flex items-center justify-center relative overflow-hidden bg-bg-app">
      {/* Background Glowing Ambient Orbs */}
      <div className="hero-bg-effects">
        <div className="hero-orb hero-orb-1 opacity-25" />
        <div className="hero-orb hero-orb-2 opacity-25" />
      </div>

      <div className="w-full max-w-md relative z-10 glass-card bg-surface/95 border border-border-main p-6 sm:p-8 rounded-3xl shadow-2xl backdrop-blur-xl">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <Logo size="lg" to="/" />
          <h1 className="text-2xl font-extrabold text-text-primary mt-4 tracking-tight">
            {twoFactorChallenge ? 'Two-Factor Verification' : (
              <span>Welcome Back to <span className="gradient-text">SMMuper</span></span>
            )}
          </h1>
          <p className="text-xs text-muted-foreground mt-1.5 max-w-xs">
            {twoFactorChallenge 
              ? `Enter the 6-digit authenticator code for ${twoFactorChallenge.username}`
              : 'Sign in to access your wholesale SMM orders, wallet, and reseller API'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-danger-bg border border-danger/30 text-danger text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 2FA Challenge Form */}
        {twoFactorChallenge ? (
          <form onSubmit={handleVerify2FA} className="space-y-4">
            <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 text-center">
              <KeyRound size={36} className="mx-auto text-primary mb-2" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Open Google Authenticator or your TOTP app and enter the current 6-digit security code.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-center block mb-2 text-text-primary uppercase tracking-wider">
                6-Digit Security Token
              </label>
              <input
                type="text"
                required
                autoFocus
                maxLength={6}
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                className="w-full py-3 text-center text-3xl tracking-[0.4em] font-mono font-extrabold rounded-xl bg-bg-surface-elevated border border-border-main text-text-primary focus:outline-none focus:border-primary shadow-inner"
                placeholder="000000"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-gradient w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg"
            >
              {loading ? (
                <span>Verifying Token...</span>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  <span>Verify & Enter Dashboard</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setTwoFactorChallenge(null);
                setTwoFactorCode('');
                setError('');
              }}
              className="w-full py-2 text-xs text-muted-foreground hover:text-text-primary flex items-center justify-center gap-1.5 transition-colors"
            >
              <ArrowLeft size={14} /> Back to Password Sign In
            </button>
          </form>
        ) : (
          /* Standard Login Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5 mb-1.5">
                <Mail size={14} className="text-muted-foreground" />
                <span>Email Address or Username</span>
              </label>
              <input
                type="text"
                required
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-xl bg-bg-surface-elevated border border-border-main text-text-primary text-xs sm:text-sm focus:outline-none focus:border-primary transition-all"
                placeholder="name@example.com or username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                  <Lock size={14} className="text-muted-foreground" />
                  <span>Password</span>
                </label>
                <Link to="/forgot-password" className="text-[11px] font-semibold text-primary hover:underline">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative flex items-center">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-bg-surface-elevated border border-border-main text-text-primary text-xs sm:text-sm focus:outline-none focus:border-primary transition-all"
                  placeholder="Enter your account password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none text-muted-foreground hover:text-text-primary">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-border-main text-primary focus:ring-primary w-3.5 h-3.5 bg-bg-surface-elevated"
                />
                <span>Remember me for 30 days</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-gradient w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-primary/30 transition-all mt-2"
            >
              {loading ? (
                <span>Signing In...</span>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Sign In to SMMuper</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Google Sign-In (shown only when enabled by admin) */}
        {!twoFactorChallenge && (
          <GoogleSignInButton onCredential={handleGoogleCredential} disabled={loading} />
        )}

        {/* Register Link */}
        <div className="mt-6 text-center text-xs text-muted-foreground">
          Don't have an account yet?{' '}
          <Link to="/register" className="font-bold text-primary hover:underline">
            Create Free Account
          </Link>
        </div>

        {/* Security Trust Indicators */}
        <div className="mt-6 pt-4 border-t border-border-main/50 flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Shield size={12} className="text-emerald-400" /> 256-Bit SSL Encrypted
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Sparkles size={12} className="text-primary" /> 99.9% API Uptime
          </span>
        </div>
      </div>
    </div>
  );
}
