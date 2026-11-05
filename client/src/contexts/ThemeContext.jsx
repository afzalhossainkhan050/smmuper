import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { applyBrand, loadSavedBrand, saveBrandLocally } from '../utils/brandTheme';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // Did the visitor ever choose light/dark themselves? If not, the admin's default mode applies.
  const userChose = useRef(false);

  const [theme, setThemeState] = useState(() => {
    const saved = localStorage.getItem('smmuper_theme');
    if (saved === 'light' || saved === 'dark') {
      userChose.current = true;
      return saved;
    }
    return 'dark';
  });

  // Last brand colors the admin saved (cached locally so there is no color flash on reload)
  const [brand, setBrandState] = useState(() => loadSavedBrand());

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    applyBrand(brand, theme);
  }, [theme, brand]);

  const toggleTheme = () => {
    userChose.current = true;
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('smmuper_theme', next);
      return next;
    });
  };

  const setTheme = (mode) => {
    if (mode === 'dark' || mode === 'light') {
      userChose.current = true;
      localStorage.setItem('smmuper_theme', mode);
      setThemeState(mode);
    }
  };

  /** Called with the admin's saved brand colors (or empty to use the built-in default). */
  const setBrand = useCallback((next) => {
    saveBrandLocally(next);
    setBrandState(next && (next.primary || next.accent) ? { primary: next.primary, accent: next.accent } : null);
  }, []);

  /** Admin's default light/dark mode, used only for visitors who never picked one. */
  const applyDefaultMode = useCallback((mode) => {
    if (!userChose.current && (mode === 'dark' || mode === 'light')) {
      setThemeState(mode);
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme, setTheme, brand, setBrand, applyDefaultMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
