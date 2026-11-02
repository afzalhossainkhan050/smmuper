import React, { useState, useEffect } from 'react';
import {
  Mail, Search, Trash2, Download, RefreshCw, XCircle, Users
} from 'lucide-react';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminSubscribersPage() {
  const { showToast } = useAuth();

  const [loading, setLoading] = useState(true);
  const [subscribers, setSubscribers] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [deletingSub, setDeletingSub] = useState(null);

  const loadSubscribers = async () => {
    try {
      setLoading(true);
      const res = await api.admin.getSubscribers(`search=${search}&page=${page}`);
      setSubscribers(res.subscribers || []);
      setPagination(res.pagination || {});
    } catch (err) {
      showToast(err.message || 'Failed to load subscribers', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscribers();
  }, [search, page]);

  const handleDelete = async () => {
    if (!deletingSub) return;
    try {
      await api.admin.deleteSubscriber(deletingSub.id);
      showToast('Subscriber removed', 'success');
      setDeletingSub(null);
      loadSubscribers();
    } catch (err) {
      showToast(err.message || 'Failed to delete subscriber', 'error');
    }
  };

  const handleExportCSV = () => {
    if (subscribers.length === 0) {
      showToast('No subscribers to export', 'error');
      return;
    }

    const headers = ['ID', 'Email', 'Subscribed At'];
    const rows = subscribers.map(s => [s.id, s.email, s.created_at]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `smmuper_subscribers_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Subscribers exported to CSV', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Mail className="w-7 h-7 text-indigo-400" />
            Newsletter Subscribers
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage your opted-in newsletter email list for marketing campaigns, announcements, and discounts.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 shadow-sm transition-all"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          Export Subscribers CSV
        </button>
      </div>

      {/* Main Table Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by email address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-72"
            />
          </div>

          <div className="text-xs text-slate-400">
            Total Subscribers: <span className="font-bold text-white">{pagination.total || subscribers.length}</span>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
            Loading subscribers...
          </div>
        ) : subscribers.length === 0 ? (
          <div className="py-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
            <Mail className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-400">No subscribers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">SL</th>
                  <th className="pb-3 font-semibold">Subscriber Email</th>
                  <th className="pb-3 font-semibold">Joined At</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {subscribers.map((sub, index) => (
                  <tr key={sub.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 text-xs text-slate-500">
                      {((page - 1) * 20) + index + 1}
                    </td>
                    <td className="py-3.5 font-medium text-white">
                      {sub.email}
                    </td>
                    <td className="py-3.5 text-xs text-slate-400">
                      {new Date(sub.created_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => setDeletingSub(sub)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                        title="Remove Subscriber"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Remove Subscriber</h3>
            <p className="text-sm text-slate-300">
              Are you sure you want to remove <span className="font-semibold text-rose-400">"{deletingSub.email}"</span> from the subscriber list?
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setDeletingSub(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-medium text-white shadow-lg shadow-rose-600/20"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

