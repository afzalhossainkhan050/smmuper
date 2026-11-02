import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, Clock, CheckCircle2, XCircle, Search,
  RefreshCw, Eye, Check, X, AlertCircle, FileText, User
} from 'lucide-react';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminKycRequestsPage() {
  const { showToast } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  // Modals
  const [viewingSubmission, setViewingSubmission] = useState(null);
  const [rejectingSubmission, setRejectingSubmission] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.admin.getKycSubmissions(`status=${activeTab === 'all' ? '' : activeTab}&search=${search}&page=${page}`);
      setSubmissions(res.submissions || []);
      if (res.stats) setStats(res.stats);
      if (res.pagination) setPagination(res.pagination);
    } catch (err) {
      showToast(err.message || 'Failed to load KYC requests', 'error');
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

  const handleApprove = async (id) => {
    try {
      setProcessing(true);
      await api.admin.approveKycSubmission(id);
      showToast('KYC submission approved and user marked verified', 'success');
      setViewingSubmission(null);
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to approve submission', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      showToast('Please provide a rejection reason', 'error');
      return;
    }

    try {
      setProcessing(true);
      await api.admin.rejectKycSubmission(rejectingSubmission.id, { rejection_reason: rejectionReason });
      showToast('KYC submission rejected with feedback', 'success');
      setRejectingSubmission(null);
      setRejectionReason('');
      setViewingSubmission(null);
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to reject submission', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</span>;
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20"><Clock className="w-3 h-3 mr-1" /> Pending</span>;
      case 'rejected':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20"><XCircle className="w-3 h-3 mr-1" /> Rejected</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-7 h-7 text-indigo-400" />
          KYC Verification Requests
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Review submitted government documents, approve legitimate identities, and reject fraudulent profiles.
        </p>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-400 font-medium">Total Submissions</div>
          <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-400 font-medium">Pending Review</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{stats.pending}</div>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-400 font-medium">Approved Identities</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{stats.approved}</div>
        </div>
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-400 font-medium">Rejected Submissions</div>
          <div className="text-2xl font-bold text-rose-400 mt-1">{stats.rejected}</div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800/80">
            {[
              { id: 'all', label: 'All Submissions' },
              { id: 'pending', label: 'Pending Review' },
              { id: 'approved', label: 'Approved' },
              { id: 'rejected', label: 'Rejected' },
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
                placeholder="Search username or email..."
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

        {loading ? (
          <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
            Loading verification requests...
          </div>
        ) : submissions.length === 0 ? (
          <div className="py-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
            <ShieldCheck className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-400">No verification requests found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">User</th>
                  <th className="pb-3 font-semibold">Form Title</th>
                  <th className="pb-3 font-semibold">Submitted At</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Reviewer</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3">
                      <div className="font-semibold text-white">{sub.username}</div>
                      <div className="text-[11px] text-slate-400">{sub.email}</div>
                    </td>
                    <td className="py-3 text-xs text-slate-300">
                      {sub.form_title}
                    </td>
                    <td className="py-3 text-xs text-slate-300">
                      {new Date(sub.created_at).toLocaleString()}
                    </td>
                    <td className="py-3">
                      {getStatusBadge(sub.status)}
                    </td>
                    <td className="py-3 text-xs text-slate-400">
                      {sub.reviewer_username || '—'}
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => setViewingSubmission(sub)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-medium border border-indigo-500/30 inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Review
                        </button>

                        {sub.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(sub.id)}
                              className="p-1 rounded-lg hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                              title="Approve immediately"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setRejectingSubmission(sub)}
                              className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-400 transition-colors"
                              title="Reject submission"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Document Details Modal */}
      {viewingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-400" />
                  Review KYC Submission #{viewingSubmission.id}
                </h2>
                <div className="text-xs text-slate-400 mt-0.5">
                  User: {viewingSubmission.username} ({viewingSubmission.email})
                </div>
              </div>
              <button
                onClick={() => setViewingSubmission(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400">Current Status:</span>
                <div>{getStatusBadge(viewingSubmission.status)}</div>
              </div>

              {viewingSubmission.rejection_reason && (
                <div className="bg-rose-950/40 border border-rose-800/50 p-3 rounded-xl text-xs text-rose-300">
                  <span className="font-bold">Rejection Note: </span>
                  {viewingSubmission.rejection_reason}
                </div>
              )}

              {/* Form Data Fields */}
              <div className="space-y-3">
                <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Submitted Form Fields</h4>
                {Object.entries(viewingSubmission.form_data || {}).map(([key, val]) => {
                  const isImage = typeof val === 'string' && (val.startsWith('data:image') || val.match(/\.(jpeg|jpg|gif|png|webp)/i));

                  return (
                    <div key={key} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
                      <div className="text-xs font-semibold text-indigo-300 capitalize mb-1">
                        {key.replace(/_/g, ' ')}
                      </div>
                      {isImage ? (
                        <div className="mt-2">
                          <img
                            src={val}
                            alt={key}
                            className="max-h-72 rounded-lg object-contain border border-slate-800 shadow-md"
                          />
                        </div>
                      ) : (
                        <div className="text-sm text-white font-mono break-words">
                          {val || '—'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-800 flex justify-between gap-3">
              <button
                type="button"
                onClick={() => setViewingSubmission(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300"
              >
                Close
              </button>

              {viewingSubmission.status === 'pending' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => setRejectingSubmission(viewingSubmission)}
                    className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 text-xs font-medium border border-rose-500/30"
                  >
                    Reject Submission
                  </button>
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => handleApprove(viewingSubmission.id)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-medium text-white shadow-lg shadow-emerald-600/20"
                  >
                    Approve Identity
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-400" />
              Reject KYC Submission
            </h3>
            <p className="text-xs text-slate-300 mb-4">
              Provide specific feedback to user <span className="font-semibold text-white">{rejectingSubmission.username}</span> explaining why their documentation was rejected so they can re-upload correctly.
            </p>

            <form onSubmit={handleReject} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Rejection Reason <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={4}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Image was blurry and details could not be read, or ID has expired."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setRejectingSubmission(null); setRejectionReason(''); }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-medium text-white shadow-lg shadow-rose-600/20"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

