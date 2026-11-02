import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import Breadcrumbs from '../../components/ui/Breadcrumbs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import { ShieldCheck, ArrowRight, Layers, Sparkles } from 'lucide-react';

export default function AdminPlaceholderPage({ title, moduleGroup, phase = 'Phase 2' }) {
  const location = useLocation();

  const autoTitle = title || location.pathname.split('/').pop().replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <div className="space-y-6">
      <div className="dashboard-page-header">
        <div>
          <Breadcrumbs
            items={[
              { label: 'Admin', to: '/admin' },
              ...(moduleGroup ? [{ label: moduleGroup }] : []),
              { label: autoTitle },
            ]}
          />
          <h1 className="dashboard-page-title mt-1">{autoTitle}</h1>
        </div>
        <StatusBadge status="active" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary-light text-primary">
              <Layers size={22} />
            </div>
            <div>
              <CardTitle>{autoTitle} Management</CardTitle>
              <CardDescription>
                System module architecture registered and database connection confirmed.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="p-6 rounded-xl bg-bg-surface-elevated border border-border-main flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="font-extrabold text-sm text-text-primary">Architecture Status:</span>
                <span className="badge badge-active text-xs">Ready for {phase}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Database schema, API models, and permission matrices for this module are established in Phase 1. Full CRUD and data views will unlock in {phase}.
              </p>
            </div>
            <Link
              to="/admin"
              className="btn btn-secondary btn-sm flex items-center gap-2 whitespace-nowrap"
            >
              <span>Return to Dashboard</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

