import React from 'react';
import { Clock, CheckCircle2, UserCheck, PlayCircle, XCircle } from 'lucide-react';

export default function StatusBadge({ status }) {
  const normalized = (status || 'pending').toLowerCase();

  const config = {
    pending: {
      label: 'Pending Confirmation',
      className: 'badge-pending',
      icon: Clock,
    },
    confirmed: {
      label: 'Confirmed',
      className: 'badge-confirmed',
      icon: CheckCircle2,
    },
    assigned: {
      label: 'Technician Assigned',
      className: 'badge-assigned',
      icon: UserCheck,
    },
    in_progress: {
      label: 'In Progress',
      className: 'badge-in_progress',
      icon: PlayCircle,
    },
    completed: {
      label: 'Service Completed',
      className: 'badge-completed',
      icon: CheckCircle2,
    },
    cancelled: {
      label: 'Cancelled',
      className: 'badge-cancelled',
      icon: XCircle,
    },
    rejected: {
      label: 'Declined',
      className: 'badge-rejected',
      icon: XCircle,
    },
  };

  const item = config[normalized] || config.pending;
  const Icon = item.icon;

  return (
    <span className={`badge ${item.className}`}>
      <Icon size={13} />
      {item.label}
    </span>
  );
}
