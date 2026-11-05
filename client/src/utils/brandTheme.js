// Brand color engine: turns two admin-chosen colors into the CSS variables the whole site uses.

export const DEFAULT_BRAND = { primary: '#7C5CFC', accent: '#2DD4BF' };

export const PRESETS = [
  { id: 'aurora',  name: 'Aurora',  primary: '#7C5CFC', accent: '#2DD4BF' },
  { id: 'indigo',  name: 'Indigo',  primary: '#6366F1', accent: '#06B6D4' },
  { id: 'ocean',   name: 'Ocean',   primary: '#2F7BFF', accent: '#22D3EE' },
  { id: 'emerald', name: 'Emerald', primary: '#10B981', accent: '#3B82F6' },
  { id: 'rose',    name: 'Rose',    primary: '#F43F5E', accent: '#F59E0B' },
  { id: 'sunset',  name: 'Sunset',  primary: '#F97316', accent: '#EC4899' },
];

export const isHex = (v) => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);

const toRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (rgb) => '#' + rgb.map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => {
  const A = toRgb(a), B = toRgb(b);
  return toHex(A.map((n, i) => n + (B[i] - n) * t));
};
const rgba = (hex, alpha) => `rgba(${toRgb(hex).join(', ')}, ${alpha})`;

/** CSS variables for a brand. Returns null when no custom brand is set (use stylesheet defaults). */
export function brandVars(brand, mode = 'dark') {
  if (!brand || (!isHex(brand.primary) && !isHex(brand.accent))) return null;
  const primary = isHex(brand.primary) ? brand.primary : DEFAULT_BRAND.primary;
  const accent = isHex(brand.accent) ? brand.accent : DEFAULT_BRAND.accent;
  const isDark = mode !== 'light';
  const solid = isDark ? primary : mix(primary, '#000000', 0.1);

  return {
    '--brand-1': primary,
    '--brand-2': mix(primary, accent, 0.5),
    '--brand-3': accent,
    '--primary': solid,
    '--primary-hover': mix(primary, '#000000', 0.14),
    '--primary-light': rgba(primary, isDark ? 0.16 : 0.12),
    '--border-focus': solid,
    '--sidebar-item-active': mix(primary, '#FFFFFF', 0.55),
    '--sidebar-item-active-bg': rgba(primary, 0.2),
    '--sidebar-item-hover': rgba(primary, 0.12),
    '--accent-cyan': accent,
    '--accent-cyan-bg': rgba(accent, 0.14),
  };
}

const MANAGED_VARS = Object.keys(brandVars({ primary: DEFAULT_BRAND.primary, accent: DEFAULT_BRAND.accent }, 'dark'));

export function applyBrand(brand, mode = 'dark') {
  const style = document.documentElement.style;
  const vars = brandVars(brand, mode);
  if (!vars) {
    MANAGED_VARS.forEach((name) => style.removeProperty(name));
    return;
  }
  Object.entries(vars).forEach(([name, value]) => style.setProperty(name, value));
}

export function loadSavedBrand() {
  try {
    const saved = JSON.parse(localStorage.getItem('smmuper_brand') || 'null');
    return saved && (isHex(saved.primary) || isHex(saved.accent)) ? saved : null;
  } catch {
    return null;
  }
}

export function saveBrandLocally(brand) {
  try {
    if (brand && (isHex(brand.primary) || isHex(brand.accent))) {
      localStorage.setItem('smmuper_brand', JSON.stringify({ primary: brand.primary, accent: brand.accent }));
    } else {
      localStorage.removeItem('smmuper_brand');
    }
  } catch { /* storage unavailable */ }
}
