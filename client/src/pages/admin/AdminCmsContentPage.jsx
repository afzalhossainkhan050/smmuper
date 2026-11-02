import React, { useState, useEffect } from 'react';
import {
  BookOpen, Sparkles, RefreshCw, Save, CheckCircle2,
  AlertCircle, HelpCircle, Users, CreditCard, Layers, Plus, Trash2
} from 'lucide-react';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminCmsContentPage() {
  const { showToast } = useAuth();

  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState([]);
  const [activeSection, setActiveSection] = useState('hero');
  const [content, setContent] = useState({});
  const [saving, setSaving] = useState(false);

  const loadSections = async () => {
    try {
      setLoading(true);
      const res = await api.admin.getCmsSections();
      const secs = res.sections || [];
      setSections(secs);

      const current = secs.find(s => s.section_name === activeSection) || secs[0];
      if (current) {
        setContent(current.content || {});
      }
    } catch (err) {
      showToast(err.message || 'Failed to load CMS content sections', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSections();
  }, []);

  const handleSelectSection = (secName) => {
    setActiveSection(secName);
    const found = sections.find(s => s.section_name === secName);
    if (found) {
      setContent(found.content || {});
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.admin.updateCmsSection(activeSection, { content });
      showToast(`CMS section '${activeSection}' updated successfully!`, 'success');
      await loadSections();
    } catch (err) {
      showToast(err.message || 'Failed to update CMS section', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BookOpen className="w-7 h-7 text-indigo-400" />
          Landing Website Content Sections (CMS)
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Customize homepage marketing copy, hero banners, value propositions, FAQ answers, testimonials, and payment logos.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {[
          { id: 'hero', label: 'Hero Banner', icon: Sparkles },
          { id: 'about', label: 'About SMMuper', icon: Layers },
          { id: 'features', label: 'Core Features', icon: Sparkles },
          { id: 'faq', label: 'FAQ Accordion', icon: HelpCircle },
          { id: 'testimonials', label: 'Testimonials', icon: Users },
          { id: 'payment_partners', label: 'Payment Partners', icon: CreditCard },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleSelectSection(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeSection === tab.id
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
          Loading CMS sections...
        </div>
      ) : (
        <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-white capitalize">
                Editing Section: {activeSection.replace(/_/g, ' ')}
              </h2>
              <div className="text-xs text-slate-500">Live on smmuper.com homepage</div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save & Publish Changes'}
            </button>
          </div>

          {/* Hero Section Fields */}
          {activeSection === 'hero' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Badge Tagline</label>
                <input
                  type="text"
                  value={content.badge || ''}
                  onChange={(e) => setContent({ ...content, badge: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Main Headline</label>
                <input
                  type="text"
                  value={content.heading || ''}
                  onChange={(e) => setContent({ ...content, heading: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Subheadline</label>
                <textarea
                  rows={3}
                  value={content.subheading || ''}
                  onChange={(e) => setContent({ ...content, subheading: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Primary CTA Button Text</label>
                  <input
                    type="text"
                    value={content.cta_primary_text || ''}
                    onChange={(e) => setContent({ ...content, cta_primary_text: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Primary CTA Link</label>
                  <input
                    type="text"
                    value={content.cta_primary_url || ''}
                    onChange={(e) => setContent({ ...content, cta_primary_url: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Stats Repeater */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <label className="block text-xs font-bold text-white uppercase tracking-wider">Social Proof Counters</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(content.stats || []).map((st, i) => (
                    <div key={i} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Label"
                        value={st.label}
                        onChange={(e) => {
                          const updated = [...(content.stats || [])];
                          updated[i].label = e.target.value;
                          setContent({ ...content, stats: updated });
                        }}
                        className="w-1/2 bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-xs text-white"
                      />
                      <input
                        type="text"
                        placeholder="Value (e.g. 2.4M+)"
                        value={st.value}
                        onChange={(e) => {
                          const updated = [...(content.stats || [])];
                          updated[i].value = e.target.value;
                          setContent({ ...content, stats: updated });
                        }}
                        className="w-1/2 bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-xs text-emerald-400 font-bold"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* About Section */}
          {activeSection === 'about' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">About Title</label>
                <input
                  type="text"
                  value={content.title || ''}
                  onChange={(e) => setContent({ ...content, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description Paragraph</label>
                <textarea
                  rows={4}
                  value={content.description || ''}
                  onChange={(e) => setContent({ ...content, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {/* FAQ Section */}
          {activeSection === 'faq' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-white uppercase tracking-wider">FAQ Items</label>
                <button
                  type="button"
                  onClick={() => setContent({ ...content, items: [...(content.items || []), { q: 'New Question?', a: 'Answer...' }] })}
                  className="px-3 py-1.5 bg-indigo-600/20 text-indigo-300 rounded-lg text-xs font-semibold border border-indigo-500/30 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add FAQ
                </button>
              </div>

              <div className="space-y-3">
                {(content.items || []).map((faq, i) => (
                  <div key={i} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        placeholder="Question"
                        value={faq.q}
                        onChange={(e) => {
                          const updated = [...(content.items || [])];
                          updated[i].q = e.target.value;
                          setContent({ ...content, items: updated });
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-bold text-white mr-2"
                      />
                      <button
                        type="button"
                        onClick={() => setContent({ ...content, items: content.items.filter((_, idx) => idx !== i) })}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Answer"
                      value={faq.a}
                      onChange={(e) => {
                        const updated = [...(content.items || [])];
                        updated[i].a = e.target.value;
                        setContent({ ...content, items: updated });
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Testimonials Section */}
          {activeSection === 'testimonials' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-white uppercase tracking-wider">Client Reviews</label>
                <button
                  type="button"
                  onClick={() => setContent({ ...content, items: [...(content.items || []), { name: 'Client Name', company: 'Agency', role: 'Founder', content: 'Review...' }] })}
                  className="px-3 py-1.5 bg-indigo-600/20 text-indigo-300 rounded-lg text-xs font-semibold border border-indigo-500/30 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Review
                </button>
              </div>

              <div className="space-y-3">
                {(content.items || []).map((t, i) => (
                  <div key={i} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Name"
                        value={t.name}
                        onChange={(e) => {
                          const updated = [...(content.items || [])];
                          updated[i].name = e.target.value;
                          setContent({ ...content, items: updated });
                        }}
                        className="w-1/3 bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-xs text-white"
                      />
                      <input
                        type="text"
                        placeholder="Company"
                        value={t.company}
                        onChange={(e) => {
                          const updated = [...(content.items || [])];
                          updated[i].company = e.target.value;
                          setContent({ ...content, items: updated });
                        }}
                        className="w-1/3 bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-xs text-white"
                      />
                      <input
                        type="text"
                        placeholder="Role"
                        value={t.role}
                        onChange={(e) => {
                          const updated = [...(content.items || [])];
                          updated[i].role = e.target.value;
                          setContent({ ...content, items: updated });
                        }}
                        className="w-1/3 bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setContent({ ...content, items: content.items.filter((_, idx) => idx !== i) })}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Quote"
                      value={t.content}
                      onChange={(e) => {
                        const updated = [...(content.items || [])];
                        updated[i].content = e.target.value;
                        setContent({ ...content, items: updated });
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Partners & Features fallback */}
          {(activeSection === 'features' || activeSection === 'payment_partners') && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-white uppercase tracking-wider">
                Raw JSON Schema Editor ({activeSection})
              </label>
              <textarea
                rows={12}
                value={JSON.stringify(content, null, 2)}
                onChange={(e) => {
                  try {
                    setContent(JSON.parse(e.target.value));
                  } catch (err) {}
                }}
                className="w-full bg-slate-950 font-mono border border-slate-800 rounded-xl p-3 text-xs text-emerald-400 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save & Publish Changes'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

