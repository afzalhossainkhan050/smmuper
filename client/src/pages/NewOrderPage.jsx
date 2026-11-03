import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  ShoppingCart, Link as LinkIcon, Hash, DollarSign, 
  Layers, Clock, RotateCcw, Ban, AlertCircle, CheckCircle2,
  ListPlus, FileText, Sparkles, Wallet
} from 'lucide-react';

export default function NewOrderPage() {
  const { user, showToast, fetchProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const preselectedServiceId = searchParams.get('service_id');
  const [activeTab, setActiveTab] = useState('single'); // 'single' | 'mass'

  // Data
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Single Order State
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedService, setSelectedService] = useState(null);
  const [form, setForm] = useState({ service_id: '', link: '', quantity: '', comments: '' });
  const [submitting, setSubmitting] = useState(false);

  // Mass Order State
  const [massOrdersText, setMassOrdersText] = useState('');
  const [submittingMass, setSubmittingMass] = useState(false);
  const [massResult, setMassResult] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [servicesData, categoriesData] = await Promise.all([
          api.services.getAll(),
          api.services.getCategories(),
        ]);
        const svcs = servicesData.services || servicesData || [];
        const cats = categoriesData.categories || categoriesData || [];
        setServices(svcs);
        setCategories(cats);

        if (preselectedServiceId) {
          const found = svcs.find(s => String(s.id) === String(preselectedServiceId) || String(s.service_id) === String(preselectedServiceId));
          if (found) {
            setSelectedCategory(found.category_id?.toString() || '');
            setSelectedService(found);
            const minQty = found.min_quantity || found.min || 100;
            setForm({ service_id: String(found.id), link: '', quantity: String(minQty), comments: '' });
          } else if (cats.length > 0) {
            setSelectedCategory(cats[0].id?.toString() || '');
          }
        } else if (cats.length > 0) {
          setSelectedCategory(cats[0].id?.toString() || '');
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [preselectedServiceId]);

  const filteredServices = selectedCategory
    ? services.filter((s) => s.category_id?.toString() === selectedCategory || s.category === selectedCategory)
    : services;

  const handleCategoryChange = (catId) => {
    setSelectedCategory(catId);
    setSelectedService(null);
    setForm(prev => ({ ...prev, service_id: '', quantity: '' }));
  };

  const handleServiceChange = (serviceId) => {
    const service = services.find((s) => s.id?.toString() === serviceId);
    setSelectedService(service || null);
    const minQty = service?.min_quantity || 100;
    setForm(prev => ({ ...prev, service_id: serviceId, quantity: minQty.toString() }));
  };

  const calculatePrice = () => {
    if (!selectedService || !form.quantity) return '0.00';
    const rate = parseFloat(selectedService.rate || 0);
    const qty = parseInt(form.quantity) || 0;
    return ((rate / 1000) * qty).toFixed(2);
  };

  const singleOrderCost = parseFloat(calculatePrice());
  const userBalance = parseFloat(user?.balance || 0);
  const hasSufficientBalance = userBalance >= singleOrderCost;

  const handleSingleOrderSubmit = async (e) => {
    e.preventDefault();
    if (!form.service_id || !form.link || !form.quantity) {
      showToast('Please fill in all required fields', 'error');
      return;
    }
    const qty = parseInt(form.quantity);
    if (selectedService) {
      if (qty < selectedService.min_quantity) {
        showToast(`Minimum quantity is ${selectedService.min_quantity}`, 'error');
        return;
      }
      if (qty > selectedService.max_quantity) {
        showToast(`Maximum quantity is ${selectedService.max_quantity}`, 'error');
        return;
      }
    }
    if (!hasSufficientBalance) {
      showToast(`Insufficient balance. Please add funds to your wallet.`, 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.orders.create({
        service_id: parseInt(form.service_id),
        link: form.link.trim(),
        quantity: qty,
        comments: form.comments || undefined
      });
      showToast(`Order #${res.order?.id || ''} placed successfully!`);
      setForm(prev => ({ ...prev, link: '', comments: '' }));
      fetchProfile();
    } catch (err) {
      showToast(err.message || 'Failed to place order', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMassOrderSubmit = async (e) => {
    e.preventDefault();
    if (!massOrdersText.trim()) {
      showToast('Please enter at least one order line', 'error');
      return;
    }

    setSubmittingMass(true);
    setMassResult(null);
    try {
      const res = await api.orders.createMass({ orders: massOrdersText });
      setMassResult(res);
      showToast(res.message || `Mass orders placed successfully!`);
      setMassOrdersText('');
      fetchProfile();
    } catch (err) {
      showToast(err.message || 'Failed to place mass orders', 'error');
    } finally {
      setSubmittingMass(false);
    }
  };

  if (loading) return <LoadingSpinner fullPage />;

  return (
    <div className="new-order-page space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <ShoppingCart className="text-indigo-400" size={26} />
            New <span className="gradient-text">Order</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Select high-quality wholesale services and place your order instantly.</p>
        </div>

        {/* Live Wallet Balance Pill */}
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Wallet size={16} />
          </div>
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Available Balance</div>
            <div className="text-sm font-bold text-emerald-400 font-mono">${userBalance.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Tabs: Single Order vs Mass Order */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('single')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'single'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white bg-slate-800/60'
          }`}
        >
          <ShoppingCart size={15} />
          Single Order
        </button>
        <button
          onClick={() => setActiveTab('mass')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'mass'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'text-slate-400 hover:text-white bg-slate-800/60'
          }`}
        >
          <ListPlus size={15} />
          Mass Order
        </button>
      </div>

      {/* Single Order Form */}
      {activeTab === 'single' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-slate-800 bg-slate-900/60 shadow-xl">
            <form onSubmit={handleSingleOrderSubmit} className="space-y-4">
              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Layers size={14} className="text-indigo-400" />
                  Category <span className="text-rose-400">*</span>
                </label>
                <select
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  value={selectedCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                >
                  <option value="">-- Choose Category --</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon || '📦'} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Service */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-indigo-400" />
                  Service <span className="text-rose-400">*</span>
                </label>
                <select
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  value={form.service_id}
                  onChange={(e) => handleServiceChange(e.target.value)}
                >
                  <option value="">-- Choose Service --</option>
                  {filteredServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      #{s.id} - {s.name} (${parseFloat(s.rate).toFixed(2)}/1k)
                    </option>
                  ))}
                </select>
              </div>

              {/* Service Details Card */}
              {selectedService && (
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/80 space-y-2.5 animate-fadeIn">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/60 pb-2">
                    <span className="text-xs font-bold text-white">{selectedService.name}</span>
                    <span className="text-xs font-bold text-emerald-400 font-mono">
                      ${parseFloat(selectedService.rate).toFixed(2)} / 1,000
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-300 font-mono">
                    <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      <div className="text-[10px] text-slate-500">Min Order</div>
                      <div className="font-bold">{selectedService.min_quantity?.toLocaleString()}</div>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      <div className="text-[10px] text-slate-500">Max Order</div>
                      <div className="font-bold">{selectedService.max_quantity?.toLocaleString()}</div>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      <div className="text-[10px] text-slate-500">Avg Speed</div>
                      <div className="font-bold truncate">{selectedService.avg_time || 'Instant'}</div>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      <div className="text-[10px] text-slate-500">Guarantee</div>
                      <div className="font-bold text-indigo-400">
                        {selectedService.refill ? 'Refill Active' : 'No Refill'}
                      </div>
                    </div>
                  </div>

                  {selectedService.description && (
                    <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-700/40 leading-relaxed whitespace-pre-line">
                      {selectedService.description}
                    </div>
                  )}
                </div>
              )}

              {/* Link Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <LinkIcon size={14} className="text-indigo-400" />
                  Target Link or Username <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  placeholder="https://instagram.com/p/xxx or username"
                  value={form.link}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                />
              </div>

              {/* Quantity Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Hash size={14} className="text-indigo-400" />
                  Quantity <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  required
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                  placeholder={selectedService ? `${selectedService.min_quantity} - ${selectedService.max_quantity}` : '100'}
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  min={selectedService?.min_quantity || 1}
                  max={selectedService?.max_quantity || 100000}
                />
              </div>

              {/* Price Preview Card */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-indigo-950/40 border border-indigo-900/40 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400 font-medium">Estimated Charge</div>
                  <div className="text-2xl font-extrabold text-white font-mono mt-0.5">${calculatePrice()}</div>
                </div>
                {!hasSufficientBalance && (
                  <div className="text-right">
                    <span className="text-[11px] text-rose-400 font-semibold block">Insufficient Balance</span>
                    <span className="text-[10px] text-slate-400">Please deposit funds</span>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || !hasSufficientBalance || !selectedService}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Placing Order...
                  </>
                ) : (
                  <>
                    <ShoppingCart size={16} />
                    Place Order Now
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Quick Helpful Tips Side Card */}
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                <AlertCircle size={15} className="text-indigo-400" />
                Ordering Best Practices
              </h3>
              <ul className="space-y-2 text-slate-400 list-disc pl-4 leading-relaxed">
                <li>Make sure your social media account is <strong className="text-white">public</strong>, not private.</li>
                <li>Do not change your username or target URL while an order is in progress.</li>
                <li>Do not submit multiple simultaneous orders for the same link until the first finishes.</li>
                <li>Services with <strong className="text-emerald-400">Refill</strong> include automatic or on-demand drop protection.</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        /* Mass Order Form */
        <div className="glass-card rounded-2xl p-6 border border-slate-800 bg-slate-900/60 shadow-xl space-y-4 max-w-3xl">
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 space-y-2">
            <div className="font-bold text-white flex items-center gap-1.5">
              <FileText size={15} className="text-indigo-400" />
              Mass Order Format Guide:
            </div>
            <p className="text-slate-400 leading-relaxed font-mono">
              One order per line formatted as: <span className="text-indigo-400 font-bold">service_id | link | quantity</span>
            </p>
            <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 text-slate-300 font-mono text-[11px] leading-relaxed">
              101 | https://instagram.com/p/xxx | 1000<br />
              101 | https://instagram.com/p/yyy | 2500<br />
              205 | https://facebook.com/post/zzz | 500
            </div>
          </div>

          <form onSubmit={handleMassOrderSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Mass Orders Input (Up to 200 orders per batch)
              </label>
              <textarea
                required
                rows="8"
                value={massOrdersText}
                onChange={(e) => setMassOrdersText(e.target.value)}
                placeholder="101 | https://instagram.com/p/xxx | 1000"
                className="w-full p-3.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={submittingMass || !massOrdersText.trim()}
              className="py-3 px-6 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submittingMass ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  Processing Mass Batch...
                </>
              ) : (
                <>
                  <ListPlus size={15} />
                  Submit Mass Orders
                </>
              )}
            </button>
          </form>

          {/* Mass Order Result Preview */}
          {massResult && (
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3 animate-fadeIn text-xs">
              <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 size={16} />
                  {massResult.total_submitted} Orders Successfully Placed
                </span>
                <span className="font-mono font-bold text-white">
                  Total Charged: ${massResult.total_charged?.toFixed(2)}
                </span>
              </div>

              {massResult.failed_lines?.length > 0 && (
                <div className="space-y-1.5 text-rose-400">
                  <div className="font-bold text-xs">Failed Lines:</div>
                  {massResult.failed_lines.map((fl, idx) => (
                    <div key={idx} className="p-2 rounded bg-rose-950/40 border border-rose-900/60 font-mono text-[11px]">
                      Line {fl.line_number}: {fl.error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
