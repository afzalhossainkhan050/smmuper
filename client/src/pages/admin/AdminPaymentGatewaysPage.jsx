import React, { useState, useEffect } from 'react';
import {
  CreditCard, Plus, Search, Edit3, Trash2, CheckCircle2,
  AlertCircle, ArrowLeft, Loader2, Power, Settings2, Shield,
  DollarSign, RefreshCw, Key, HelpCircle, Eye, EyeOff, Smartphone, Coins, Building2
} from 'lucide-react';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminPaymentGatewaysPage() {
  const { showToast } = useAuth();

  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('automatic'); // 'automatic' | 'manual'
  const [search, setSearch] = useState('');

  // Modals
  const [editingMethod, setEditingMethod] = useState(null);
  const [isCreatingManual, setIsCreatingManual] = useState(false);
  const [deletingMethod, setDeletingMethod] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'manual',
    currency: 'USD',
    exchange_rate: 1.0,
    min_amount: 1.0,
    max_amount: 1000.0,
    percentage_charge: 0.0,
    fixed_charge: 0.0,
    instructions: '',
    parameters: {
      mode: 'sandbox',
      public_key: '',
      secret_key: '',
      merchant_account: '',
      require_trx_id: true,
      require_sender_account: true,
      require_proof_slip: false
    },
    status: 1
  });

  const fetchMethods = async () => {
    try {
      setLoading(true);
      const res = await api.admin.getPaymentMethods();
      setMethods(res.methods || res || []);
    } catch (err) {
      showToast(err.message || 'Failed to fetch payment gateways', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMethods();
  }, []);

  const handleToggleStatus = async (method) => {
    try {
      await api.admin.togglePaymentMethod(method.id);
      showToast(`${method.name} status updated successfully`);
      fetchMethods();
    } catch (err) {
      showToast(err.message || 'Failed to toggle status', 'error');
    }
  };

  const handleOpenEdit = (method) => {
    let params = {};
    try {
      params = typeof method.parameters === 'string' ? JSON.parse(method.parameters || '{}') : (method.parameters || {});
    } catch (e) {
      params = {};
    }
    setFormData({
      name: method.name || '',
      code: method.code || '',
      type: method.type || 'manual',
      currency: method.currency || 'USD',
      exchange_rate: parseFloat(method.exchange_rate) || 1.0,
      min_amount: parseFloat(method.min_amount) || 1.0,
      max_amount: parseFloat(method.max_amount) || 1000.0,
      percentage_charge: parseFloat(method.percentage_charge) || 0.0,
      fixed_charge: parseFloat(method.fixed_charge) || 0.0,
      instructions: method.instructions || '',
      parameters: {
        mode: params.mode || 'sandbox',
        public_key: params.public_key || '',
        secret_key: params.secret_key || '',
        merchant_account: params.merchant_account || '',
        require_trx_id: params.require_trx_id !== false,
        require_sender_account: params.require_sender_account !== false,
        require_proof_slip: !!params.require_proof_slip
      },
      status: method.status !== undefined ? method.status : 1
    });
    setEditingMethod(method);
    setIsCreatingManual(false);
  };

  const handleOpenCreateManual = () => {
    setFormData({
      name: '',
      code: '',
      type: 'manual',
      currency: 'BDT',
      exchange_rate: 120.0,
      min_amount: 5.0,
      max_amount: 500.0,
      percentage_charge: 1.85,
      fixed_charge: 0.0,
      instructions: '1. Send Money to our official personal wallet number: 01888-123456\n2. Put your SMMuper username in reference\n3. Copy the TrxID and enter below.',
      parameters: {
        merchant_account: '01888-123456',
        require_trx_id: true,
        require_sender_account: true,
        require_proof_slip: false
      },
      status: 1
    });
    setEditingMethod(null);
    setIsCreatingManual(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Gateway name is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim() || formData.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        type: formData.type,
        currency: formData.currency.toUpperCase().trim(),
        exchange_rate: parseFloat(formData.exchange_rate) || 1.0,
        min_amount: parseFloat(formData.min_amount) || 0,
        max_amount: parseFloat(formData.max_amount) || 0,
        percentage_charge: parseFloat(formData.percentage_charge) || 0,
        fixed_charge: parseFloat(formData.fixed_charge) || 0,
        instructions: formData.instructions || '',
        parameters: formData.parameters,
        status: formData.status ? 1 : 0
      };

      if (editingMethod) {
        await api.admin.updatePaymentMethod(editingMethod.id, payload);
        showToast('Payment gateway updated successfully');
      } else {
        await api.admin.createPaymentMethod(payload);
        showToast('Manual payment gateway created successfully');
      }

      setEditingMethod(null);
      setIsCreatingManual(false);
      fetchMethods();
    } catch (err) {
      showToast(err.message || 'Failed to save gateway', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingMethod) return;
    try {
      await api.admin.deletePaymentMethod(deletingMethod.id);
      showToast('Gateway deleted successfully');
      setDeletingMethod(null);
      fetchMethods();
    } catch (err) {
      showToast(err.message || 'Failed to delete gateway', 'error');
    }
  };

  // Filter methods by tab and search
  const filteredMethods = methods.filter(m => {
    const matchesTab = m.type === activeTab;
    const matchesSearch = !search ||
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.code.toLowerCase().includes(search.toLowerCase()) ||
      (m.currency && m.currency.toLowerCase().includes(search.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  const autoCount = methods.filter(m => m.type === 'automatic').length;
  const manualCount = methods.filter(m => m.type === 'manual').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <span>Dashboard</span>
            <span>/</span>
            <span>Payment Setting</span>
            <span>/</span>
            <span className="text-primary-600 font-medium">Payment Methods</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <CreditCard className="w-7 h-7 text-primary-500" />
            Payment Methods
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure automatic payment processors and local manual payment deposit gateways
          </p>
        </div>

        {activeTab === 'manual' && (
          <button
            onClick={handleOpenCreateManual}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-lg shadow-primary-500/20 font-medium text-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Manual Gateway
          </button>
        )}
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('automatic')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'automatic'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Automatic Gateway
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === 'automatic' ? 'bg-primary-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {autoCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'manual'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            Manual Gateway
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === 'manual' ? 'bg-primary-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
            }`}>
              {manualCount}
            </span>
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search gateways..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-200"
          />
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary-500" />
          <p className="text-sm">Loading payment gateways...</p>
        </div>
      ) : filteredMethods.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8">
          <CreditCard className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No {activeTab} gateways found</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            {activeTab === 'manual'
              ? 'Click "Add Manual Gateway" above to configure your first manual payment method like bKash, Nagad or Bank Transfer.'
              : 'No automatic payment gateways match your search.'}
          </p>
        </div>
      ) : activeTab === 'automatic' ? (
        /* Automatic Gateways Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMethods.map((m) => {
            let params = {};
            try {
              params = typeof m.parameters === 'string' ? JSON.parse(m.parameters || '{}') : (m.parameters || {});
            } catch (e) {
              params = {};
            }
            const isLive = params.mode === 'live';

            return (
              <div
                key={m.id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-950/40 border border-primary-100 dark:border-primary-900 flex items-center justify-center text-primary-600 font-bold text-lg">
                        {m.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-base">{m.name}</h3>
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide ${
                          isLive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                        }`}>
                          {isLive ? 'LIVE' : 'SANDBOX'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleStatus(m)}
                      title={m.status ? 'Deactivate gateway' : 'Activate gateway'}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        m.status ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          m.status ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="space-y-2.5 py-3 border-y border-slate-100 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Currency</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-100">{m.currency || 'USD'} (1 USD = {m.exchange_rate} {m.currency})</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Deposit Limits</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-100">${parseFloat(m.min_amount || 0).toFixed(2)} - ${parseFloat(m.max_amount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Fee / Charge</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-100">
                        {parseFloat(m.fixed_charge) > 0 ? `$${parseFloat(m.fixed_charge).toFixed(2)} + ` : ''}
                        {parseFloat(m.percentage_charge || 0)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <span className={`text-xs font-medium flex items-center gap-1.5 ${m.status ? 'text-emerald-600' : 'text-slate-400'}`}>
                    <span className={`w-2 h-2 rounded-full ${m.status ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    {m.status ? 'Active Gateway' : 'Inactive'}
                  </span>
                  <button
                    onClick={() => handleOpenEdit(m)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 dark:bg-primary-950/40 dark:hover:bg-primary-900/60 rounded-lg transition-all"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    Configure
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Manual Gateways Table */
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3.5 px-4">Gateway</th>
                  <th className="py-3.5 px-4">Currency & Rate</th>
                  <th className="py-3.5 px-4">Limits (Min - Max)</th>
                  <th className="py-3.5 px-4">Charge / Fee</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredMethods.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                    <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-950/40 border border-primary-100 dark:border-primary-900 flex items-center justify-center text-primary-600 font-bold text-sm">
                          {m.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">{m.name}</div>
                          <div className="text-xs text-slate-400">{m.code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{m.currency}</span>
                      <div className="text-xs text-slate-400">1 USD = {m.exchange_rate} {m.currency}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-800 dark:text-slate-200 font-medium">
                        ${parseFloat(m.min_amount || 0).toFixed(2)} - ${parseFloat(m.max_amount || 0).toFixed(2)}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                        {parseFloat(m.fixed_charge) > 0 ? `$${parseFloat(m.fixed_charge).toFixed(2)} + ` : ''}
                        {parseFloat(m.percentage_charge || 0)}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(m)}
                        title={m.status ? 'Deactivate gateway' : 'Activate gateway'}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          m.status ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            m.status ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(m)}
                          className="p-1.5 text-primary-600 hover:text-primary-700 hover:bg-primary-50 dark:hover:bg-primary-950/50 rounded-lg transition-all"
                          title="Edit Gateway"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingMethod(m)}
                          className="p-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-all"
                          title="Delete Gateway"
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
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {(editingMethod || isCreatingManual) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-2xl w-full p-6 sm:p-8 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary-500" />
                {editingMethod ? `Configure ${editingMethod.name}` : 'Create Manual Gateway'}
              </h2>
              <button
                onClick={() => { setEditingMethod(null); setIsCreatingManual(false); }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5 mt-6">
              {/* Row 1: Name & Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Gateway Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. bKash Personal or Stripe"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Gateway Code (Identifier)
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g. bkash_manual"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* Row 2: Currency & Exchange Rate */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Currency Code (e.g. BDT, USD, USDT) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                    placeholder="USD"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Exchange Rate (1 USD = ? {formData.currency || 'USD'})
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.exchange_rate}
                    onChange={(e) => setFormData({ ...formData, exchange_rate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* Row 3: Min & Max Deposit Limits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Min Deposit Amount ($ USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.min_amount}
                    onChange={(e) => setFormData({ ...formData, min_amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Max Deposit Amount ($ USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.max_amount}
                    onChange={(e) => setFormData({ ...formData, max_amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* Row 4: Charges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Percentage Charge (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.percentage_charge}
                    onChange={(e) => setFormData({ ...formData, percentage_charge: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Fixed Charge ($ USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.fixed_charge}
                    onChange={(e) => setFormData({ ...formData, fixed_charge: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              {/* Manual Gateway Specifics: Account & Instructions */}
              {formData.type === 'manual' ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Recipient / Merchant Account Number
                    </label>
                    <input
                      type="text"
                      value={formData.parameters.merchant_account || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        parameters: { ...formData.parameters, merchant_account: e.target.value }
                      })}
                      placeholder="e.g. 01888-123456 (bKash) or USDT Address"
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Deposit Instructions for Customer
                    </label>
                    <textarea
                      rows={4}
                      value={formData.instructions}
                      onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                      placeholder="Provide step-by-step instructions on how the user sends funds..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">
                      Required Proof Information from User
                    </span>
                    <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.parameters.require_trx_id}
                          onChange={(e) => setFormData({
                            ...formData,
                            parameters: { ...formData.parameters, require_trx_id: e.target.checked }
                          })}
                          className="rounded text-primary-600 focus:ring-primary-500"
                        />
                        Transaction ID (TrxID)
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.parameters.require_sender_account}
                          onChange={(e) => setFormData({
                            ...formData,
                            parameters: { ...formData.parameters, require_sender_account: e.target.checked }
                          })}
                          className="rounded text-primary-600 focus:ring-primary-500"
                        />
                        Sender Phone / Account Number
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.parameters.require_proof_slip}
                          onChange={(e) => setFormData({
                            ...formData,
                            parameters: { ...formData.parameters, require_proof_slip: e.target.checked }
                          })}
                          className="rounded text-primary-600 focus:ring-primary-500"
                        />
                        Payment Slip / Screenshot URL
                      </label>
                    </div>
                  </div>
                </>
              ) : (
                /* Automatic Gateway Credentials */
                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase">
                      API Credentials & Keys
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Mode:</span>
                      <button
                        type="button"
                        onClick={() => setFormData({
                          ...formData,
                          parameters: {
                            ...formData.parameters,
                            mode: formData.parameters.mode === 'live' ? 'sandbox' : 'live'
                          }
                        })}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          formData.parameters.mode === 'live'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-amber-500 text-white'
                        }`}
                      >
                        {formData.parameters.mode === 'live' ? 'PRODUCTION (LIVE)' : 'TEST (SANDBOX)'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                      Public Key / Client ID / API Key
                    </label>
                    <input
                      type="text"
                      value={formData.parameters.public_key || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        parameters: { ...formData.parameters, public_key: e.target.value }
                      })}
                      placeholder="pk_live_..."
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        Secret Key / Private Token
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowSecrets(!showSecrets)}
                        className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                      >
                        {showSecrets ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {showSecrets ? 'Hide' : 'Reveal'}
                      </button>
                    </div>
                    <input
                      type={showSecrets ? 'text' : 'password'}
                      value={formData.parameters.secret_key || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        parameters: { ...formData.parameters, secret_key: e.target.value }
                      })}
                      placeholder="sk_live_..."
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>
              )}

              {/* Status Toggle */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Gateway Status</span>
                  <p className="text-xs text-slate-400">Enable or disable this payment method for customer deposit</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, status: formData.status ? 0 : 1 })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.status ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.status ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => { setEditingMethod(null); setIsCreatingManual(false); }}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-medium text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-lg shadow-primary-500/20 font-semibold text-sm transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Save Gateway
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingMethod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl max-w-md w-full p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Delete Payment Gateway?</h3>
            <p className="text-sm text-slate-500 mb-6">
              Are you sure you want to delete <span className="font-semibold text-slate-800 dark:text-slate-200">{deletingMethod.name}</span>? Customers will no longer be able to deposit funds using this gateway.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setDeletingMethod(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-medium shadow-md shadow-rose-500/20"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

