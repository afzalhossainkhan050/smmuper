import React from 'react';
import { Star } from 'lucide-react';

export default function StarRating({ rating = 5, max = 5, onRate, interactive = false, size = 16 }) {
  const stars = [];

  for (let i = 1; i <= max; i++) {
    const isFilled = i <= Math.round(rating);
    stars.push(
      <span
        key={i}
        onClick={() => interactive && onRate && onRate(i)}
        style={{
          cursor: interactive ? 'pointer' : 'default',
          color: isFilled ? '#F59E0B' : '#E2E8F0',
          transition: 'color 0.15s ease',
          display: 'inline-flex',
        }}
        title={`${i} Stars`}
      >
        <Star
          size={size}
          fill={isFilled ? '#F59E0B' : 'transparent'}
          strokeWidth={isFilled ? 1.5 : 2}
        />
      </span>
    );
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
      {stars}
    </div>
  );
}
