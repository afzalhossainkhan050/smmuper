import React from 'react';
import { Phone, MessageCircle } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export default function FloatingButtons() {
  const { settings } = useSettings();

  const phoneClean = (settings.business_phone || '').replace(/[^\d+]/g, '');
  const whatsappClean = (settings.business_whatsapp || '15553214321').replace(/[^\d]/g, '');

  return (
    <div style={{
      position: 'fixed',
      bottom: '1.5rem',
      right: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      zIndex: 999,
    }}>
      {/* WhatsApp Button */}
      <a
        href={`https://wa.me/${whatsappClean}?text=Hello%20${encodeURIComponent(settings.business_name || 'CoolAir Pro')},%20I%20need%20assistance%20with%20my%20air%20conditioning%20system.`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          backgroundColor: '#25D366',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 15px rgba(37, 211, 102, 0.45)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.08)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(37, 211, 102, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 15px rgba(37, 211, 102, 0.45)';
        }}
        title="Chat on WhatsApp"
        aria-label="WhatsApp Contact"
      >
        <MessageCircle size={28} />
      </a>

      {/* Call Button */}
      <a
        href={`tel:${phoneClean}`}
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          backgroundColor: '#0284C7',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 15px rgba(2, 132, 199, 0.45)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.08)';
          e.currentTarget.style.boxShadow = '0 6px 20px rgba(2, 132, 199, 0.6)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 15px rgba(2, 132, 199, 0.45)';
        }}
        title="Call Technicians"
        aria-label="Call Business Phone"
      >
        <Phone size={24} />
      </a>
    </div>
  );
}
