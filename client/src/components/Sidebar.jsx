import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, ShoppingCart, PlusCircle, Package, Wallet,
  Clock, User, MessageSquare, Code, List, X, Shield, Users,
  Settings, BarChart3, Gift, Layers, ShieldCheck
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const { isAdmin } = useAuth();
  const location = useLocation();

  const userLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/dashboard/new-order', icon: PlusCircle, label: 'New Order' },
    { to: '/dashboard/orders', icon: ShoppingCart, label: 'Orders' },
    { to: '/dashboard/services', icon: Package, label: 'Services' },
    { to: '/dashboard/add-funds', icon: Wallet, label: 'Add Funds' },
    { to: '/dashboard/payments', icon: Clock, label: 'Payment History' },
    { to: '/dashboard/child-panels', icon: Layers, label: 'Child Panels' },
    { to: '/dashboard/kyc', icon: ShieldCheck, label: 'Identity (KYC)' },
    { to: '/dashboard/tickets', icon: MessageSquare, label: 'Support Tickets' },
    { to: '/dashboard/referrals', icon: Gift, label: 'Referrals' },
    { to: '/dashboard/api-docs', icon: Code, label: 'API Docs' },
    { to: '/dashboard/profile', icon: User, label: 'Profile' },
  ];

  const adminLinks = [
    { to: '/admin', icon: BarChart3, label: 'Dashboard', end: true },
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/admin/orders', icon: ShoppingCart, label: 'Orders' },
    { to: '/admin/services', icon: Settings, label: 'Services' },
  ];

  const isAdminRoute = location.pathname.startsWith('/admin');
  const links = isAdminRoute && isAdmin ? adminLinks : userLinks;
  const sidebarTitle = isAdminRoute && isAdmin ? 'Admin Panel' : 'Dashboard';

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-title">
            {isAdminRoute && <Shield size={20} className="sidebar-title-icon" />}
            {sidebarTitle}
          </h2>
          <button className="sidebar-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <nav className="sidebar-nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <link.icon size={18} />
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>
        {isAdminRoute && isAdmin && (
          <div className="sidebar-footer-links">
            <NavLink to="/dashboard" className="sidebar-link sidebar-back-link" onClick={onClose}>
              <LayoutDashboard size={18} />
              <span>User Dashboard</span>
            </NavLink>
          </div>
        )}
        {!isAdminRoute && isAdmin && (
          <div className="sidebar-footer-links">
            <NavLink to="/admin" className="sidebar-link sidebar-back-link" onClick={onClose}>
              <Shield size={18} />
              <span>Admin Panel</span>
            </NavLink>
          </div>
        )}
      </aside>
    </>
  );
}
