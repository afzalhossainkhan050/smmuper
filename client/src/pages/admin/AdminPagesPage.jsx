import React, { useState, useEffect } from 'react';
import {
  FileText, Plus, Search, Edit3, Trash2, CheckCircle2,
  ExternalLink, Globe, X, RefreshCw, Sparkles, Layers
} from 'lucide-react';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminPagesPage() {
  const { showToast } = useAuth();

  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState([]);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'create' | 'edit'
  const [editingPage, setEditingPage] = useState(null);
  const [deletingPage, setDeletingPage] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    title: '',
    content: '',
    meta_title: '',
    meta_description: '',
    meta_keywords: '',
    status: 'active'
  });

  const loadPages = async () => {
    try {
      setLoading(true);
      const res = await api.admin.getPages(`search=${search}`);
      setPages(res.pages || []);
    } catch (err) {
      showToast(err.message || 'Failed to load pages', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPages();
  }, [search]);

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      slug: '',
      title: '',
      content: '',
      meta_title: '',
      meta_description: '',
      meta_keywords: '',
      status: 'active'
    });
    setEditingPage(null);
    setViewMode('create');
  };

  const handleOpenEdit = (page) => {
    setEditingPage(page);
    setFormData({
      name: page.name,
      slug: page.slug,
      title: page.title,
      content: page.content || '',
      meta_title: page.meta_title || '',
      meta_description: page.meta_description || '',
      meta_keywords: page.meta_keywords || '',
      status: page.status || 'active'
    });
    setViewMode('edit');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.slug.trim() || !formData.title.trim()) {
      showToast('Name, slug, and title are required', 'error');
      return;
    }

    try {
      setSaving(true);
      if (editingPage) {
        await api.admin.updatePage(editingPage.id, formData);
        showToast('Page updated successfully', 'success');
      } else {
        await api.admin.createPage(formData);
        showToast('New page published', 'success');
      }
      setViewMode('list');
      loadPages();
    } catch (err) {
      showToast(err.message || 'Failed to save page', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingPage) return;
    try {
      await api.admin.deletePage(deletingPage.id);
      showToast('Page deleted', 'success');
      setDeletingPage(null);
      loadPages();
    } catch (err) {
      showToast(err.message || 'Failed to delete page', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-7 h-7 text-indigo-400" />
            Website Pages & Legal Policies
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Create and edit content for Terms & Conditions, Privacy Policy, Refund Policy, and custom landing pages.
          </p>
        </div>

        {viewMode === 'list' && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium shadow-lg shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Create New Page
          </button>
        )}
      </div>

      {viewMode === 'list' ? (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search pages by name or title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-72"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
              Loading pages...
            </div>
          ) : pages.length === 0 ? (
            <div className="py-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
              <FileText className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-400">No pages found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Page Name</th>
                    <th className="pb-3 font-semibold">Public URL Slug</th>
                    <th className="pb-3 font-semibold">Heading Title</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {pages.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 font-semibold text-white">
                        {p.name}
                      </td>
                      <td className="py-4">
                        <a
                          href={`/page/${p.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-xs text-indigo-400 hover:underline flex items-center gap-1"
                        >
                          /page/{p.slug}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                      <td className="py-4 text-xs text-slate-300 max-w-xs truncate">
                        {p.title}
                      </td>
                      <td className="py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          p.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-indigo-400 transition-colors"
                            title="Edit Page"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingPage(p)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                            title="Delete Page"
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
      ) : (
        /* Create / Edit Page */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl max-w-4xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <h2 className="text-lg font-bold text-white">
              {viewMode === 'edit' ? `Edit Page: ${formData.name}` : 'Create New Page'}
            </h2>
            <button
              onClick={() => setViewMode('list')}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel & Return
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Page Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Terms & Conditions"
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const slug = name.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '');
                    setFormData({ ...formData, name, slug: formData.slug ? formData.slug : slug });
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  URL Slug <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-mono">/page/</span>
                  <input
                    type="text"
                    placeholder="terms-and-conditions"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-') })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-16 pr-3 py-2.5 text-sm text-white font-mono focus:border-indigo-500"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Heading Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Terms and Conditions of Service"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-indigo-500"
                >
                  <option value="active">Active (Published)</option>
                  <option value="inactive">Inactive (Draft)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Page Content (HTML / Rich Text) <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={10}
                placeholder="<h3>1. Section Header</h3><p>Paragraph content goes here...</p>"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full bg-slate-950 font-mono border border-slate-800 rounded-xl p-3.5 text-xs text-white focus:border-indigo-500"
                required
              />
            </div>

            {/* SEO Metadata Box */}
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-3">
              <h4 className="text-xs uppercase font-bold text-indigo-400 tracking-wider">Page SEO Optimization</h4>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">SEO Meta Title</label>
                <input
                  type="text"
                  value={formData.meta_title}
                  onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">SEO Meta Description</label>
                <textarea
                  rows={2}
                  value={formData.meta_description}
                  onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20"
              >
                {saving ? 'Saving...' : 'Save & Publish Page'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Modal */}
      {deletingPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Delete Page</h3>
            <p className="text-sm text-slate-300">
              Are you sure you want to delete <span className="font-semibold text-rose-400">"{deletingPage.name}"</span>?
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setDeletingPage(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-medium text-white shadow-lg shadow-rose-600/20"
              >
                Delete Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

