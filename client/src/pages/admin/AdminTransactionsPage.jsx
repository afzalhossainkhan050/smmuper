import React, { useState, useEffect } from 'react';
import {
  Receipt, Search, TrendingUp, TrendingDown, DollarSign,
  ArrowUpRight, ArrowDownRight, RefreshCw, Loader2, Filter,
  PieChart, BarChart3, Calendar, CheckCircle2, Shield, User, Copy, Check
} from 'lucide-react';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminTransactionsPage() {
  const { showToast } = useAuth();

  const [activeTab, setActiveTab] = useState('ledger'); // 'ledger' | 'reports'
  const [transactions, setTransactions] = useState([]);
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (search) params.append('search', search);

      const res = await api.admin.getTransactions(params.toString());
      setTransactions(res.transactions || res || []);
    } catch (err) {
      showToast(err.message || 'Failed to fetch transaction ledger', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      const res = await api.admin.getFinancialReports();
      setReports(res.reports || res || null);
    } catch (err) {
      console.error('Failed to fetch financial reports:', err);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchReports();
  }, [typeFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTransactions();
  };

  const handleCopy = (id, text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isCredit = (type) => ['deposit', 'order_refund', 'order_partial_refund', 'manual_credit', 'referral_commission'].includes(type);

  const totalCredits = transactions
    .filter(t => isCredit(t.transaction_type))
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

  const totalDebits = transactions
    .filter(t => !isCredit(t.transaction_type))
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

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
            <span className="text-primary-600 font-medium">Financial Transactions</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Receipt className="w-7 h-7 text-primary-500" />
            Financial Transactions & Ledger
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Immutable financial audit trail recording all wallet credits, order charges, refunds, and profit reports
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { fetchTransactions(); fetchReports(); }}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm w-fit">
        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'ledger'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Immutable Ledger
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'reports'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Profit & Financial Reports
        </button>
      </div>

      {activeTab === 'ledger' ? (
        <>
          {/* Top Ledger Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs uppercase font-semibold text-slate-400">Total Filtered Credits</span>
                <span className="p-1 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50">
                  <ArrowDownRight className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">+${totalCredits.toFixed(2)}</div>
              <p className="text-xs text-slate-500 mt-1">Deposits, refunds & manual credits</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs uppercase font-semibold text-slate-400">Total Filtered Debits</span>
                <span className="p-1 rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-950/50">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">-${totalDebits.toFixed(2)}</div>
              <p className="text-xs text-slate-500 mt-1">Customer order placements & debits</p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs uppercase font-semibold text-slate-400">Ledger Security</span>
                <span className="p-1 rounded-lg bg-primary-100 text-primary-600 dark:bg-primary-950/50">
                  <Shield className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-extrabold text-primary-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                Immutable
              </div>
              <p className="text-xs text-slate-500 mt-1">Append-only double-entry balance log</p>
            </div>
          </div>

          {/* Filter & Search */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search TrxID, user, description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-200"
              />
            </form>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-xs text-slate-400 whitespace-nowrap">Transaction Type:</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Types</option>
                <option value="deposit">Deposit</option>
                <option value="order_charge">Order Charge</option>
                <option value="order_refund">Order Refund (Full)</option>
                <option value="order_partial_refund">Order Partial Refund</option>
                <option value="manual_credit">Manual Credit</option>
                <option value="manual_debit">Manual Debit</option>
                <option value="referral_commission">Referral Commission</option>
              </select>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary-500" />
                <p className="text-sm">Loading financial ledger...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-16 p-8">
                <Receipt className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No Transactions Found</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                  Every wallet balance deduction, deposit, and refund automatically writes an immutable entry here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-3.5 px-4">ID</th>
                      <th className="py-3.5 px-4">User</th>
                      <th className="py-3.5 px-4">Reference / TrxID</th>
                      <th className="py-3.5 px-4">Type</th>
                      <th className="py-3.5 px-4">Amount</th>
                      <th className="py-3.5 px-4">Balance Progression</th>
                      <th className="py-3.5 px-4">Description</th>
                      <th className="py-3.5 px-4 text-right">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {transactions.map((t) => {
                      const credit = isCredit(t.transaction_type);
                      return (
                        <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-xs text-slate-400">
                            #{t.id}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900 dark:text-white text-xs">{t.username || `User #${t.user_id}`}</div>
                            <div className="text-[11px] text-slate-400">{t.email}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-primary-600 dark:text-primary-400">
                              <span>{t.reference_id || 'N/A'}</span>
                              {t.reference_id && (
                                <button
                                  type="button"
                                  onClick={() => handleCopy(t.id, t.reference_id)}
                                  className="text-slate-400 hover:text-primary-600 transition-colors"
                                  title="Copy TrxID"
                                >
                                  {copiedId === t.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                              t.transaction_type === 'deposit'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                                : t.transaction_type === 'order_charge'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400'
                                : t.transaction_type.includes('refund')
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
                                : 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400'
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
        </>
      ) : (
        /* PROFIT & FINANCIAL REPORTS TAB */
        <div className="space-y-6">
          {reports ? (
            <>
              {/* Financial Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="text-xs uppercase font-semibold text-slate-400 mb-1">Customer Order Revenue</div>
                  <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    ${parseFloat(reports.summary?.order_revenue || 0).toFixed(2)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Total revenue charged from customers</p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="text-xs uppercase font-semibold text-slate-400 mb-1">Wholesale Provider Cost</div>
                  <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                    ${parseFloat(reports.summary?.provider_cost || 0).toFixed(2)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Wholesale API costs paid to suppliers</p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="text-xs uppercase font-semibold text-slate-400 mb-1">Gross Reseller Profit</div>
                  <div className="text-2xl font-extrabold text-primary-600">
                    ${parseFloat(reports.summary?.gross_profit || 0).toFixed(2)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Order Revenue minus Wholesale Cost</p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="text-xs uppercase font-semibold text-slate-400 mb-1">Net Platform Profit</div>
                  <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    ${parseFloat(reports.summary?.net_profit || 0).toFixed(2)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Gross Profit + Gateway Fees - Refunds</p>
                </div>
              </div>

              {/* Secondary Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex justify-between items-center">
                  <span className="text-slate-500">Total Customer Deposits:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">${parseFloat(reports.summary?.total_deposits || 0).toFixed(2)}</span>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex justify-between items-center">
                  <span className="text-slate-500">Gateway Surcharges Collected:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">+${parseFloat(reports.summary?.gateway_fees || 0).toFixed(2)}</span>
                </div>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex justify-between items-center">
                  <span className="text-slate-500">Total Processed Refunds:</span>
                  <span className="font-bold text-rose-500">-${parseFloat(reports.summary?.total_refunds || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Daily Breakdown Table */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary-500" />
                  30-Day Daily Financial Performance
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
                    <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-3.5 px-4">Date</th>
                        <th className="py-3.5 px-4">Order Revenue</th>
                        <th className="py-3.5 px-4">Wholesale Cost</th>
                        <th className="py-3.5 px-4">Gross Margin</th>
                        <th className="py-3.5 px-4">Refunds</th>
                        <th className="py-3.5 px-4 text-right">Net Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {(reports.daily_breakdown || []).map((day) => {
                        const gross = (parseFloat(day.order_revenue) || 0) - (parseFloat(day.provider_cost) || 0);
                        const net = gross - (parseFloat(day.refunds) || 0);
                        return (
                          <tr key={day.date} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors text-xs">
                            <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                              {day.date}
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                              ${parseFloat(day.order_revenue || 0).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-amber-600 dark:text-amber-400">
                              ${parseFloat(day.provider_cost || 0).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 font-bold text-primary-600">
                              ${gross.toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-rose-500">
                              ${parseFloat(day.refunds || 0).toFixed(2)}
                            </td>
                            <td className="py-3 px-4 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                              ${net.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary-500" />
              <p className="text-sm">Generating profit analytics...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

