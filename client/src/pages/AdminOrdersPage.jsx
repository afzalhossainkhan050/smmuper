import { useState, useEffect } from 'react';
import api from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { 
  ShoppingCart, Search, RefreshCw, Filter, Eye, Edit2, 
  RotateCcw, Ban, CheckCircle2, Clock, AlertCircle, ExternalLink,
  Server, DollarSign, Send, ArrowUpRight
} from 'lucide-react';

export default function AdminOrdersPage() {
  const { showToast } = useAuth();
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    total_charge: 0,
    total_cost: 0,
    pending: 0,
    processing: 0,
    in_progress: 0,
    completed: 0,
    partial: 0,
    cancelled: 0,
    refunded: 0,
    failed: 0
  });
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('all');
  const [providers, setProviders] = useState([]);

  // Modals & Drawers
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Edit Form
  const [editForm, setEditForm] = useState({
    status: '',
    start_count: 0,
    remains: 0,
    provider_order_id: '',
    error_message: ''
  });

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const [ordRes, provRes] = await Promise.all([
        api.admin.getOrders(),
        api.admin.getProviders()
      ]);
      setOrders(ordRes.orders || []);
      if (ordRes.stats) setStats(ordRes.stats);
      setProviders(provRes.providers || []);
    } catch (err) {
      console.error('Failed to load orders:', err);
      showToast(err.message || 'Failed to load orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleSyncStatus = async () => {
    try {
      setSyncing(true);
      const res = await api.admin.syncOrdersStatus();
      showToast(res.message || `Status synchronized for ${res.synced_count || 0} orders.`);
      fetchOrders();
    } catch (err) {
      showToast(err.message || 'Failed to sync orders status', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const openEditModal = (order) => {
    setEditingOrder(order);
    setEditForm({
      status: order.status || 'pending',
      start_count: order.start_count || 0,
      remains: order.remains || 0,
      provider_order_id: order.provider_order_id || '',
      error_message: order.error_message || ''
    });
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingOrder) return;

    try {
      setSavingEdit(true);
      await api.admin.updateOrder(editingOrder.id, {
        ...editForm,
        start_count: parseInt(editForm.start_count) || 0,
        remains: parseInt(editForm.remains) || 0
      });
      showToast(`Order #${editingOrder.id} updated successfully`);
      setEditModalOpen(false);
      fetchOrders();
    } catch (err) {
      showToast(err.message || 'Failed to update order', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleResendToProvider = async (order) => {
    if (!window.confirm(`Resubmit order #${order.id} to wholesale API provider?`)) return;
    try {
      const res = await api.admin.resendOrder(order.id);
      showToast(res.message || 'Order resubmitted to provider');
      fetchOrders();
    } catch (err) {
      showToast(err.message || 'Failed to resend order', 'error');
    }
  };

  const handleCancelAndRefund = async (order) => {
    if (!window.confirm(`Cancel order #${order.id} and refund $${order.charge.toFixed(2)} to user ${order.username}?`)) return;
    try {
      const res = await api.admin.cancelOrder(order.id);
      showToast(res.message || 'Order cancelled and refunded');
      fetchOrders();
    } catch (err) {
      showToast(err.message || 'Failed to cancel order', 'error');
    }
  };

  const handleRefillOrder = async (order) => {
    try {
      const res = await api.admin.refillOrder(order.id);
      showToast(res.message || 'Refill initiated');
      fetchOrders();
    } catch (err) {
      showToast(err.message || 'Failed to initiate refill', 'error');
    }
  };

  const openOrderDetails = async (order) => {
    try {
      const res = await api.admin.getOrderById(order.id);
      setSelectedOrderDetails(res);
      setDetailsModalOpen(true);
    } catch (err) {
      setSelectedOrderDetails({ order });
      setDetailsModalOpen(true);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'completed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Completed</span>;
      case 'processing':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Processing</span>;
      case 'in_progress':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">In Progress</span>;
      case 'pending':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">Pending</span>;
      case 'partial':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">Partial</span>;
      case 'cancelled':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">Cancelled</span>;
      case 'refunded':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">Refunded</span>;
      case 'failed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">Failed</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">{status}</span>;
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchesProvider = selectedProvider === 'all' || 
      (selectedProvider === 'manual' && !o.provider_id) || 
      (o.provider_id?.toString() === selectedProvider);
    const matchesSearch = !search ||
      String(o.id).includes(search) ||
      (o.username && o.username.toLowerCase().includes(search.toLowerCase())) ||
      (o.email && o.email.toLowerCase().includes(search.toLowerCase())) ||
      (o.service_name && o.service_name.toLowerCase().includes(search.toLowerCase())) ||
      (o.link && o.link.toLowerCase().includes(search.toLowerCase())) ||
      (o.provider_order_id && String(o.provider_order_id).includes(search));
    return matchesStatus && matchesProvider && matchesSearch;
  });

  const statusTabs = [
    { key: 'all', label: 'All Orders', count: stats.total },
    { key: 'pending', label: 'Pending', count: stats.pending },
    { key: 'processing', label: 'Processing', count: stats.processing },
    { key: 'in_progress', label: 'In Progress', count: stats.in_progress },
    { key: 'completed', label: 'Completed', count: stats.completed },
    { key: 'partial', label: 'Partial', count: stats.partial },
    { key: 'cancelled', label: 'Cancelled', count: stats.cancelled },
    { key: 'refunded', label: 'Refunded', count: stats.refunded },
    { key: 'failed', label: 'Failed', count: stats.failed }
  ];

  return (
    <div className="admin-page space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5 font-medium">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-indigo-400">Manage Orders</span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <ShoppingCart className="text-indigo-400" size={26} />
            Manage Orders
          </h1>
        </div>
        <div className="flex items-center gap-2.5">
          <button 
            onClick={fetchOrders}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white transition border border-slate-700/60"
            title="Refresh"
          >
            <RefreshCw size={17} />
          </button>
          <button 
            onClick={handleSyncStatus}
            disabled={syncing}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-medium shadow-lg shadow-indigo-500/20 transition flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={17} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync Orders Status'}
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 backdrop-blur-sm">
          <div className="text-xs uppercase font-semibold text-slate-400">Total Orders</div>
          <div className="text-2xl font-extrabold text-white mt-1">{stats.total}</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 backdrop-blur-sm">
          <div className="text-xs uppercase font-semibold text-emerald-400">Total Spent / Revenue</div>
          <div className="text-2xl font-extrabold text-white mt-1">${(stats.total_charge || 0).toFixed(2)}</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 backdrop-blur-sm">
          <div className="text-xs uppercase font-semibold text-blue-400">In Progress / Active</div>
          <div className="text-2xl font-extrabold text-white mt-1">{(stats.processing || 0) + (stats.in_progress || 0)}</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 backdrop-blur-sm">
          <div className="text-xs uppercase font-semibold text-rose-400">Cancelled / Refunded</div>
          <div className="text-2xl font-extrabold text-white mt-1">{(stats.cancelled || 0) + (stats.refunded || 0)}</div>
        </div>
      </div>

      {/* Filter Tabs - Matches admin_orders_list.png */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
        {statusTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
              statusFilter === tab.key
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700/80'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                statusFilter === tab.key ? 'bg-indigo-700 text-white' : 'bg-slate-700 text-slate-300'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search & Provider Filter Bar */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-2.5">
          <label className="text-xs text-slate-400 font-medium">Provider:</label>
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="text-xs py-1.5 px-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Providers</option>
            <option value="manual">Manual Orders</option>
            {providers.map(pr => (
              <option key={pr.id} value={pr.id}>{pr.name}</option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search Order ID, user, link, service..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <ShoppingCart className="mx-auto mb-3 opacity-30" size={40} />
            <p className="text-base font-medium text-slate-300">No orders found</p>
            <p className="text-xs mt-1">Orders placed by customers will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/50 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="px-4 py-3.5 w-16">Order ID</th>
                  <th className="px-4 py-3.5">User</th>
                  <th className="px-4 py-3.5 min-w-[220px]">Order Details</th>
                  <th className="px-4 py-3.5">Provider</th>
                  <th className="px-4 py-3.5">Financials</th>
                  <th className="px-4 py-3.5">Start / Remains</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-right w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredOrders.map(order => {
                  const profit = order.charge - (order.cost || 0);

                  return (
                    <tr key={order.id} className="hover:bg-slate-800/30 transition">
                      {/* Order ID */}
                      <td className="px-4 py-3.5 font-mono font-bold text-white">
                        #{order.id}
                        <div className="text-[10px] text-slate-500 font-normal">
                          {new Date(order.created_at).toLocaleDateString()}
                        </div>
                      </td>

                      {/* User Info */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-white">{order.username}</div>
                        <div className="text-[11px] text-slate-400">{order.email}</div>
                      </td>

                      {/* Service Details & Link */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-white line-clamp-1">{order.service_name}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-slate-400 text-[11px] truncate max-w-[180px]">{order.link}</span>
                          <a 
                            href={order.link.startsWith('http') ? order.link : `https://${order.link}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-indigo-400 hover:text-indigo-300"
                          >
                            <ExternalLink size={11} />
                          </a>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Qty: <span className="text-slate-200 font-mono font-semibold">{order.quantity.toLocaleString()}</span>
                        </div>
                      </td>

                      {/* Provider Mapping */}
                      <td className="px-4 py-3.5">
                        {order.provider_name ? (
                          <div className="flex flex-col">
                            <span className="inline-flex items-center gap-1 text-indigo-400 font-medium">
                              <Server size={11} />
                              {order.provider_name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              #{order.provider_order_id || 'Pending Sync'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Manual</span>
                        )}
                      </td>

                      {/* Financials */}
                      <td className="px-4 py-3.5 font-mono">
                        <div className="font-bold text-white">${order.charge.toFixed(2)}</div>
                        <div className="text-[10px] text-slate-400">
                          Cost: ${(order.cost || 0).toFixed(2)} | Profit: <span className="text-emerald-400 font-semibold">+${profit.toFixed(2)}</span>
                        </div>
                      </td>

                      {/* Start / Remains */}
                      <td className="px-4 py-3.5 font-mono">
                        <div>Start: <span className="text-slate-200">{order.start_count || 0}</span></div>
                        <div>Remains: <span className="text-amber-400">{order.remains || 0}</span></div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-center">
                        <div>{getStatusBadge(order.status)}</div>
                        {order.refill_status && order.refill_status !== 'none' && (
                          <div className="text-[10px] text-emerald-400 mt-1 font-semibold">
                            Refill: {order.refill_status}
                          </div>
                        )}
                        {order.cancel_status && order.cancel_status !== 'none' && (
                          <div className="text-[10px] text-amber-400 mt-1 font-semibold">
                            Cancel: {order.cancel_status}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openOrderDetails(order)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                            title="View Details"
                          >
                            <Eye size={13} />
                          </button>

                          <button
                            onClick={() => openEditModal(order)}
                            className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 transition"
                            title="Edit Status / Counts"
                          >
                            <Edit2 size={13} />
                          </button>

                          {/* Resend button if order has provider but status is failed/pending */}
                          {order.provider_name && (order.status === 'failed' || !order.provider_order_id) && (
                            <button
                              onClick={() => handleResendToProvider(order)}
                              className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition"
                              title="Resend to Provider"
                            >
                              <Send size={13} />
                            </button>
                          )}

                          {/* Cancel & Refund button if eligible */}
                          {order.status !== 'cancelled' && order.status !== 'refunded' && (
                            <button
                              onClick={() => handleCancelAndRefund(order)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
                              title="Cancel & Refund"
                            >
                              <Ban size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Order Modal */}
      {editModalOpen && editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit2 className="text-indigo-400" size={19} />
                Edit Order #{editingOrder.id}
              </h2>
              <button 
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="partial">Partial (Auto-refund remaining)</option>
                  <option value="cancelled">Cancelled (Full Refund)</option>
                  <option value="refunded">Refunded (Full Refund)</option>
                  <option value="failed">Failed</option>
                </select>
                {(editForm.status === 'cancelled' || editForm.status === 'refunded') && (
                  <p className="text-[11px] text-amber-400 mt-1 flex items-center gap-1">
                    <AlertCircle size={12} />
                    Changing to Cancelled/Refunded will automatically credit ${editingOrder.charge.toFixed(2)} to the user's wallet.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Start Count
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.start_count}
                    onChange={(e) => setEditForm({ ...editForm, start_count: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Remains
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.remains}
                    onChange={(e) => setEditForm({ ...editForm, remains: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Provider Order ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. 9845231"
                  value={editForm.provider_order_id}
                  onChange={(e) => setEditForm({ ...editForm, provider_order_id: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Error Message / Notes
                </label>
                <textarea
                  rows="2"
                  value={editForm.error_message}
                  onChange={(e) => setEditForm({ ...editForm, error_message: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 text-xs text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl font-medium shadow-lg shadow-indigo-600/20 transition disabled:opacity-50"
                >
                  {savingEdit ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {detailsModalOpen && selectedOrderDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Eye className="text-indigo-400" size={19} />
                Order #{selectedOrderDetails.order?.id} Details
              </h2>
              <button 
                onClick={() => setDetailsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-800/50 p-3 rounded-xl border border-slate-700/60">
                <div>
                  <div className="text-slate-400 font-medium">Customer:</div>
                  <div className="text-white font-semibold text-sm mt-0.5">{selectedOrderDetails.order?.username}</div>
                  <div className="text-slate-400 text-[11px]">{selectedOrderDetails.order?.email}</div>
                </div>
                <div>
                  <div className="text-slate-400 font-medium">Status:</div>
                  <div className="mt-1">{getStatusBadge(selectedOrderDetails.order?.status)}</div>
                </div>
              </div>

              <div>
                <div className="text-slate-400 font-medium mb-1">Service:</div>
                <div className="text-white font-semibold">{selectedOrderDetails.order?.service_name}</div>
              </div>

              <div>
                <div className="text-slate-400 font-medium mb-1">Target Link:</div>
                <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 break-all font-mono text-slate-200">
                  {selectedOrderDetails.order?.link}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-slate-800/40 p-3 rounded-xl border border-slate-700/40 font-mono">
                <div>
                  <div className="text-slate-400 text-[10px]">Quantity</div>
                  <div className="text-white font-bold text-sm mt-0.5">{selectedOrderDetails.order?.quantity}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px]">Customer Charge</div>
                  <div className="text-emerald-400 font-bold text-sm mt-0.5">${selectedOrderDetails.order?.charge?.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[10px]">Provider Cost</div>
                  <div className="text-indigo-400 font-bold text-sm mt-0.5">${(selectedOrderDetails.order?.cost || 0).toFixed(2)}</div>
                </div>
              </div>

              {selectedOrderDetails.order?.provider_name && (
                <div className="bg-indigo-950/40 border border-indigo-800/40 p-3 rounded-xl">
                  <div className="text-indigo-400 font-bold text-[11px] mb-1 flex items-center gap-1.5">
                    <Server size={13} />
                    External Wholesale API
                  </div>
                  <div className="text-white font-semibold">{selectedOrderDetails.order?.provider_name}</div>
                  <div className="text-slate-400 font-mono text-[11px] mt-0.5">
                    Provider Order ID: #{selectedOrderDetails.order?.provider_order_id || 'Not sent'}
                  </div>
                </div>
              )}

              {selectedOrderDetails.order?.error_message && (
                <div className="bg-rose-950/40 border border-rose-800/40 p-3 rounded-xl text-rose-300">
                  <div className="font-bold flex items-center gap-1.5 mb-0.5">
                    <AlertCircle size={13} />
                    Provider Warning / Error:
                  </div>
                  <div>{selectedOrderDetails.order?.error_message}</div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setDetailsModalOpen(false)}
                className="px-4 py-2 text-xs text-white bg-slate-800 hover:bg-slate-700 rounded-xl font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
