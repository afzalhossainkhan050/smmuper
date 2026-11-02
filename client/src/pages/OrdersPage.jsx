import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { useSystem } from '../contexts/SystemContext';
import { 
  ShoppingCart, Search, Eye, RotateCcw, Ban, RefreshCw, 
  ExternalLink, Layers, ArrowRight, X
} from 'lucide-react';

export default function OrdersPage() {
  const { showToast } = useAuth();
  const { formatPrice } = useSystem();
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const perPage = 15;

  // Details Modal
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await api.orders.getAll();
      setOrders(data.orders || data || []);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      showToast(err.message || 'Failed to load orders', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleRefill = async (orderId) => {
    try {
      const res = await api.orders.refill(orderId);
      showToast(res.message || 'Refill request submitted');
      fetchOrders();
    } catch (err) {
      showToast(err.message || 'Failed to submit refill request', 'error');
    }
  };

  const handleCancel = async (orderId) => {
    if (!window.confirm('Are you sure you want to request cancellation for this order?')) return;
    try {
      const res = await api.orders.cancel(orderId);
      showToast(res.message || 'Cancellation request submitted');
      fetchOrders();
    } catch (err) {
      showToast(err.message || 'Failed to submit cancellation request', 'error');
    }
  };

  const statuses = [
    { key: 'all', label: 'All Orders' },
    { key: 'pending', label: 'Pending' },
    { key: 'processing', label: 'Processing' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'completed', label: 'Completed' },
    { key: 'partial', label: 'Partial' },
    { key: 'cancelled', label: 'Cancelled' },
    { key: 'refunded', label: 'Refunded' }
  ];

  const filtered = orders.filter((o) => {
    const matchesFilter = filter === 'all' || o.status === filter;
    const matchesSearch = !search ||
      String(o.id).includes(search) ||
      (o.service_name && o.service_name.toLowerCase().includes(search.toLowerCase())) ||
      (o.link && o.link.toLowerCase().includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const totalPages = Math.ceil(filtered.length / perPage) || 1;
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'completed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">Completed</span>;
      case 'processing':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Processing</span>;
      case 'in_progress':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">In Progress</span>;
      case 'pending':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">Pending</span>;
      case 'partial':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">Partial</span>;
      case 'cancelled':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">Cancelled</span>;
      case 'refunded':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">Refunded</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-bg-surface-elevated text-text-muted">{status}</span>;
    }
  };

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="orders-page space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2.5">
            <ShoppingCart className="text-primary" size={26} />
            My <span className="gradient-text">Orders</span>
          </h1>
          <p className="text-xs text-text-muted mt-1">Track and manage all your social media service orders in real-time.</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button 
            onClick={fetchOrders}
            className="p-2.5 rounded-xl bg-bg-surface-elevated hover:bg-bg-surface-hover text-text-secondary hover:text-text-primary transition border border-border-main"
            title="Refresh Orders"
          >
            <RefreshCw size={17} />
          </button>
          <Link
            to="/dashboard/new-order"
            className="btn-gradient text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-md shadow-primary/20"
          >
            <ShoppingCart size={15} />
            New Order
          </Link>
        </div>
      </div>

      {/* Filter Tabs (Horizontal Scrollable on Mobile) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
        {statuses.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setFilter(tab.key); setPage(1); }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              filter === tab.key
                ? 'bg-primary text-white shadow-md shadow-primary/30'
                : 'bg-bg-surface hover:bg-bg-surface-hover text-text-secondary hover:text-text-primary border border-border-main'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Input Bar */}
      <div className="bg-bg-surface border border-border-main rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          <input
            type="text"
            placeholder="Search Order ID, Service, or Link..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-9 py-2 text-xs bg-bg-surface-elevated border border-border-main rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="text-xs text-text-muted font-medium flex items-center justify-between sm:justify-end">
          <span>Showing {paginated.length} of {filtered.length} orders</span>
        </div>
      </div>

      {/* Orders Container */}
      <div className="bg-bg-surface border border-border-main rounded-2xl overflow-hidden shadow-md">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-text-muted">
            <ShoppingCart className="mx-auto mb-3 opacity-30 text-text-muted" size={44} />
            <p className="text-base font-bold text-text-primary">No orders found</p>
            <p className="text-xs mt-1 max-w-sm mx-auto">
              {search || filter !== 'all' 
                ? 'No orders match your filter criteria. Try clearing search or selecting another tab.' 
                : "You haven't placed any orders yet. Place an order to see live delivery updates here."}
            </p>
            <Link to="/dashboard/new-order" className="btn-gradient text-xs px-4 py-2 mt-4 inline-flex items-center gap-1.5 rounded-xl">
              Place Your First Order <ArrowRight size={13} />
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop & Tablet Table (>= 640px) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-sm text-text-secondary">
                <thead className="bg-bg-surface-elevated text-xs uppercase tracking-wider text-text-muted border-b border-border-main font-semibold">
                  <tr>
                    <th className="px-4 py-3.5 w-16">ID</th>
                    <th className="px-4 py-3.5 min-w-[200px]">Service</th>
                    <th className="px-4 py-3.5">Target Link</th>
                    <th className="px-4 py-3.5">Quantity</th>
                    <th className="px-4 py-3.5">Charge</th>
                    <th className="px-4 py-3.5">Start / Remains</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    <th className="px-4 py-3.5 text-right w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle text-xs">
                  {paginated.map((order) => {
                    const canRefill = (order.status === 'completed' || order.status === 'in_progress') && 
                      order.service_refill && 
                      order.refill_status !== 'requested' && 
                      order.refill_status !== 'refilling';

                    const canCancel = (order.status === 'pending' || order.status === 'processing') && 
                      order.service_cancel && 
                      order.cancel_status !== 'requested';

                    return (
                      <tr key={order.id} className="hover:bg-bg-surface-hover/50 transition">
                        <td className="px-4 py-3.5 font-mono font-bold text-text-primary">
                          #{order.id}
                          <div className="text-[10px] text-text-muted font-normal">
                            {new Date(order.created_at).toLocaleDateString()}
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-text-primary line-clamp-1">{order.service_name}</div>
                          {order.category_name && (
                            <div className="text-[10px] text-primary flex items-center gap-1 mt-0.5 font-medium">
                              <Layers size={10} />
                              {order.category_name}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1">
                            <span className="text-text-muted text-xs truncate max-w-[170px]">{order.link}</span>
                            <a 
                              href={order.link?.startsWith('http') ? order.link : `https://${order.link}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-primary hover:opacity-80 p-0.5"
                            >
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 font-mono text-text-primary font-medium">
                          {order.quantity?.toLocaleString()}
                        </td>

                        <td className="px-4 py-3.5 font-mono font-bold text-text-primary">
                          {formatPrice(order.charge || 0)}
                        </td>

                        <td className="px-4 py-3.5 font-mono text-[11px]">
                          <div>Start: <span className="text-text-primary font-medium">{order.start_count || 0}</span></div>
                          <div>Remains: <span className="text-amber-500 font-semibold">{order.remains || 0}</span></div>
                        </td>

                        <td className="px-4 py-3.5 text-center">
                          <div>{getStatusBadge(order.status)}</div>
                          {order.refill_status && order.refill_status !== 'none' && (
                            <div className="text-[10px] text-emerald-500 mt-1 font-semibold">
                              Refill: {order.refill_status}
                            </div>
                          )}
                          {order.cancel_status && order.cancel_status !== 'none' && (
                            <div className="text-[10px] text-amber-500 mt-1 font-semibold">
                              Cancel: {order.cancel_status}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => { setSelectedOrder(order); setDetailsModalOpen(true); }}
                              className="p-1.5 rounded-lg bg-bg-surface-elevated hover:bg-bg-surface-hover text-text-secondary hover:text-text-primary border border-border-main transition"
                              title="View Details"
                            >
                              <Eye size={13} />
                            </button>

                            {canRefill && (
                              <button
                                onClick={() => handleRefill(order.id)}
                                className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 transition"
                                title="Request Refill"
                              >
                                <RotateCcw size={13} />
                              </button>
                            )}

                            {canCancel && (
                              <button
                                onClick={() => handleCancel(order.id)}
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 transition"
                                title="Request Cancel"
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

            {/* Mobile Card View (< 640px) */}
            <div className="block sm:hidden divide-y divide-border-subtle">
              {paginated.map((order) => {
                const canRefill = (order.status === 'completed' || order.status === 'in_progress') && 
                  order.service_refill && 
                  order.refill_status !== 'requested' && 
                  order.refill_status !== 'refilling';

                const canCancel = (order.status === 'pending' || order.status === 'processing') && 
                  order.service_cancel && 
                  order.cancel_status !== 'requested';

                return (
                  <div key={order.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-sm text-text-primary">#{order.id}</span>
                        <span className="text-[10px] text-text-muted">
                          {new Date(order.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div>{getStatusBadge(order.status)}</div>
                    </div>

                    <div>
                      <div className="font-bold text-xs text-text-primary leading-snug line-clamp-2">
                        {order.service_name}
                      </div>
                      {order.category_name && (
                        <div className="text-[10px] text-primary flex items-center gap-1 mt-0.5">
                          <Layers size={10} />
                          {order.category_name}
                        </div>
                      )}
                    </div>

                    <div className="p-2 rounded-xl bg-bg-surface-elevated border border-border-main flex items-center justify-between text-xs">
                      <span className="text-text-muted truncate max-w-[200px] text-[11px]">{order.link}</span>
                      <a 
                        href={order.link?.startsWith('http') ? order.link : `https://${order.link}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-primary hover:opacity-80 p-1 flex-shrink-0"
                      >
                        <ExternalLink size={13} />
                      </a>
                    </div>

                    <div className="grid grid-cols-3 gap-2 py-1 text-center bg-bg-surface-elevated/50 rounded-xl p-2 border border-border-subtle">
                      <div>
                        <div className="text-[10px] text-text-muted uppercase">Qty</div>
                        <div className="font-mono font-bold text-xs text-text-primary mt-0.5">
                          {order.quantity?.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-text-muted uppercase">Charge</div>
                        <div className="font-mono font-bold text-xs text-text-primary mt-0.5">
                          {formatPrice(order.charge || 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-text-muted uppercase">Remains</div>
                        <div className="font-mono font-bold text-xs text-amber-500 mt-0.5">
                          {order.remains || 0}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => { setSelectedOrder(order); setDetailsModalOpen(true); }}
                        className="px-3 py-1.5 rounded-lg bg-bg-surface-elevated hover:bg-bg-surface-hover text-text-secondary text-xs font-semibold border border-border-main flex items-center gap-1"
                      >
                        <Eye size={13} /> Details
                      </button>

                      {canRefill && (
                        <button
                          onClick={() => handleRefill(order.id)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 text-xs font-semibold border border-emerald-500/20 flex items-center gap-1"
                        >
                          <RotateCcw size={13} /> Refill
                        </button>
                      )}

                      {canCancel && (
                        <button
                          onClick={() => handleCancel(order.id)}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-500 text-xs font-semibold border border-rose-500/20 flex items-center gap-1"
                        >
                          <Ban size={13} /> Cancel
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border-main flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-muted">
            <div>Page {page} of {totalPages}</div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 bg-bg-surface-elevated hover:bg-bg-surface-hover border border-border-main rounded-lg text-text-primary disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 bg-bg-surface-elevated hover:bg-bg-surface-hover border border-border-main rounded-lg text-text-primary disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Customer Order Details Modal */}
      {detailsModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay-bg backdrop-blur-sm animate-fadeIn">
          <div className="bg-bg-surface border border-border-main rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-border-main flex items-center justify-between">
              <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <ShoppingCart className="text-primary" size={19} />
                Order #{selectedOrder.id}
              </h2>
              <button 
                onClick={() => setDetailsModalOpen(false)}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="flex items-center justify-between bg-bg-surface-elevated p-3 rounded-xl border border-border-subtle">
                <span className="text-text-muted font-medium">Status</span>
                <span>{getStatusBadge(selectedOrder.status)}</span>
              </div>

              <div>
                <div className="text-text-muted font-medium mb-1">Service:</div>
                <div className="text-text-primary font-semibold">{selectedOrder.service_name}</div>
              </div>

              <div>
                <div className="text-text-muted font-medium mb-1">Link:</div>
                <div className="p-2.5 rounded-xl bg-bg-surface-elevated border border-border-subtle break-all font-mono text-text-primary">
                  {selectedOrder.link}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-bg-surface-elevated p-3 rounded-xl border border-border-subtle font-mono">
                <div>
                  <div className="text-text-muted text-[10px]">Quantity</div>
                  <div className="text-text-primary font-bold text-sm mt-0.5">{selectedOrder.quantity?.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-text-muted text-[10px]">Amount Charged</div>
                  <div className="text-primary font-bold text-sm mt-0.5">{formatPrice(selectedOrder.charge || 0)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-bg-surface-elevated p-3 rounded-xl border border-border-subtle font-mono">
                <div>
                  <div className="text-text-muted text-[10px]">Start Count</div>
                  <div className="text-text-primary font-bold text-sm mt-0.5">{selectedOrder.start_count || 0}</div>
                </div>
                <div>
                  <div className="text-text-muted text-[10px]">Remains</div>
                  <div className="text-amber-500 font-bold text-sm mt-0.5">{selectedOrder.remains || 0}</div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-border-main flex justify-end">
              <button
                onClick={() => setDetailsModalOpen(false)}
                className="btn-gradient text-xs px-4 py-2 rounded-xl"
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
