import React from 'react';
import { NavLink } from 'react-router-dom';
import Logo from '../brand/Logo';
import ThemeToggle from '../ui/ThemeToggle';
import {
  LayoutDashboard, ShoppingCart, PlusCircle, Package, Wallet,
  Clock, User, MessageSquare, Code, Shield, X, Layers, Gift,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function CustomerSidebar({ isCollapsed, isMobileOpen, onCloseMobile }) {
  const { user, isAdmin } = useAuth();

  const customerLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/dashboard/new-order', icon: PlusCircle, label: 'New Order' },
    { to: '/dashboard/orders', icon: ShoppingCart, label: 'Orders History' },
    { to: '/dashboard/services', icon: Package, label: 'Services & Pricing' },
    { to: '/dashboard/add-funds', icon: Wallet, label: 'Add Funds' },
    { to: '/dashboard/payments', icon: Clock, label: 'Payment History' },
    { to: '/dashboard/child-panels', icon: Layers, label: 'Child Panels' },
    { to: '/dashboard/kyc', icon: ShieldCheck, label: 'Identity (KYC)' },
    { to: '/dashboard/referrals', icon: Gift, label: 'Referrals' },
    { to: '/dashboard/tickets', icon: MessageSquare, label: 'Support Tickets' },
    { to: '/dashboard/api-docs', icon: Code, label: 'Reseller API' },
    { to: '/dashboard/profile', icon: User, label: 'Account & Security' },
  ];

  return (
    <>
      {isMobileOpen && (
        <div className="sidebar-overlay" onClick={onCloseMobile} />
      )}

      <aside
        className={`saas-sidebar ${isCollapsed ? 'collapsed' : 'expanded'} ${isMobileOpen ? 'mobile-open' : ''}`}
      >
        {/* Header */}
        <div className="sidebar-header">
          <Logo
            variant={isCollapsed ? 'icon-only' : 'full'}
            size="md"
            to="/dashboard"
          />
          {isMobileOpen && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-md text-sidebar-text hover:text-white"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Scrollable Navigation */}
        <div className="sidebar-nav-scroll">
          <div className="sidebar-section-heading">
            {!isCollapsed ? 'CUSTOMER PANEL' : '•'}
          </div>

          {customerLinks.map((item, idx) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={idx}
                to={item.to}
                end={item.end}
                onClick={onCloseMobile}
                title={isCollapsed ? item.label : undefined}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} className="flex-shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}

          {/* Admin Switcher if role is admin */}
          {isAdmin && (
            <div className="pt-4 mt-4 border-t border-sidebar-border">
              <div className="sidebar-section-heading">
                {!isCollapsed ? 'ADMINISTRATION' : '•'}
              </div>
              <NavLink
                to="/admin"
                onClick={onCloseMobile}
                className="sidebar-link hover:text-indigo-400 font-semibold"
                title={isCollapsed ? 'Open Admin Control' : undefined}
              >
                <Shield size={18} className="flex-shrink-0 text-indigo-400" />
                {!isCollapsed && <span>Admin Control Panel</span>}
              </NavLink>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          {!isCollapsed && (
            <span className="text-[11px] font-bold text-muted-foreground opacity-70">
              SMMuper v1.0
            </span>
          )}
          <ThemeToggle />
        </div>
      </aside>
    </>
  );
}

