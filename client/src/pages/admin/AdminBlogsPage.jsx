import React, { useState, useEffect } from 'react';
import {
  BookOpen, Plus, Search, Edit3, Trash2, CheckCircle2,
  ExternalLink, Eye, X, RefreshCw, FolderTree, User, Sparkles
} from 'lucide-react';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminBlogsPage() {
  const { showToast } = useAuth();

  const [activeTab, setActiveTab] = useState('blogs'); // 'blogs' | 'categories'
  const [loading, setLoading] = useState(true);

  // Blogs Data
  const [blogs, setBlogs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});

  // Mode: 'list' | 'create_blog' | 'edit_blog'
  const [viewMode, setViewMode] = useState('list');
  const [editingBlog, setEditingBlog] = useState(null);
  const [deletingBlog, setDeletingBlog] = useState(null);

  // Category Modals
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', slug: '', status: 'active' });

  // Blog Form State
  const [blogForm, setBlogForm] = useState({
    category_id: '',
    author_id: '',
    title: '',
    slug: '',
    description: '',
    image: '',
    status: 'active'
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [blogsRes, catsRes, authorsRes] = await Promise.all([
        api.admin.getBlogs(`search=${search}&page=${page}`),
        api.admin.getBlogCategories(),
        api.admin.getBlogAuthors()
      ]);

      setBlogs(blogsRes.blogs || []);
      setPagination(blogsRes.pagination || {});
      setCategories(catsRes.categories || []);
      setAuthors(authorsRes.authors || authorsRes.data?.authors || []);
    } catch (err) {
      showToast(err.message || 'Failed to load blog data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, page]);

  // Open Blog Create / Edit
  const handleOpenCreateBlog = () => {
    setEditingBlog(null);
    setBlogForm({
      category_id: categories[0]?.id || '',
      author_id: authors[0]?.id || '',
      title: '',
      slug: '',
      description: '',
      image: '',
      status: 'active'
    });
    setViewMode('create_blog');
  };

  const handleOpenEditBlog = (b) => {
    setEditingBlog(b);
    setBlogForm({
      category_id: b.category_id,
      author_id: b.author_id || '',
      title: b.title,
      slug: b.slug,
      description: b.description || '',
      image: b.image || '',
      status: b.status || 'active'
    });
    setViewMode('edit_blog');
  };

  const handleSaveBlog = async (e) => {
    e.preventDefault();
    if (!blogForm.title.trim() || !blogForm.description.trim() || !blogForm.category_id) {
      showToast('Title, category, and article body are required', 'error');
      return;
    }

    try {
      if (editingBlog) {
        await api.admin.updateBlog(editingBlog.id, blogForm);
        showToast('Blog article updated', 'success');
      } else {
        await api.admin.createBlog(blogForm);
        showToast('Blog article published', 'success');
      }
      setViewMode('list');
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to save blog post', 'error');
    }
  };

  const handleDeleteBlog = async () => {
    if (!deletingBlog) return;
    try {
      await api.admin.deleteBlog(deletingBlog.id);
      showToast('Blog post deleted', 'success');
      setDeletingBlog(null);
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to delete blog post', 'error');
    }
  };

  // Category Actions
  const handleOpenCreateCategory = () => {
    setEditingCategory(null);
    setCategoryForm({ name: '', slug: '', status: 'active' });
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (c) => {
    setEditingCategory(c);
    setCategoryForm({ name: c.name, slug: c.slug, status: c.status || 'active' });
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      showToast('Category name is required', 'error');
      return;
    }

    try {
      if (editingCategory) {
        await api.admin.updateBlogCategory(editingCategory.id, categoryForm);
        showToast('Category updated', 'success');
      } else {
        await api.admin.createBlogCategory(categoryForm);
        showToast('Category created', 'success');
      }
      setIsCategoryModalOpen(false);
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to save category', 'error');
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    try {
      await api.admin.deleteBlogCategory(deletingCategory.id);
      showToast('Category deleted', 'success');
      setDeletingCategory(null);
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to delete category', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-indigo-400" />
            Blog Posts & Knowledge Center
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Author SEO-optimized articles, manage topical categories, and track pageview analytics.
          </p>
        </div>

        {viewMode === 'list' && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenCreateCategory}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition-colors shadow-sm"
            >
              <FolderTree className="w-4 h-4 text-indigo-400" />
              Add Category
            </button>
            <button
              onClick={handleOpenCreateBlog}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              Write Article
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      {viewMode === 'list' && (
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('blogs')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'blogs'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Articles ({blogs.length})
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'categories'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Categories ({categories.length})
          </button>
        </div>
      )}

      {/* View Mode: List */}
      {viewMode === 'list' && activeTab === 'blogs' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search articles by title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-72"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
              Loading articles...
            </div>
          ) : blogs.length === 0 ? (
            <div className="py-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
              <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-400">No blog articles found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Title</th>
                    <th className="pb-3 font-semibold">Category</th>
                    <th className="pb-3 font-semibold">Author</th>
                    <th className="pb-3 font-semibold">Views</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {blogs.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-4">
                        <div className="font-semibold text-white max-w-sm truncate">{b.title}</div>
                        <a
                          href={`/blog/${b.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-[11px] text-indigo-400 hover:underline flex items-center gap-1"
                        >
                          /blog/{b.slug}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                      <td className="py-4 text-xs text-slate-300">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700">
                          {b.category_name || 'General'}
                        </span>
                      </td>
                      <td className="py-4 text-xs text-slate-400">
                        {b.author_name || 'Staff Writer'}
                      </td>
                      <td className="py-4 text-xs font-semibold text-emerald-400">
                        {b.views_count || 0}
                      </td>
                      <td className="py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          b.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEditBlog(b)}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-indigo-400 transition-colors"
                            title="Edit Article"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingBlog(b)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                            title="Delete Article"
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
      )}

      {/* View Mode: List - Categories Tab */}
      {viewMode === 'list' && activeTab === 'categories' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Category Name</th>
                  <th className="pb-3 font-semibold">Slug</th>
                  <th className="pb-3 font-semibold">Articles Count</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {categories.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 font-semibold text-white">
                      {c.name}
                    </td>
                    <td className="py-3.5 font-mono text-xs text-indigo-400">
                      {c.slug}
                    </td>
                    <td className="py-3.5 text-xs text-slate-300">
                      {c.blog_count || 0} articles
                    </td>
                    <td className="py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        c.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditCategory(c)}
                          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-indigo-400 transition-colors"
                          title="Edit Category"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeletingCategory(c)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Delete Category"
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
        </div>
      )}

      {/* Create / Edit Article View */}
      {(viewMode === 'create_blog' || viewMode === 'edit_blog') && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl max-w-4xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <h2 className="text-lg font-bold text-white">
              {viewMode === 'edit_blog' ? 'Edit Blog Article' : 'Write New Blog Article'}
            </h2>
            <button
              onClick={() => setViewMode('list')}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel & Return
            </button>
          </div>

          <form onSubmit={handleSaveBlog} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Article Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. How to Scale Your Reselling Agency"
                  value={blogForm.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    const slug = title.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '');
                    setBlogForm({ ...blogForm, title, slug: blogForm.slug ? blogForm.slug : slug });
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
                  <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-mono">/blog/</span>
                  <input
                    type="text"
                    value={blogForm.slug}
                    onChange={(e) => setBlogForm({ ...blogForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-') })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-16 pr-3 py-2.5 text-sm text-white font-mono focus:border-indigo-500"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Category <span className="text-rose-400">*</span></label>
                <select
                  value={blogForm.category_id}
                  onChange={(e) => setBlogForm({ ...blogForm, category_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white"
                  required
                >
                  <option value="">Select category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Author</label>
                <select
                  value={blogForm.author_id}
                  onChange={(e) => setBlogForm({ ...blogForm, author_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white"
                >
                  <option value="">Default / Staff</option>
                  {authors.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.address || 'Writer'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Status</label>
                <select
                  value={blogForm.status}
                  onChange={(e) => setBlogForm({ ...blogForm, status: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white"
                >
                  <option value="active">Active (Published)</option>
                  <option value="inactive">Inactive (Draft)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Article Body / Content <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={10}
                placeholder="Write your article in markdown or plain text..."
                value={blogForm.description}
                onChange={(e) => setBlogForm({ ...blogForm, description: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:border-indigo-500"
                required
              />
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
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20"
              >
                Publish Article
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Category Create/Edit Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-indigo-400" />
                {editingCategory ? 'Edit Category' : 'Create Category'}
              </h2>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Category Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. SMM Reselling"
                  value={categoryForm.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const slug = name.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/(^-|-$)/g, '');
                    setCategoryForm({ ...categoryForm, name, slug: categoryForm.slug ? categoryForm.slug : slug });
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Slug
                </label>
                <input
                  type="text"
                  placeholder="smm-reselling"
                  value={categoryForm.slug}
                  onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-') })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Status</label>
                <select
                  value={categoryForm.status}
                  onChange={(e) => setCategoryForm({ ...categoryForm, status: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white shadow-lg shadow-indigo-600/20"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Blog Modal */}
      {deletingBlog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Delete Blog Article</h3>
            <p className="text-sm text-slate-300">
              Are you sure you want to delete <span className="font-semibold text-rose-400">"{deletingBlog.title}"</span>?
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setDeletingBlog(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBlog}
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

