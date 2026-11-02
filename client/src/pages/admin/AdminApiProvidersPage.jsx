import React, { useState, useEffect } from 'react';
import {
  Server, Plus, Search, Edit3, Trash2, CheckCircle2,
  AlertCircle, RefreshCw, Eye, EyeOff, Copy, Check,
  ExternalLink, ArrowLeft, Loader2, Coins, ArrowRightLeft,
  FileText, Download, Sliders, ChevronDown, Activity, Globe, X
} from 'lucide-react';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { useSystem } from '../../contexts/SystemContext';

export default function AdminApiProvidersPage() {
  const { showToast } = useAuth();
  const { currentCurrency, formatPrice } = useSystem();

  const [providers, setProviders] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // View Mode: 'list' | 'create' | 'edit'
  const [viewMode, setViewMode] = useState('list');
  const [editingProvider, setEditingProvider] = useState(null);
  const [deletingProvider, setDeletingProvider] = useState(null);
  const [actionDropdownId, setActionDropdownId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State (Matches Screenshot 2: Edit API Provider)
  const [formData, setFormData] = useState({
    name: '',
    api_url: '',
    api_key: '',
    currency: 'USD',
    conversion_rate: '1.0',
    status: 'active',
    description: ''
  });
  const [showKeyInForm, setShowKeyInForm] = useState(false);

  // Modals
  const [copiedKeyId, setCopiedKeyId] = useState(null);
  const [testingId, setTestingId] = useState(null);
  const [refreshingBalanceId, setRefreshingBalanceId] = useState(null);

  // Import Services Modal State
  const [importingProvider, setImportingProvider] = useState(null);
  const [remoteServices, setRemoteServices] = useState([]);
  const [loadingRemote, setLoadingRemote] = useState(false);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [importMarkup, setImportMarkup] = useState('30');
  const [autoCategories, setAutoCategories] = useState(true);
  const [importingInProgress, setImportingInProgress] = useState(false);
  const [remoteSearch, setRemoteSearch] = useState('');

  // Sync Services Modal State
  const [syncingProvider, setSyncingProvider] = useState(null);
  const [syncMarkup, setSyncMarkup] = useState('30');
  const [syncInProgress, setSyncInProgress] = useState(false);

  // Provider Logs Modal State
  const [viewingLogsProvider, setViewingLogsProvider] = useState(null);
  const [providerLogs, setProviderLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const loadProviders = async () => {
    try {
      setLoading(true);
      const res = await api.admin.getProviders();
      setProviders(res.data?.providers || []);
      setStats(res.data?.stats || { total: 0, active: 0, inactive: 0 });
    } catch (err) {
      showToast(err.message || 'Failed to load providers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();
  }, []);

  // Close action dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.action-dropdown-container')) {
        setActionDropdownId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      api_url: '',
      api_key: '',
      currency: 'USD',
      conversion_rate: '1.0',
      status: 'active',
      description: ''
    });
    setEditingProvider(null);
    setShowKeyInForm(false);
    setViewMode('create');
  };

  const handleOpenEdit = (prov) => {
    setEditingProvider(prov);
    setFormData({
      name: prov.name,
      api_url: prov.api_url,
      api_key: prov.masked_key || '••••••••••••••••',
      currency: prov.currency || 'USD',
      conversion_rate: String(prov.conversion_rate || '1.0'),
      status: prov.status,
      description: prov.description || ''
    });
    setShowKeyInForm(false);
    setViewMode('edit');
    setActionDropdownId(null);
  };

  const handleSaveProvider = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.api_url.trim()) {
      showToast('Provider name and API URL are required', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: formData.name.trim(),
        api_url: formData.api_url.trim(),
        api_key: formData.api_key.trim(),
        currency: formData.currency.trim().toUpperCase(),
        conversion_rate: parseFloat(formData.conversion_rate) || 1.0,
        status: formData.status,
        description: formData.description.trim()
      };

      if (editingProvider) {
        await api.admin.updateProvider(editingProvider.id, payload);
        showToast(`Provider '${payload.name}' updated successfully`, 'success');
      } else {
        await api.admin.createProvider(payload);
        showToast(`Provider '${payload.name}' added successfully`, 'success');
      }

      setViewMode('list');
      await loadProviders();
    } catch (err) {
      showToast(err.message || 'Failed to save provider', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProvider = async () => {
    if (!deletingProvider) return;
    try {
      setSaving(true);
      await api.admin.deleteProvider(deletingProvider.id);
      showToast(`Provider '${deletingProvider.name}' deleted`, 'success');
      setDeletingProvider(null);
      await loadProviders();
    } catch (err) {
      showToast(err.message || 'Failed to delete provider', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (prov) => {
    try {
      const nextStatus = prov.status === 'active' ? 'inactive' : 'active';
      await api.admin.updateProvider(prov.id, { status: nextStatus });
      showToast(`Provider status marked as ${nextStatus}`, 'success');
      setActionDropdownId(null);
      await loadProviders();
    } catch (err) {
      showToast(err.message || 'Failed to toggle status', 'error');
    }
  };

  const handleTestConnection = async (prov) => {
    try {
      setTestingId(prov.id);
      const res = await api.admin.testProviderConnection(prov.id);
      showToast(res.message || `Connection to ${prov.name} successful!`, 'success');
      await loadProviders();
    } catch (err) {
      showToast(err.message || `Connection failed to ${prov.name}`, 'error');
    } finally {
      setTestingId(null);
      setActionDropdownId(null);
    }
  };

  const handleCheckBalance = async (prov) => {
    try {
      setRefreshingBalanceId(prov.id);
      const res = await api.admin.checkProviderBalance(prov.id);
      showToast(`Balance updated: ${res.data?.balance} ${res.data?.currency}`, 'success');
      await loadProviders();
    } catch (err) {
      showToast(err.message || 'Failed to check balance', 'error');
    } finally {
      setRefreshingBalanceId(null);
      setActionDropdownId(null);
    }
  };

  const handleCopyKey = (prov) => {
    if (prov.api_key) {
      navigator.clipboard.writeText(prov.api_key);
      setCopiedKeyId(prov.id);
      setTimeout(() => setCopiedKeyId(null), 2000);
      showToast('API Key copied to clipboard', 'info');
    }
  };

  // ──────────────── IMPORT SERVICES WORKFLOW ────────────────
  const handleOpenImportModal = async (prov) => {
    setImportingProvider(prov);
    setSelectedServiceIds([]);
    setRemoteSearch('');
    setActionDropdownId(null);
    try {
      setLoadingRemote(true);
      const res = await api.admin.getProviderRemoteServices(prov.id);
      setRemoteServices(res.data?.services || []);
    } catch (err) {
      showToast(err.message || 'Failed to fetch services from provider', 'error');
      setRemoteServices([]);
    } finally {
      setLoadingRemote(false);
    }
  };

  const handleToggleSelectAllServices = () => {
    if (selectedServiceIds.length === filteredRemoteServices.length) {
      setSelectedServiceIds([]);
    } else {
      setSelectedServiceIds(filteredRemoteServices.map(s => Number(s.service)));
    }
  };

  const handleToggleServiceSelect = (serviceId) => {
    const id = Number(serviceId);
    setSelectedServiceIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleExecuteImport = async () => {
    if (!importingProvider) return;
    try {
      setImportingInProgress(true);
      const res = await api.admin.importProviderServices(importingProvider.id, {
        serviceIds: selectedServiceIds,
        markupPercent: parseFloat(importMarkup) || 30,
        autoCreateCategories: autoCategories
      });
      showToast(res.message || 'Services imported successfully', 'success');
      setImportingProvider(null);
      await loadProviders();
    } catch (err) {
      showToast(err.message || 'Import failed', 'error');
    } finally {
      setImportingInProgress(false);
    }
  };

  // ──────────────── SYNC SERVICES WORKFLOW ────────────────
  const handleExecuteSync = async () => {
    if (!syncingProvider) return;
    try {
      setSyncInProgress(true);
      const res = await api.admin.syncProviderServices(syncingProvider.id, {
        markupPercent: parseFloat(syncMarkup) || 30
      });
      showToast(res.message || 'Service synchronization completed', 'success');
      setSyncingProvider(null);
      await loadProviders();
    } catch (err) {
      showToast(err.message || 'Synchronization failed', 'error');
    } finally {
      setSyncInProgress(false);
    }
  };

  // ──────────────── VIEW LOGS WORKFLOW ────────────────
  const handleOpenLogsModal = async (prov) => {
    setViewingLogsProvider(prov);
    setActionDropdownId(null);
    try {
      setLoadingLogs(true);
      const res = await api.admin.getProviderLogs(prov.id);
      setProviderLogs(res.data?.logs || []);
    } catch (err) {
      showToast(err.message || 'Failed to load provider logs', 'error');
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleClearLogs = async () => {
    if (!viewingLogsProvider) return;
    try {
      await api.admin.clearProviderLogs(viewingLogsProvider.id);
      showToast('Logs cleared', 'success');
      setProviderLogs([]);
    } catch (err) {
      showToast(err.message || 'Failed to clear logs', 'error');
    }
  };

  const filteredProviders = providers.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.api_url.toLowerCase().includes(search.toLowerCase()) ||
      (p.currency && p.currency.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredRemoteServices = remoteServices.filter(s =>
    s.name.toLowerCase().includes(remoteSearch.toLowerCase()) ||
    s.category.toLowerCase().includes(remoteSearch.toLowerCase()) ||
    String(s.service).includes(remoteSearch)
  );

  // ──────────────── VIEW: CREATE / EDIT API PROVIDER (Matches Screenshot 2) ────────────────
  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <div className="space-y-6 animate-in fade-in duration-150">
        {/* Breadcrumb Navigation (Matching Screenshot 2) */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Dashboard</span>
            <span>/</span>
            <button onClick={() => setViewMode('list')} className="hover:text-primary hover:underline">
              Api Providers
            </button>
            <span>/</span>
            <span className="text-text-primary font-bold">
              {viewMode === 'create' ? 'Add Api Provider' : 'Edit Api Provider'}
            </span>
          </div>
          <button
            onClick={() => setViewMode('list')}
            className="saas-btn-secondary text-xs flex items-center gap-1.5"
          >
            <ArrowLeft size={14} />
            Back to Providers
          </button>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          {viewMode === 'create' ? 'Add API Provider' : 'Edit Api Provider'}
        </h1>

        <div className="saas-card space-y-6 max-w-4xl">
          <div className="border-b border-border-main pb-3">
            <h2 className="text-base font-bold text-text-primary">
              {viewMode === 'create' ? 'Add New API Provider' : 'Edit API Provider'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Connect external SMM wholesale panels via Standard v2 API endpoints.
            </p>
          </div>

          <form onSubmit={handleSaveProvider} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="saas-label">API Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. vipsmmpro"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="saas-input w-full text-xs font-semibold"
                />
              </div>

              <div>
                <label className="saas-label">URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://vipsmmpro.com/api/v2"
                  value={formData.api_url}
                  onChange={(e) => setFormData({ ...formData, api_url: e.target.value })}
                  className="saas-input w-full text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="saas-label">API Key *</label>
                <div className="relative">
                  <input
                    type={showKeyInForm ? 'text' : 'password'}
                    required
                    placeholder="Enter or paste provider API secret key"
                    value={formData.api_key}
                    onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                    className="saas-input w-full text-xs font-mono pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeyInForm(!showKeyInForm)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-text-primary"
                  >
                    {showKeyInForm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {viewMode === 'edit' && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Leave as masked dots to keep the existing stored key unchanged.
                  </p>
                )}
              </div>

              {/* Conversion Rate matching Screenshot 2 */}
              <div>
                <label className="saas-label">Conversion Rate</label>
                <div className="flex items-center rounded-lg border border-border-main bg-bg-surface-elevated overflow-hidden">
                  <span className="px-3 py-2 text-xs font-bold text-muted-foreground bg-bg-surface-subtle border-r border-border-main">
                    1 {formData.currency || 'USD'}
                  </span>
                  <input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    required
                    value={formData.conversion_rate}
                    onChange={(e) => setFormData({ ...formData, conversion_rate: e.target.value })}
                    className="saas-input border-0 rounded-none w-full text-xs font-mono focus:ring-0"
                    placeholder="83.95"
                  />
                  <span className="px-3 py-2 text-xs text-muted-foreground bg-bg-surface-subtle border-l border-border-main whitespace-nowrap">
                    Base Currency: USD
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Exchange rate between provider's currency and platform base currency.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="saas-label">Provider Native Currency</label>
                <input
                  type="text"
                  maxLength={5}
                  placeholder="e.g. INR, USD, EUR"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                  className="saas-input w-full uppercase font-mono text-xs"
                />
              </div>

              <div>
                <label className="saas-label">Description / Internal Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Primary wholesale provider for Asian Instagram followers."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="saas-input w-full text-xs"
                />
              </div>
            </div>

            {/* Status Switch (Matching Screenshot 2) */}
            <div className="p-4 rounded-xl border border-border-main bg-bg-surface-elevated space-y-2">
              <div className="font-bold text-xs text-text-primary">Status</div>
              <div className="text-xs text-muted-foreground">
                The API provider has been enabled for the order.
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setFormData({
                    ...formData,
                    status: formData.status === 'active' ? 'inactive' : 'active'
                  })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.status === 'active' ? 'bg-primary' : 'bg-zinc-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.status === 'active' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-border-main flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="saas-btn-primary flex items-center gap-2 text-xs"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                Save changes
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="saas-btn-secondary text-xs"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ──────────────── VIEW: API PROVIDERS LIST (Matches Screenshot 1) ────────────────
  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation (Matching Screenshot 1) */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Dashboard</span>
        <span>/</span>
        <span className="text-text-primary font-bold">API Providers</span>
      </div>

      {/* Page Title & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2.5">
            <Server className="text-primary" size={24} />
            API Providers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Centralized wholesale SMM API integration engine, service auto-synchronization, and order routing.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="saas-btn-primary flex items-center gap-2 self-start sm:self-auto text-xs"
        >
          <Plus size={16} />
          + Add Provider
        </button>
      </div>

      {/* Top 3 Stat Cards (Matching Screenshot 1: Total, Active, Inactive) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="saas-card text-center py-6">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            TOTAL API PROVIDER
          </div>
          <div className="text-4xl font-black text-text-primary mt-2">
            {stats.total}
          </div>
        </div>

        <div className="saas-card text-center py-6">
          <div className="text-xs font-bold text-emerald-500 uppercase tracking-wider flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            ACTIVE API PROVIDER
          </div>
          <div className="text-4xl font-black text-emerald-500 mt-2">
            {stats.active}
          </div>
        </div>

        <div className="saas-card text-center py-6">
          <div className="text-xs font-bold text-red-500 uppercase tracking-wider flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            INACTIVE API PROVIDER
          </div>
          <div className="text-4xl font-black text-red-500 mt-2">
            {stats.inactive}
          </div>
        </div>
      </div>

      {/* Main Table Card (Matching Screenshot 1) */}
      <div className="saas-card p-0 overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-border-main flex flex-col sm:flex-row gap-3 items-center justify-between bg-bg-surface-elevated">
          <div>
            <h2 className="text-sm font-bold text-text-primary">API Providers</h2>
            <p className="text-xs text-muted-foreground">
              API Providers are services or platforms that offer Application Programming Interfaces.
            </p>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search provider name or URL..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="saas-input pl-9 w-full text-xs"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="saas-input text-xs"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Responsive Table Matching Screenshot 1 */}
        <div className="overflow-x-auto">
          <table className="saas-table w-full">
            <thead>
              <tr>
                <th className="w-12 text-center">SL</th>
                <th>NAME</th>
                <th>API KEY</th>
                <th>BALANCE</th>
                <th>STATUS</th>
                <th className="text-right">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-muted-foreground">
                    <Loader2 className="animate-spin inline-block mr-2" size={20} />
                    Loading API providers...
                  </td>
                </tr>
              ) : filteredProviders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-muted-foreground">
                    No API providers found. Click "+ Add Provider" to configure your first connection.
                  </td>
                </tr>
              ) : (
                filteredProviders.map((prov, index) => (
                  <tr key={prov.id} className="hover:bg-bg-surface-hover transition-colors">
                    <td className="text-center font-mono text-xs text-muted-foreground">{index + 1}</td>
                    <td>
                      <div>
                        <span className="font-bold text-xs text-text-primary hover:text-primary transition-colors cursor-pointer" onClick={() => handleOpenEdit(prov)}>
                          {prov.name}
                        </span>
                        <div className="text-[11px] font-mono text-muted-foreground truncate max-w-xs mt-0.5">
                          {prov.api_url}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          Mapped Services: <strong className="text-primary">{prov.mapped_services_count || 0}</strong>
                          {prov.last_synced_at && ` • Synced: ${new Date(prov.last_synced_at).toLocaleDateString()}`}
                        </div>
                      </div>
                    </td>

                    {/* Masked API Key (Matching Screenshot 1) */}
                    <td>
                      <div className="inline-flex items-center gap-2 bg-bg-surface-subtle px-3 py-1 rounded border border-border-subtle">
                        <span className="font-mono text-xs text-muted-foreground">
                          {prov.masked_key || '••••••••••••••••'}
                        </span>
                        <button
                          onClick={() => handleCopyKey(prov)}
                          title="Copy Full API Key"
                          className="text-muted-foreground hover:text-text-primary transition-colors"
                        >
                          {copiedKeyId === prov.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </td>

                    {/* Balance with Currency (Matching Screenshot 1: 0 INR, 0 USD) */}
                    <td className="font-semibold text-xs text-text-primary">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold">
                          {Number(prov.balance || 0).toLocaleString()} {prov.currency || 'USD'}
                        </span>
                        <button
                          onClick={() => handleCheckBalance(prov)}
                          disabled={refreshingBalanceId === prov.id}
                          className="p-1 text-muted-foreground hover:text-primary rounded"
                          title="Refresh Live Balance"
                        >
                          <RefreshCw size={12} className={refreshingBalanceId === prov.id ? 'animate-spin text-primary' : ''} />
                        </button>
                      </div>
                      {prov.conversion_rate && prov.conversion_rate !== 1 && (
                        <div className="text-[10px] text-muted-foreground font-mono">
                          Rate: {prov.conversion_rate} / USD
                        </div>
                      )}
                    </td>

                    {/* Status Badge (Green dot + Active / Red dot + Inactive) */}
                    <td>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          prov.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${prov.status === 'active' ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                        {prov.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Action Dropdown Matching Screenshot 1 */}
                    <td className="text-right">
                      <div className="relative inline-block text-left action-dropdown-container">
                        <div className="inline-flex rounded-md shadow-sm">
                          <button
                            onClick={() => handleOpenEdit(prov)}
                            className="saas-btn-secondary text-xs px-2.5 py-1 rounded-r-none flex items-center gap-1"
                          >
                            <Edit3 size={13} />
                            Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionDropdownId(actionDropdownId === prov.id ? null : prov.id);
                            }}
                            className="saas-btn-secondary text-xs px-1.5 py-1 rounded-l-none border-l-0"
                          >
                            <ChevronDown size={14} />
                          </button>
                        </div>

                        {/* Dropdown Menu Items Matching Screenshot 1 */}
                        {actionDropdownId === prov.id && (
                          <div className="absolute right-0 mt-1 w-52 saas-card bg-surface shadow-2xl z-50 p-1.5 border border-border-main animate-in fade-in zoom-in-95 duration-100 text-left">
                            <button
                              onClick={() => handleToggleStatus(prov)}
                              className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-bg-surface-hover rounded flex items-center gap-2"
                            >
                              <CheckCircle2 size={13} className="text-muted-foreground" />
                              <span>{prov.status === 'active' ? 'Mark As Deactivate' : 'Mark As Active'}</span>
                            </button>

                            <button
                              onClick={() => handleTestConnection(prov)}
                              disabled={testingId === prov.id}
                              className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-bg-surface-hover rounded flex items-center gap-2"
                            >
                              <Activity size={13} className="text-primary" />
                              <span>{testingId === prov.id ? 'Testing Connection...' : 'Test Connection'}</span>
                            </button>

                            <button
                              onClick={() => handleCheckBalance(prov)}
                              className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-bg-surface-hover rounded flex items-center gap-2"
                            >
                              <Coins size={13} className="text-amber-500" />
                              <span>Update Provider Balance</span>
                            </button>

                            <button
                              onClick={() => handleOpenImportModal(prov)}
                              className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-bg-surface-hover rounded flex items-center gap-2"
                            >
                              <Download size={13} className="text-cyan-400" />
                              <span>Import Services</span>
                            </button>

                            <button
                              onClick={() => {
                                setSyncingProvider(prov);
                                setActionDropdownId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-bg-surface-hover rounded flex items-center gap-2"
                            >
                              <ArrowRightLeft size={13} className="text-emerald-500" />
                              <span>Sync Prices & Limits</span>
                            </button>

                            <button
                              onClick={() => handleOpenLogsModal(prov)}
                              className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-bg-surface-hover rounded flex items-center gap-2"
                            >
                              <FileText size={13} className="text-muted-foreground" />
                              <span>View Provider Logs</span>
                            </button>

                            <div className="my-1 border-t border-border-subtle" />

                            <button
                              onClick={() => {
                                setDeletingProvider(prov);
                                setActionDropdownId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-500/10 rounded flex items-center gap-2"
                            >
                              <Trash2 size={13} />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ──────────────── MODAL: IMPORT SERVICES ──────────────── */}
      {importingProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="saas-card w-full max-w-4xl bg-surface p-6 shadow-2xl border border-border-main rounded-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-border-main">
              <div>
                <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                  <Download className="text-primary" size={18} />
                  Import Services: {importingProvider.name}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Fetch live services catalog via Standard v2 API and assign to customer pricing.
                </p>
              </div>
              <button
                onClick={() => setImportingProvider(null)}
                className="text-muted-foreground hover:text-text-primary p-1 rounded-md"
              >
                <X size={18} />
              </button>
            </div>

            {/* Import Controls Header */}
            <div className="py-4 border-b border-border-main grid grid-cols-1 sm:grid-cols-3 gap-4 bg-bg-surface-elevated p-4 rounded-xl my-3">
              <div>
                <label className="saas-label">Profit Markup Margin (%)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={importMarkup}
                    onChange={(e) => setImportMarkup(e.target.value)}
                    className="saas-input w-28 text-xs font-bold"
                  />
                  <span className="text-xs text-muted-foreground">% profit added to cost</span>
                </div>
              </div>

              <div>
                <label className="saas-label">Category Assignment</label>
                <label className="flex items-center gap-2 text-xs text-text-primary cursor-pointer mt-2">
                  <input
                    type="checkbox"
                    checked={autoCategories}
                    onChange={(e) => setAutoCategories(e.target.checked)}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>Auto-create categories if missing</span>
                </label>
              </div>

              <div className="flex items-end justify-end">
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={importingInProgress || loadingRemote || (selectedServiceIds.length === 0 && remoteServices.length === 0)}
                  className="saas-btn-primary text-xs flex items-center gap-1.5 w-full sm:w-auto justify-center"
                >
                  {importingInProgress && <Loader2 size={14} className="animate-spin" />}
                  Import {selectedServiceIds.length > 0 ? `${selectedServiceIds.length} Selected` : `All (${remoteServices.length})`}
                </button>
              </div>
            </div>

            {/* Remote Services Filter */}
            <div className="flex items-center justify-between pb-3">
              <div className="relative w-72">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Filter remote services..."
                  value={remoteSearch}
                  onChange={(e) => setRemoteSearch(e.target.value)}
                  className="saas-input pl-8 w-full text-xs"
                />
              </div>

              <div className="text-xs text-muted-foreground">
                <button
                  type="button"
                  onClick={handleToggleSelectAllServices}
                  className="text-primary hover:underline font-bold mr-2"
                >
                  {selectedServiceIds.length === filteredRemoteServices.length ? 'Deselect All' : 'Select All'}
                </button>
                <span>({selectedServiceIds.length} selected of {filteredRemoteServices.length})</span>
              </div>
            </div>

            {/* Remote Services Table */}
            <div className="flex-1 overflow-y-auto border border-border-main rounded-lg">
              <table className="saas-table w-full">
                <thead className="sticky top-0 bg-bg-surface-elevated z-10">
                  <tr>
                    <th className="w-10 text-center">
                      <input
                        type="checkbox"
                        checked={filteredRemoteServices.length > 0 && selectedServiceIds.length === filteredRemoteServices.length}
                        onChange={handleToggleSelectAllServices}
                      />
                    </th>
                    <th>ID</th>
                    <th>Service Name</th>
                    <th>Category</th>
                    <th>Wholesale Rate</th>
                    <th>Selling Rate (+{importMarkup}%)</th>
                    <th>Min / Max</th>
                    <th>Features</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingRemote ? (
                    <tr>
                      <td colSpan="8" className="text-center py-16 text-muted-foreground">
                        <Loader2 className="animate-spin inline-block mr-2" size={22} />
                        Querying provider remote services catalog...
                      </td>
                    </tr>
                  ) : filteredRemoteServices.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-10 text-muted-foreground">
                        No services returned from provider.
                      </td>
                    </tr>
                  ) : (
                    filteredRemoteServices.map((s) => {
                      const isSelected = selectedServiceIds.includes(Number(s.service));
                      const convRate = parseFloat(importingProvider.conversion_rate || 1.0);
                      const costUsd = s.rate / convRate;
                      const sellingRate = costUsd * (1 + (parseFloat(importMarkup) || 30) / 100);

                      return (
                        <tr key={s.service} className={isSelected ? 'bg-primary/5' : ''}>
                          <td className="text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleServiceSelect(s.service)}
                            />
                          </td>
                          <td className="font-mono text-xs font-bold text-muted-foreground">{s.service}</td>
                          <td className="text-xs font-semibold text-text-primary max-w-xs">{s.name}</td>
                          <td className="text-xs text-muted-foreground">{s.category}</td>
                          <td className="text-xs font-mono">
                            {s.rate} {importingProvider.currency || 'USD'}
                          </td>
                          <td className="text-xs font-mono font-bold text-emerald-500">
                            ${sellingRate.toFixed(4)}
                          </td>
                          <td className="text-xs font-mono text-muted-foreground">
                            {s.min} - {s.max}
                          </td>
                          <td>
                            <div className="flex items-center gap-1 text-[10px]">
                              {s.refill && <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold">Refill</span>}
                              {s.cancel && <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-bold">Cancel</span>}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-4 mt-3 border-t border-border-main flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Total Remote Services Found: <strong>{remoteServices.length}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setImportingProvider(null)}
                  className="saas-btn-secondary text-xs"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={importingInProgress || loadingRemote}
                  className="saas-btn-primary text-xs flex items-center gap-1.5"
                >
                  {importingInProgress && <Loader2 size={14} className="animate-spin" />}
                  Import Selected
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── MODAL: SYNC SERVICES ──────────────── */}
      {syncingProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="saas-card w-full max-w-md bg-surface p-6 shadow-2xl border border-border-main rounded-xl">
            <div className="flex items-center justify-between pb-3 border-b border-border-main">
              <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                <ArrowRightLeft className="text-emerald-500" size={18} />
                Synchronize: {syncingProvider.name}
              </h2>
              <button
                onClick={() => setSyncingProvider(null)}
                className="text-muted-foreground hover:text-text-primary p-1 rounded-md"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 pt-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                This process will query <strong className="text-text-primary">{syncingProvider.name}</strong> to:
              </p>
              <ul className="text-xs text-muted-foreground space-y-1.5 pl-4 list-disc">
                <li>Update cost prices and recalculate customer rates using target profit margin.</li>
                <li>Sync minimum and maximum order limits.</li>
                <li>Disable services that have been removed or deactivated by the wholesale provider.</li>
              </ul>

              <div>
                <label className="saas-label">Target Profit Margin (%)</label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={syncMarkup}
                  onChange={(e) => setSyncMarkup(e.target.value)}
                  className="saas-input w-full text-xs font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border-main">
                <button
                  type="button"
                  onClick={() => setSyncingProvider(null)}
                  className="saas-btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteSync}
                  disabled={syncInProgress}
                  className="saas-btn-primary text-xs flex items-center gap-1.5"
                >
                  {syncInProgress && <Loader2 size={14} className="animate-spin" />}
                  Execute Sync
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── MODAL: PROVIDER LOGS ──────────────── */}
      {viewingLogsProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="saas-card w-full max-w-4xl bg-surface p-6 shadow-2xl border border-border-main rounded-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-border-main">
              <div>
                <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                  <FileText className="text-primary" size={18} />
                  Provider Logs: {viewingLogsProvider.name}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Secure API request and response payload audit trail.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearLogs}
                  className="saas-btn-danger text-xs px-2.5 py-1"
                >
                  Clear Logs
                </button>
                <button
                  onClick={() => setViewingLogsProvider(null)}
                  className="text-muted-foreground hover:text-text-primary p-1 rounded-md"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto mt-3 border border-border-main rounded-lg">
              <table className="saas-table w-full">
                <thead className="sticky top-0 bg-bg-surface-elevated z-10">
                  <tr>
                    <th className="w-12 text-center">SL</th>
                    <th>Action</th>
                    <th>Status</th>
                    <th>Request Payload (Sanitized)</th>
                    <th>Response Data</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingLogs ? (
                    <tr>
                      <td colSpan="6" className="text-center py-12 text-muted-foreground">
                        <Loader2 className="animate-spin inline-block mr-2" size={20} />
                        Loading provider audit logs...
                      </td>
                    </tr>
                  ) : providerLogs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-10 text-muted-foreground">
                        No provider logs recorded yet.
                      </td>
                    </tr>
                  ) : (
                    providerLogs.map((log, i) => (
                      <tr key={log.id}>
                        <td className="text-center font-mono text-xs text-muted-foreground">{i + 1}</td>
                        <td className="font-mono text-xs font-bold text-primary">{log.action}</td>
                        <td>
                          <span
                            className={`font-mono text-[11px] px-2 py-0.5 rounded font-bold ${
                              log.status_code >= 200 && log.status_code < 300
                                ? 'bg-emerald-500/10 text-emerald-500'
                                : 'bg-red-500/10 text-red-500'
                            }`}
                          >
                            HTTP {log.status_code}
                          </span>
                        </td>
                        <td className="max-w-xs font-mono text-[11px] text-muted-foreground truncate" title={log.request_data}>
                          {log.request_data}
                        </td>
                        <td className="max-w-xs font-mono text-[11px] text-text-primary truncate" title={log.response_data}>
                          {log.response_data}
                        </td>
                        <td className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-border-main flex justify-end">
              <button
                type="button"
                onClick={() => setViewingLogsProvider(null)}
                className="saas-btn-secondary text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── DELETE CONFIRMATION MODAL ──────────────── */}
      {deletingProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="saas-card w-full max-w-sm bg-surface p-6 shadow-2xl border border-red-500/20 rounded-xl">
            <div className="flex items-center gap-3 text-red-500 pb-3 border-b border-border-main">
              <AlertCircle size={22} />
              <h2 className="text-base font-bold text-text-primary">Delete API Provider</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Are you sure you want to delete <strong className="text-text-primary">"{deletingProvider.name}"</strong>?
              Existing services mapped to this provider will be safely unlinked.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-4 mt-2">
              <button
                type="button"
                onClick={() => setDeletingProvider(null)}
                className="saas-btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProvider}
                disabled={saving}
                className="saas-btn-danger text-xs flex items-center gap-1.5"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

