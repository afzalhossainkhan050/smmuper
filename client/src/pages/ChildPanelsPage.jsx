import React, { useState, useEffect } from 'react';
import {
  Globe, Server, CheckCircle2, AlertCircle, Clock, Shield,
  RefreshCw, Copy, Check, ExternalLink, ArrowRight, DollarSign,
  Lock, User, Sparkles, Layers
} from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

export default function ChildPanelsPage() {
  const { user, refreshUser, showToast } = useAuth();

  const [panels, setPanels] = useState([]);
  const [monthlyPrice, setMonthlyPrice] = useState(15.00);
  const [nameservers, setNameservers] = useState(['ns1.smmuper.com', 'ns2.smmuper.com']);
  const [isEnabled, setIsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [renewingId, setRenewingId] = useState(null);
  const [copiedNs, setCopiedNs] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    domain: '',
    admin_user: '',
    admin_password: '',
    currency: 'USD'
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.childPanels.getPanels();
      setPanels(res.panels || []);
      if (res.monthly_price !== undefined) setMonthlyPrice(res.monthly_price);
      if (res.nameservers) setNameservers(res.nameservers);
      if (res.is_enabled !== undefined) setIsEnabled(res.is_enabled);
    } catch (err) {
      showToast(err.message || 'Failed to load child panels', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopy = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedNs(idx);
    setTimeout(() => setCopiedNs(null), 2000);
    showToast(`Copied ${text} to clipboard`, 'success');
  };

  const handleOrder = async (e) => {
    e.preventDefault();
    if (!formData.domain.trim()) {
      showToast('Please enter your domain name', 'error');
      return;
    }
    if (!formData.admin_user.trim()) {
      showToast('Please enter an admin username', 'error');
      return;
    }
    if (!formData.admin_password || formData.admin_password.length < 6) {
      showToast('Admin password must be at least 6 characters', 'error');
      return;
    }

    if ((user?.balance || 0) < monthlyPrice) {
      showToast(`Insufficient balance. Child panel requires $${monthlyPrice.toFixed(2)}. Please add funds to your wallet.`, 'error');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.childPanels.order(formData);
      showToast(res.message || 'Child panel ordered successfully!', 'success');
      setFormData({
        domain: '',
        admin_user: '',
        admin_password: '',
        currency: 'USD'
      });
      await loadData();
      if (refreshUser) refreshUser();
    } catch (err) {
      showToast(err.message || 'Failed to order child panel', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRenew = async (panelId) => {
    if ((user?.balance || 0) < monthlyPrice) {
      showToast(`Insufficient balance. Renewal requires $${monthlyPrice.toFixed(2)}. Please add funds.`, 'error');
      return;
    }

    try {
      setRenewingId(panelId);
      const res = await api.childPanels.renew(panelId);
      showToast(res.message || 'Child panel renewed for 30 days!', 'success');
      await loadData();
      if (refreshUser) refreshUser();
    } catch (err) {
      showToast(err.message || 'Renewal failed', 'error');
    } finally {
      setRenewingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Active</span>;
      case 'renew_requested':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20"><Clock className="w-3 h-3 mr-1" /> Renewal Pending</span>;
      case 'expired':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20"><AlertCircle className="w-3 h-3 mr-1" /> Expired</span>;
      case 'suspended':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20"><AlertCircle className="w-3 h-3 mr-1" /> Suspended</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20"><Clock className="w-3 h-3 mr-1" /> {status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Layers className="w-7 h-7 text-indigo-400" />
            Whitelabel Child Panels
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Launch and sell under your own branded domain powered directly by SMMuper's high-speed wholesale API engine.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2.5 shadow-sm">
          <DollarSign className="w-5 h-5 text-emerald-400" />
          <div>
            <div className="text-xs text-slate-400">Monthly License</div>
            <div className="text-base font-bold text-emerald-400">${monthlyPrice.toFixed(2)} / month</div>
          </div>
        </div>
      </div>

      {/* DNS Configuration Alert Card */}
      <div className="bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-900 border border-indigo-500/30 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
              <Server className="w-4 h-4" />
              Required Nameserver Configuration
            </div>
            <p className="text-xs text-slate-300">
              Before purchasing, configure your domain registrar's NS records to point to SMMuper's authoritative cloud:
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {nameservers.map((ns, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleCopy(ns, idx)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-indigo-500/30 text-indigo-200 text-xs font-mono hover:bg-slate-800 transition-colors"
                title="Click to copy nameserver"
              >
                <span>{ns}</span>
                {copiedNs === idx ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Purchase Form + Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Form (1 Col) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-400" />
            Order New Child Panel
          </h2>

          <form onSubmit={handleOrder} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Domain Name <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. smm.youragency.com"
                  value={formData.domain}
                  onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Do not include http:// or https://</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Admin Username <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. admin"
                  value={formData.admin_user}
                  onChange={(e) => setFormData({ ...formData, admin_user: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Admin Password <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="password"
                  placeholder="Min 6 characters"
                  value={formData.admin_password}
                  onChange={(e) => setFormData({ ...formData, admin_password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Default Currency
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="USD">USD ($ - United States Dollar)</option>
                <option value="BDT">BDT (৳ - Bangladeshi Taka)</option>
                <option value="EUR">EUR (€ - Euro)</option>
              </select>
            </div>

            {/* Pricing Summary */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Setup Duration:</span>
                <span className="text-white font-medium">30 Days</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Your Wallet Balance:</span>
                <span className={`font-semibold ${(user?.balance || 0) >= monthlyPrice ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ${(user?.balance || 0).toFixed(2)}
                </span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between text-sm font-bold">
                <span className="text-white">Total Charge:</span>
                <span className="text-indigo-400">${monthlyPrice.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !isEnabled}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium py-3 rounded-xl shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-all text-sm"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Setting up Panel...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Order Child Panel (${monthlyPrice.toFixed(2)})
                </>
              )}
            </button>
          </form>
        </div>

        {/* Existing Child Panels Table (2 Cols) */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Server className="w-5 h-5 text-indigo-400" />
                My Active Child Panels ({panels.length})
              </h2>
              <button
                onClick={loadData}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="py-16 text-center text-slate-500 flex flex-col items-center justify-center">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
                Loading your child panels...
              </div>
            ) : panels.length === 0 ? (
              <div className="py-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl p-8">
                <Globe className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-base font-medium text-slate-400">No child panels yet</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Launch your very own branded SMM panel. Connect your custom domain and start selling automatically.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 font-semibold">Domain</th>
                      <th className="pb-3 font-semibold">Admin</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold">Expires</th>
                      <th className="pb-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {panels.map((panel) => {
                      const isExpired = panel.status === 'expired' || (panel.expires_at && new Date(panel.expires_at) < new Date());
                      return (
                        <tr key={panel.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3.5">
                            <div className="font-semibold text-white flex items-center gap-1.5">
                              {panel.domain}
                              <a
                                href={`https://${panel.domain}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-slate-400 hover:text-indigo-400"
                                title="Visit Panel"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                            <div className="text-[11px] text-slate-500">${panel.price || monthlyPrice}/mo</div>
                          </td>
                          <td className="py-3.5 text-slate-300 font-mono text-xs">
                            {panel.admin_user}
                          </td>
                          <td className="py-3.5">
                            {getStatusBadge(panel.status)}
                          </td>
                          <td className="py-3.5 text-xs text-slate-300">
                            {panel.expires_at ? (
                              <div>
                                <div>{new Date(panel.expires_at).toLocaleDateString()}</div>
                                <div className="text-[10px] text-slate-500">
                                  {isExpired ? 'Expired' : `${Math.ceil((new Date(panel.expires_at) - new Date()) / (1000 * 60 * 60 * 24))} days left`}
                                </div>
                              </div>
                            ) : (
                              'Lifetime'
                            )}
                          </td>
                          <td className="py-3.5 text-right">
                            <button
                              onClick={() => handleRenew(panel.id)}
                              disabled={renewingId === panel.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-medium transition-all"
                            >
                              <RefreshCw className={`w-3 h-3 ${renewingId === panel.id ? 'animate-spin' : ''}`} />
                              Renew (${monthlyPrice.toFixed(2)})
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Whitelabel Benefits Feature Highlights */}
          <div className="mt-6 pt-6 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <span>Free SSL Certificate included</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <span>Full wholesale API sync</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Custom domain branding</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

