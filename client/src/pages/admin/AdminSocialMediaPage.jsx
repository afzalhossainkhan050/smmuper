import { useState, useEffect } from 'react';
import api from '../../utils/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Share2, Plus, Edit2, Trash2, CheckCircle2, XCircle, 
  GripVertical, MoreVertical, Layers, Search, RefreshCw, AlertCircle
} from 'lucide-react';

export default function AdminSocialMediaPage() {
  const { showToast } = useAuth();
  const [platforms, setPlatforms] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState(null);
  const [form, setForm] = useState({
    name: '',
    icon: 'share-2',
    slug: '',
    sort_order: 0,
    status: 'active'
  });
  const [saving, setSaving] = useState(false);

  const fetchPlatforms = async () => {
    try {
      setLoading(true);
      const res = await api.admin.getSocialMedia();
      setPlatforms(res.platforms || []);
      setStats(res.stats || {
        total: res.platforms?.length || 0,
        active: res.platforms?.filter(p => p.status === 'active').length || 0,
        inactive: res.platforms?.filter(p => p.status === 'inactive').length || 0
      });
    } catch (err) {
      console.error('Failed to load social media platforms:', err);
      showToast(err.message || 'Failed to load social media platforms', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlatforms();
  }, []);

  const openAddModal = () => {
    setEditingPlatform(null);
    setForm({
      name: '',
      icon: 'share-2',
      slug: '',
      sort_order: platforms.length + 1,
      status: 'active'
    });
    setModalOpen(true);
  };

  const openEditModal = (platform) => {
    setEditingPlatform(platform);
    setForm({
      name: platform.name,
      icon: platform.icon || 'share-2',
      slug: platform.slug || '',
      sort_order: platform.sort_order || 0,
      status: platform.status || 'active'
    });
    setModalOpen(true);
    setActiveDropdown(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Platform name is required', 'error');
      return;
    }

    try {
      setSaving(true);
      if (editingPlatform) {
        await api.admin.updateSocialMedia(editingPlatform.id, form);
        showToast(`Platform "${form.name}" updated successfully`);
      } else {
        await api.admin.createSocialMedia(form);
        showToast(`Platform "${form.name}" created successfully`);
      }
      setModalOpen(false);
      fetchPlatforms();
    } catch (err) {
      showToast(err.message || 'Failed to save social media platform', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (platform) => {
    const newStatus = platform.status === 'active' ? 'inactive' : 'active';
    try {
      await api.admin.updateSocialMedia(platform.id, { status: newStatus });
      showToast(`Platform marked as ${newStatus}`);
      fetchPlatforms();
    } catch (err) {
      showToast(err.message || 'Failed to update status', 'error');
    } finally {
      setActiveDropdown(null);
    }
  };

  const handleDelete = async (platform) => {
    if (!window.confirm(`Are you sure you want to delete "${platform.name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.admin.deleteSocialMedia(platform.id);
      showToast(`Platform "${platform.name}" deleted`);
      fetchPlatforms();
    } catch (err) {
      showToast(err.message || 'Failed to delete platform', 'error');
    } finally {
      setActiveDropdown(null);
    }
  };

  const filteredPlatforms = platforms.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.slug && p.slug.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="admin-page space-y-6">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-400 mb-1 flex items-center gap-1.5 font-medium">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-indigo-400">Social Media</span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Share2 className="text-indigo-400" size={26} />
            Social Media
          </h1>
        </div>
        <div className="flex items-center gap-2.5">
          <button 
            onClick={fetchPlatforms}
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
            Add Social Media
          </button>
        </div>
      </div>

      {/* Stat Cards - Matches admin_social_media.png */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex items-center justify-between backdrop-blur-sm">
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-slate-400">Total</div>
            <div className="text-3xl font-extrabold text-white mt-1">{stats.total}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Share2 size={24} />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex items-center justify-between backdrop-blur-sm">
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-emerald-400">Active</div>
            <div className="text-3xl font-extrabold text-white mt-1">{stats.active}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex items-center justify-between backdrop-blur-sm">
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-rose-400">Inactive</div>
            <div className="text-3xl font-extrabold text-white mt-1">{stats.inactive}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <XCircle size={24} />
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white text-base">Social Media Platforms</span>
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400">
              {filteredPlatforms.length}
            </span>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search platform..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner />
          </div>
        ) : filteredPlatforms.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Share2 className="mx-auto mb-3 opacity-30" size={40} />
            <p className="text-base font-medium text-slate-300">No platforms found</p>
            <p className="text-xs mt-1">Add your first social media platform to start categorizing services.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/50 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="px-5 py-3.5 w-16">SL</th>
                  <th className="px-5 py-3.5 w-12 text-center">Sort</th>
                  <th className="px-5 py-3.5 w-16 text-center">Icon</th>
                  <th className="px-5 py-3.5">Name</th>
                  <th className="px-5 py-3.5">Categories</th>
                  <th className="px-5 py-3.5">Services</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right w-32">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPlatforms.map((platform, idx) => (
                  <tr key={platform.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-5 py-4 text-slate-400 font-medium">{idx + 1}</td>
                    <td className="px-5 py-4 text-center">
                      <div className="cursor-grab text-slate-500 hover:text-slate-300 inline-block p-1">
                        <GripVertical size={16} />
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs mx-auto">
                        {platform.name.slice(0, 2).toUpperCase()}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-white">{platform.name}</div>
                      <div className="text-xs text-slate-400">/{platform.slug}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-xs font-medium text-slate-300">
                        <Layers size={13} className="text-indigo-400" />
                        {platform.categories_count || 0}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300">
                        {platform.services_count || 0}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {platform.status === 'active' ? (
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
                          onClick={() => openEditModal(platform)}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 text-xs font-medium border border-indigo-500/20 transition flex items-center gap-1"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                          Edit
                        </button>
                        <button
                          onClick={() => setActiveDropdown(activeDropdown === platform.id ? null : platform.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                        >
                          <MoreVertical size={15} />
                        </button>

                        {/* Action Dropdown - Matches reference screenshot */}
                        {activeDropdown === platform.id && (
                          <div className="absolute right-0 top-full mt-1 w-44 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl py-1 z-30 text-left">
                            <button
                              onClick={() => handleToggleStatus(platform)}
                              className="w-full px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                            >
                              {platform.status === 'active' ? (
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
                              onClick={() => handleDelete(platform)}
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

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Share2 className="text-indigo-400" size={20} />
                {editingPlatform ? 'Edit Social Media' : 'Add Social Media'}
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
                  Platform Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Instagram"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Slug / URL Key
                </label>
                <input
                  type="text"
                  placeholder="e.g. instagram"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Icon Identifier / Class
                </label>
                <input
                  type="text"
                  placeholder="e.g. instagram, facebook, youtube"
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                  {saving ? 'Saving...' : editingPlatform ? 'Save Changes' : 'Create Platform'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

