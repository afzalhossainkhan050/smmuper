import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BookOpen, ArrowLeft, Calendar, Eye, User, Share2,
  Sparkles, RefreshCw, ExternalLink, Globe
} from 'lucide-react';
import { api } from '../utils/api';

export default function SingleBlogView() {
  const { slug } = useParams();
  const [blog, setBlog] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.cms.getBlog(slug);
        setBlog(res.blog);
        setRelated(res.related || []);
        if (res.blog?.title) {
          document.title = `${res.blog.title} - SMMuper`;
        }
      } catch (err) {
        setError(err.message || 'Article not found');
      } finally {
        setLoading(false);
      }
    };

    fetchBlog();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
        Loading article...
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="max-w-3xl mx-auto py-20 px-4 text-center">
        <BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Article Not Found</h1>
        <p className="text-slate-400 text-sm mb-6">
          The requested article could not be found or has been removed.
        </p>
        <Link
          to="/blogs"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Blog Hub
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 space-y-10">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link to="/" className="hover:text-white">Home</Link>
        <span>/</span>
        <Link to="/blogs" className="hover:text-white">Blog</Link>
        <span>/</span>
        <span className="text-indigo-400 max-w-xs truncate">{blog.title}</span>
      </div>

      {/* Article Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 text-xs font-semibold border border-indigo-500/20">
            {blog.category_name}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Calendar className="w-3.5 h-3.5" />
            {new Date(blog.created_at).toLocaleDateString()}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
            <Eye className="w-3.5 h-3.5" />
            {blog.views_count} views
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
          {blog.title}
        </h1>

        {/* Author Byline */}
        <div className="flex items-center gap-3 pt-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold flex items-center justify-center text-sm shadow-md">
            {(blog.author_name || 'A')[0]}
          </div>
          <div>
            <div className="text-sm font-bold text-white">{blog.author_name || 'SMMuper Editorial'}</div>
            <div className="text-xs text-slate-400">{blog.author_address || 'Wholesale SMM Strategist'}</div>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl text-slate-300 text-sm leading-relaxed whitespace-pre-line space-y-4">
        {blog.description}
      </div>

      {/* Author Profile Bio Card */}
      {blog.author_name && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-2xl font-bold text-indigo-400 flex-shrink-0">
            {blog.author_name[0]}
          </div>
          <div className="space-y-2 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h3 className="text-base font-bold text-white">{blog.author_name}</h3>
              {blog.author_address && (
                <span className="text-xs text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md font-mono">
                  {blog.author_address}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
              {blog.author_about || 'Content author and social media marketing specialist dedicated to sharing high-speed API strategies, reseller scaling formulas, and drop-prevention techniques.'}
            </p>
          </div>
        </div>
      )}

      {/* Related Articles */}
      {related.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-slate-800">
          <h3 className="text-lg font-bold text-white">Related Guides in {blog.category_name}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {related.map(rel => (
              <Link
                key={rel.id}
                to={`/blog/${rel.slug}`}
                className="bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-4 transition-all block group"
              >
                <div className="text-[11px] text-indigo-400 font-semibold mb-1">{rel.category_name}</div>
                <h4 className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-2">
                  {rel.title}
                </h4>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="pt-4 flex justify-between items-center">
        <Link
          to="/blogs"
          className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to all articles
        </Link>
      </div>
    </div>
  );
}

