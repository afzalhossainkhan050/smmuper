import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSystem } from '../../contexts/SystemContext';
import api from '../../utils/api';
import Breadcrumbs from '../../components/ui/Breadcrumbs';
import LoadingSpinner from '../../components/LoadingSpinner';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import {
  Gift, Users, DollarSign, Percent, Settings, Search,
  CheckCircle2, AlertCircle, Save, ArrowRight, ShieldCheck,
  TrendingUp, Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminReferralsPage() {
  const { showToast } = useAuth();
  const { formatPrice } = useSystem();

  const [commissions, setCommissions] = useState([]);
  const [stats, setStats] = useState({
    total_commissions_paid: 0,
    total_commissions_count: 0,
    total_active_referrers: 0
  });
  const [settings, setSettings] = useState({
    referral_commission_rate: 5.0,
    referral_system_enabled: true
  });
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });

  const loadReferralData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', '25');
      if (search.trim()) {
        params.append('search', search.trim());
      }

      const res = await api.admin.getReferrals(params.toString());
      setCommissions(res.data?.commissions || res.commissions || []);
      setStats(res.data?.stats || res.stats || {
        total_commissions_paid: 0,
        total_commissions_count: 0,
        total_active_referrers: 0
      });
      if (res.data?.settings) {
        setSettings(res.data.settings);
      }
      if (res.data?.pagination) {
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to load referral data:', err);
      showToast(err.message || 'Failed to load referral program data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReferralData();
  }, [page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadReferralData();
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await api.admin.updateReferralSettings({
        referral_commission_rate: parseFloat(settings.referral_commission_rate),
        referral_system_enabled: settings.referral_system_enabled
      });
      showToast('Referral program settings updated successfully!', 'success');
      loadReferralData();
    } catch (err) {
      showToast(err.message || 'Failed to update referral settings', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="dashboard-page-header">
        <div>
          <Breadcrumbs
            items={[
              { label: 'Admin', href: '/admin' },
              { label: 'Commission Setting', href: '/admin/referrals' },
              { label: 'Referral' }
            ]}
          />
          <h1 className="dashboard-page-title mt-1 flex items-center gap-2">
            <Gift size={24} className="text-primary" />
            <span>Referral Commission <span className="gradient-text">Management</span></span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure global customer referral commission percentages and inspect all commission ledger payouts.
          </p>
        </div>
      </div>

      {/* Settings Card & Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Referral System Settings */}
        <Card className="lg:col-span-1 border-primary/30">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Settings size={16} className="text-primary" />
              <span>Program Configuration</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="form-group mb-0">
                <label className="form-label text-xs">Referral System Status</label>
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={settings.referral_system_enabled}
                      onChange={(e) => setSettings({ ...settings, referral_system_enabled: e.target.checked })}
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                  <span className="text-xs font-bold text-text-primary">
                    {settings.referral_system_enabled ? 'Active / Enabled' : 'Disabled / Suspended'}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 block">
                  When enabled, referrers receive commission immediately on completed customer orders.
                </span>
              </div>

              <div className="form-group mb-0">
                <label className="form-label text-xs">Commission Rate (%)</label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    required
                    className="form-control text-xs pr-8 font-mono font-bold"
                    value={settings.referral_commission_rate}
                    onChange={(e) => setSettings({ ...settings, referral_commission_rate: e.target.value })}
                  />
                  <Percent size={14} className="absolute right-3 text-muted-foreground pointer-events-none" />
                </div>
                <span className="text-[10px] text-muted-foreground mt-1 block">
                  Percentage of order charge credited to the referrer's wallet.
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="btn btn-primary btn-sm w-full flex items-center justify-center gap-2 font-bold"
                >
                  <Save size={14} />
                  <span>{savingSettings ? 'Saving Settings...' : 'Save Configuration'}</span>
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Global Statistics Cards */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="hover:border-emerald-400/40">
            <CardContent className="p-5 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Total Commissions Paid
                </span>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                  <DollarSign size={20} />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-emerald-400 font-mono">
                  {formatPrice(stats.total_commissions_paid)}
                </div>
                <span className="text-[11px] text-muted-foreground">Credited directly to user wallets</span>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-cyan-400/40">
            <CardContent className="p-5 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Total Transactions
                </span>
                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
                  <TrendingUp size={20} />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-text-primary font-mono">
                  {stats.total_commissions_count}
                </div>
                <span className="text-[11px] text-muted-foreground">Order commission events</span>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-indigo-400/40">
            <CardContent className="p-5 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Active Referrers
                </span>
                <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
                  <Users size={20} />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-extrabold text-text-primary font-mono">
                  {stats.total_active_referrers}
                </div>
                <span className="text-[11px] text-muted-foreground">Users who earned commissions</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Commissions History Table Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Clock size={16} className="text-primary" />
            <span>Referral Commission History ({pagination.total || commissions.length})</span>
          </CardTitle>

          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search user / order ID..."
                className="form-control text-xs py-1.5 pl-8 pr-3 sm:w-56"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
            <button type="submit" className="btn btn-secondary btn-sm py-1.5 px-3 text-xs">
              Search
            </button>
          </form>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">
              <LoadingSpinner />
            </div>
          ) : commissions.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-xs space-y-2">
              <Gift size={36} className="mx-auto opacity-30 text-primary" />
              <p className="font-semibold">No commission records found.</p>
              <p className="text-[11px]">When users registered under referral links place orders, commissions appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-bg-surface-elevated text-muted-foreground uppercase tracking-wider text-[10px] border-b border-border-main">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Referrer</th>
                    <th className="px-4 py-3">Referred User</th>
                    <th className="px-4 py-3">Order ID</th>
                    <th className="px-4 py-3">Commission</th>
                    <th className="px-4 py-3">Rate</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Date & Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {commissions.map((c) => (
                    <tr key={c.id} className="hover:bg-bg-surface-hover/50">
                      <td className="px-4 py-3 font-mono font-bold text-text-primary">
                        #{c.id}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/admin/users?search=${encodeURIComponent(c.referrer_username)}`}
                          className="font-semibold text-text-primary hover:text-primary transition-colors block"
                        >
                          {c.referrer_username}
                        </Link>
                        <span className="text-[10px] text-muted-foreground">
                          {c.referrer_email}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          to={`/admin/users?search=${encodeURIComponent(c.referred_username)}`}
                          className="font-semibold text-text-primary hover:text-primary transition-colors block"
                        >
                          {c.referred_username}
                        </Link>
                        <span className="text-[10px] text-muted-foreground">
                          {c.referred_email}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-text-primary font-bold">
                        <Link
                          to={`/admin/orders?search=${c.order_id}`}
                          className="hover:text-primary hover:underline"
                        >
                          #{c.order_id}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-400 font-mono text-xs">
                        +{formatPrice(c.commission_amount)}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                        {c.commission_rate}%
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                          Credited
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground text-[11px]">
                        {new Date(c.created_at).toLocaleString()}
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
  );
}

