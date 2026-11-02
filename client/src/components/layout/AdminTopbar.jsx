import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Menu, Search, Bell, Settings, Sun, Moon, Globe,
  User, Shield, ExternalLink, LogOut, ChevronDown, Check
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useSystem } from '../../contexts/SystemContext';
import MenuSearchModal from '../ui/MenuSearchModal';

export default function AdminTopbar({ onToggleCollapse, onOpenMobile }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { currencies, currentCurrency, changeCurrency, formatPrice } = useSystem();
  const navigate = useNavigate();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const profileRef = useRef(null);
  const currencyRef = useRef(null);
  const notifRef = useRef(null);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
      if (currencyRef.current && !currencyRef.current.contains(e.target)) {
        setIsCurrencyOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotificationOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <header className="dashboard-topbar">
        {/* Left Side: Collapse Toggle & Menu Search */}
        <div className="topbar-left">
          {/* Desktop Collapse Button */}
          <button
            onClick={onToggleCollapse}
            className="topbar-toggle-btn hidden lg:flex"
            title="Toggle Sidebar Collapse"
            type="button"
          >
            <Menu size={20} />
          </button>

          {/* Mobile Drawer Button */}
          <button
            onClick={onOpenMobile}
            className="topbar-toggle-btn flex lg:hidden"
            title="Open Mobile Navigation"
            type="button"
          >
            <Menu size={20} />
          </button>

          {/* Search for a menu trigger */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="topbar-search-trigger"
            type="button"
            title="Search for a menu (Ctrl+K)"
          >
            <Search size={16} />
            <span>Search for a menu</span>
            <kbd className="topbar-search-kbd">⌘K</kbd>
          </button>
        </div>

        {/* Right Side Controls */}
        <div className="topbar-right">
          {/* Currency Selector */}
          <div className="relative" ref={currencyRef}>
            <button
              onClick={() => setIsCurrencyOpen(!isCurrencyOpen)}
              className="topbar-icon-btn flex items-center gap-1 px-2.5 w-auto"
              title="Select Active Currency"
              type="button"
            >
              <Globe size={16} />
              <span className="text-xs font-bold">{currentCurrency.code}</span>
            </button>

            {isCurrencyOpen && (
              <div className="absolute right-0 mt-2 w-48 saas-card bg-surface shadow-2xl z-50 p-1.5 border border-border-main">
                <div className="px-3 py-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Select Currency
                </div>
                {currencies.map(c => (
                  <button
                    key={c.code}
                    onClick={() => {
                      changeCurrency(c.code);
                      setIsCurrencyOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
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

          {/* Theme Switcher Toggle */}
          <button
            onClick={toggleTheme}
            className="topbar-icon-btn"
            title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
            type="button"
          >
            {isDark ? (
              <Sun size={18} className="text-amber-400" />
            ) : (
              <Moon size={18} className="text-indigo-600" />
            )}
          </button>

          {/* Quick Settings Link */}
          <Link
            to="/admin/settings"
            className="topbar-icon-btn hidden sm:flex"
            title="System Settings"
          >
            <Settings size={18} />
          </Link>

          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="topbar-icon-btn"
              title="Notifications"
              type="button"
            >
              <Bell size={18} />
              <span className="badge-dot-indicator" />
            </button>

            {isNotificationOpen && (
              <div className="absolute right-0 mt-2 w-80 saas-card bg-surface shadow-2xl z-50 p-0 border border-border-main overflow-hidden">
                <div className="px-4 py-3 border-b border-border-main flex items-center justify-between bg-bg-surface-elevated">
                  <span className="text-xs font-bold text-text-primary">System Notifications</span>
                  <span className="text-[10px] bg-primary-light text-primary px-1.5 py-0.5 rounded font-bold">1 New</span>
                </div>
                <div className="p-3 divide-y divide-border-subtle max-h-64 overflow-y-auto">
                  <div className="py-2 text-xs">
                    <div className="font-semibold text-text-primary">Welcome to SMMuper Admin</div>
                    <div className="text-muted-foreground text-[11px] mt-0.5">Phase 1 architecture initialized. Multi-currency and API ready.</div>
                    <div className="text-[10px] text-muted-foreground mt-1 opacity-70">Just now</div>
                  </div>
                </div>
                <div className="px-4 py-2 border-t border-border-main bg-bg-surface-subtle text-center">
                  <Link to="/admin/notices" onClick={() => setIsNotificationOpen(false)} className="text-[11px] text-primary font-bold hover:underline">
                    View All Notices
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Admin Avatar & Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="user-avatar-btn"
              type="button"
            >
              <div className="user-avatar-circle">
                {user?.username?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <div className="hidden md:flex flex-col text-left leading-none">
                <span className="text-xs font-bold text-text-primary">
                  {user?.username || 'Admin'}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  Administrator
                </span>
              </div>
              <ChevronDown size={14} className="text-muted-foreground ml-0.5" />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-56 saas-card bg-surface shadow-2xl z-50 p-1.5 border border-border-main animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2 border-b border-border-main">
                  <div className="text-xs font-bold text-text-primary">{user?.username}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{user?.email}</div>
                  <div className="mt-1.5 text-xs font-extrabold text-primary">
                    Balance: {formatPrice(user?.balance || 0)}
                  </div>
                </div>

                <div className="py-1">
                  <Link
                    to="/admin/settings"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-text-primary hover:bg-bg-surface-hover"
                  >
                    <Settings size={15} className="text-muted-foreground" />
                    <span>Control Panel</span>
                  </Link>
                  <Link
                    to="/dashboard"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-cyan-400 hover:bg-bg-surface-hover font-semibold"
                  >
                    <ExternalLink size={15} />
                    <span>Customer Dashboard</span>
                  </Link>
                </div>

                <div className="pt-1 border-t border-border-main">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-danger hover:bg-danger-bg font-semibold"
                  >
                    <LogOut size={15} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Quick Menu Search Modal (Ctrl+K) */}
      <MenuSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
}

