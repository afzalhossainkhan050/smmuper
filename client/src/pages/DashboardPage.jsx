import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSystem } from '../contexts/SystemContext';
import api from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import StatusBadge from '../components/ui/StatusBadge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import {
  Wallet, ShoppingCart, Clock, CheckCircle2, TrendingUp,
  PlusCircle, ArrowRight, Package, ShieldAlert, Sparkles
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const { formatPrice, notice } = useSystem();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await api.orders.getAll();
        setOrders(data.orders || data || []);
      } catch (err) {
        console.error('Failed to fetch orders:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const stats = {
    balance: user?.balance || 0,
    total: orders.length,
    pending: orders.filter((o) => o.status === 'pending' || o.status === 'processing').length,
    completed: orders.filter((o) => o.status === 'completed').length,
  };

  const recentOrders = orders.slice(0, 5);

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="dashboard-page-header">
        <div>
          <Breadcrumbs items={[{ label: 'Dashboard' }]} />
          <h1 className="dashboard-page-title mt-1">
            Welcome back, <span className="gradient-text">{user?.username || 'Customer'}</span>
          </h1>
        </div>
        <Link to="/dashboard/new-order" className="btn btn-primary btn-sm flex items-center gap-2">
          <PlusCircle size={16} />
          <span>New Order</span>
        </Link>
      </div>

      {/* Broadcast Notice Bar */}
      {notice && (
        <div className="p-4 rounded-xl bg-primary-light border border-primary/30 flex items-start gap-3">
          <Sparkles size={20} className="text-primary flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-extrabold text-text-primary mr-1">{notice.title}:</span>
            <span className="text-muted-foreground">{notice.description}</span>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:border-primary/40">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Current Balance
              </div>
              <div className="text-2xl font-extrabold text-text-primary mt-1">
                {formatPrice(stats.balance)}
              </div>
              <Link to="/dashboard/add-funds" className="text-[11px] text-primary font-bold hover:underline inline-flex items-center gap-1 mt-1">
                Add Funds <ArrowRight size={12} />
              </Link>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center">
              <Wallet size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-cyan-400/40">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Total Orders
              </div>
              <div className="text-2xl font-extrabold text-text-primary mt-1">
                {stats.total}
              </div>
              <span className="text-[11px] text-muted-foreground">Lifetime placed</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-cyan-500/15 text-cyan-500 flex items-center justify-center">
              <ShoppingCart size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-amber-400/40">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Active / Pending
              </div>
              <div className="text-2xl font-extrabold text-text-primary mt-1">
                {stats.pending}
              </div>
              <span className="text-[11px] text-muted-foreground">In progress</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
              <Clock size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-emerald-400/40">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Completed Orders
              </div>
              <div className="text-2xl font-extrabold text-text-primary mt-1">
                {stats.completed}
              </div>
              <span className="text-[11px] text-muted-foreground">Successfully delivered</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Recent Orders & Quick Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package size={18} className="text-primary" />
                <span>Recent Orders</span>
              </CardTitle>
              <Link to="/dashboard/orders" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                View All <ArrowRight size={13} />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {recentOrders.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-xs">
                  <ShoppingCart size={32} className="mx-auto mb-2 opacity-40" />
                  <p>You haven't placed any orders yet.</p>
                  <Link to="/dashboard/new-order" className="btn btn-primary btn-sm mt-3 inline-flex">
                    Place Your First Order
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-bg-surface-elevated text-muted-foreground uppercase tracking-wider text-[10px] border-b border-border-main">
                      <tr>
                        <th className="px-4 py-3">Order ID</th>
                        <th className="px-4 py-3">Service</th>
                        <th className="px-4 py-3">Quantity</th>
                        <th className="px-4 py-3">Charge</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {recentOrders.map((order) => (
                        <tr key={order.id || order._id} className="hover:bg-bg-surface-hover/50">
                          <td className="px-4 py-3 font-mono font-bold text-text-primary">
                            #{order.id}
                          </td>
                          <td className="px-4 py-3 max-w-[200px] truncate font-medium text-text-primary">
                            {order.service_name || order.name || 'Service Order'}
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

        {/* Quick Navigation Cards */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp size={18} className="text-primary" />
                <span>Quick Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2.5">
              <Link
                to="/dashboard/new-order"
                className="p-3 rounded-xl bg-bg-surface-elevated hover:bg-bg-surface-hover border border-border-main text-center group transition-all hover:border-primary"
              >
                <PlusCircle size={22} className="mx-auto text-primary group-hover:scale-110 transition-transform mb-1.5" />
                <span className="text-xs font-bold block text-text-primary">New Order</span>
              </Link>
              <Link
                to="/dashboard/add-funds"
                className="p-3 rounded-xl bg-bg-surface-elevated hover:bg-bg-surface-hover border border-border-main text-center group transition-all hover:border-emerald-400"
              >
                <Wallet size={22} className="mx-auto text-emerald-400 group-hover:scale-110 transition-transform mb-1.5" />
                <span className="text-xs font-bold block text-text-primary">Add Funds</span>
              </Link>
              <Link
                to="/dashboard/services"
                className="p-3 rounded-xl bg-bg-surface-elevated hover:bg-bg-surface-hover border border-border-main text-center group transition-all hover:border-cyan-400"
              >
                <Package size={22} className="mx-auto text-cyan-400 group-hover:scale-110 transition-transform mb-1.5" />
                <span className="text-xs font-bold block text-text-primary">Services</span>
              </Link>
              <Link
                to="/dashboard/tickets"
                className="p-3 rounded-xl bg-bg-surface-elevated hover:bg-bg-surface-hover border border-border-main text-center group transition-all hover:border-amber-400"
              >
                <Clock size={22} className="mx-auto text-amber-400 group-hover:scale-110 transition-transform mb-1.5" />
                <span className="text-xs font-bold block text-text-primary">Support</span>
              </Link>
            </CardContent>
          </Card>

          {/* Reseller API Callout */}
          <Card className="bg-gradient-to-br from-indigo-950/40 via-surface to-surface border-primary/30">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-1">
                <Sparkles size={14} /> Reseller API v2
              </div>
              <h4 className="font-extrabold text-sm text-text-primary mb-1">
                Automate Your SMM Business
              </h4>
              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                Connect your existing panel, bot, or application via our standardized JSON API for instant fulfillment.
              </p>
              <Link to="/dashboard/api-docs" className="btn btn-secondary btn-sm w-full text-xs">
                View API Documentation
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
