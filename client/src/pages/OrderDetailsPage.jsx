import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useSystem } from '../contexts/SystemContext';
import { ArrowLeft, ExternalLink, Package, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import Breadcrumbs from '../components/ui/Breadcrumbs';

export default function OrderDetailsPage() {
  const { id } = useParams();
  const { formatPrice } = useSystem();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const data = await api.orders.getById(id);
        setOrder(data.order || data);
      } catch (err) {
        setError(err.message || 'Failed to fetch order details');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  const statusSteps = ['pending', 'processing', 'in_progress', 'completed'];
  const getStatusIndex = (status) => {
    if (status === 'cancelled' || status === 'partial' || status === 'refunded') return -1;
    return statusSteps.indexOf(status);
  };

  if (loading) return <LoadingSpinner fullPage />;
  if (error) return (
    <div className="p-6 text-center max-w-md mx-auto my-12 bg-bg-surface border border-border-main rounded-2xl shadow-xl">
      <p className="text-sm text-rose-500 font-semibold mb-4">{error}</p>
      <Link to="/dashboard/orders" className="btn-gradient text-xs px-4 py-2 inline-flex items-center gap-1.5 rounded-xl">
        <ArrowLeft size={14} /> Back to Orders
      </Link>
    </div>
  );
  if (!order) return null;

  const currentStatusIndex = getStatusIndex(order.status);

  return (
    <div className="order-details-page space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div>
        <Breadcrumbs items={[{ label: 'Orders', href: '/dashboard/orders' }, { label: `Order #${order.id || id}` }]} />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2">
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Package size={24} className="text-primary" />
            Order <span className="gradient-text">#{order.id || id}</span>
          </h1>
          <Link to="/dashboard/orders" className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-semibold">
            <ArrowLeft size={14} /> Back to All Orders
          </Link>
        </div>
      </div>

      {/* Progress Tracker (for active pipeline) */}
      {order.status !== 'cancelled' && order.status !== 'partial' && order.status !== 'refunded' && (
        <div className="bg-bg-surface border border-border-main rounded-2xl p-5 shadow-md">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-4">Order Fulfillment Progress</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative">
            {statusSteps.map((step, i) => {
              const isPastOrCurrent = i <= currentStatusIndex;
              const isCurrent = i === currentStatusIndex;
              return (
                <div
                  key={step}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    isCurrent
                      ? 'bg-primary/10 border-primary text-primary font-bold shadow-sm'
                      : isPastOrCurrent
                      ? 'bg-bg-surface-elevated border-emerald-500/30 text-emerald-500 font-semibold'
                      : 'bg-bg-surface-elevated/40 border-border-subtle text-text-muted opacity-60'
                  }`}
                >
                  <div className="flex justify-center mb-1">
                    {isPastOrCurrent ? <CheckCircle2 size={16} /> : <div className="w-4 h-4 rounded-full border border-border-main" />}
                  </div>
                  <span className="text-xs capitalize">{step.replace('_', ' ')}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Service & Target Link */}
        <div className="bg-bg-surface border border-border-main rounded-2xl p-5 shadow-md space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted border-b border-border-subtle pb-2.5">
            Target & Parameters
          </h3>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-text-muted block text-[11px] mb-0.5">Service:</span>
              <span className="font-bold text-text-primary text-sm">{order.service_name || 'Social Media Service'}</span>
            </div>
            <div>
              <span className="text-text-muted block text-[11px] mb-0.5">Target Link:</span>
              <div className="p-2.5 rounded-xl bg-bg-surface-elevated border border-border-main flex items-center justify-between gap-2">
                <span className="text-text-primary font-mono truncate text-[11px]">{order.link}</span>
                <a
                  href={order.link?.startsWith('http') ? order.link : `https://${order.link}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:opacity-80 p-0.5"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-bg-surface-elevated/50 border border-border-subtle text-center">
              <div>
                <span className="text-[10px] text-text-muted uppercase">Quantity</span>
                <div className="font-mono font-bold text-sm text-text-primary mt-0.5">{order.quantity?.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-[10px] text-text-muted uppercase">Start</span>
                <div className="font-mono font-bold text-sm text-text-primary mt-0.5">{order.start_count || 0}</div>
              </div>
              <div>
                <span className="text-[10px] text-text-muted uppercase">Remains</span>
                <div className="font-mono font-bold text-sm text-amber-500 mt-0.5">{order.remains || 0}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Financial & Status Information */}
        <div className="bg-bg-surface border border-border-main rounded-2xl p-5 shadow-md space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted border-b border-border-subtle pb-2.5">
            Financial & Timestamps
          </h3>
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Total Charged:</span>
              <span className="font-mono font-extrabold text-base text-primary">
                {formatPrice(order.charge || order.amount || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Current Status:</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold capitalize bg-primary/10 text-primary border border-primary/20">
                {order.status}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Created Timestamp:</span>
              <span className="font-mono text-text-primary">
                {new Date(order.created_at || order.createdAt).toLocaleString()}
              </span>
            </div>
            {order.updated_at && (
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Last Updated:</span>
                <span className="font-mono text-text-primary">
                  {new Date(order.updated_at || order.updatedAt).toLocaleString()}
                </span>
              </div>
            )}
            <div className="pt-2 border-t border-border-subtle">
              <Link
                to="/dashboard/tickets"
                className="w-full text-center block py-2 rounded-xl bg-bg-surface-elevated hover:bg-bg-surface-hover text-text-secondary text-xs font-semibold border border-border-main transition"
              >
                Need help with this order? Open a Support Ticket
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
