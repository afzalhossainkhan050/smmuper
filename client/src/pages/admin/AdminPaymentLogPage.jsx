import React, { useState, useEffect } from 'react';
import {
  CreditCard, Search, CheckCircle2, XCircle, Clock, FileText,
  Loader2, RefreshCw, DollarSign, Download, Printer, Copy, Check,
  ExternalLink, User, ArrowUpRight, Filter
} from 'lucide-react';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminPaymentLogPage() {
  const { showToast } = useAuth();

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'completed' | 'pending' | 'rejected'
  const [search, setSearch] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [copiedTrx, setCopiedTrx] = useState(false);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await api.admin.getPayments();
      setPayments(res.payments || res || []);
    } catch (err) {
      showToast(err.message || 'Failed to fetch payments', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleCopyTrx = (trx) => {
    if (!trx) return;
    navigator.clipboard.writeText(trx);
    setCopiedTrx(true);
    setTimeout(() => setCopiedTrx(false), 2000);
  };

  // Filter payments
  const filteredPayments = payments.filter(p => {
    const matchesTab = activeTab === 'all' || p.status === activeTab;
    const matchesSearch = !search ||
      (p.transaction_id && p.transaction_id.toLowerCase().includes(search.toLowerCase())) ||
      (p.username && p.username.toLowerCase().includes(search.toLowerCase())) ||
      (p.email && p.email.toLowerCase().includes(search.toLowerCase())) ||
      (p.method && p.method.toLowerCase().includes(search.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  const completedPayments = payments.filter(p => p.status === 'completed');
  const totalCompletedVolume = completedPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  const totalFees = payments.reduce((sum, p) => sum + (parseFloat(p.charge) || 0), 0);
  const pendingCount = payments.filter(p => p.status === 'pending').length;
  const completedCount = completedPayments.length;
  const rejectedCount = payments.filter(p => p.status === 'rejected').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <span>Dashboard</span>
            <span>/</span>
            <span>Transactions</span>
            <span>/</span>
            <span className="text-primary-600 font-medium">Payment Log</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <CreditCard className="w-7 h-7 text-primary-500" />
            Payment Log
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Audited history of all customer top-ups, gateway transactions, and manual deposit logs
          </p>
        </div>

        <button
          onClick={fetchPayments}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-xs uppercase font-semibold text-slate-400 mb-1">Total Payments</div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{payments.length}</div>
          <p className="text-xs text-slate-500 mt-1">{completedCount} successful transactions</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-xs uppercase font-semibold text-slate-400 mb-1">Settled Volume</div>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">${totalCompletedVolume.toFixed(2)}</div>
          <p className="text-xs text-slate-500 mt-1">Total funds credited into user wallets</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-xs uppercase font-semibold text-slate-400 mb-1">Gateway Fees Collected</div>
          <div className="text-2xl font-extrabold text-primary-600">${totalFees.toFixed(2)}</div>
          <p className="text-xs text-slate-500 mt-1">Platform payment surcharge earnings</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-xs uppercase font-semibold text-slate-400 mb-1">Success Rate</div>
          <div className="text-2xl font-extrabold text-indigo-500">
            {payments.length > 0 ? `${Math.round((completedCount / payments.length) * 100)}%` : '100%'}
          </div>
          <p className="text-xs text-slate-500 mt-1">{pendingCount} pending, {rejectedCount} rejected</p>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto p-1">
          {[
            { id: 'all', label: 'All Payments', count: payments.length },
            { id: 'completed', label: 'Completed', count: completedCount, color: 'text-emerald-600' },
            { id: 'pending', label: 'Pending', count: pendingCount, color: 'text-amber-500' },
            { id: 'rejected', label: 'Rejected', count: rejectedCount, color: 'text-rose-500' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                activeTab === tab.id ? 'bg-primary-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search payments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-200"
          />
        </div>
      </div>

      {/* Payment Log Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary-500" />
            <p className="text-sm">Loading payment log...</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="text-center py-16 p-8">
            <CreditCard className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No Payments Recorded</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              Transactions will automatically appear here once users deposit funds via automatic or manual gateways.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="py-3.5 px-4">Transaction ID</th>
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Gateway</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Fee / Local</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredPayments.map((p) => {
                  const isCompleted = p.status === 'completed';
                  const isPending = p.status === 'pending';
                  const isRejected = p.status === 'rejected';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-xs text-primary-600 dark:text-primary-400">
                        {p.transaction_id || `TXN-${p.id}`}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white text-xs">{p.username || 'System User'}</div>
                        <div className="text-[11px] text-slate-400">{p.email || `User #${p.user_id}`}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-xs text-slate-800 dark:text-slate-200 capitalize">
                          {p.gateway_name || p.method}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        ${parseFloat(p.amount).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <div className="text-slate-600 dark:text-slate-400">
                          {parseFloat(p.local_amount || p.amount).toFixed(2)} {p.currency || 'USD'}
                        </div>
                        {parseFloat(p.charge) > 0 && (
                          <div className="text-[11px] text-slate-400">+${parseFloat(p.charge).toFixed(2)} fee</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isCompleted
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                            : isPending
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                        }`}>
                          {isCompleted ? 'Completed' : isPending ? 'Pending' : 'Rejected'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedReceipt(p)}
                          className="px-2.5 py-1 text-xs font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 dark:hover:bg-primary-950/50 rounded-lg transition-all inline-flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          View
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

      {/* RECEIPT MODAL */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-lg w-full p-6 sm:p-8 my-8">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-950/40 border border-primary-100 dark:border-primary-900 flex items-center justify-center text-primary-600 font-bold">
                  S
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Payment Receipt</h3>
                  <p className="text-xs font-mono text-slate-400">RCP-{String(selectedReceipt.id).padStart(6, '0')}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-5 mt-6 text-sm">
              {/* Status Header */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-xs text-slate-400">Transaction Status</span>
                  <div className="font-bold text-base capitalize mt-0.5 text-slate-900 dark:text-white">
                    {selectedReceipt.status}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400">Credited Amount</span>
                  <div className="font-extrabold text-lg text-emerald-600 dark:text-emerald-400">
                    ${parseFloat(selectedReceipt.amount).toFixed(2)} USD
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-2.5 py-2 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Customer</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedReceipt.username} ({selectedReceipt.email})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Payment Gateway</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">{selectedReceipt.gateway_name || selectedReceipt.method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Transaction ID (TrxID)</span>
                  <span className="font-mono font-semibold text-primary-600 dark:text-primary-400">{selectedReceipt.transaction_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Date & Time</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{new Date(selectedReceipt.created_at).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Exchange Rate</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">1 USD = {selectedReceipt.rate || 1.0} {selectedReceipt.currency || 'USD'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Gateway Processing Fee</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">${parseFloat(selectedReceipt.charge || 0).toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 dark:border-slate-700/60 pt-2 font-bold text-slate-900 dark:text-white">
                  <span>Total Paid in Local Currency</span>
                  <span>{parseFloat(selectedReceipt.local_amount || selectedReceipt.amount).toFixed(2)} {selectedReceipt.currency || 'USD'}</span>
                </div>
              </div>

              {/* Admin Feedback / Rejection Note */}
              {selectedReceipt.admin_feedback && (
                <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  <span className="font-semibold text-slate-500 uppercase tracking-wider block mb-1">Admin Feedback</span>
                  <p className="text-slate-700 dark:text-slate-300">{selectedReceipt.admin_feedback}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Receipt
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedReceipt(null)}
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold transition-all shadow-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

