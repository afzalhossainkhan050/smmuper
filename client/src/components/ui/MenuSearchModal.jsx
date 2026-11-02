import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ChevronRight, LayoutDashboard, ShoppingCart, Users, Settings, Wallet, Layers, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function MenuSearchModal({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Global key shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(false); // will trigger toggle in parent
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const adminMenuCatalog = [
    { label: 'Admin Dashboard', path: '/admin', group: 'Dashboard', icon: LayoutDashboard },
    { label: 'User Management', path: '/admin/users', group: 'User Panel', icon: Users },
    { label: 'Staff Management', path: '/admin/staff', group: 'User Panel', icon: ShieldCheck },
    { label: 'Mail To Users', path: '/admin/mail-users', group: 'User Panel', icon: Settings },
    { label: 'Control Panel / General Settings', path: '/admin/settings', group: 'Settings Panel', icon: Settings },
    { label: 'Email Settings & Templates', path: '/admin/email-settings', group: 'Settings Panel', icon: Settings },
    { label: 'Google Login', path: '/admin/google-login', group: 'Settings Panel', icon: Settings },
    { label: 'Notification Settings & Push', path: '/admin/notification-settings', group: 'Settings Panel', icon: Settings },
    { label: 'Roles & Permissions', path: '/admin/roles', group: 'Settings Panel', icon: ShieldCheck },
    { label: 'Admin Activity Logs', path: '/admin/activity-logs', group: 'Settings Panel', icon: Settings },
    { label: 'Addon Manager', path: '/admin/addons', group: 'Settings Panel', icon: Layers },
    { label: 'Currency Management', path: '/admin/currencies', group: 'Manage Multi Currency', icon: Wallet },
    { label: 'Notices', path: '/admin/notices', group: 'Themes Settings', icon: Settings },
    { label: 'Blog Authors', path: '/admin/authors', group: 'Themes Settings', icon: Layers },
    { label: 'Order Management', path: '/admin/orders', group: 'Order Management', icon: ShoppingCart },
    { label: 'Manage Services', path: '/admin/services', group: 'Manage Services', icon: Layers },
    { label: 'API Providers', path: '/admin/providers', group: 'Manage API Provider', icon: Settings },
    { label: 'Payment Logs', path: '/admin/payments', group: 'Transactions', icon: Wallet },
    { label: 'Support Tickets', path: '/admin/tickets', group: 'Ticket Panel', icon: ShieldCheck },
  ];

  const userMenuCatalog = [
    { label: 'User Dashboard', path: '/dashboard', group: 'Dashboard', icon: LayoutDashboard },
    { label: 'New Order', path: '/dashboard/new-order', group: 'Orders', icon: ShoppingCart },
    { label: 'Order History', path: '/dashboard/orders', group: 'Orders', icon: ShoppingCart },
    { label: 'Services & Pricing', path: '/dashboard/services', group: 'Services', icon: Layers },
    { label: 'Add Funds', path: '/dashboard/add-funds', group: 'Wallet', icon: Wallet },
    { label: 'Transaction History', path: '/dashboard/payments', group: 'Wallet', icon: Wallet },
    { label: 'Support Tickets', path: '/dashboard/tickets', group: 'Support', icon: ShieldCheck },
    { label: 'API Documentation', path: '/dashboard/api-docs', group: 'Reseller API', icon: Settings },
    { label: 'Profile Settings', path: '/dashboard/profile', group: 'Account', icon: Users },
  ];

  const allItems = isAdmin ? [...adminMenuCatalog, ...userMenuCatalog] : userMenuCatalog;

  const filtered = query.trim()
    ? allItems.filter(item =>
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        item.group.toLowerCase().includes(query.toLowerCase())
      )
    : allItems.slice(0, 8);

  const handleSelect = (path) => {
    navigate(path);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="sidebar-overlay flex items-center justify-center p-4">
      <div className="saas-card w-full max-w-lg bg-surface border-border-main shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-main bg-bg-surface-elevated">
          <Search size={18} className="text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search menus, features, settings..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent border-none text-sm text-text-primary placeholder:text-muted-foreground focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-text-primary hover:bg-bg-surface-hover"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No matching pages or menus found for "{query}"
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelect(item.path)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-sm text-text-primary hover:bg-bg-surface-hover transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-md bg-primary-light text-primary group-hover:scale-105 transition-transform">
                        <Icon size={16} />
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-text-primary">{item.label}</div>
                        <div className="text-[11px] text-muted-foreground">{item.group}</div>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2 border-t border-border-main bg-bg-surface-subtle text-[11px] text-muted-foreground flex items-center justify-between">
          <span>Navigate with mouse or keyboard</span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-bg-surface border border-border-main text-[10px]">ESC</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
}

