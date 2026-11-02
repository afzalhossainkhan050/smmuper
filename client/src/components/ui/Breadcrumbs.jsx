import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export default function Breadcrumbs({ items = [] }) {
  if (!items.length) return null;

  return (
    <nav className="dashboard-breadcrumbs select-none" aria-label="Breadcrumb">
      <Link to="/dashboard" className="flex items-center gap-1 hover:text-indigo-400">
        <Home size={14} />
      </Link>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            <ChevronRight size={13} className="opacity-40" />
            {isLast || !item.to ? (
              <span className="font-semibold text-text-primary">{item.label}</span>
            ) : (
              <Link to={item.to} className="hover:text-indigo-400">
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

