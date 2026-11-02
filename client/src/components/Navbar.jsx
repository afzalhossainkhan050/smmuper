import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSystem } from '../contexts/SystemContext';
import Logo from './brand/Logo';
import ThemeToggle from './ui/ThemeToggle';
import {
  Menu, X, User, LogOut, Settings, Shield, ChevronDown,
  Globe, Check, LayoutDashboard, ShoppingCart
} from 'lucide-react';

export default function Navbar() {
  const { isAuthenticated, isAdmin, user, logout } = useAuth();
  const { currencies, currentCurrency, changeCurrency } = useSystem();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const navigate = useNavigate();

  const userDropdownRef = useRef(null);
  const currencyRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (currencyRef.current && !currencyRef.current.contains(e.target)) {
        setCurrencyOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    setDropdownOpen(false);
  };

  return (
    <nav className="public-navbar">
      {/* Brand Logo */}
      <Logo size="md" to="/" />

      {/* Desktop Navigation Links */}
      <div className="public-nav-links">
        <Link to="/">Home</Link>
        <Link to="/services">Services & Pricing</Link>
        <Link to="/dashboard/api-docs">API Documentation</Link>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Currency Switcher */}
        <div className="relative" ref={currencyRef}>
          <button
            onClick={() => setCurrencyOpen(!currencyOpen)}
            className="topbar-icon-btn flex items-center gap-1 px-2.5 w-auto"
            title="Currency"
            type="button"
          >
            <Globe size={15} />
            <span className="text-xs font-bold">{currentCurrency.code}</span>
          </button>

          {currencyOpen && (
            <div className="absolute right-0 mt-2 w-44 saas-card bg-surface shadow-2xl z-50 p-1.5 border border-border-main">
              <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase">
                Select Currency
              </div>
              {currencies.map(c => (
                <button
                  key={c.code}
                  onClick={() => {
                    changeCurrency(c.code);
                    setCurrencyOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded text-xs font-medium ${
                    currentCurrency.code === c.code
                      ? 'bg-primary-light text-primary font-bold'
                      : 'text-text-primary hover:bg-bg-surface-hover'
                  }`}
                >
                  <span>{c.code} ({c.symbol})</span>
                  {currentCurrency.code === c.code && <Check size={14} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />

        {!isAuthenticated ? (
          <div className="hidden sm:flex items-center gap-2">
            <Link to="/login" className="btn btn-ghost btn-sm">
              Sign In
            </Link>
            <Link to="/register" className="btn btn-primary btn-sm">
              Get Started
            </Link>
          </div>
        ) : (
          <div className="relative" ref={userDropdownRef}>
            <button
              className="user-avatar-btn"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <div className="user-avatar-circle">
                {user?.username?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <span className="text-xs font-bold hidden md:inline">
                {user?.username}
              </span>
              <ChevronDown size={14} className="text-muted-foreground" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 saas-card bg-surface shadow-2xl z-50 p-1.5 border border-border-main animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2 border-b border-border-main">
                  <div className="text-xs font-bold text-text-primary">{user?.username}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{user?.email}</div>
                </div>

                <div className="py-1">
                  <Link
                    to="/dashboard"
                    className="flex items-center gap-2 px-3 py-2 text-xs text-text-primary hover:bg-bg-surface-hover rounded"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <LayoutDashboard size={15} /> Dashboard
                  </Link>
                  <Link
                    to="/dashboard/orders"
                    className="flex items-center gap-2 px-3 py-2 text-xs text-text-primary hover:bg-bg-surface-hover rounded"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <ShoppingCart size={15} /> My Orders
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="flex items-center gap-2 px-3 py-2 text-xs text-primary font-bold hover:bg-bg-surface-hover rounded"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <Shield size={15} /> Admin Panel
                    </Link>
                  )}
                </div>

                <div className="pt-1 border-t border-border-main">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-danger hover:bg-danger-bg font-semibold rounded"
                  >
                    <LogOut size={15} /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Mobile Toggle Button */}
        <button
          className="topbar-toggle-btn sm:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          type="button"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileOpen && (
        <div className="fixed inset-x-0 top-[75px] bg-surface border-b border-border-main p-4 flex flex-col gap-3 shadow-2xl sm:hidden z-50 animate-in slide-in-from-top-2 duration-150">
          <Link
            to="/"
            className="px-3 py-2 rounded text-sm font-semibold hover:bg-bg-surface-hover"
            onClick={() => setMobileOpen(false)}
          >
            Home
          </Link>
          <Link
            to="/services"
            className="px-3 py-2 rounded text-sm font-semibold hover:bg-bg-surface-hover"
            onClick={() => setMobileOpen(false)}
          >
            Services & Pricing
          </Link>
          <Link
            to="/dashboard/api-docs"
            className="px-3 py-2 rounded text-sm font-semibold hover:bg-bg-surface-hover"
            onClick={() => setMobileOpen(false)}
          >
            API Docs
          </Link>

          {!isAuthenticated ? (
            <div className="pt-3 border-t border-border-main flex flex-col gap-2">
              <Link
                to="/login"
                className="btn btn-secondary w-full"
                onClick={() => setMobileOpen(false)}
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="btn btn-primary w-full"
                onClick={() => setMobileOpen(false)}
              >
                Create Free Account
              </Link>
            </div>
          ) : (
            <div className="pt-3 border-t border-border-main flex flex-col gap-2">
              <Link
                to="/dashboard"
                className="btn btn-primary w-full"
                onClick={() => setMobileOpen(false)}
              >
                Go to Dashboard
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
