import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSystem } from '../contexts/SystemContext';
import api from '../utils/api';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import LoadingSpinner from '../components/LoadingSpinner';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import {
  Users, DollarSign, Percent, Copy, Check, Share2,
  Gift, ArrowRight, ShieldCheck, Clock, ExternalLink, Sparkles
} from 'lucide-react';

export default function ReferralsPage() {
  const { user, showToast } = useAuth();
  const { formatPrice } = useSystem();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchReferrals();
  }, []);

  const fetchReferrals = async () => {
    try {
      setLoading(true);
      const res = await api.referrals.getDashboard();
      setData(res.data || res);
    } catch (err) {
      console.error('Failed to load referral data:', err);
      showToast(err.message || 'Failed to load referral program data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const referralUrl = data?.referral_url || `https://smmuper.com/register?ref=${user?.username || ''}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    showToast('Referral link copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) return <LoadingSpinner fullPage />;

  const stats = data?.stats || {
    referred_count: 0,
    total_earned: 0,
    commissions_count: 0
  };
  const commissionRate = data?.commission_rate || 5.0;
  const referredUsers = data?.referred_users || [];
  const recentCommissions = data?.recent_commissions || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="dashboard-page-header">
        <div>
          <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Referral Program' }]} />
          <h1 className="dashboard-page-title mt-1 flex items-center gap-2">
            <Gift size={24} className="text-primary" />
            <span>Referral <span className="gradient-text">Program</span></span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Invite colleagues, resellers, and agencies to earn {commissionRate}% lifetime commission credited straight to your balance.
          </p>
        </div>
      </div>

      {/* Hero Invite Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900/60 via-surface to-surface border border-primary/40 p-6 md:p-8 shadow-xl">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary border border-primary/30 text-xs font-bold mb-3">
            <Sparkles size={14} /> Instant Wallet Credits on Every Order
          </div>
          <h2 className="text-xl md:text-2xl font-black text-text-primary mb-2">
            Earn {commissionRate}% Lifetime Commission
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground mb-6 leading-relaxed">
            Every time someone registers using your exclusive link and completes an order, your wallet receives an immediate commission ledger credit. No limits, no holding periods.
          </p>

          {/* Referral Link Box */}
          <div className="flex flex-col sm:flex-row items-stretch gap-2 max-w-2xl bg-bg-surface-elevated p-2 rounded-xl border border-border-main shadow-inner">
            <div className="flex-1 flex items-center px-3 py-2 text-xs font-mono text-text-primary select-all overflow-x-auto truncate">
              {referralUrl}
            </div>
            <button
              onClick={handleCopyLink}
              className={`btn btn-sm flex items-center justify-center gap-2 px-5 py-2.5 font-bold transition-all shadow-md ${
                copied
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'btn-primary'
              }`}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? 'Copied Link' : 'Copy Link'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="hover:border-primary/40">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Total Referred Friends
              </div>
              <div className="text-2xl font-extrabold text-text-primary mt-1">
                {stats.referred_count}
              </div>
              <span className="text-[11px] text-muted-foreground">Registered via your code</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-500/15 text-indigo-500 flex items-center justify-center">
              <Users size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-emerald-400/40">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Total Earned
              </div>
              <div className="text-2xl font-extrabold text-emerald-400 mt-1">
                {formatPrice(stats.total_earned)}
              </div>
              <span className="text-[11px] text-muted-foreground">Credited directly to wallet</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
              <DollarSign size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-amber-400/40">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Commission Rate
              </div>
              <div className="text-2xl font-extrabold text-text-primary mt-1">
                {commissionRate}%
              </div>
              <span className="text-[11px] text-muted-foreground">Applied per order placement</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
              <Percent size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="saas-card p-5 border border-border-main bg-surface">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 font-extrabold text-xs flex items-center justify-center mb-3">
            01
          </div>
          <h4 className="font-extrabold text-sm text-text-primary mb-1">Share Your Link</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Send your unique referral link to buyers, friends, or share it across social media and digital marketing forums.
          </p>
        </div>

        <div className="saas-card p-5 border border-border-main bg-surface">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 font-extrabold text-xs flex items-center justify-center mb-3">
            02
          </div>
          <h4 className="font-extrabold text-sm text-text-primary mb-1">They Order Services</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            When users register through your link, they are permanently attached to your account as your referrals.
          </p>
        </div>

        <div className="saas-card p-5 border border-border-main bg-surface">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 font-extrabold text-xs flex items-center justify-center mb-3">
            03
          </div>
          <h4 className="font-extrabold text-sm text-text-primary mb-1">Get Paid Instantly</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            As soon as an order is processed, {commissionRate}% of the order charge is credited immediately to your balance.
          </p>
        </div>
      </div>

      {/* Tables: Referred Users & Recent Commissions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Referred Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Users size={16} className="text-primary" />
              <span>Referred Clients ({referredUsers.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {referredUsers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs">
                <Users size={32} className="mx-auto mb-2 opacity-30" />
                <p>No referrals registered yet.</p>
                <p className="text-[11px] mt-1">Share your link above to begin earning!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-bg-surface-elevated text-muted-foreground uppercase tracking-wider text-[10px] border-b border-border-main">
                    <tr>
                      <th className="px-4 py-3">Client</th>
                      <th className="px-4 py-3">Joined</th>
                      <th className="px-4 py-3">Orders</th>
                      <th className="px-4 py-3 text-right">Earned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {referredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-bg-surface-hover/50">
                        <td className="px-4 py-3 font-semibold text-text-primary">
                          {u.username}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-[11px]">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-text-primary font-mono font-bold">
                          {u.orders_count || 0}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-400 font-mono">
                          {formatPrice(u.earned_from_user || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Commission History */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <DollarSign size={16} className="text-emerald-400" />
              <span>Recent Commissions ({recentCommissions.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentCommissions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs">
                <DollarSign size={32} className="mx-auto mb-2 opacity-30" />
                <p>No commissions recorded yet.</p>
                <p className="text-[11px] mt-1">Commissions will appear here when your referrals place orders.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-bg-surface-elevated text-muted-foreground uppercase tracking-wider text-[10px] border-b border-border-main">
                    <tr>
                      <th className="px-4 py-3">Referral</th>
                      <th className="px-4 py-3">Order</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {recentCommissions.map((c) => (
                      <tr key={c.id} className="hover:bg-bg-surface-hover/50">
                        <td className="px-4 py-3 font-medium text-text-primary">
                          {c.referred_username || `User #${c.referred_user_id}`}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                          #{c.order_id || 'Direct'}
                        </td>
                        <td className="px-4 py-3 font-bold text-emerald-400 font-mono">
                          +{formatPrice(c.commission_amount)}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground text-[11px]">
                          {new Date(c.created_at).toLocaleDateString()}
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
    </div>
  );
}

