import { useState, useEffect } from 'react';
import api from '../../utils/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';
import { 
  FolderTree, Plus, Edit2, Trash2, CheckCircle2, XCircle, 
  Layers, Search, RefreshCw, Share2, MoreVertical 
} from 'lucide-react';

export default function AdminCategoriesPage() {
  const { showToast } = useAuth();
  const [categories, setCategories] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [form, setForm] = useState({
    name: '',
    social_media_id: '',
    icon: '📦',
    sort_order: 0,
    status: 'active'
  });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [catRes, platRes] = await Promise.all([
        api.admin.getCategories(),
        api.admin.getSocialMedia()
      ]);
      setCategories(catRes.categories || []);
      setStats(catRes.stats || {
        total: catRes.categories?.length || 0,
        active: catRes.categories?.filter(c => c.status === 'active').length || 0,
        inactive: catRes.categories?.filter(c => c.status === 'inactive').length || 0
      });
      setPlatforms(platRes.platforms || []);
    } catch (err) {
      console.error('Failed to load categories:', err);
      showToast(err.message || 'Failed to load categories', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openAddModal = () => {
    setEditingCategory(null);
    setForm({
      name: '',
      social_media_id: platforms[0]?.id || '',
      icon: '📦',
      sort_order: categories.length + 1,
      status: 'active'
    });
    setModalOpen(true);
  };

  const openEditModal = (cat) => {
    setEditingCategory(cat);
    setForm({
      name: cat.name,
      social_media_id: cat.social_media_id || '',
      icon: cat.icon || '📦',
      sort_order: cat.sort_order || 0,
      status: cat.status || 'active'
    });
    setModalOpen(true);
    setActiveDropdown(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Category name is required', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...form,
        social_media_id: form.social_media_id ? parseInt(form.social_media_id) : null,
        sort_order: parseInt(form.sort_order) || 0
      };

      if (editingCategory) {
        await api.admin.updateCategory(editingCategory.id, payload);
        showToast(`Category "${form.name}" updated successfully`);
      } else {
        await api.admin.createCategory(payload);
        showToast(`Category "${form.name}" created successfully`);
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to save category', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (cat) => {
    const newStatus = cat.status === 'active' ? 'inactive' : 'active';
    try {
      await api.admin.updateCategory(cat.id, { status: newStatus });
      showToast(`Category marked as ${newStatus}`);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to update category status', 'error');
    } finally {
      setActiveDropdown(null);
    }
  };

  const handleDelete = async (cat) => {
    if (!window.confirm(`Are you sure you want to delete category "${cat.name}"?`)) {
      return;
    }
    try {
      await api.admin.deleteCategory(cat.id);
      showToast(`Category "${cat.name}" deleted successfully`);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Failed to delete category', 'error');
    } finally {
      setActiveDropdown(null);
    }
  };

  const filteredCategories = categories.filter(c => {
    const matchesPlatform = selectedPlatform === 'all' || 
      (selectedPlatform === 'unassigned' && !c.social_media_id) ||
      (c.social_media_id?.toString() === selectedPlatform);
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesSearch = !search || 
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.social_media_name && c.social_media_name.toLowerCase().includes(search.toLowerCase()));
    return matchesPlatform && matchesStatus && matchesSearch;
  });

  return (
    <div className="admin-page space-y-6">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5 font-medium">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-indigo-400">Category</span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <FolderTree className="text-indigo-400" size={26} />
            Categories
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
            Add Category
          </button>
        </div>
      </div>

      {/* Stat Cards - Matches admin_category.png */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex items-center justify-between backdrop-blur-sm">
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-slate-400">Total Categories</div>
            <div className="text-3xl font-extrabold text-white mt-1">{stats.total}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <FolderTree size={24} />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex items-center justify-between backdrop-blur-sm">
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-emerald-400">Active Categories</div>
            <div className="text-3xl font-extrabold text-white mt-1">{stats.active}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex items-center justify-between backdrop-blur-sm">
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-rose-400">Inactive Categories</div>
            <div className="text-3xl font-extrabold text-white mt-1">{stats.inactive}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <XCircle size={24} />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xl">
        <div className="flex flex-wrap items-center gap-3">
          {/* Social Platform Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400 font-medium">Platform:</label>
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="text-xs py-1.5 px-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Platforms</option>
              {platforms.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
              <option value="unassigned">Unassigned</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400 font-medium">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs py-1.5 px-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <FolderTree className="mx-auto mb-3 opacity-30" size={40} />
            <p className="text-base font-medium text-slate-300">No categories found</p>
            <p className="text-xs mt-1">Create categories to organize your SMM services.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/50 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="px-5 py-3.5 w-16">SL</th>
                  <th className="px-5 py-3.5 w-16 text-center">Icon</th>
                  <th className="px-5 py-3.5">Category Name</th>
                  <th className="px-5 py-3.5">Platform</th>
                  <th className="px-5 py-3.5">Services Count</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right w-32">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredCategories.map((cat, idx) => (
                  <tr key={cat.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-5 py-4 text-slate-400 font-medium">{idx + 1}</td>
                    <td className="px-5 py-4 text-center">
                      <span className="text-xl inline-block">{cat.icon || '📦'}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-white">{cat.name}</div>
                      <div className="text-xs text-slate-400">Sort: {cat.sort_order}</div>
                    </td>
                    <td className="px-5 py-4">
                      {cat.social_media_name ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
                          <Share2 size={13} />
                          {cat.social_media_name}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 italic">None</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300">
                        <Layers size={13} className="text-indigo-400" />
                        {cat.services_count || 0}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {cat.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="relative inline-flex items-center gap-1.5">
                        <button
                          onClick={() => openEditModal(cat)}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 text-xs font-medium border border-indigo-500/20 transition flex items-center gap-1"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                          Edit
                        </button>
                        <button
                          onClick={() => setActiveDropdown(activeDropdown === cat.id ? null : cat.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                        >
                          <MoreVertical size={15} />
                        </button>

                        {/* Dropdown Menu */}
                        {activeDropdown === cat.id && (
                          <div className="absolute right-0 top-full mt-1 w-44 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl py-1 z-30 text-left">
                            <button
                              onClick={() => handleToggleStatus(cat)}
                              className="w-full px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                            >
                              {cat.status === 'active' ? (
                                <>
                                  <XCircle size={14} className="text-amber-400" />
                                  Mark As Deactivate
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 size={14} className="text-emerald-400" />
                                  Mark As Active
                                </>
                              )}
                            </button>
                            <button
                              onClick={() => handleDelete(cat)}
                              className="w-full px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
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

      {/* Add / Edit Category Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FolderTree className="text-indigo-400" size={20} />
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </h2>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Social Media Platform
                </label>
                <select
                  value={form.social_media_id}
                  onChange={(e) => setForm({ ...form, social_media_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- No Platform (Unassigned) --</option>
                  {platforms.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Category Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Instagram Followers [Non Drop]"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Icon (Emoji or text)
                  </label>
                  <input
                    type="text"
                    value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
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
                    className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl font-medium shadow-lg shadow-indigo-600/20 transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

