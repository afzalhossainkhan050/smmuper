import React, { useState, useEffect } from 'react';
import {
  Coins, Plus, Search, Edit3, Trash2, CheckCircle,
  Globe, AlertCircle, ArrowRightLeft, Star, X, Loader2
} from 'lucide-react';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { useSystem } from '../../contexts/SystemContext';

export default function AdminCurrenciesPage() {
  const { showToast } = useAuth();
  const { fetchSystemData } = useSystem();

  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState(null);
  const [deletingCurrency, setDeletingCurrency] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    symbol: '',
    exchange_rate: '1.0',
    status: 'active'
  });

  const loadCurrencies = async () => {
    try {
      setLoading(true);
      const res = await api.admin.getCurrencies();
      setCurrencies(res.data?.currencies || []);
    } catch (err) {
      showToast(err.message || 'Failed to load currencies', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurrencies();
  }, []);

  const openAddModal = () => {
    setFormData({
      name: '',
      code: '',
      symbol: '',
      exchange_rate: '1.0',
      status: 'active'
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (curr) => {
    setEditingCurrency(curr);
    setFormData({
      name: curr.name,
      code: curr.code,
      symbol: curr.symbol,
      exchange_rate: String(curr.exchange_rate),
      status: curr.status
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.code || !formData.symbol) {
      showToast('Please fill out all required fields', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        symbol: formData.symbol.trim(),
        exchange_rate: parseFloat(formData.exchange_rate) || 1.0,
        status: formData.status
      };

      if (editingCurrency) {
        await api.admin.updateCurrency(editingCurrency.id, payload);
        showToast('Currency updated successfully', 'success');
        setEditingCurrency(null);
      } else {
        await api.admin.createCurrency(payload);
        showToast('Currency added successfully', 'success');
        setIsAddModalOpen(false);
      }

      await loadCurrencies();
      if (fetchSystemData) fetchSystemData();
    } catch (err) {
      showToast(err.message || 'Error saving currency', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetDefault = async (curr) => {
    if (curr.is_default) return;
    try {
      await api.admin.setDefaultCurrency(curr.id);
      showToast(`Base default currency set to ${curr.code}`, 'success');
      await loadCurrencies();
      if (fetchSystemData) fetchSystemData();
    } catch (err) {
      showToast(err.message || 'Failed to set default currency', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deletingCurrency) return;
    try {
      setSubmitting(true);
      await api.admin.deleteCurrency(deletingCurrency.id);
      showToast(`Currency ${deletingCurrency.code} removed`, 'success');
      setDeletingCurrency(null);
      await loadCurrencies();
      if (fetchSystemData) fetchSystemData();
    } catch (err) {
      showToast(err.message || 'Failed to delete currency', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCurrencies = currencies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.symbol.includes(search)
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2.5">
            <Coins className="text-primary" size={24} />
            Currency Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure global exchange rates, automated conversion rates, and standard transaction currencies.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="saas-btn-primary flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus size={16} />
          Add Currency
        </button>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="saas-card flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <Globe size={22} />
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Currencies</div>
            <div className="text-2xl font-black text-text-primary mt-0.5">{currencies.length}</div>
          </div>
        </div>

        <div className="saas-card flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
            <Star size={22} />
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Base Currency</div>
            <div className="text-xl font-bold text-text-primary mt-0.5">
              {currencies.find(c => c.is_default)?.code || 'USD'} ({currencies.find(c => c.is_default)?.symbol || '$'})
            </div>
          </div>
        </div>

        <div className="saas-card flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
            <CheckCircle size={22} />
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Status</div>
            <div className="text-2xl font-black text-text-primary mt-0.5">
              {currencies.filter(c => c.status === 'active').length} Active
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="saas-card p-0 overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-border-main flex flex-col sm:flex-row gap-3 items-center justify-between bg-bg-surface-elevated">
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search code, name, or symbol..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="saas-input pl-9 w-full text-xs"
            />
          </div>
          <span className="text-xs text-muted-foreground self-end sm:self-center">
            Showing {filteredCurrencies.length} of {currencies.length} records
          </span>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="saas-table w-full">
            <thead>
              <tr>
                <th className="w-12 text-center">SL</th>
                <th>Currency Name</th>
                <th>Code</th>
                <th>Symbol</th>
                <th>Exchange Rate</th>
                <th>Type</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-muted-foreground">
                    <Loader2 className="animate-spin inline-block mr-2" size={20} />
                    Loading currencies...
                  </td>
                </tr>
              ) : filteredCurrencies.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-muted-foreground">
                    No currencies found matching your search.
                  </td>
                </tr>
              ) : (
                filteredCurrencies.map((c, index) => (
                  <tr key={c.id}>
                    <td className="text-center font-mono text-xs text-muted-foreground">{index + 1}</td>
                    <td className="font-semibold text-text-primary">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          {c.symbol}
                        </span>
                        <span>{c.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="font-mono font-bold px-2 py-0.5 rounded bg-bg-surface-subtle border border-border-subtle text-xs">
                        {c.code}
                      </span>
                    </td>
                    <td className="font-bold text-base">{c.symbol}</td>
                    <td className="font-mono text-xs font-semibold">
                      1 USD = {Number(c.exchange_rate).toFixed(4)} {c.code}
                    </td>
                    <td>
                      {c.is_default ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          <Star size={11} fill="currentColor" /> Base Default
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetDefault(c)}
                          title="Click to set as Base Default"
                          className="text-[11px] text-muted-foreground hover:text-primary underline cursor-pointer"
                        >
                          Make Base
                        </button>
                      )}
                    </td>
                    <td>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          c.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${c.status === 'active' ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                        {c.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => openEditModal(c)}
                          className="p-1.5 rounded-md hover:bg-bg-surface-hover text-muted-foreground hover:text-text-primary transition-colors"
                          title="Edit Currency"
                        >
                          <Edit3 size={15} />
                        </button>
                        {!c.is_default && (
                          <button
                            onClick={() => setDeletingCurrency(c)}
                            className="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                            title="Delete Currency"
                          >
                            <Trash2 size={15} />
                          </button>
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

      {/* Create / Edit Currency Modal */}
      {(isAddModalOpen || editingCurrency) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="saas-card w-full max-w-md bg-surface p-6 shadow-2xl border border-border-main rounded-xl">
            <div className="flex items-center justify-between pb-4 border-b border-border-main">
              <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <Coins size={18} className="text-primary" />
                {editingCurrency ? 'Edit Currency' : 'Add New Currency'}
              </h2>
              <button
                onClick={() => { setIsAddModalOpen(false); setEditingCurrency(null); }}
                className="text-muted-foreground hover:text-text-primary p-1 rounded-md"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 pt-4">
              <div>
                <label className="saas-label">Currency Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bangladeshi Taka, Euro, US Dollar"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="saas-input w-full text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="saas-label">Currency Code *</label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    placeholder="e.g. BDT, EUR"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="saas-input w-full uppercase font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="saas-label">Symbol *</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    placeholder="e.g. ৳, €, $"
                    value={formData.symbol}
                    onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                    className="saas-input w-full font-bold text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="saas-label">Exchange Rate (per 1 USD) *</label>
                <input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  required
                  placeholder="e.g. 118.50"
                  value={formData.exchange_rate}
                  onChange={(e) => setFormData({ ...formData, exchange_rate: e.target.value })}
                  className="saas-input w-full font-mono text-xs"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  1 USD will convert to this amount in customer wallets.
                </p>
              </div>

              <div>
                <label className="saas-label">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="saas-input w-full text-xs"
                >
                  <option value="active">Active (Available across checkout & selector)</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border-main">
                <button
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); setEditingCurrency(null); }}
                  className="saas-btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="saas-btn-primary text-xs flex items-center gap-1.5"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  {editingCurrency ? 'Update Currency' : 'Create Currency'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingCurrency && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="saas-card w-full max-w-sm bg-surface p-6 shadow-2xl border border-red-500/20 rounded-xl">
            <div className="flex items-center gap-3 text-red-500 pb-3 border-b border-border-main">
              <AlertCircle size={22} />
              <h2 className="text-base font-bold text-text-primary">Delete Currency</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Are you sure you want to delete <strong className="text-text-primary">{deletingCurrency.name} ({deletingCurrency.code})</strong>?
              This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-4 mt-2">
              <button
                type="button"
                onClick={() => setDeletingCurrency(null)}
                className="saas-btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="saas-btn-danger text-xs flex items-center gap-1.5"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

