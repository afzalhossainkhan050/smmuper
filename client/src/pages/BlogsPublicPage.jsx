import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, Search, Eye, Calendar, User, ArrowRight,
  RefreshCw, Sparkles, Mail, CheckCircle2
} from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

export default function BlogsPublicPage() {
  const { showToast } = useAuth();

  const [loading, setLoading] = useState(true);
  const [blogs, setBlogs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);

  const loadBlogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category', selectedCategory);
      if (search) params.append('search', search);

      const res = await api.cms.getBlogs(params.toString());
      setBlogs(res.blogs || []);
      setCategories(res.categories || []);
    } catch (err) {
      showToast(err.message || 'Failed to load blogs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlogs();
  }, [selectedCategory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadBlogs();
  };

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;

    try {
      setSubscribing(true);
      const res = await api.cms.subscribe(newsletterEmail);
      showToast(res.message || 'Subscribed successfully!', 'success');
      setNewsletterEmail('');
    } catch (err) {
      showToast(err.message || 'Failed to subscribe', 'error');
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 space-y-12">
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <Sparkles className="w-3.5 h-3.5" />
          Knowledge Hub & Technical Articles
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
          SMM Reselling & Platform Growth
        </h1>
        <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
          Master the wholesale social media ecosystem with expert growth blueprints, automated API documentation, and child panel scaling advice.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="max-w-md mx-auto pt-2 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search guides, strategies, API..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20"
          >
            Search
          </button>
        </form>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={() => setSelectedCategory('')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            selectedCategory === ''
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          All Topics
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.slug)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              selectedCategory === cat.slug
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {cat.name} ({cat.blog_count || 0})
          </button>
        ))}
      </div>

      {/* Blog Cards Grid */}
      {loading ? (
        <div className="py-24 text-center text-slate-500 flex flex-col items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
          Loading articles...
        </div>
      ) : blogs.length === 0 ? (
        <div className="py-20 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl p-8">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No articles found</h3>
          <p className="text-xs text-slate-500 mt-1">Try selecting another topic or clearing your search term.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {blogs.map((b) => (
            <Link
              key={b.id}
              to={`/blog/${b.slug}`}
              className="group bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 rounded-3xl p-6 shadow-xl transition-all flex flex-col justify-between hover:-translate-y-1"
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 font-medium border border-indigo-500/20">
                    {b.category_name}
                  </span>
                  <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                    <Eye className="w-3.5 h-3.5" />
                    {b.views_count} views
                  </div>
                </div>

                <h2 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-2">
                  {b.title}
                </h2>

                <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
                  {b.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800/80 mt-6 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-300 flex items-center justify-center font-bold text-[10px]">
                    {(b.author_name || 'S')[0]}
                  </div>
                  <span className="text-slate-300 font-medium">{b.author_name || 'SMM Staff'}</span>
                </div>

                <div className="text-indigo-400 font-semibold group-hover:translate-x-1 transition-transform flex items-center gap-1 text-xs">
                  Read <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Newsletter Box */}
      <div className="bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900 border border-indigo-500/30 rounded-3xl p-8 sm:p-12 shadow-2xl text-center space-y-4 max-w-3xl mx-auto">
        <Mail className="w-10 h-10 text-indigo-400 mx-auto" />
        <h3 className="text-2xl font-bold text-white">Subscribe to SMM Wholesale Insights</h3>
        <p className="text-xs text-slate-300 max-w-md mx-auto">
          Get weekly wholesale rate reductions, provider speed updates, and child panel growth tips delivered straight to your inbox.
        </p>

        <form onSubmit={handleSubscribe} className="max-w-md mx-auto flex items-center gap-2 pt-2">
          <input
            type="email"
            placeholder="Enter your email address..."
            value={newsletterEmail}
            onChange={(e) => setNewsletterEmail(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            required
          />
          <button
            type="submit"
            disabled={subscribing}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20"
          >
            {subscribing ? 'Subscribing...' : 'Join Newsletter'}
          </button>
        </form>
      </div>
    </div>
  );
}

