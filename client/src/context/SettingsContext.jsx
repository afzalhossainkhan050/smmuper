import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const defaultSettings = {
  business_name: 'CoolAir Pro Services',
  business_tagline: 'Reliable Climate Solutions & Certified AC Technicians',
  business_phone: '+1 (555) 321-4321',
  business_emergency_phone: '+1 (555) 911-COOL',
  business_email: 'support@coolairpro.com',
  business_address: '742 Evergreen Terrace, Suite 300',
  business_city: 'Metro City, NY 10001',
  business_whatsapp: '15553214321',
  business_hours: 'Monday – Sunday: 7:00 AM – 10:00 PM (Emergency 24/7 Dispatch)',
  service_radius: 'Serving Metro City & Greater Metropolitan Area (35-mile radius)',
  emergency_guarantee: 'Guaranteed 60-Minute Rapid Response for Emergencies',
  license_number: 'HVAC Master License #NY-884920-A',
  google_maps_embed: 'https://maps.google.com/maps?q=40.712776,-74.005974&hl=en;z=14&output=embed',
};

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const response = await api.settings.get();
      if (response.success && response.data) {
        setSettings((prev) => ({ ...prev, ...response.data }));
      }
    } catch (err) {
      console.warn('Using default site settings:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const refreshSettings = () => fetchSettings();

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

export default SettingsContext;
