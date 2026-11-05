import React, { useState, useEffect } from 'react';
import { Palette, Save, Loader2, RotateCcw, Check, Sun, Moon, MonitorSmartphone } from 'lucide-react';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { PRESETS, DEFAULT_BRAND, isHex, applyBrand } from '../../utils/brandTheme';

const MODES = [
  { id: '', label: 'Visitor choice', hint: 'Starts dark; visitors can switch', icon: MonitorSmartphone },
  { id: 'dark', label: 'Dark', hint: 'New visitors see dark', icon: Moon },
  { id: 'light', label: 'Light', hint: 'New visitors see light', icon: Sun },
];

function ColorField({ id, label, value, onChange, fallback }) {
  const shown = isHex(value) ? value : fallback;
  return (
    <div>
      <label className="saas-label" htmlFor={id}>{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={shown}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="w-12 h-10 rounded-lg border border-border-main cursor-pointer bg-transparent p-0.5"
        />
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder={fallback}
          maxLength={7}
          spellCheck={false}
          className="saas-input font-mono text-xs uppercase flex-1"
        />
      </div>
    </div>
  );
}

export default function AdminThemePage() {
  const { showToast } = useAuth();
  const { theme, brand, setBrand } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ primary: '', accent: '', default_mode: '' });

  useEffect(() => {
    (async () => {
      try {
        const res = await api.admin.getThemeSettings();
        if (res?.settings) setForm({ primary: '', accent: '', default_mode: '', ...res.settings });
      } catch (err) {
        showToast(err.message || 'Failed to load theme settings', 'error');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live preview: the whole admin panel changes color as you pick
  useEffect(() => {
    if (loading) return;
    const preview = (isHex(form.primary) || isHex(form.accent)) ? form : null;
    applyBrand(preview, theme);
  }, [form.primary, form.accent, theme, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Leaving without saving restores the saved colors
  useEffect(() => () => applyBrand(brand, theme), [brand, theme]);

  const pickPreset = (p) => setForm((f) => ({ ...f, primary: p.primary, accent: p.accent }));
  const isActivePreset = (p) => form.primary.toUpperCase() === p.primary && form.accent.toUpperCase() === p.accent;
  const usingDefault = !isHex(form.primary) && !isHex(form.accent);

  const handleSave = async (e) => {
    e.preventDefault();
    if (form.primary && !isHex(form.primary)) {
      showToast('Primary color must look like #7C5CFC', 'error');
      return;
    }
    if (form.accent && !isHex(form.accent)) {
      showToast('Accent color must look like #2DD4BF', 'error');
      return;
    }
    try {
      setSaving(true);
      await api.admin.updateThemeSettings({
        primary: form.primary || '',
        accent: form.accent || '',
        default_mode: form.default_mode || '',
      });
      setBrand({ primary: form.primary, accent: form.accent });
      showToast('Theme saved. Visitors will see it on their next page load.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to save theme settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-primary mr-2" size={24} />
        <span className="text-sm font-semibold text-muted-foreground">Loading theme settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary flex items-center gap-2.5">
          <Palette className="text-primary" size={24} />
          Theme &amp; colors
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Choose your brand colors. The whole website, customer dashboard and this admin panel change as you pick. Nothing is public until you save.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="saas-card space-y-5">
          <div className="border-b border-border-main pb-3">
            <h2 className="text-base font-bold text-text-primary">Color presets</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Start from a preset, then fine-tune below if you want.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {PRESETS.map((p) => {
              const active = isActivePreset(p);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pickPreset(p)}
                  aria-pressed={active}
                  className={`relative p-3 rounded-2xl border text-left transition-all ${
                    active ? 'border-primary bg-primary-light' : 'border-border-main bg-bg-surface-elevated hover:border-primary/50'
                  }`}
                >
                  <span
                    className="block h-10 rounded-xl mb-2.5"
                    style={{ background: `linear-gradient(135deg, ${p.primary}, ${p.accent})` }}
                  />
                  <span className="text-xs font-bold text-text-primary">{p.name}</span>
                  {active && (
                    <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center">
                      <Check size={12} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            <ColorField id="theme-primary" label="Main color" value={form.primary} fallback={DEFAULT_BRAND.primary}
              onChange={(v) => setForm((f) => ({ ...f, primary: v }))} />
            <ColorField id="theme-accent" label="Accent color" value={form.accent} fallback={DEFAULT_BRAND.accent}
              onChange={(v) => setForm((f) => ({ ...f, accent: v }))} />
          </div>
          <p className="text-[11px] text-muted-foreground">
            The main color is used for buttons, links and highlights. The accent color blends into gradients and charts.
          </p>
        </div>

        <div className="saas-card space-y-4">
          <div className="border-b border-border-main pb-3">
            <h2 className="text-base font-bold text-text-primary">Default mode</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Applies to new visitors only. Anyone who switches light or dark keeps their own choice.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Default mode">
            {MODES.map((m) => {
              const Icon = m.icon;
              const active = form.default_mode === m.id;
              return (
                <button
                  key={m.id || 'visitor'}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setForm((f) => ({ ...f, default_mode: m.id }))}
                  className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                    active ? 'border-primary bg-primary-light' : 'border-border-main bg-bg-surface-elevated hover:border-primary/50'
                  }`}
                >
                  <Icon size={18} className={active ? 'text-primary' : 'text-muted-foreground'} />
                  <span>
                    <span className="block text-xs font-bold text-text-primary">{m.label}</span>
                    <span className="block text-[11px] text-muted-foreground mt-0.5">{m.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="saas-card space-y-4">
          <div className="border-b border-border-main pb-3">
            <h2 className="text-base font-bold text-text-primary">Live preview</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="saas-btn-primary text-xs">Primary button</button>
            <button type="button" className="saas-btn-secondary text-xs">Secondary button</button>
            <span className="status-badge">Active</span>
            <span className="gradient-text text-xl font-extrabold">Gradient heading</span>
          </div>
          <div className="h-2 rounded-full" style={{ background: 'var(--primary-gradient)' }} />
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, primary: '', accent: '' }))}
            disabled={usingDefault}
            className="saas-btn-secondary flex items-center justify-center gap-2 text-xs"
          >
            <RotateCcw size={14} /> Use the default colors
          </button>
          <button type="submit" disabled={saving} className="saas-btn-primary flex items-center justify-center gap-2 text-xs">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving...' : 'Save theme'}
          </button>
        </div>
      </form>
    </div>
  );
}
