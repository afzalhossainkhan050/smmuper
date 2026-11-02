import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import {
  Clock, DollarSign, Receipt, Search, FileText, CheckCircle2,
  XCircle, ArrowDownRight, ArrowUpRight, Printer, Copy, Check,
  Loader2, RefreshCw, Smartphone, CreditCard, Coins, Building2
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PaymentHistoryPage() {
  const { showToast } = useAuth();

  const [activeTab, setActiveTab] = useState('deposits'); // 'deposits' | 'transactions'
  const [payments, setPayments] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Receipt Modal
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [copiedTrx, setCopiedTrx] = useState(false);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res = await api.payments.getHistory(params.toString());
      setPayments(res.payments || res || []);
    } catch (err) {
      showToast(err.message || 'Failed to fetch payment history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (search) params.append('search', search);

      const res = await api.payments.getTransactions(params.toString());
      setTransactions(res.transactions || res || []);
      setSummary(res.summary || null);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'deposits') {
      fetchHistory();
    } else {
      fetchTransactions();
    }
  }, [activeTab, statusFilter, typeFilter]);

  const handleCopyTrx = (trx) => {
    if (!trx) return;
    navigator.clipboard.writeText(trx);
    setCopiedTrx(true);
    setTimeout(() => setCopiedTrx(false), 2000);
  };

  const isCredit = (type) => ['deposit', 'order_refund', 'order_partial_refund', 'manual_credit', 'referral_commission'].includes(type);

  // Filter payments by search
  const filteredPayments = payments.filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (p.transaction_id && p.transaction_id.toLowerCase().includes(s)) ||
      (p.method && p.method.toLowerCase().includes(s)) ||
      (p.gateway_name && p.gateway_name.toLowerCase().includes(s));
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
            <Clock className="w-8 h-8 text-primary-500" />
            Payments & Wallet Ledger
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track deposit requests, verified receipts, and your immutable wallet financial balance history
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/dashboard/add-funds"
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-primary-500/20 transition-all"
          >
            + Add Funds
          </Link>
          <button
            onClick={() => activeTab === 'deposits' ? fetchHistory() : fetchTransactions()}
            disabled={loading}
            className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Top Tabs */}
      <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm w-fit">
        <button
          onClick={() => setActiveTab('deposits')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'deposits'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Deposit History
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'transactions'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Wallet Ledger
        </button>
      </div>

      {/* TAB 1: DEPOSITS */}
      {activeTab === 'deposits' ? (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by TrxID or gateway..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-400">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary-500" />
                <p className="text-sm">Loading deposit history...</p>
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="text-center py-16 p-8">
                <CreditCard className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No Deposits Found</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                  You have not deposited funds yet. Click "Add Funds" to top up your account balance.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-3.5 px-4">Transaction ID</th>
                      <th className="py-3.5 px-4">Gateway</th>
                      <th className="py-3.5 px-4">Amount</th>
                      <th className="py-3.5 px-4">Local / Fee</th>
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
                          <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white capitalize">
                            {p.gateway_name || p.method}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                            ${parseFloat(p.amount).toFixed(2)} USD
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-500">
                            <div>{parseFloat(p.local_amount || p.amount).toFixed(2)} {p.currency || 'USD'}</div>
                            {parseFloat(p.charge) > 0 && <div>Fee: ${parseFloat(p.charge).toFixed(2)}</div>}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
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
                              className="px-2.5 py-1 text-xs font-semibold text-primary-600 hover:text-primary-700 hover:bg-primary-50 dark:hover:bg-primary-950/50 rounded-lg transition-all inline-flex items-center gap-1"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Receipt
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
        </div>
      ) : (
        /* TAB 2: WALLET TRANSACTIONS LEDGER */
        <div className="space-y-4">
          {/* Summary Row */}
          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase font-semibold text-slate-400">Total Funds Credited</span>
                  <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    +${parseFloat(summary.total_credited || 0).toFixed(2)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Deposits, refunds & bonuses</p>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 rounded-2xl">
                  <ArrowDownRight className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase font-semibold text-slate-400">Total Funds Debited</span>
                  <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">
                    -${parseFloat(summary.total_debited || 0).toFixed(2)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Orders placed & service charges</p>
                </div>
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 text-rose-600 rounded-2xl">
                  <ArrowUpRight className="w-6 h-6" />
                </div>
              </div>
            </div>
          )}

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search description or TrxID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs text-slate-400">Type:</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Movements</option>
                <option value="deposit">Deposits</option>
                <option value="order_charge">Order Charges</option>
                <option value="order_refund">Order Refunds</option>
                <option value="order_partial_refund">Partial Refunds</option>
                <option value="manual_credit">Credits</option>
              </select>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            {transactions.length === 0 ? (
              <div className="text-center py-16 p-8">
                <Receipt className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No Wallet Movements</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                  Every order charge and deposit will show an immutable running balance trail here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-3.5 px-4">Reference ID</th>
                      <th className="py-3.5 px-4">Type</th>
                      <th className="py-3.5 px-4">Amount</th>
                      <th className="py-3.5 px-4">Running Balance</th>
                      <th className="py-3.5 px-4">Description</th>
                      <th className="py-3.5 px-4 text-right">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {transactions.map((t) => {
                      const credit = isCredit(t.transaction_type);
                      return (
                        <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-medium text-xs text-primary-600 dark:text-primary-400">
                            {t.reference_id || `#${t.id}`}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                              t.transaction_type === 'deposit'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                                : t.transaction_type === 'order_charge'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
                            }`}>
                              {t.transaction_type.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className={`py-3.5 px-4 font-bold text-sm ${credit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {credit ? '+' : '-'}${parseFloat(t.amount).toFixed(2)}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-xs text-slate-500">
                            ${parseFloat(t.balance_before || 0).toFixed(2)} → <span className="font-bold text-slate-800 dark:text-slate-200">${parseFloat(t.balance_after || 0).toFixed(2)}</span>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300 max-w-xs truncate" title={t.description}>
                            {t.description}
                          </td>
                          <td className="py-3.5 px-4 text-right text-xs text-slate-400 whitespace-nowrap">
                            {new Date(t.created_at).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-lg w-full p-6 sm:p-8 my-8 text-sm">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  S
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">SMMuper Official Receipt</h3>
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

            <div className="space-y-4 mt-6">
              <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-xs text-slate-400">Payment Status</span>
                  <div className="font-bold text-base capitalize mt-0.5 text-slate-900 dark:text-white">
                    {selectedReceipt.status}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400">Amount Credited</span>
                  <div className="font-extrabold text-lg text-emerald-600 dark:text-emerald-400">
                    ${parseFloat(selectedReceipt.amount).toFixed(2)} USD
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Gateway / Method:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                    {selectedReceipt.gateway_name || selectedReceipt.method}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Transaction ID (TrxID):</span>
                  <span className="font-mono font-semibold text-primary-600">{selectedReceipt.transaction_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Date & Time:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{new Date(selectedReceipt.created_at).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Exchange Rate:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">1 USD = {selectedReceipt.rate || 1.0} {selectedReceipt.currency || 'USD'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Processing Surcharge:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">${parseFloat(selectedReceipt.charge || 0).toFixed(2)} USD</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 dark:border-slate-700 pt-2 font-bold text-slate-900 dark:text-white">
                  <span>Total Paid in Local Currency:</span>
                  <span className="text-primary-600 font-extrabold">
                    {parseFloat(selectedReceipt.local_amount || selectedReceipt.amount).toFixed(2)} {selectedReceipt.currency || 'USD'}
                  </span>
                </div>
              </div>

              {selectedReceipt.admin_feedback && (
                <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  <span className="font-semibold text-slate-500 uppercase tracking-wider block mb-1">Administrative Feedback</span>
                  <p className="text-slate-700 dark:text-slate-300">{selectedReceipt.admin_feedback}</p>
                </div>
              )}

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
