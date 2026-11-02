import React, { useState, useEffect } from 'react';
import {
  Database, Download, ShieldAlert, CheckCircle2, AlertCircle,
  RefreshCw, Power, Lock, HardDrive, FileCheck
} from 'lucide-react';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminSystemBackupPage() {
  const { showToast } = useAuth();

  const [loading, setLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [toggling, setToggling] = useState(false);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const res = await api.admin.getMaintenanceStatus();
      setMaintenanceMode(!!res.maintenance_mode);
    } catch (err) {
      showToast(err.message || 'Failed to load maintenance status', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleToggleMaintenance = async () => {
    const nextVal = !maintenanceMode;
    try {
      setToggling(true);
      const res = await api.admin.toggleMaintenance(nextVal);
      setMaintenanceMode(nextVal);
      showToast(res.message || `Maintenance mode ${nextVal ? 'enabled' : 'disabled'}`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to toggle maintenance mode', 'error');
    } finally {
      setToggling(false);
    }
  };

  const handleDownloadBackup = () => {
    const token = localStorage.getItem('token');
    const url = `/api/admin/system/backup`;

    // Download using fetch with Authorization header to trigger browser file download
    fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Download failed');
        return res.blob();
      })
      .then(blob => {
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = `smmuper_backup_${new Date().toISOString().slice(0, 10)}.db`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Database backup downloaded successfully', 'success');
      })
      .catch(err => {
        showToast('Failed to download system backup: ' + err.message, 'error');
      });
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Database className="w-7 h-7 text-indigo-400" />
          System Maintenance & Database Backup
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Generate full snapshots of your SQLite database and manage platform maintenance availability.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Maintenance Mode Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
                <Power className="w-6 h-6" />
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                maintenanceMode
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}>
                {maintenanceMode ? 'MAINTENANCE ACTIVE' : 'SYSTEM LIVE & OPERATIONAL'}
              </span>
            </div>

            <h3 className="text-lg font-bold text-white">Platform Maintenance Mode</h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              When maintenance mode is active, customer registration, orders, and wallet deposits are gracefully paused with an announcement banner. Administrators retain full access.
            </p>
          </div>

          <div className="pt-6 border-t border-slate-800 mt-6 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Current state: <strong className="text-white">{maintenanceMode ? 'Enabled' : 'Disabled'}</strong>
            </span>
            <button
              onClick={handleToggleMaintenance}
              disabled={toggling || loading}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
                maintenanceMode
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-rose-600 hover:bg-rose-500 text-white'
              }`}
            >
              {toggling ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Power className="w-4 h-4" />
              )}
              {maintenanceMode ? 'Deactivate Maintenance' : 'Activate Maintenance'}
            </button>
          </div>
        </div>

        {/* Database Backup Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
                <HardDrive className="w-6 h-6" />
              </div>
              <span className="text-xs text-slate-400 font-mono">SQLite (WAL Mode)</span>
            </div>

            <h3 className="text-lg font-bold text-white">Database Snapshot Backup</h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Downloads a complete point-in-time binary copy of <code className="text-indigo-300">smm_uper.db</code>. WAL checkpointing is automatically flushed to disk to guarantee ACID consistency.
            </p>

            <div className="mt-4 bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
              <div>✓ Includes 30+ tables (Ledger, Orders, Users, Services, Settings)</div>
              <div>✓ Immutable financial ledger entries preserved</div>
              <div>✓ Standard SQLite format compatible with any server or restore tool</div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800 mt-6 flex justify-end">
            <button
              onClick={handleDownloadBackup}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all"
            >
              <Download className="w-4 h-4" />
              Download Database Backup (.db)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

