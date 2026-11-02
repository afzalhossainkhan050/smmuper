import React, { useState } from 'react';
import {
  Palette, Layout, Check, Sparkles, Monitor, Sun, Moon
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminThemesPage({ mode = 'theme' }) {
  const { showToast } = useAuth();

  const [activeTheme, setActiveTheme] = useState('premium-saas');
  const [activeDashboardLayout, setActiveDashboardLayout] = useState('modern-sidebar');
  const [primaryColor, setPrimaryColor] = useState('indigo');

  const themes = [
    {
      id: 'premium-saas',
      title: 'Premium SaaS Glassmorphism (Default)',
      description: 'Dark slate background with deep indigo accents, glass cards, and high contrast typography.',
      gradient: 'from-indigo-600/30 to-purple-600/20'
    },
    {
      id: 'cyber-reseller',
      title: 'Cyber Reseller High-Density',
      description: 'Ultra-compact high-density tables designed for high-volume order management and speed.',
      gradient: 'from-blue-600/30 to-cyan-600/20'
    },
    {
      id: 'aurora-emerald',
      title: 'Aurora Emerald Growth',
      description: 'Clean vibrant emerald green highlights ideal for marketing agency and financial platforms.',
      gradient: 'from-emerald-600/30 to-teal-600/20'
    }
  ];

  const dashboardLayouts = [
    {
      id: 'modern-sidebar',
      title: 'Modern Floating Sidebar',
      description: 'Iconic left sidebar navigation with collapsible rail and pinned topbar utilities.',
      icon: Layout
    },
    {
      id: 'dense-header',
      title: 'Compact Navigation Bar',
      description: 'Maximized horizontal screen real-estate with full-width tables.',
      icon: Monitor
    }
  ];

  const handleSaveTheme = () => {
    showToast('Theme configuration updated successfully!', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Palette className="w-7 h-7 text-indigo-400" />
          {mode === 'theme' ? 'Theme & Visual Styling Settings' : 'Dashboard Layout Customizer'}
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Customize SMMuper's visual branding, customer dashboard layouts, color palettes, and component styles.
        </p>
      </div>

      {/* Theme Cards Grid */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Select Active Theme</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {themes.map((th) => {
            const isSelected = activeTheme === th.id;
            return (
              <div
                key={th.id}
                onClick={() => setActiveTheme(th.id)}
                className={`relative rounded-2xl p-6 border transition-all cursor-pointer bg-slate-900/90 shadow-lg ${
                  isSelected
                    ? 'border-indigo-500 ring-2 ring-indigo-500/30'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className={`h-28 rounded-xl bg-gradient-to-br ${th.gradient} border border-slate-800 flex items-center justify-center mb-4`}>
                  <Sparkles className="w-8 h-8 text-white/70" />
                </div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-white text-sm">{th.title}</h3>
                  {isSelected && (
                    <div className="p-1 rounded-full bg-indigo-600 text-white">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{th.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dashboard Layout Selection */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Customer Dashboard Structure</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {dashboardLayouts.map((ly) => {
            const isSelected = activeDashboardLayout === ly.id;
            const Icon = ly.icon;
            return (
              <div
                key={ly.id}
                onClick={() => setActiveDashboardLayout(ly.id)}
                className={`flex items-start gap-4 p-5 rounded-2xl border transition-all cursor-pointer bg-slate-900/90 ${
                  isSelected
                    ? 'border-indigo-500 ring-2 ring-indigo-500/30'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-indigo-400">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-white text-sm">{ly.title}</h4>
                    {isSelected && <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-bold">ACTIVE</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{ly.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-4 flex justify-end">
        <button
          onClick={handleSaveTheme}
          className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20"
        >
          Apply & Save Theme Changes
        </button>
      </div>
    </div>
  );
}

