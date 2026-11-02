import React from 'react';

export default function StatusBadge({ status, className = '' }) {
  const normStatus = String(status || 'unknown').toLowerCase().trim();

  let badgeType = 'default';
  if (['active', 'completed', 'success', 'approved'].includes(normStatus)) {
    badgeType = 'active';
  } else if (['pending', 'waiting', 'open'].includes(normStatus)) {
    badgeType = 'pending';
  } else if (['processing', 'in_progress', 'replied', 'answered'].includes(normStatus)) {
    badgeType = 'processing';
  } else if (['cancelled', 'failed', 'rejected', 'banned', 'suspended', 'inactive', 'closed'].includes(normStatus)) {
    badgeType = 'cancelled';
  }

  const label = normStatus.replace(/_/g, ' ');

  return (
    <span className={`badge badge-${badgeType} ${className}`}>
      <span className="badge-dot" />
      {label}
    </span>
  );
}

