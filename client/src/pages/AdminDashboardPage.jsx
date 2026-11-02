import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useSystem } from '../contexts/SystemContext';
import LoadingSpinner from '../components/LoadingSpinner';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import StatusBadge from '../components/ui/StatusBadge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import {
  BarChart3, Users, ShoppingCart, DollarSign, TrendingUp,
  ArrowUpRight, ArrowRight, Activity, ShieldCheck, Server,
  Coins, Package, Sliders
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { formatPrice } = useSystem();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.admin.getDashboard();
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch admin stats:', err);
        setStats({
          totalRevenue: 0, totalOrders: 0, totalUsers: 2, pendingOrders: 0,
          todayOrders: 0, todayRevenue: 0, recentOrders: [], recentUsers: [],
        });
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <LoadingSpinner fullPage />;

  const statCards = [
    {
      icon: DollarSign,
      label: 'Gross Revenue',
      value: formatPrice(stats?.totalRevenue || 0),
      change: '+14.2%',
      positive: true,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/15',
    },
    {
      icon: ShoppingCart,
      label: 'Platform Orders',
      value: (stats?.totalOrders || 0).toLocaleString(),
      change: '+8.4%',
      positive: true,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/15',
    },
    {
      icon: Users,
      label: 'Registered Users',
      value: (stats?.totalUsers || 2).toLocaleString(),
      change: '+100%',
      positive: true,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/15',
    },
    {
      icon: Activity,
      label: 'Pending Orders',
      value: (stats?.pendingOrders || 0).toLocaleString(),
      change: 'Active',
      positive: false,
      color: 'text-amber-400',
      bg: 'bg-amber-500/15',
    },
  ];

  const recentOrders = stats?.recentOrders || [];
  const recentUsers = stats?.recentUsers || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="dashboard-page-header">
        <div>
          <Breadcrumbs items={[{ label: 'Admin Dashboard' }]} />
          <h1 className="dashboard-page-title mt-1 flex items-center gap-2.5">
            <span>Administration Overview</span>
            <span className="badge badge-active text-[11px]">System Active</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/admin/orders" className="btn btn-secondary btn-sm">
            <ShoppingCart size={15} />
            <span>Manage Orders</span>
          </Link>
          <Link to="/admin/users" className="btn btn-primary btn-sm">
            <Users size={15} />
            <span>Manage Users</span>
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <Card key={i} className="hover:border-primary/40">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    {card.label}
                  </div>
                  <div className="text-2xl font-extrabold text-text-primary mt-1">
                    {card.value}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 mt-1">
                    <ArrowUpRight size={13} />
                    <span>{card.change}</span>
                  </div>
                </div>
                <div className={`w-12 h-12 rounded-xl ${card.bg} ${card.color} flex items-center justify-center`}>
                  <Icon size={24} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Admin Modules Navigation Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Link
          to="/admin/users"
          className="p-4 rounded-xl bg-surface border border-border-main hover:border-primary/50 text-center transition-all group shadow-sm hover:shadow-md"
        >
          <Users size={22} className="mx-auto text-primary group-hover:scale-110 transition-transform mb-1.5" />
          <span className="text-xs font-bold text-text-primary block">Users</span>
          <span className="text-[10px] text-muted-foreground">Accounts & Balances</span>
        </Link>
        <Link
          to="/admin/orders"
          className="p-4 rounded-xl bg-surface border border-border-main hover:border-cyan-400/50 text-center transition-all group shadow-sm hover:shadow-md"
        >
          <ShoppingCart size={22} className="mx-auto text-cyan-400 group-hover:scale-110 transition-transform mb-1.5" />
          <span className="text-xs font-bold text-text-primary block">Orders</span>
          <span className="text-[10px] text-muted-foreground">Order Lifecycle</span>
        </Link>
        <Link
          to="/admin/services"
          className="p-4 rounded-xl bg-surface border border-border-main hover:border-emerald-400/50 text-center transition-all group shadow-sm hover:shadow-md"
        >
          <Package size={22} className="mx-auto text-emerald-400 group-hover:scale-110 transition-transform mb-1.5" />
          <span className="text-xs font-bold text-text-primary block">Services</span>
          <span className="text-[10px] text-muted-foreground">Rates & Catalog</span>
        </Link>
        <Link
          to="/admin/providers"
          className="p-4 rounded-xl bg-surface border border-border-main hover:border-purple-400/50 text-center transition-all group shadow-sm hover:shadow-md"
        >
          <Server size={22} className="mx-auto text-purple-400 group-hover:scale-110 transition-transform mb-1.5" />
          <span className="text-xs font-bold text-text-primary block">Providers</span>
          <span className="text-[10px] text-muted-foreground">API Sync Engine</span>
        </Link>
        <Link
          to="/admin/currencies"
          className="p-4 rounded-xl bg-surface border border-border-main hover:border-amber-400/50 text-center transition-all group shadow-sm hover:shadow-md"
        >
          <Coins size={22} className="mx-auto text-amber-400 group-hover:scale-110 transition-transform mb-1.5" />
          <span className="text-xs font-bold text-text-primary block">Currencies</span>
          <span className="text-[10px] text-muted-foreground">USD, BDT, EUR</span>
        </Link>
        <Link
          to="/admin/settings"
          className="p-4 rounded-xl bg-surface border border-border-main hover:border-pink-400/50 text-center transition-all group shadow-sm hover:shadow-md"
        >
          <Sliders size={22} className="mx-auto text-pink-400 group-hover:scale-110 transition-transform mb-1.5" />
          <span className="text-xs font-bold text-text-primary block">Settings</span>
          <span className="text-[10px] text-muted-foreground">System Controls</span>
        </Link>
      </div>

      {/* Main Tables: Recent Orders & Recent Users */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCart size={18} className="text-primary" />
                <span>Recent Platform Orders</span>
              </CardTitle>
              <Link to="/admin/orders" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                View All <ArrowRight size={13} />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {recentOrders.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-xs">
                  <p>No recent orders found in database.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-bg-surface-elevated text-muted-foreground uppercase tracking-wider text-[10px] border-b border-border-main">
                      <tr>
                        <th className="px-4 py-3">Order ID</th>
                        <th className="px-4 py-3">Client</th>
                        <th className="px-4 py-3">Service</th>
                        <th className="px-4 py-3">Qty</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {recentOrders.map((order) => (
                        <tr key={order.id || order._id} className="hover:bg-bg-surface-hover/50">
                          <td className="px-4 py-3 font-mono font-bold text-text-primary">
                            #{order.id}
                          </td>
                          <td className="px-4 py-3 font-semibold text-text-primary">
                            {order.username || 'Client'}
                          </td>
                          <td className="px-4 py-3 max-w-[180px] truncate text-muted-foreground">
                            {order.service_name || order.name || 'Order'}
                          </td>
                          <td className="px-4 py-3 font-semibold text-text-primary">
                            {order.quantity?.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 font-bold text-text-primary">
                            {formatPrice(order.charge || 0)}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={order.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Registered Users */}
        <div>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Users size={18} className="text-primary" />
                <span>Recent Users</span>
              </CardTitle>
              <Link to="/admin/users" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                All Users <ArrowRight size={13} />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {recentUsers.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-xs">
                  <p>No user registrations yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-border-subtle">
                  {recentUsers.map((u) => (
                    <div key={u.id} className="p-3.5 flex items-center justify-between hover:bg-bg-surface-hover/50 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center font-bold text-xs">
                          {u.username?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-text-primary">{u.username}</div>
                          <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">{u.email}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-extrabold text-primary">{formatPrice(u.balance || 0)}</div>
                        <StatusBadge status={u.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
