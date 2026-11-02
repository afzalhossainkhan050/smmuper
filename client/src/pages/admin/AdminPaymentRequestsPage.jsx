import React, { useState, useEffect } from 'react';
import {
  Coins, Search, CheckCircle2, XCircle, AlertCircle, Eye,
  Loader2, RefreshCw, User, Calendar, DollarSign, ArrowUpRight,
  ShieldAlert, Copy, ExternalLink, Smartphone, Building2, Check
} from 'lucide-react';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminPaymentRequestsPage() {
  const { showToast } = useAuth();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');

  // Selected request for review
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [adminFeedback, setAdminFeedback] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [copiedTrx, setCopiedTrx] = useState(false);

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      const res = await api.admin.getPendingPayments();
      setRequests(res.payments || res || []);
    } catch (err) {
      showToast(err.message || 'Failed to fetch pending payment requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const handleCopyTrx = (trx) => {
    if (!trx) return;
    navigator.clipboard.writeText(trx);
    setCopiedTrx(true);
    setTimeout(() => setCopiedTrx(false), 2000);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setProcessingAction(true);
    try {
      await api.admin.approvePayment(selectedRequest.id, {
        feedback: adminFeedback || 'Manual payment verified and approved'
      });
      showToast(`Payment #${selectedRequest.id} approved! $${parseFloat(selectedRequest.amount).toFixed(2)} credited to ${selectedRequest.username}'s wallet.`);
      setSelectedRequest(null);
      setAdminFeedback('');
      fetchPendingRequests();
    } catch (err) {
      showToast(err.message || 'Failed to approve payment', 'error');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    if (!adminFeedback.trim()) {
      showToast('Please provide a reason for rejecting this deposit request', 'error');
      return;
    }
    setProcessingAction(true);
    try {
      await api.admin.rejectPayment(selectedRequest.id, {
        feedback: adminFeedback.trim()
      });
      showToast(`Payment #${selectedRequest.id} rejected.`);
      setSelectedRequest(null);
      setAdminFeedback('');
      setRejectMode(false);
      fetchPendingRequests();
    } catch (err) {
      showToast(err.message || 'Failed to reject payment', 'error');
    } finally {
      setProcessingAction(false);
    }
  };

  // Filter requests
  const filteredRequests = requests.filter(r => {
    const matchesSearch = !search ||
      (r.transaction_id && r.transaction_id.toLowerCase().includes(search.toLowerCase())) ||
      (r.username && r.username.toLowerCase().includes(search.toLowerCase())) ||
      (r.email && r.email.toLowerCase().includes(search.toLowerCase()));
    const matchesMethod = methodFilter === 'all' || r.method === methodFilter;
    return matchesSearch && matchesMethod;
  });

  const totalPendingAmount = filteredRequests.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

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
            <span className="text-primary-600 font-medium">Payment Request</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Coins className="w-7 h-7 text-primary-500" />
            Payment Requests
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Verify manual deposits (bKash, Nagad, Rocket, Bank Wire, Binance USDT) and credit customer wallets
          </p>
        </div>

        <button
          onClick={fetchPendingRequests}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Queue
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-xs uppercase font-semibold text-slate-400 mb-1">Pending Requests</div>
          <div className="text-2xl font-extrabold text-amber-500">{requests.length}</div>
          <p className="text-xs text-slate-500 mt-1">Awaiting admin transaction verification</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-xs uppercase font-semibold text-slate-400 mb-1">Pending Volume</div>
          <div className="text-2xl font-extrabold text-primary-600">${totalPendingAmount.toFixed(2)}</div>
          <p className="text-xs text-slate-500 mt-1">Total USD value of unverified deposits</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="text-xs uppercase font-semibold text-slate-400 mb-1">Ledger Integrity</div>
          <div className="text-2xl font-extrabold text-emerald-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-6 h-6" />
            Atomic Sync
          </div>
          <p className="text-xs text-slate-500 mt-1">Approval logs to immutable ledger</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by TrxID, username, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-slate-200"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Gateways</option>
            <option value="bkash">bKash</option>
            <option value="nagad">Nagad</option>
            <option value="rocket">Rocket</option>
            <option value="binance">Binance USDT</option>
            <option value="bank_transfer">Bank Wire</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary-500" />
            <p className="text-sm">Loading pending payment requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-16 p-8">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-80" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No Pending Requests</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              All customer deposits are currently verified and processed! The review queue is clear.
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
                  <th className="py-3.5 px-4">Credit Amount</th>
                  <th className="py-3.5 px-4">Local / Payable</th>
                  <th className="py-3.5 px-4">Submitted At</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-primary-600 dark:text-primary-400">
                      {r.transaction_id || `TXN-${r.id}`}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-600 dark:text-slate-300">
                          {(r.username || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white leading-tight">{r.username}</div>
                          <div className="text-xs text-slate-400">{r.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 border border-primary-200/50 dark:border-primary-800/40">
                        {r.gateway_name || r.method}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white text-base">
                      ${parseFloat(r.amount).toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {parseFloat(r.local_amount || r.amount).toFixed(2)} {r.currency || 'USD'}
                      </div>
                      {parseFloat(r.charge) > 0 && (
                        <div className="text-xs text-slate-400">+ ${parseFloat(r.charge).toFixed(2)} fee</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400">
                        Pending Review
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedRequest(r);
                          setAdminFeedback('');
                          setRejectMode(false);
                        }}
                        className="px-3.5 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 ml-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* REVIEW & APPROVAL MODAL */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-xl w-full p-6 sm:p-8 my-8">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Coins className="w-5 h-5 text-primary-500" />
                  Review Deposit Request #{selectedRequest.id}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">Submitted on {new Date(selectedRequest.created_at).toLocaleString()}</p>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-5 mt-6">
              {/* User Snapshot */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-950/60 text-primary-600 flex items-center justify-center font-bold">
                    {selectedRequest.username?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{selectedRequest.username}</h4>
                    <p className="text-xs text-slate-400">{selectedRequest.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400">Current Balance</span>
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    ${parseFloat(selectedRequest.user_balance || 0).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Deposit Proof Details */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400">Gateway</span>
                  <div className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">
                    {selectedRequest.gateway_name || selectedRequest.method}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400">Amount to Credit</span>
                  <div className="font-extrabold text-emerald-600 dark:text-emerald-400 text-base mt-0.5">
                    ${parseFloat(selectedRequest.amount).toFixed(2)} USD
                  </div>
                </div>
              </div>

              {/* Transaction ID & Sender Account */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase">Customer Transaction ID (TrxID)</span>
                    <div className="text-sm font-mono font-bold text-slate-900 dark:text-white mt-0.5 flex items-center gap-2">
                      {selectedRequest.transaction_id}
                      <button
                        type="button"
                        onClick={() => handleCopyTrx(selectedRequest.transaction_id)}
                        className="text-primary-600 hover:text-primary-700 text-xs flex items-center gap-1 font-sans"
                      >
                        {copiedTrx ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedTrx ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>

                {selectedRequest.payer_details && (
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase">Sender Account / Phone</span>
                    <div className="text-xs font-mono text-slate-800 dark:text-slate-200 mt-0.5 break-all">
                      {typeof selectedRequest.payer_details === 'string'
                        ? selectedRequest.payer_details
                        : JSON.stringify(selectedRequest.payer_details)}
                    </div>
                  </div>
                )}

                {selectedRequest.payment_proof && (
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase">Proof / Slip Attachment</span>
                    <div className="text-xs text-primary-600 dark:text-primary-400 mt-0.5 flex items-center gap-1">
                      <ExternalLink className="w-3.5 h-3.5" />
                      <a href={selectedRequest.payment_proof} target="_blank" rel="noreferrer" className="underline break-all">
                        {selectedRequest.payment_proof}
                      </a>
                    </div>
                  </div>
                )}

                {selectedRequest.notes && (
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase">Customer Note</span>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{selectedRequest.notes}</p>
                  </div>
                )}
              </div>

              {/* Admin Feedback / Rejection Note */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  {rejectMode ? 'Rejection Reason (Sent to Customer) *' : 'Approval Note / Feedback (Optional)'}
                </label>
                <textarea
                  rows={2}
                  value={adminFeedback}
                  onChange={(e) => setAdminFeedback(e.target.value)}
                  placeholder={rejectMode ? 'Explain why this transaction was rejected (e.g. TrxID not found on merchant statement)...' : 'Manual payment verified and approved'}
                  className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border rounded-xl text-sm focus:outline-none focus:ring-2 text-slate-800 dark:text-slate-200 ${
                    rejectMode ? 'border-rose-300 focus:ring-rose-500' : 'border-slate-200 dark:border-slate-700 focus:ring-primary-500'
                  }`}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setRejectMode(!rejectMode)}
                  className={`text-xs font-semibold px-4 py-2 rounded-xl transition-all ${
                    rejectMode
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      : 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                  }`}
                >
                  {rejectMode ? 'Switch to Approve' : 'Reject Deposit Instead'}
                </button>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedRequest(null)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium"
                  >
                    Close
                  </button>

                  {rejectMode ? (
                    <button
                      type="button"
                      disabled={processingAction || !adminFeedback.trim()}
                      onClick={handleReject}
                      className="flex items-center gap-1.5 px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-500/20 disabled:opacity-50 transition-all"
                    >
                      {processingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                      Confirm Rejection
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={processingAction}
                      onClick={handleApprove}
                      className="flex items-center gap-1.5 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 disabled:opacity-50 transition-all"
                    >
                      {processingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Approve & Credit ${parseFloat(selectedRequest.amount).toFixed(2)}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

