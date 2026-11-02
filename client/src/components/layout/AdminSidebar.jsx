import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import Logo from '../brand/Logo';
import ThemeToggle from '../ui/ThemeToggle';
import {
  LayoutDashboard, Server, Coins, Share2, FolderTree, Package,
  ShoppingCart, Receipt, ShieldCheck, FileCheck, Users, Mail,
  Gift, Sliders, Shield, Puzzle, CreditCard, Palette, Layout,
  FileText, Menu as MenuIcon, BookOpen, Bell, ChevronDown, ChevronRight,
  LogOut, ExternalLink, X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminSidebar({ isCollapsed, isMobileOpen, onCloseMobile }) {
  const location = useLocation();
  const { user, logout } = useAuth();

  // State to manage open/close status of accordion sections
  const [openSections, setOpenSections] = useState({
    childPanels: false,
    services: false,
    transactions: false,
    tickets: false,
    kyc: false,
    users: false,
    settings: false,
    themes: false,
  });

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Admin menu groupings derived directly from SMM Matrix reference screenshots
  const menuGroups = [
    {
      heading: 'DASHBOARD',
      items: [
        { label: 'Dashboard', to: '/admin', icon: LayoutDashboard, end: true },
      ]
    },
    {
      heading: 'MANAGE CHILD PANEL',
      items: [
        { label: 'Panel Dashboard', to: '/admin/child-panels', icon: Layout, badge: 'Addon' },
        { label: 'Set Panel Price', to: '/admin/child-panels/pricing', icon: Coins },
        { label: 'Running Child Panel', to: '/admin/child-panels/running', icon: Server },
        { label: 'Panel Purchase Request', to: '/admin/child-panels/requests', icon: ShoppingCart },
        { label: 'Renewal Request', to: '/admin/child-panels/renewals', icon: Receipt },
      ]
    },
    {
      heading: 'MANAGE API PROVIDER',
      items: [
        { label: 'API Providers', to: '/admin/providers', icon: Server },
      ]
    },
    {
      heading: 'MANAGE MULTI CURRENCY',
      items: [
        { label: 'Currencies', to: '/admin/currencies', icon: Coins },
      ]
    },
    {
      heading: 'MANAGE SERVICES',
      items: [
        { label: 'Social Media', to: '/admin/social-media', icon: Share2 },
        { label: 'Category', to: '/admin/categories', icon: FolderTree },
        { label: 'Services', to: '/admin/services', icon: Package },
      ]
    },
    {
      heading: 'ORDER MANAGEMENT',
      items: [
        { label: 'Manage Orders', to: '/admin/orders', icon: ShoppingCart },
      ]
    },
    {
      heading: 'TRANSACTIONS',
      items: [
        { label: 'Transaction', to: '/admin/transactions', icon: Receipt },
        { label: 'Payment Log', to: '/admin/payments', icon: CreditCard },
        { label: 'Payment Request', to: '/admin/payment-requests', icon: Coins },
      ]
    },
    {
      heading: 'TICKET PANEL',
      items: [
        { label: 'Support Ticket', to: '/admin/tickets', icon: ShieldCheck },
      ]
    },
    {
      heading: 'KYC MANAGEMENT',
      items: [
        { label: 'KYC Setting', to: '/admin/kyc-settings', icon: FileCheck },
        { label: 'KYC Request', to: '/admin/kyc-requests', icon: ShieldCheck },
      ]
    },
    {
      heading: 'SUBSCRIBERS',
      items: [
        { label: 'Subscriber', to: '/admin/subscribers', icon: Mail },
      ]
    },
    {
      heading: 'USER PANEL',
      items: [
        { label: 'User Management', to: '/admin/users', icon: Users },
        { label: 'Staff Management', to: '/admin/staff', icon: ShieldCheck },
        { label: 'Mail To Users', to: '/admin/mail-users', icon: Mail },
      ]
    },
    {
      heading: 'COMMISSION SETTING',
      items: [
        { label: 'Referral', to: '/admin/referrals', icon: Gift },
      ]
    },
    {
      heading: 'SETTINGS PANEL',
      items: [
        { label: 'Control Panel', to: '/admin/settings', icon: Sliders },
        { label: 'Email Settings', to: '/admin/email-settings', icon: Mail },
        { label: 'Notification Settings', to: '/admin/notification-settings', icon: Bell },
        { label: 'Roles & Permission', to: '/admin/roles', icon: Shield },
        { label: 'Activity Logs', to: '/admin/activity-logs', icon: FileCheck },
        { label: 'Addon Manager', to: '/admin/addons', icon: Puzzle, badge: 'Addon' },
        { label: 'Payment Setting', to: '/admin/payment-gateways', icon: CreditCard },
      ]
    },
    {
      heading: 'THEMES SETTINGS',
      items: [
        { label: 'Choose Theme', to: '/admin/themes', icon: Palette },
        { label: 'Choose Dashboard', to: '/admin/theme-dashboard', icon: Layout },
        { label: 'Pages', to: '/admin/pages', icon: FileText },
        { label: 'Manage Menu', to: '/admin/menus', icon: MenuIcon },
        { label: 'Manage Content', to: '/admin/content', icon: BookOpen },
        { label: 'Manage Blog', to: '/admin/blogs', icon: BookOpen },
        { label: 'Notice', to: '/admin/notices', icon: Bell },
      ]
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div className="sidebar-overlay" onClick={onCloseMobile} />
      )}

      <aside
        className={`saas-sidebar ${isCollapsed ? 'collapsed' : 'expanded'} ${isMobileOpen ? 'mobile-open' : ''}`}
      >
        {/* Sidebar Brand Header */}
        <div className="sidebar-header">
          <Logo
            variant={isCollapsed ? 'icon-only' : 'full'}
            size={isCollapsed ? 'md' : 'md'}
            to="/admin"
          />
          {/* Close button for mobile screen */}
          {isMobileOpen && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-md text-sidebar-text hover:text-white"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Sidebar Scrollable Navigation */}
        <div className="sidebar-nav-scroll">
          {menuGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="mb-2">
              {!isCollapsed && (
                <div className="sidebar-section-heading">
                  {group.heading}
                </div>
              )}
              {isCollapsed && (
                <div className="sidebar-section-heading" title={group.heading}>
                  •
                </div>
              )}
              {group.items.map((item, itemIdx) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={itemIdx}
                    to={item.to}
                    end={item.end}
                    onClick={onCloseMobile}
                    title={isCollapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `sidebar-link ${isActive ? 'active' : ''}`
                    }
                  >
                    <Icon size={18} className="flex-shrink-0" />
                    {!isCollapsed && (
                      <>
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <span className="sidebar-badge">{item.badge}</span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}

          {/* Quick link to User View */}
          <div className="pt-4 mt-2 border-t border-sidebar-border">
            <NavLink
              to="/dashboard"
              onClick={onCloseMobile}
              className="sidebar-link hover:text-cyan-400"
              title={isCollapsed ? 'Switch to Customer Dashboard' : undefined}
            >
              <ExternalLink size={18} className="flex-shrink-0 text-cyan-400" />
              {!isCollapsed && <span>Customer View</span>}
            </NavLink>
          </div>
        </div>

        {/* Sidebar Footer with Version & Theme Switcher */}
        <div className="sidebar-footer">
          {!isCollapsed && (
            <span className="tracking-wider text-[11px] font-bold text-muted-foreground opacity-70">
              VERSION 1.0.0
            </span>
          )}
          <ThemeToggle />
        </div>
      </aside>
    </>
  );
}

