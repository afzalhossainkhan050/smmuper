import React, { useState, useEffect } from 'react';
import {
  Bell, Plus, Search, Edit3, Trash2, CheckCircle2,
  AlertCircle, ArrowLeft, Image as ImageIcon, Upload, Loader2,
  Eye, Check, ChevronDown
} from 'lucide-react';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminNoticesPage() {
  const { showToast } = useAuth();

  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Mode: 'list' | 'create' | 'edit'
  const [viewMode, setViewMode] = useState('list');
  const [editingNotice, setEditingNotice] = useState(null);
  const [deletingNotice, setDeletingNotice] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image: '',
    status: 'active'
  });

  const loadNotices = async () => {
    try {
      setLoading(true);
      const res = await api.admin.getNotices();
      setNotices(res.notices || res.data?.notices || []);
    } catch (err) {
      showToast(err.message || 'Failed to load notices', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotices();
  }, []);

  const handleOpenCreate = () => {
    setFormData({
      title: '',
      description: '',
      image: '',
      status: 'active'
    });
    setEditingNotice(null);
    setViewMode('create');
  };

  const handleOpenEdit = (notice) => {
    setEditingNotice(notice);
    setFormData({
      title: notice.title,
      description: notice.description,
      image: notice.image || '',
      status: notice.status
    });
    setViewMode('edit');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      showToast('Please enter both title and description', 'error');
      return;
    }

    try {
      setSaving(true);
      if (editingNotice) {
        await api.admin.updateNotice(editingNotice.id, formData);
        showToast('Notice updated successfully', 'success');
      } else {
        await api.admin.createNotice(formData);
        showToast('Notice created and published', 'success');
      }
      setViewMode('list');
      await loadNotices();
    } catch (err) {
      showToast(err.message || 'Failed to save notice', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingNotice) return;
    try {
      setSaving(true);
      await api.admin.deleteNotice(deletingNotice.id);
      showToast('Notice deleted successfully', 'success');
      setDeletingNotice(null);
      await loadNotices();
    } catch (err) {
      showToast(err.message || 'Failed to delete notice', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredNotices = notices.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.description.toLowerCase().includes(search.toLowerCase())
  );

  // ──────────────── VIEW: CREATE / EDIT NOTICE FORM (Matches Screenshot 1) ────────────────
  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <div className="space-y-6 animate-in fade-in duration-150">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Dashboard</span>
            <span>/</span>
            <button onClick={() => setViewMode('list')} className="hover:text-primary hover:underline">
              Notice
            </button>
            <span>/</span>
            <span className="text-text-primary font-bold">
              {viewMode === 'create' ? 'Create Notice' : 'Edit Notice'}
            </span>
          </div>
          <button
            onClick={() => setViewMode('list')}
            className="saas-btn-secondary text-xs flex items-center gap-1.5"
          >
            <ArrowLeft size={14} />
            Back to List
          </button>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          {viewMode === 'create' ? 'Create Notice' : 'Edit Notice'}
        </h1>

        {/* Language Notification Callout (Matching Screenshot 1) */}
        <div className="p-4 rounded-xl bg-bg-surface-elevated border border-border-main flex items-center gap-3">
          <div className="text-primary text-xl">📢</div>
          <div className="text-xs text-muted-foreground">
            You are {viewMode === 'create' ? 'creating' : 'editing'} notice for <strong className="text-text-primary">'English'</strong> version.
          </div>
        </div>

        {/* Form Container */}
        <div className="saas-card space-y-6">
          <div className="border-b border-border-main pb-3">
            <h2 className="text-base font-bold text-text-primary">
              {viewMode === 'create' ? 'Create Notice' : 'Edit Notice'}
            </h2>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label className="saas-label">Title *</label>
              <input
                type="text"
                required
                placeholder="Enter Notice Title (e.g. What is an SMM Panel Reseller?)"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="saas-input w-full text-xs"
              />
            </div>

            <div>
              <label className="saas-label">Description *</label>
              {/* Rich text editor styling simulation */}
              <div className="rounded-xl border border-border-main overflow-hidden bg-bg-surface-elevated">
                <div className="p-2 border-b border-border-subtle bg-bg-surface-subtle flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-bold px-1.5 py-0.5 rounded hover:bg-bg-surface-hover cursor-pointer">B</span>
                  <span className="italic px-1.5 py-0.5 rounded hover:bg-bg-surface-hover cursor-pointer">I</span>
                  <span className="underline px-1.5 py-0.5 rounded hover:bg-bg-surface-hover cursor-pointer">U</span>
                  <span className="h-4 w-px bg-border-main mx-1" />
                  <span className="px-1.5 py-0.5 rounded hover:bg-bg-surface-hover cursor-pointer">Inter ▾</span>
                  <span className="px-1.5 py-0.5 rounded hover:bg-bg-surface-hover cursor-pointer text-amber-500 font-bold">A ▾</span>
                  <span className="h-4 w-px bg-border-main mx-1" />
                  <span className="px-1.5 py-0.5 rounded hover:bg-bg-surface-hover cursor-pointer">• List</span>
                  <span className="px-1.5 py-0.5 rounded hover:bg-bg-surface-hover cursor-pointer">1. List</span>
                  <span className="px-1.5 py-0.5 rounded hover:bg-bg-surface-hover cursor-pointer">&lt;/&gt; Code</span>
                </div>
                <textarea
                  required
                  rows={8}
                  placeholder="Enter notice description or announcements..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-4 bg-transparent border-0 focus:outline-none text-xs text-text-primary font-sans leading-relaxed resize-y"
                />
              </div>
            </div>

            {/* Notice Image & Status (Matching Screenshot 1) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div>
                <label className="saas-label">Notice Image</label>
                <div className="p-6 border-2 border-dashed border-border-main rounded-xl flex flex-col items-center justify-center text-center hover:border-primary/50 transition-colors bg-bg-surface-elevated">
                  {formData.image ? (
                    <div className="space-y-2">
                      <img src={formData.image} alt="Notice Preview" className="max-h-36 rounded-lg object-cover mx-auto" />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, image: '' })}
                        className="text-xs text-red-500 hover:underline block mx-auto"
                      >
                        Remove Image
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-12 rounded-lg border border-border-main flex items-center justify-center text-muted-foreground mb-3">
                        <Upload size={22} />
                      </div>
                      <div className="text-xs font-semibold text-text-primary">Browse your file here or paste URL</div>
                      <input
                        type="text"
                        placeholder="https://example.com/banner.png"
                        value={formData.image}
                        onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                        className="saas-input w-full text-xs mt-3 text-center"
                      />
                    </>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground mt-2">
                  Image size should be <strong className="text-text-primary">746 × 498 px</strong>
                </div>
              </div>

              <div className="p-6 rounded-xl border border-border-main bg-bg-surface-elevated space-y-3">
                <div className="font-bold text-xs text-text-primary">Status</div>
                <div className="text-xs text-muted-foreground">
                  The notice has enabled for the user.
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: formData.status === 'active' ? 'inactive' : 'active' })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formData.status === 'active' ? 'bg-primary' : 'bg-zinc-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.status === 'active' ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border-main flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="saas-btn-primary flex items-center gap-2 text-xs"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                Save & Publish
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="saas-btn-secondary text-xs"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ──────────────── VIEW: NOTICES LIST (Matches Screenshot 2) ────────────────
  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Dashboard</span>
        <span>/</span>
        <span className="text-text-primary font-bold">Notice</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2.5">
            <Bell className="text-primary" size={24} />
            Notice
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Publish site-wide announcements, system alerts, and promo bulletins for customers.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="saas-btn-primary flex items-center gap-2 self-start sm:self-auto text-xs"
        >
          <Plus size={16} />
          Add Notice
        </button>
      </div>

      {/* Main Notice Card */}
      <div className="saas-card p-0 overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-border-main flex flex-col sm:flex-row gap-3 items-center justify-between bg-bg-surface-elevated">
          <div className="font-bold text-sm text-text-primary">Notice List</div>
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search notice title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="saas-input pl-9 w-full text-xs"
            />
          </div>
        </div>

        {/* Responsive Table Matching Screenshot 2 */}
        <div className="overflow-x-auto">
          <table className="saas-table w-full">
            <thead>
              <tr>
                <th className="w-14 text-center">SL</th>
                <th>TITLE</th>
                <th>STATUS</th>
                <th className="text-center">LANG</th>
                <th className="text-right">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-muted-foreground">
                    <Loader2 className="animate-spin inline-block mr-2" size={20} />
                    Loading notices...
                  </td>
                </tr>
              ) : filteredNotices.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-10 text-muted-foreground">
                    No notices published yet. Click "+ Add Notice" to create one.
                  </td>
                </tr>
              ) : (
                filteredNotices.map((notice, index) => (
                  <tr key={notice.id}>
                    <td className="text-center font-mono text-xs text-muted-foreground">{index + 1}</td>
                    <td className="font-semibold text-text-primary text-xs max-w-md">
                      <div>{notice.title}</div>
                      <div className="text-[11px] text-muted-foreground font-normal line-clamp-1 mt-0.5" dangerouslySetInnerHTML={{ __html: notice.description }} />
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {notice.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-center">
                      <div className="inline-flex items-center gap-1 text-xs">
                        <span title="English Available" className="cursor-pointer">🇺🇸</span>
                        <span title="Spanish Available" className="cursor-pointer opacity-50">🇪🇸</span>
                      </div>
                    </td>
                    <td className="text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(notice)}
                          className="saas-btn-secondary text-xs px-2.5 py-1 inline-flex items-center gap-1"
                        >
                          <Edit3 size={13} />
                          Edit
                        </button>
                        <button
                          onClick={() => setDeletingNotice(notice)}
                          className="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                          title="Delete Notice"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="saas-card w-full max-w-sm bg-surface p-6 shadow-2xl border border-red-500/20 rounded-xl">
            <div className="flex items-center gap-3 text-red-500 pb-3 border-b border-border-main">
              <AlertCircle size={22} />
              <h2 className="text-base font-bold text-text-primary">Delete Notice</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Are you sure you want to delete notice <strong className="text-text-primary">"{deletingNotice.title}"</strong>?
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-4 mt-2">
              <button
                type="button"
                onClick={() => setDeletingNotice(null)}
                className="saas-btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="saas-btn-danger text-xs flex items-center gap-1.5"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

