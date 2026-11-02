import { useState, useEffect } from 'react';
import api from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { 
  Package, Plus, Edit2, Trash2, CheckCircle2, XCircle, 
  Search, RefreshCw, Layers, Server, DollarSign, Clock, 
  RotateCcw, Ban, Sparkles, Filter, ChevronDown, Check, X
} from 'lucide-react';

export default function AdminServicesPage() {
  const { showToast } = useAuth();
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [providers, setProviders] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0, provider_services: 0, manual_services: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProvider, setSelectedProvider] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [search, setSearch] = useState('');

  // Bulk Selection
  const [selectedServices, setSelectedServices] = useState([]);
  const [bulkAction, setBulkAction] = useState('');

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State - Matches admin_service_create.png
  const [form, setForm] = useState({
    category_id: '',
    name: '',
    type: 'default',
    provider_id: '',
    provider_service_id: '',
    original_rate: 0,
    rate: 0,
    min_quantity: 100,
    max_quantity: 10000,
    avg_time: '0-1 hours',
    dripfeed: 0,
    refill: 0,
    cancel: 0,
    status: 'active',
    description: '',
    sort_order: 0
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [svcRes, catRes, platRes, provRes] = await Promise.all([
        api.admin.getServices(),
        api.admin.getCategories(),
        api.admin.getSocialMedia(),
        api.admin.getProviders()
      ]);
      setServices(svcRes.services || []);
      setStats(svcRes.stats || { total: svcRes.services?.length || 0 });
      setCategories(catRes.categories || []);
      setPlatforms(platRes.platforms || []);
      setProviders(provRes.providers || []);
    } catch (err) {
      console.error('Failed to load services:', err);
      showToast(err.message || 'Failed to load services', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
    setEditingService(null);
    setForm({
      category_id: categories[0]?.id || '',
      name: '',
      type: 'default',
      provider_id: '',
      provider_service_id: '',
      original_rate: 0,
      rate: 1.00,
      min_quantity: 100,
      max_quantity: 10000,
      avg_time: '0-1 hours',
      dripfeed: 0,
      refill: 1,
      cancel: 1,
      status: 'active',
      description: '',
      sort_order: services.length + 1
    });
    setModalOpen(true);
  };

  const openEditModal = (service) => {
    setEditingService(service);
    setForm({
      category_id: service.category_id || '',
      name: service.name || '',
      type: service.type || 'default',
      provider_id: service.provider_id || '',
      provider_service_id: service.provider_service_id || '',
      original_rate: service.original_rate || 0,
      rate: service.rate || 0,
      min_quantity: service.min_quantity || 100,
      max_quantity: service.max_quantity || 10000,
      avg_time: service.avg_time || '0-1 hours',
      dripfeed: service.dripfeed ? 1 : 0,
      refill: service.refill ? 1 : 0,
      cancel: service.cancel ? 1 : 0,
      status: service.status || 'active',
      description: service.description || '',
      sort_order: service.sort_order || 0
    });
    setModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Service name is required', 'error');
      return;
    }
    if (!form.category_id) {
      showToast('Category is required', 'error');
      return;
    }
    if (parseFloat(form.rate) <= 0) {
      showToast('Selling rate must be greater than 0', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...form,
        category_id: parseInt(form.category_id),
        rate: parseFloat(form.rate),
        original_rate: parseFloat(form.original_rate) || 0,
        min_quantity: parseInt(form.min_quantity) || 1,
        max_quantity: parseInt(form.max_quantity) || 10000,
        provider_id: form.provider_id ? parseInt(form.provider_id) : null,
        provider_service_id: form.provider_service_id || null,
        sort_order: parseInt(form.sort_order) || 0
      };

      if (editingService) {
        await api.admin.updateService(editingService.id, payload);
        showToast(`Service "${form.name}" updated successfully`);
      } else {
        await api.admin.createService(payload);
        showToast(`Service "${form.name}" created successfully`);
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to save service', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (service) => {
    try {
      const res = await api.admin.toggleServiceStatus(service.id);
      showToast(res.message || 'Service status updated');
      setServices(prev => prev.map(s => s.id === service.id ? { ...s, status: res.status } : s));
    } catch (err) {
      showToast(err.message || 'Failed to toggle status', 'error');
    }
  };

  const handleDelete = async (service) => {
    if (!window.confirm(`Are you sure you want to delete service "${service.name}"?`)) {
      return;
    }
    try {
      await api.admin.deleteService(service.id);
      showToast(`Service deleted successfully`);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to delete service', 'error');
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedServices(filteredServices.map(s => s.id));
    } else {
      setSelectedServices([]);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedServices(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleExecuteBulkAction = async () => {
    if (!bulkAction) return;
    if (selectedServices.length === 0) {
      showToast('Select at least one service first', 'error');
      return;
    }

    try {
      await api.admin.bulkActionServices({
        action: bulkAction,
        service_ids: selectedServices
      });
      showToast(`Bulk action applied to ${selectedServices.length} services`);
      setSelectedServices([]);
      setBulkAction('');
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to apply bulk action', 'error');
    }
  };

  const filteredServices = services.filter(s => {
    const matchesPlatform = selectedPlatform === 'all' || s.social_media_id?.toString() === selectedPlatform;
    const matchesCategory = selectedCategory === 'all' || s.category_id?.toString() === selectedCategory;
    const matchesProvider = selectedProvider === 'all' || 
      (selectedProvider === 'manual' && !s.provider_id) || 
      (s.provider_id?.toString() === selectedProvider);
    const matchesStatus = selectedStatus === 'all' || s.status === selectedStatus;
    const matchesSearch = !search || 
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      String(s.id).includes(search) ||
      (s.category_name && s.category_name.toLowerCase().includes(search.toLowerCase()));
    return matchesPlatform && matchesCategory && matchesProvider && matchesStatus && matchesSearch;
  });

  return (
    <div className="admin-page space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5 font-medium">
            <span>Dashboard</span>
            <span>/</span>
            <span>Service</span>
            <span>/</span>
            <span className="text-indigo-400">Services List</span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Package className="text-indigo-400" size={26} />
            Services Management
          </h1>
        </div>
        <div className="flex items-center gap-2.5">
          <button 
            onClick={fetchData}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white transition border border-slate-700/60"
            title="Refresh"
          >
            <RefreshCw size={17} />
          </button>
          <button 
            onClick={openAddModal}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-medium shadow-lg shadow-indigo-500/20 transition flex items-center gap-2"
          >
            <Plus size={18} />
            Add Service
          </button>
        </div>
      </div>

      {/* Stat Cards - Matches admin_service.png */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 backdrop-blur-sm">
          <div className="text-xs uppercase font-semibold text-slate-400">Total</div>
          <div className="text-2xl font-extrabold text-white mt-1">{stats.total}</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 backdrop-blur-sm">
          <div className="text-xs uppercase font-semibold text-emerald-400">Active</div>
          <div className="text-2xl font-extrabold text-white mt-1">{stats.active || 0}</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 backdrop-blur-sm">
          <div className="text-xs uppercase font-semibold text-rose-400">Inactive</div>
          <div className="text-2xl font-extrabold text-white mt-1">{stats.inactive || 0}</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 backdrop-blur-sm">
          <div className="text-xs uppercase font-semibold text-indigo-400">API Provider</div>
          <div className="text-2xl font-extrabold text-white mt-1">{stats.provider_services || 0}</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 backdrop-blur-sm col-span-2 sm:col-span-1">
          <div className="text-xs uppercase font-semibold text-amber-400">Manual</div>
          <div className="text-2xl font-extrabold text-white mt-1">{stats.manual_services || 0}</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 shadow-xl">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Platform Filter */}
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="text-xs py-1.5 px-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Platforms</option>
            {platforms.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs py-1.5 px-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500 max-w-xs"
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Provider Filter */}
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="text-xs py-1.5 px-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Providers</option>
            <option value="manual">Manual (No API)</option>
            {providers.map(pr => (
              <option key={pr.id} value={pr.id}>{pr.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs py-1.5 px-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search service name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Bulk Action Controls */}
      {selectedServices.length > 0 && (
        <div className="bg-indigo-950/60 border border-indigo-800/80 rounded-xl p-3 flex items-center justify-between text-xs animate-fadeIn">
          <div className="flex items-center gap-2 text-indigo-300 font-medium">
            <Check className="text-indigo-400" size={16} />
            <span>{selectedServices.length} services selected</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              className="py-1 px-3 bg-slate-900 border border-slate-700 rounded-lg text-white"
            >
              <option value="">-- Choose Bulk Action --</option>
              <option value="activate">Activate Selected</option>
              <option value="deactivate">Deactivate Selected</option>
              <option value="delete">Delete Selected</option>
            </select>
            <button
              onClick={handleExecuteBulkAction}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Main Services Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Package className="mx-auto mb-3 opacity-30" size={40} />
            <p className="text-base font-medium text-slate-300">No services found</p>
            <p className="text-xs mt-1">Adjust filters or create a new service.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/50 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="px-4 py-3.5 w-10 text-center">
                    <input 
                      type="checkbox"
                      checked={selectedServices.length > 0 && selectedServices.length === filteredServices.length}
                      onChange={handleSelectAll}
                      className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                    />
                  </th>
                  <th className="px-4 py-3.5 w-16">ID</th>
                  <th className="px-4 py-3.5 min-w-[260px]">Service Name</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Provider Mapping</th>
                  <th className="px-4 py-3.5">Rate / 1k</th>
                  <th className="px-4 py-3.5">Min / Max</th>
                  <th className="px-4 py-3.5 text-center">Features</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-right w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredServices.map(svc => {
                  const marginPct = svc.original_rate > 0 
                    ? Math.round(((svc.rate - svc.original_rate) / svc.original_rate) * 100)
                    : null;

                  return (
                    <tr key={svc.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-4 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={selectedServices.includes(svc.id)}
                          onChange={() => handleToggleSelect(svc.id)}
                          className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                        />
                      </td>
                      <td className="px-4 py-3.5 text-slate-400 font-mono font-medium">#{svc.id}</td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-white line-clamp-1">{svc.name}</div>
                        {svc.avg_time && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock size={11} className="text-slate-500" />
                            {svc.avg_time}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium">
                          <Layers size={11} className="text-indigo-400" />
                          {svc.category_name}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {svc.provider_name ? (
                          <div className="flex flex-col">
                            <span className="inline-flex items-center gap-1 text-indigo-400 font-semibold">
                              <Server size={11} />
                              {svc.provider_name}
                            </span>
                            <span className="text-[10px] text-slate-400">ID: {svc.provider_service_id || 'N/A'}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Manual</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-mono">
                        <div className="font-bold text-white">${parseFloat(svc.rate).toFixed(2)}</div>
                        {svc.original_rate > 0 && (
                          <div className="text-[10px] text-slate-400">
                            Cost: ${parseFloat(svc.original_rate).toFixed(2)}
                            {marginPct !== null && (
                              <span className={`ml-1 font-semibold ${marginPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                ({marginPct >= 0 ? '+' : ''}{marginPct}%)
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-slate-400 font-mono">
                        {svc.min_quantity.toLocaleString()} / {svc.max_quantity.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          {svc.refill ? (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold" title="Refill Supported">
                              Refill
                            </span>
                          ) : null}
                          {svc.cancel ? (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold" title="Cancel Supported">
                              Cancel
                            </span>
                          ) : null}
                          {svc.dripfeed ? (
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold" title="Dripfeed Supported">
                              Drip
                            </span>
                          ) : null}
                          {!svc.refill && !svc.cancel && !svc.dripfeed && (
                            <span className="text-slate-600">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => handleToggleStatus(svc)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            svc.status === 'active' ? 'bg-indigo-600' : 'bg-slate-700'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              svc.status === 'active' ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(svc)}
                            className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 transition"
                            title="Edit Service"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(svc)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
                            title="Delete Service"
                          >
                            <Trash2 size={13} />
                          </button>
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

      {/* Add / Edit Service Modal - Matches admin_service_create.png */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl my-8">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Package className="text-indigo-400" size={20} />
                {editingService ? 'Edit Service' : 'Create Service'}
              </h2>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Category <span className="text-rose-400">*</span>
                  </label>
                  <select
                    required
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Select Category --</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.social_media_name ? `(${c.social_media_name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Service Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Service Type
                  </label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="default">Default</option>
                    <option value="package">Package</option>
                    <option value="custom_comments">Custom Comments</option>
                    <option value="subscriptions">Subscriptions</option>
                  </select>
                </div>
              </div>

              {/* Service Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Service Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Instagram Followers [Non-Drop | High Quality | Instant]"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* API Provider Assignment */}
              <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-3">
                <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Server size={14} />
                  Wholesale API Provider Mapping
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Provider
                    </label>
                    <select
                      value={form.provider_id}
                      onChange={(e) => setForm({ ...form, provider_id: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">Manual (No External API)</option>
                      {providers.map(pr => (
                        <option key={pr.id} value={pr.id}>{pr.name} ({pr.currency})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Provider Service ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1042"
                      value={form.provider_service_id}
                      onChange={(e) => setForm({ ...form, provider_service_id: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing & Margin Calculator */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Original Rate (Cost / 1k)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    placeholder="0.00"
                    value={form.original_rate}
                    onChange={(e) => setForm({ ...form, original_rate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Selling Rate ($ / 1k) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    required
                    placeholder="1.50"
                    value={form.rate}
                    onChange={(e) => setForm({ ...form, rate: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Profit Margin
                  </label>
                  <div className="w-full px-3 py-2 text-xs bg-slate-800/60 border border-slate-700 rounded-xl text-emerald-400 font-mono font-bold flex items-center justify-between">
                    <span>
                      {form.original_rate > 0 
                        ? `${Math.round(((form.rate - form.original_rate) / form.original_rate) * 100)}%`
                        : '100%'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      +${(form.rate - (form.original_rate || 0)).toFixed(2)}/1k
                    </span>
                  </div>
                </div>
              </div>

              {/* Quantity Bounds */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Min Quantity <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.min_quantity}
                    onChange={(e) => setForm({ ...form, min_quantity: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Max Quantity <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.max_quantity}
                    onChange={(e) => setForm({ ...form, max_quantity: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Average Speed / Time
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 0-1 hours"
                    value={form.avg_time}
                    onChange={(e) => setForm({ ...form, avg_time: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Feature Toggles */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form.refill}
                    onChange={(e) => setForm({ ...form, refill: e.target.checked ? 1 : 0 })}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <span className="text-xs font-medium text-slate-200">Refill Allowed</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form.cancel}
                    onChange={(e) => setForm({ ...form, cancel: e.target.checked ? 1 : 0 })}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <span className="text-xs font-medium text-slate-200">Cancel Allowed</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!form.dripfeed}
                    onChange={(e) => setForm({ ...form, dripfeed: e.target.checked ? 1 : 0 })}
                    className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <span className="text-xs font-medium text-slate-200">Dripfeed Allowed</span>
                </label>
              </div>

              {/* Status and Sort */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Service Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Service Description & Instructions
                </label>
                <textarea
                  rows="3"
                  placeholder="Specify speed, guarantee, refill window, instructions for the link format..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-xs text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl font-medium shadow-lg shadow-indigo-600/20 transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingService ? 'Save Changes' : 'Create Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
