import React, { useState, useEffect } from 'react';
import {
  Menu as MenuIcon, Plus, Edit3, Trash2, CheckCircle2,
  ExternalLink, Globe, X, RefreshCw, ArrowUpDown
} from 'lucide-react';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminMenusPage() {
  const { showToast } = useAuth();

  const [loading, setLoading] = useState(true);
  const [menus, setMenus] = useState([]);
  const [activeLocation, setActiveLocation] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    location: 'header',
    title: '',
    url: '',
    sort_order: 0,
    target: '_self',
    status: 'active'
  });

  const loadMenus = async () => {
    try {
      setLoading(true);
      const res = await api.admin.getMenus(activeLocation === 'all' ? '' : `location=${activeLocation}`);
      setMenus(res.menus || []);
    } catch (err) {
      showToast(err.message || 'Failed to load menus', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenus();
  }, [activeLocation]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      location: activeLocation === 'footer' ? 'footer' : 'header',
      title: '',
      url: '',
      sort_order: menus.length + 1,
      target: '_self',
      status: 'active'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      location: item.location,
      title: item.title,
      url: item.url,
      sort_order: item.sort_order || 0,
      target: item.target || '_self',
      status: item.status || 'active'
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.url.trim()) {
      showToast('Title and URL are required', 'error');
      return;
    }

    try {
      setSaving(true);
      if (editingItem) {
        await api.admin.updateMenu(editingItem.id, formData);
        showToast('Menu item updated', 'success');
      } else {
        await api.admin.createMenu(formData);
        showToast('Menu item created', 'success');
      }
      setIsModalOpen(false);
      loadMenus();
    } catch (err) {
      showToast(err.message || 'Failed to save menu item', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    try {
      await api.admin.deleteMenu(deletingItem.id);
      showToast('Menu item deleted', 'success');
      setDeletingItem(null);
      loadMenus();
    } catch (err) {
      showToast(err.message || 'Failed to delete menu item', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MenuIcon className="w-7 h-7 text-indigo-400" />
            Navigation Menu Manager
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Customize header navigation links, footer directory menus, sort order, and targets.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium shadow-lg shadow-indigo-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Menu Link
        </button>
      </div>

      {/* Main Table Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          {['all', 'header', 'footer'].map(loc => (
            <button
              key={loc}
              onClick={() => setActiveLocation(loc)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                activeLocation === loc
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {loc === 'all' ? 'All Menus' : `${loc} Menu`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
            Loading menus...
          </div>
        ) : menus.length === 0 ? (
          <div className="py-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
            <MenuIcon className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-400">No navigation items defined</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Title</th>
                  <th className="pb-3 font-semibold">URL Destination</th>
                  <th className="pb-3 font-semibold">Location</th>
                  <th className="pb-3 font-semibold">Sort Order</th>
                  <th className="pb-3 font-semibold">Target</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {menus.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 font-semibold text-white">
                      {m.title}
                    </td>
                    <td className="py-3.5 font-mono text-xs text-indigo-400">
                      {m.url}
                    </td>
                    <td className="py-3.5 text-xs font-medium text-slate-300 capitalize">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700">
                        {m.location}
                      </span>
                    </td>
                    <td className="py-3.5 text-xs text-slate-300">
                      {m.sort_order}
                    </td>
                    <td className="py-3.5 font-mono text-xs text-slate-400">
                      {m.target}
                    </td>
                    <td className="py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        m.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                      }`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(m)}
                          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-indigo-400 transition-colors"
                          title="Edit Menu"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingItem(m)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Delete Menu"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <MenuIcon className="w-5 h-5 text-indigo-400" />
                {editingItem ? 'Edit Menu Link' : 'Add Menu Link'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Menu Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Services or API Docs"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  URL Link <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. /services or https://..."
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Location</label>
                  <select
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="header">Header Navigation</option>
                    <option value="footer">Footer Directory</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Sort Order</label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Window Target</label>
                  <select
                    value={formData.target}
                    onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="_self">Same Window (_self)</option>
                    <option value="_blank">New Tab (_blank)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white shadow-lg shadow-indigo-600/20"
                >
                  {saving ? 'Saving...' : 'Save Menu Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Delete Menu Link</h3>
            <p className="text-sm text-slate-300">
              Are you sure you want to delete <span className="font-semibold text-rose-400">"{deletingItem.title}"</span>?
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-medium text-white shadow-lg shadow-rose-600/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

