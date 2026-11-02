import React, { useState, useEffect } from 'react';
import {
  BookOpen, Plus, Search, Edit3, Trash2, CheckCircle2,
  AlertCircle, ArrowLeft, Image as ImageIcon, Upload, Loader2,
  Share2, Globe, ExternalLink, X
} from 'lucide-react';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminBlogAuthorsPage() {
  const { showToast } = useAuth();

  const [authors, setAuthors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Mode: 'list' | 'create' | 'edit'
  const [viewMode, setViewMode] = useState('list');
  const [editingAuthor, setEditingAuthor] = useState(null);
  const [deletingAuthor, setDeletingAuthor] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    slug: '',
    about: '',
    image: '',
    status: 'active',
    socialMedia: [
      { name: 'Facebook', icon: 'facebook', link: 'https://facebook.com/' },
      { name: 'Twitter', icon: 'twitter', link: 'https://x.com/' },
      { name: 'Linkedin', icon: 'linkedin', link: 'https://www.linkedin.com/' },
      { name: 'Instagram', icon: 'instagram', link: 'https://www.instagram.com/' }
    ]
  });

  const loadAuthors = async () => {
    try {
      setLoading(true);
      const res = await api.admin.getBlogAuthors();
      setAuthors(res.authors || res.data?.authors || []);
    } catch (err) {
      showToast(err.message || 'Failed to load authors', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuthors();
  }, []);

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      address: '',
      slug: '',
      about: '',
      image: '',
      status: 'active',
      socialMedia: [
        { name: 'Facebook', icon: 'facebook', link: 'https://facebook.com/' },
        { name: 'Twitter', icon: 'twitter', link: 'https://x.com/' }
      ]
    });
    setEditingAuthor(null);
    setViewMode('create');
  };

  const handleOpenEdit = (author) => {
    setEditingAuthor(author);
    let parsedSocial = [];
    try {
      parsedSocial = typeof author.social_links === 'string' ? JSON.parse(author.social_links) : (author.social_links || []);
    } catch (e) {
      parsedSocial = [];
    }

    setFormData({
      name: author.name,
      address: author.address || '',
      slug: author.slug || '',
      about: author.about || '',
      image: author.image || '',
      status: author.status || 'active',
      socialMedia: parsedSocial.length > 0 ? parsedSocial : [
        { name: 'Facebook', icon: 'facebook', link: '' }
      ]
    });
    setViewMode('edit');
  };

  const handleAddSocialRow = () => {
    setFormData(prev => ({
      ...prev,
      socialMedia: [...prev.socialMedia, { name: '', icon: '', link: '' }]
    }));
  };

  const handleRemoveSocialRow = (idx) => {
    setFormData(prev => ({
      ...prev,
      socialMedia: prev.socialMedia.filter((_, i) => i !== idx)
    }));
  };

  const handleSocialChange = (idx, field, val) => {
    setFormData(prev => {
      const nextSocial = [...prev.socialMedia];
      nextSocial[idx] = { ...nextSocial[idx], [field]: val };
      return { ...prev, socialMedia: nextSocial };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Author name is required', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        slug: formData.slug.trim(),
        about: formData.about.trim(),
        image: formData.image,
        status: formData.status,
        social_links: formData.socialMedia
      };

      if (editingAuthor) {
        await api.admin.updateBlogAuthor(editingAuthor.id, payload);
        showToast('Author profile updated successfully', 'success');
      } else {
        await api.admin.createBlogAuthor(payload);
        showToast('Blog author created successfully', 'success');
      }

      setViewMode('list');
      await loadAuthors();
    } catch (err) {
      showToast(err.message || 'Failed to save author', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingAuthor) return;
    try {
      setSaving(true);
      await api.admin.deleteBlogAuthor(deletingAuthor.id);
      showToast('Author deleted successfully', 'success');
      setDeletingAuthor(null);
      await loadAuthors();
    } catch (err) {
      showToast(err.message || 'Failed to delete author', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredAuthors = authors.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    (a.address && a.address.toLowerCase().includes(search.toLowerCase()))
  );

  // ──────────────── VIEW: CREATE / EDIT AUTHOR (Matches Screenshot 3 & 4) ────────────────
  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <div className="space-y-6 animate-in fade-in duration-150">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Dashboard</span>
            <span>/</span>
            <button onClick={() => setViewMode('list')} className="hover:text-primary hover:underline">
              Authors
            </button>
            <span>/</span>
            <span className="text-text-primary font-bold">
              {viewMode === 'create' ? 'Create Author' : 'Edit Author'}
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
          {viewMode === 'create' ? 'Create Author' : 'Edit Author'}
        </h1>

        {/* Language Notification Callout (Matching Screenshot 3) */}
        <div className="p-4 rounded-xl bg-bg-surface-elevated border border-border-main flex items-center gap-3">
          <div className="text-primary text-xl">📢</div>
          <div className="text-xs text-muted-foreground">
            You are {viewMode === 'create' ? 'creating' : 'editing'} blog category for <strong className="text-text-primary">'English'</strong> version.
          </div>
        </div>

        <div className="saas-card space-y-6">
          <div className="border-b border-border-main pb-3">
            <h2 className="text-base font-bold text-text-primary">
              {viewMode === 'create' ? 'Create Author' : 'Edit Author'}
            </h2>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="saas-label">Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hermione Granger"
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const autoSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                    setFormData({ ...formData, name, slug: formData.slug || autoSlug });
                  }}
                  className="saas-input w-full text-xs"
                />
              </div>

              <div>
                <label className="saas-label">Address / Location</label>
                <input
                  type="text"
                  placeholder="e.g. Dublin, Ireland"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="saas-input w-full text-xs"
                />
              </div>
            </div>

            {/* Permalink Info (Matching Screenshot 3) */}
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 bg-bg-surface-subtle p-2.5 rounded-lg border border-border-subtle">
              <span className="font-semibold text-text-primary">Permalink:</span>
              <span className="font-mono text-[11px] text-muted-foreground">https://smmuper.com/author/</span>
              <input
                type="text"
                placeholder="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="bg-transparent border-b border-primary text-primary font-mono text-xs focus:outline-none px-1"
              />
            </div>

            {/* About The Author */}
            <div>
              <label className="saas-label">About The Author *</label>
              <div className="rounded-xl border border-border-main overflow-hidden bg-bg-surface-elevated">
                <div className="p-2 border-b border-border-subtle bg-bg-surface-subtle flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-bold px-1.5 py-0.5 rounded hover:bg-bg-surface-hover cursor-pointer">B</span>
                  <span className="italic px-1.5 py-0.5 rounded hover:bg-bg-surface-hover cursor-pointer">U</span>
                  <span className="h-4 w-px bg-border-main mx-1" />
                  <span className="px-1.5 py-0.5 rounded hover:bg-bg-surface-hover cursor-pointer">sans serif ▾</span>
                  <span className="px-1.5 py-0.5 rounded hover:bg-bg-surface-hover cursor-pointer text-amber-500 font-bold">A ▾</span>
                  <span className="h-4 w-px bg-border-main mx-1" />
                  <span className="px-1.5 py-0.5 rounded hover:bg-bg-surface-hover cursor-pointer">• List</span>
                  <span className="px-1.5 py-0.5 rounded hover:bg-bg-surface-hover cursor-pointer">&lt;/&gt; Code</span>
                </div>
                <textarea
                  rows={6}
                  placeholder="Write about author experience, bio, and social presence..."
                  value={formData.about}
                  onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                  className="w-full p-4 bg-transparent border-0 focus:outline-none text-xs text-text-primary font-sans leading-relaxed resize-y"
                />
              </div>
            </div>

            {/* Social Media Repeater (Matching Screenshot 3 & 4) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="saas-label mb-0">Social Media</label>
                <button
                  type="button"
                  onClick={handleAddSocialRow}
                  className="saas-btn-secondary text-xs px-2.5 py-1 inline-flex items-center gap-1"
                >
                  <Plus size={13} />
                  Add Social Media
                </button>
              </div>

              <div className="space-y-2">
                {formData.socialMedia.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center p-2 rounded-lg bg-bg-surface-elevated border border-border-subtle">
                    <input
                      type="text"
                      placeholder="Name (e.g. Facebook)"
                      value={row.name}
                      onChange={(e) => handleSocialChange(idx, 'name', e.target.value)}
                      className="saas-input text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Icon (e.g. fab fa-twitter)"
                      value={row.icon}
                      onChange={(e) => handleSocialChange(idx, 'icon', e.target.value)}
                      className="saas-input text-xs font-mono"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        placeholder="Link (e.g. https://x.com/...)"
                        value={row.link}
                        onChange={(e) => handleSocialChange(idx, 'link', e.target.value)}
                        className="saas-input text-xs flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveSocialRow(idx)}
                        className="p-2 text-muted-foreground hover:text-red-500 rounded-md transition-colors"
                        title="Remove row"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Image & Status (Matching Screenshot 3 & 4) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <div>
                <label className="saas-label">Author Profile Photo</label>
                <div className="p-6 border-2 border-dashed border-border-main rounded-xl flex flex-col items-center justify-center text-center hover:border-primary/50 transition-colors bg-bg-surface-elevated">
                  {formData.image ? (
                    <div className="space-y-2">
                      <img src={formData.image} alt="Author Preview" className="w-24 h-24 rounded-full object-cover mx-auto border-2 border-primary" />
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
                        placeholder="https://example.com/author.jpg"
                        value={formData.image}
                        onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                        className="saas-input w-full text-xs mt-3 text-center"
                      />
                    </>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground mt-2">
                  Image size should be <strong className="text-text-primary">240 × 240 px</strong>
                </div>
              </div>

              <div className="p-6 rounded-xl border border-border-main bg-bg-surface-elevated space-y-3">
                <div className="font-bold text-xs text-text-primary">Status</div>
                <div className="text-xs text-muted-foreground">
                  Status: Author privileges enabled for blog.
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
                Save changes
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

  // ──────────────── VIEW: AUTHORS LIST (Matches Screenshot 5) ────────────────
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Dashboard</span>
        <span>/</span>
        <span>Manage Blog</span>
        <span>/</span>
        <span className="text-text-primary font-bold">Authors</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2.5">
            <BookOpen className="text-primary" size={24} />
            Authors
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage blog writers, contributor biographies, social media linkages, and publishing authorizations.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="saas-btn-primary flex items-center gap-2 self-start sm:self-auto text-xs"
        >
          <Plus size={16} />
          Create Author
        </button>
      </div>

      {/* Main Authors Card */}
      <div className="saas-card p-0 overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-border-main flex flex-col sm:flex-row gap-3 items-center justify-between bg-bg-surface-elevated">
          <div className="font-bold text-sm text-text-primary">Authors</div>
          <div className="relative w-full sm:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search author name or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="saas-input pl-9 w-full text-xs"
            />
          </div>
        </div>

        {/* Responsive Table Matching Screenshot 5 */}
        <div className="overflow-x-auto">
          <table className="saas-table w-full">
            <thead>
              <tr>
                <th className="w-14 text-center">SL</th>
                <th>NAME</th>
                <th>LOCATION</th>
                <th>STATUS</th>
                <th className="text-center">LANG</th>
                <th className="text-right">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-muted-foreground">
                    <Loader2 className="animate-spin inline-block mr-2" size={20} />
                    Loading authors...
                  </td>
                </tr>
              ) : filteredAuthors.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-muted-foreground">
                    No authors created yet. Click "Create Author" to add one.
                  </td>
                </tr>
              ) : (
                filteredAuthors.map((author, index) => (
                  <tr key={author.id}>
                    <td className="text-center font-mono text-xs text-muted-foreground">{index + 1}</td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs overflow-hidden border border-border-main">
                          {author.image ? (
                            <img src={author.image} alt={author.name} className="w-full h-full object-cover" />
                          ) : (
                            author.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-text-primary">{author.name}</div>
                          {author.slug && (
                            <div className="text-[10px] text-muted-foreground font-mono">@{author.slug}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="text-xs text-text-secondary">{author.address || '—'}</td>
                    <td>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {author.status === 'active' ? 'Active' : 'Inactive'}
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
                          onClick={() => handleOpenEdit(author)}
                          className="saas-btn-secondary text-xs px-2.5 py-1 inline-flex items-center gap-1"
                        >
                          <Edit3 size={13} />
                          Edit
                        </button>
                        <button
                          onClick={() => setDeletingAuthor(author)}
                          className="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                          title="Delete Author"
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
      {deletingAuthor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="saas-card w-full max-w-sm bg-surface p-6 shadow-2xl border border-red-500/20 rounded-xl">
            <div className="flex items-center gap-3 text-red-500 pb-3 border-b border-border-main">
              <AlertCircle size={22} />
              <h2 className="text-base font-bold text-text-primary">Delete Author</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Are you sure you want to delete author <strong className="text-text-primary">"{deletingAuthor.name}"</strong>?
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-4 mt-2">
              <button
                type="button"
                onClick={() => setDeletingAuthor(null)}
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

