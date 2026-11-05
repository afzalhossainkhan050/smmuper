import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { useTheme } from './ThemeContext';

const SystemContext = createContext(null);

export function SystemProvider({ children }) {
  const { setBrand, applyDefaultMode } = useTheme();
  const [config, setConfig] = useState({
    brand: {
      name: 'SMMuper',
      title: 'SMMuper – #1 Best & Cheapest Social Media Marketing SaaS Panel',
      domain: 'https://smmuper.com',
      contact_email: 'support@smmuper.com',
      currency_code: 'USD',
      currency_symbol: '$',
      maintenance_mode: false,
    },
    currencies: [
      { code: 'USD', symbol: '$', exchange_rate: 1.0, is_default: 1, name: 'US Dollar' },
      { code: 'BDT', symbol: '৳', exchange_rate: 120.0, is_default: 0, name: 'Bangladeshi Taka' },
      { code: 'EUR', symbol: '€', exchange_rate: 0.92, is_default: 0, name: 'Euro' },
    ],
    defaultCurrency: { code: 'USD', symbol: '$', exchange_rate: 1.0 },
    platforms: [],
    notice: null,
  });

  const [currentCurrency, setCurrentCurrency] = useState(() => {
    const saved = localStorage.getItem('smmuper_currency');
    return saved ? JSON.parse(saved) : { code: 'USD', symbol: '$', exchange_rate: 1.0 };
  });

  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await api.system.getConfig();
      if (res && res.brand) {
        setConfig(res);
        if (res.theme) {
          setBrand({ primary: res.theme.primary, accent: res.theme.accent });
          applyDefaultMode(res.theme.default_mode);
        }
        // If no user override, select default currency
        const saved = localStorage.getItem('smmuper_currency');
        if (!saved && res.defaultCurrency) {
          setCurrentCurrency(res.defaultCurrency);
        }
      }
    } catch (err) {
      console.warn('System config fetch failed, using defaults:', err);
    } finally {
      setLoading(false);
    }
  }, [setBrand, applyDefaultMode]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const changeCurrency = (code) => {
    const match = config.currencies.find(c => c.code === code);
    if (match) {
      setCurrentCurrency(match);
      localStorage.setItem('smmuper_currency', JSON.stringify(match));
    }
  };

  /**
   * Convert an amount in USD to current active currency
   */
  const formatPrice = (amountInUSD, decimals = 2) => {
    const val = parseFloat(amountInUSD || 0);
    const converted = val * (currentCurrency.exchange_rate || 1.0);
    return `${currentCurrency.symbol}${converted.toFixed(decimals)}`;
  };

  return (
    <SystemContext.Provider
      value={{
        config,
        brand: config.brand,
        currencies: config.currencies,
        currentCurrency,
        changeCurrency,
        formatPrice,
        notice: config.notice,
        loading,
        refreshConfig: fetchConfig,
      }}
    >
      {children}
    </SystemContext.Provider>
  );
}

export function useSystem() {
  const context = useContext(SystemContext);
  if (!context) {
    throw new Error('useSystem must be used within a SystemProvider');
  }
  return context;
}

export default SystemContext;

