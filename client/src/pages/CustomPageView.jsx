import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FileText, ArrowLeft, RefreshCw, Calendar, ShieldCheck } from 'lucide-react';
import { api } from '../utils/api';

export default function CustomPageView() {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.cms.getPage(slug);
        setPage(res.page);
        if (res.page?.meta_title) {
          document.title = `${res.page.meta_title} - SMMuper`;
        } else if (res.page?.title) {
          document.title = `${res.page.title} - SMMuper`;
        }
      } catch (err) {
        setError(err.message || 'Page not found');
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
        Loading page content...
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="max-w-3xl mx-auto py-20 px-4 text-center">
        <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Page Not Found</h1>
        <p className="text-slate-400 text-sm mb-6">
          The requested page could not be found or has been moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Homepage
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400 mb-6">
        <Link to="/" className="hover:text-white transition-colors">Home</Link>
        <span>/</span>
        <span className="text-indigo-400 capitalize">{page.name}</span>
      </div>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 border border-slate-800 rounded-3xl p-8 mb-8 shadow-xl">
        <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
          {page.title}
        </h1>
        <div className="flex items-center gap-4 text-xs text-slate-400 mt-3">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-indigo-400" />
            Last updated: {new Date(page.updated_at || page.created_at).toLocaleDateString()}
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            Official SMMuper Policy
          </div>
        </div>
      </div>

      {/* Article Content Container */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-xl prose prose-invert max-w-none text-slate-300 leading-relaxed text-sm [&_h3]:text-white [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:mb-4 [&_p]:text-slate-300 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4">
        <div dangerouslySetInnerHTML={{ __html: page.content }} />
      </div>
    </div>
  );
}

