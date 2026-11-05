import React from 'react';
import { Link } from 'react-router-dom';

/**
 * SMMuper Official Vector Logo Component
 * Supports 'full' (icon + text), 'icon-only', and sizes ('sm', 'md', 'lg', 'xl')
 */
export default function Logo({
  variant = 'full',
  size = 'md',
  to = '/',
  clickable = true,
  className = '',
}) {
  const sizeMap = {
    sm: { icon: 28, text: 'text-lg', badge: 'text-[9px]' },
    md: { icon: 36, text: 'text-xl', badge: 'text-[10px]' },
    lg: { icon: 44, text: 'text-2xl', badge: 'text-xs' },
    xl: { icon: 54, text: 'text-3xl', badge: 'text-xs' },
  };

  const { icon: iconSize } = sizeMap[size] || sizeMap.md;

  const content = (
    <div className={`smmuper-logo-wrapper flex items-center gap-2.5 select-none ${className}`}>
      {/* Dynamic SMMuper S-Mark Icon */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="smmuper-logo-icon flex-shrink-0 transition-transform duration-300 hover:scale-105"
      >
        <defs>
          <linearGradient id="logo-bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: 'var(--brand-1, #7C5CFC)' }} />
            <stop offset="50%" style={{ stopColor: 'var(--brand-2, #5498DD)' }} />
            <stop offset="100%" style={{ stopColor: 'var(--brand-3, #2DD4BF)' }} />
          </linearGradient>
          <linearGradient id="logo-s-grad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: 'color-mix(in srgb, var(--brand-3, #2DD4BF) 55%, white)' }} />
            <stop offset="100%" stopColor="#FFFFFF" />
          </linearGradient>
          <filter id="logo-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" style={{ floodColor: 'var(--brand-1, #7C5CFC)' }} floodOpacity="0.35" />
          </filter>
        </defs>

        {/* Glow Layer */}
        <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#logo-bg-grad)" filter="url(#logo-glow)" />
        <rect x="3" y="3" width="58" height="58" rx="15" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" />

        {/* Curved Dynamic SMM Surge */}
        <path
          d="M 44 18 
             C 40 14, 26 14, 23 20 
             C 20 26, 27 30, 32 32 
             C 39 34, 46 38, 43 46 
             C 40 52, 26 53, 20 48"
          stroke="url(#logo-s-grad)"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Arrow Tip */}
        <polygon points="41,14 47,14 47,20 44,17" fill="#FFFFFF" />

        {/* Core Nexus Dot */}
        <circle cx="32" cy="32" r="3.2" style={{ fill: 'var(--brand-3, #2DD4BF)' }} />
      </svg>

      {/* Typography for Full Variant */}
      {variant !== 'icon-only' && (
        <div className="smmuper-logo-text-col flex flex-col leading-none">
          <div className="flex items-center tracking-tight font-extrabold">
            <span className="smmuper-brand-smm">SMM</span>
            <span className="smmuper-brand-uper bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-400 bg-clip-text text-transparent">
              uper
            </span>
            <span className="smmuper-brand-dot text-cyan-400">.</span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground opacity-75 mt-0.5">
            SaaS Panel
          </span>
        </div>
      )}
    </div>
  );

  if (clickable && to) {
    return (
      <Link to={to} className="inline-flex items-center outline-none">
        {content}
      </Link>
    );
  }

  return content;
}

