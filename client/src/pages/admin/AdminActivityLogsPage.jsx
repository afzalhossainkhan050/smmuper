import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import Breadcrumbs from '../../components/ui/Breadcrumbs';
import Button from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import {
  Activity, Search, Trash2, Calendar, User, Globe, ChevronLeft, ChevronRight, Eye, X
} from 'lucide-react';

export default function AdminActivityLogsPage() {
  const { showToast } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });

  const [activeLog, setActiveLog] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, [page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        ...(search ? { search } : {})
      }).toString();

      const res = await api.admin.getActivityLogs(params);
      setLogs(res.logs || []);
      if (res.pagination) setPagination(res.pagination);
    } catch (err) {
      showToast(err.message || 'Failed to fetch logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleClearLogs = async () => {
    if (!window.confirm('Clear all audit logs older than 30 days?')) return;
    try {
      await api.admin.clearActivityLogs();
      showToast('Historical logs cleared successfully!');
      fetchLogs();
    } catch (err) {
      showToast(err.message || 'Failed to clear logs', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="dashboard-page-header">
        <div>
          <Breadcrumbs items={[{ label: 'Admin', to: '/admin' }, { label: 'Activity Logs' }]} />
          <h1 className="dashboard-page-title mt-1 flex items-center gap-2.5">
            <Activity size={26} className="text-primary" />
            <span>Admin Activity & Audit Logs</span>
          </h1>
        </div>
        <Button
          variant="secondary"
          size="sm"
          icon={Trash2}
          onClick={handleClearLogs}
        >
          Clear Old Logs
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex items-center gap-2 max-w-md">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search action, admin, IP..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-control pl-9 text-xs"
              />
            </div>
            <Button type="submit" variant="primary" size="sm">Search</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center"><LoadingSpinner /></div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-xs">
              <Activity size={36} className="mx-auto mb-2 opacity-30" />
              <p>No audit logs recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-bg-surface-elevated text-muted-foreground uppercase tracking-wider text-[10px] border-b border-border-main">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Admin</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">IP Address</th>
                    <th className="px-4 py-3">Details</th>
                    <th className="px-4 py-3 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle font-mono">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-bg-surface-hover/50 transition-colors">
                      <td className="px-4 py-3 font-sans text-muted-foreground text-[11px] whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-sans font-bold text-text-primary">
                        {log.admin_username || 'System'}
                      </td>
                      <td className="px-4 py-3 font-sans">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-primary-light text-primary">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-[11px]">
                        {log.ip_address || '127.0.0.1'}
                      </td>
                      <td className="px-4 py-3 max-w-[240px] truncate text-muted-foreground text-[11px]">
                        {log.details || '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setActiveLog(log)}
                          className="p-1.5 rounded hover:bg-bg-surface-hover text-muted-foreground hover:text-text-primary"
                          title="Inspect Audit JSON"
                        >
                          <Eye size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
          <span>Page {page} of {pagination.totalPages}</span>
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded border border-border-main bg-surface disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              className="p-1.5 rounded border border-border-main bg-surface disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* LOG INSPECTION MODAL */}
      {activeLog && (
        <div className="sidebar-overlay flex items-center justify-center p-4 z-50">
          <div className="saas-card w-full max-w-lg bg-surface shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-main bg-bg-surface-elevated">
              <h3 className="text-sm font-extrabold text-text-primary">
                Audit Log #{activeLog.id} – {activeLog.action}
              </h3>
              <button onClick={() => setActiveLog(null)} className="text-muted-foreground hover:text-text-primary">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-3 text-xs">
              <div className="flex justify-between border-b border-border-subtle pb-2">
                <span className="text-muted-foreground">Admin:</span>
                <span className="font-bold text-text-primary">{activeLog.admin_username} ({activeLog.admin_email})</span>
              </div>
              <div className="flex justify-between border-b border-border-subtle pb-2">
                <span className="text-muted-foreground">IP Address:</span>
                <span className="font-mono text-text-primary">{activeLog.ip_address}</span>
              </div>
              <div className="flex justify-between border-b border-border-subtle pb-2">
                <span className="text-muted-foreground">User Agent:</span>
                <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[280px]">{activeLog.user_agent}</span>
              </div>
              <div>
                <span className="text-muted-foreground block mb-1">Payload Details:</span>
                <pre className="p-3 rounded-lg bg-bg-surface-elevated border border-border-main font-mono text-[11px] overflow-x-auto text-text-primary">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(activeLog.details), null, 2);
                    } catch (e) {
                      return activeLog.details;
                    }
                  })()}
                </pre>
              </div>
              <div className="pt-2 flex justify-end">
                <Button variant="secondary" size="sm" onClick={() => setActiveLog(null)}>Close</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

