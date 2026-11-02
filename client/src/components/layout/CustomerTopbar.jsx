import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Menu, Search, Bell, Wallet, Plus, Globe,
  User, Shield, LogOut, ChevronDown, Check
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useSystem } from '../../contexts/SystemContext';
import MenuSearchModal from '../ui/MenuSearchModal';
import ThemeToggle from '../ui/ThemeToggle';

export default function CustomerTopbar({ onToggleCollapse, onOpenMobile }) {
  const { user, isAdmin, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { currencies, currentCurrency, changeCurrency, formatPrice } = useSystem();
  const navigate = useNavigate();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);

  const profileRef = useRef(null);
  const currencyRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
      if (currencyRef.current && !currencyRef.current.contains(e.target)) {
        setIsCurrencyOpen(false);
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
        {/* Left Side */}
        <div className="topbar-left">
          <button
            onClick={onToggleCollapse}
            className="topbar-toggle-btn hidden lg:flex"
            title="Toggle Sidebar Collapse"
            type="button"
          >
            <Menu size={20} />
          </button>
          <button
            onClick={onOpenMobile}
            className="topbar-toggle-btn flex lg:hidden"
            title="Open Mobile Navigation"
            type="button"
          >
            <Menu size={20} />
          </button>

          <button
            onClick={() => setIsSearchOpen(true)}
            className="topbar-search-trigger"
            type="button"
          >
            <Search size={16} />
            <span>Search services & orders</span>
            <kbd className="topbar-search-kbd">⌘K</kbd>
          </button>
        </div>

        {/* Right Side */}
        <div className="topbar-right">
          {/* Wallet Balance Pill */}
          <Link
            to="/dashboard/add-funds"
            className="topbar-balance-pill transition-transform hover:scale-[1.02]"
            title="Click to Add Funds"
          >
            <Wallet size={16} className="text-primary" />
            <span>{formatPrice(user?.balance || 0)}</span>
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-[10px]">
              <Plus size={12} />
            </span>
          </Link>

          {/* Currency Switcher */}
          <div className="relative" ref={currencyRef}>
            <button
              onClick={() => setIsCurrencyOpen(!isCurrencyOpen)}
              className="topbar-icon-btn flex items-center gap-1 px-2.5 w-auto"
              title="Change Currency"
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

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Avatar Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="user-avatar-btn"
              type="button"
            >
              <div className="user-avatar-circle">
                {user?.username?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="hidden md:flex flex-col text-left leading-none">
                <span className="text-xs font-bold text-text-primary">
                  {user?.username || 'Customer'}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  {isAdmin ? 'Admin' : 'Client'}
                </span>
              </div>
              <ChevronDown size={14} className="text-muted-foreground ml-0.5" />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-56 saas-card bg-surface shadow-2xl z-50 p-1.5 border border-border-main">
                <div className="px-3 py-2 border-b border-border-main">
                  <div className="text-xs font-bold text-text-primary">{user?.username}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{user?.email}</div>
                  <div className="mt-1 text-xs font-extrabold text-primary">
                    Balance: {formatPrice(user?.balance || 0)}
                  </div>
                </div>

                <div className="py-1">
                  <Link
                    to="/dashboard/profile"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-text-primary hover:bg-bg-surface-hover"
                  >
                    <User size={15} className="text-muted-foreground" />
                    <span>Account Profile</span>
                  </Link>
                  <Link
                    to="/dashboard/api-docs"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-text-primary hover:bg-bg-surface-hover"
                  >
                    <Wallet size={15} className="text-muted-foreground" />
                    <span>Reseller API Keys</span>
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-primary font-bold hover:bg-bg-surface-hover"
                    >
                      <Shield size={15} />
                      <span>Admin Control Panel</span>
                    </Link>
                  )}
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

      <MenuSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </>
  );
}

