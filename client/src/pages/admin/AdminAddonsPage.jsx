import React, { useState, useEffect } from 'react';
import {
  Puzzle, CheckCircle2, AlertCircle, RefreshCw,
  Server, Globe, Cpu, CreditCard, ShieldCheck, Loader2
} from 'lucide-react';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminAddonsPage() {
  const { showToast } = useAuth();
  const [addons, setAddons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);

  const loadAddons = async () => {
    try {
      setLoading(true);
      const res = await api.admin.getAddons();
      setAddons(res.data?.addons || []);
    } catch (err) {
      showToast(err.message || 'Failed to load addons', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAddons();
  }, []);

  const handleToggle = async (addon) => {
    try {
      setTogglingId(addon.id);
      const res = await api.admin.toggleAddon(addon.id);
      showToast(res.message || `Addon '${addon.name}' toggled`, 'success');
      setAddons(prev => prev.map(a =>
        a.id === addon.id ? { ...a, status: res.data?.status || (a.status === 'active' ? 'inactive' : 'active') } : a
      ));
    } catch (err) {
      showToast(err.message || 'Failed to toggle addon status', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const getAddonIcon = (code) => {
    switch (code) {
      case 'child_panels': return Server;
      case 'multi_currency': return Globe;
      case 'api_sync': return Cpu;
      case 'payment_ipn': return CreditCard;
      case 'kyc_engine': return ShieldCheck;
      default: return Puzzle;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-primary mr-2" size={24} />
        <span className="text-sm font-semibold text-muted-foreground">Loading system addons...</span>
      </div>
    );
  }

  const activeCount = addons.filter(a => a.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2.5">
            <Puzzle className="text-primary" size={24} />
            Addon Manager
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Turnkey modular extensions for SMM reseller scaling, child panels, and payment webhooks.
          </p>
        </div>
        <button
          onClick={loadAddons}
          className="saas-btn-secondary flex items-center gap-2 text-xs self-start sm:self-auto"
        >
          <RefreshCw size={14} />
          Refresh Addons
        </button>
      </div>

      {/* Overview Banner */}
      <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="text-sm font-bold text-text-primary">Installed Modular Extensions</div>
            <div className="text-xs text-muted-foreground">
              {activeCount} of {addons.length} active modules enabled on SMMuper core engine.
            </div>
          </div>
        </div>
      </div>

      {/* Addons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {addons.map((addon) => {
          const Icon = getAddonIcon(addon.code);
          const isActive = addon.status === 'active';
          const isToggling = togglingId === addon.id;

          return (
            <div
              key={addon.id}
              className={`saas-card flex flex-col justify-between transition-all duration-200 ${
                isActive ? 'border-primary/30 shadow-sm' : 'opacity-80 border-border-main'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-border-subtle">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${isActive ? 'bg-primary/10 text-primary' : 'bg-zinc-800 text-zinc-400'}`}>
                      <Icon size={22} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-text-primary leading-tight">{addon.name}</h3>
                      <span className="text-[10px] font-mono text-muted-foreground">v{addon.version}</span>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20'
                    }`}
                  >
                    {isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                  {addon.description || 'Turnkey extension module configured for SMMuper automated operations.'}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-border-subtle flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">
                  Status: <strong className={isActive ? 'text-emerald-500' : 'text-zinc-500'}>{isActive ? 'Enabled' : 'Disabled'}</strong>
                </span>

                <button
                  type="button"
                  disabled={isToggling}
                  onClick={() => handleToggle(addon)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isActive ? 'bg-primary' : 'bg-zinc-600'
                  } ${isToggling ? 'opacity-50 cursor-wait' : ''}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

