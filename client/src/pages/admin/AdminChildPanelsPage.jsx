import React, { useState, useEffect } from 'react';
import {
  Server, Globe, DollarSign, Clock, CheckCircle2, AlertCircle,
  Search, RefreshCw, Edit3, Trash2, ExternalLink, Settings,
  Check, X, Shield, Plus, Sparkles, Filter
} from 'lucide-react';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminChildPanelsPage({ defaultTab = 'all' }) {
  const { showToast } = useAuth();

  const [loading, setLoading] = useState(true);
  const [panels, setPanels] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    expired: 0,
    pending: 0,
    renew_requested: 0
  });

  const [settings, setSettings] = useState({
    monthly_price: 15.00,
    nameservers: 'ns1.smmuper.com, ns2.smmuper.com',
    is_enabled: true
  });

  const [activeTab, setActiveTab] = useState(defaultTab);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  // Modals
  const [editingPanel, setEditingPanel] = useState(null);
  const [deletingPanel, setDeletingPanel] = useState(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    monthly_price: 15.00,
    nameservers: '',
    is_enabled: true
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [dashRes, listRes] = await Promise.all([
        api.admin.getChildPanelsDashboard(),
        api.admin.getChildPanels(`status=${activeTab === 'all' ? '' : activeTab}&search=${search}&page=${page}`)
      ]);

      if (dashRes.stats) setStats(dashRes.stats);
      if (dashRes.settings) {
        setSettings(dashRes.settings);
        setSettingsForm(dashRes.settings);
      }

      setPanels(listRes.panels || []);
      setPagination(listRes.pagination || {});
    } catch (err) {
      showToast(err.message || 'Failed to load child panels', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await api.admin.updateChildPanelSettings(settingsForm);
      showToast('Child panel settings updated successfully', 'success');
      setIsSettingsModalOpen(false);
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to update settings', 'error');
    }
  };

  const handleUpdateStatus = async (panelId, newStatus) => {
    try {
      await api.admin.updateChildPanel(panelId, { status: newStatus });
      showToast(`Panel status changed to ${newStatus}`, 'success');
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to update panel', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deletingPanel) return;
    try {
      await api.admin.deleteChildPanel(deletingPanel.id);
      showToast('Child panel deleted successfully', 'success');
      setDeletingPanel(null);
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to delete panel', 'error');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Active</span>;
      case 'renew_requested':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20"><Clock className="w-3 h-3 mr-1" /> Renew Request</span>;
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20"><Clock className="w-3 h-3 mr-1" /> Pending</span>;
      case 'expired':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20"><AlertCircle className="w-3 h-3 mr-1" /> Expired</span>;
      case 'suspended':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20"><AlertCircle className="w-3 h-3 mr-1" /> Suspended</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Server className="w-7 h-7 text-indigo-400" />
            Child Panel Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Monitor client whitelabel deployments, configure DNS nameservers, and review renewal requests.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium border border-slate-700 transition-colors shadow-sm"
          >
            <Settings className="w-4 h-4 text-indigo-400" />
            Configure Pricing & DNS
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-400 font-medium">Total Panels</div>
          <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-400 font-medium">Running Panels</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{stats.active}</div>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-400 font-medium">Expired Panels</div>
          <div className="text-2xl font-bold text-rose-400 mt-1">{stats.expired}</div>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-400 font-medium">Purchase Requests</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{stats.pending}</div>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-400 font-medium">Renewal Requests</div>
          <div className="text-2xl font-bold text-indigo-400 mt-1">{stats.renew_requested}</div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800/80">
            {[
              { id: 'all', label: 'All Panels' },
              { id: 'active', label: 'Running' },
              { id: 'expired', label: 'Expired' },
              { id: 'pending', label: 'Purchase Requests' },
              { id: 'renew_requested', label: 'Renewals' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search domain, username, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-64"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-white font-medium border border-slate-700"
            >
              Search
            </button>
          </form>
        </div>

        {/* Panels Data Table */}
        {loading ? (
          <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
            Loading child panels...
          </div>
        ) : panels.length === 0 ? (
          <div className="py-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
            <Globe className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-400">No child panels found matching criteria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Domain</th>
                  <th className="pb-3 font-semibold">User</th>
                  <th className="pb-3 font-semibold">Admin Credentials</th>
                  <th className="pb-3 font-semibold">Monthly Rate</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Expires</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {panels.map((panel) => (
                  <tr key={panel.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3">
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        {panel.domain}
                        <a
                          href={`https://${panel.domain}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-400 hover:text-indigo-400"
                          title="Visit Domain"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      <div className="text-[11px] text-slate-500">ID #{panel.id}</div>
                    </td>
                    <td className="py-3">
                      <div className="text-xs font-medium text-white">{panel.username}</div>
                      <div className="text-[11px] text-slate-400">{panel.email}</div>
                    </td>
                    <td className="py-3 font-mono text-xs text-slate-300">
                      <div>User: {panel.admin_user}</div>
                      <div className="text-slate-500 text-[11px]">Pass: ••••••••</div>
                    </td>
                    <td className="py-3 text-xs font-semibold text-white">
                      ${panel.price || settings.monthly_price} {panel.currency || 'USD'}
                    </td>
                    <td className="py-3">
                      {getStatusBadge(panel.status)}
                    </td>
                    <td className="py-3 text-xs text-slate-300">
                      {panel.expires_at ? new Date(panel.expires_at).toLocaleDateString() : 'Lifetime'}
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {panel.status === 'pending' || panel.status === 'renew_requested' || panel.status === 'expired' ? (
                          <button
                            onClick={() => handleUpdateStatus(panel.id, 'active')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-medium border border-emerald-500/30"
                            title="Activate / Approve"
                          >
                            Approve
                          </button>
                        ) : null}

                        {panel.status === 'active' && (
                          <button
                            onClick={() => handleUpdateStatus(panel.id, 'suspended')}
                            className="px-2.5 py-1 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 text-xs font-medium border border-amber-500/30"
                            title="Suspend panel"
                          >
                            Suspend
                          </button>
                        )}

                        <button
                          onClick={() => setDeletingPanel(panel)}
                          className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Delete Panel"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-400" />
                Child Panel System Settings
              </h2>
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Monthly Subscription Price ($ USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={settingsForm.monthly_price}
                  onChange={(e) => setSettingsForm({ ...settingsForm, monthly_price: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Required DNS Nameservers (Comma-separated)
                </label>
                <input
                  type="text"
                  value={settingsForm.nameservers}
                  onChange={(e) => setSettingsForm({ ...settingsForm, nameservers: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1">Example: ns1.smmuper.com, ns2.smmuper.com</p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="text-xs font-medium text-white">Enable Child Panel Sales</div>
                  <div className="text-[11px] text-slate-400">Allow customers to order new child panels</div>
                </div>
                <input
                  type="checkbox"
                  checked={settingsForm.is_enabled}
                  onChange={(e) => setSettingsForm({ ...settingsForm, is_enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-800 bg-slate-950"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white shadow-lg shadow-indigo-600/20"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Delete Child Panel</h3>
            <p className="text-sm text-slate-300">
              Are you sure you want to delete the child panel for domain <span className="font-semibold text-rose-400">{deletingPanel.domain}</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setDeletingPanel(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-medium text-white shadow-lg shadow-rose-600/20"
              >
                Delete Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

