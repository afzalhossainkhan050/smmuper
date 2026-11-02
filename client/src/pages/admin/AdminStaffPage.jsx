import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import Breadcrumbs from '../../components/ui/Breadcrumbs';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import {
  Users, UserCheck, Shield, Plus, Edit2, Trash2, X,
  AlertCircle, Briefcase, Mail, Key
} from 'lucide-react';

export default function AdminStaffPage() {
  const { showToast } = useAuth();
  const [staffList, setStaffList] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeStaff, setActiveStaff] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Forms
  const [form, setForm] = useState({
    email: '',
    username: '',
    password: '',
    designation: 'Support Staff',
    role_id: '',
    status: 'active',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [staffRes, rolesRes] = await Promise.all([
        api.admin.getStaff(),
        api.admin.getRoles(),
      ]);
      setStaffList(staffRes.staff || []);
      setRoles(rolesRes.roles || []);
      if (rolesRes.roles?.length && !form.role_id) {
        setForm(prev => ({ ...prev, role_id: rolesRes.roles[0].id }));
      }
    } catch (err) {
      showToast(err.message || 'Failed to load staff list', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.admin.createStaff(form);
      showToast('Staff member registered successfully!');
      setShowAddModal(false);
      setForm({
        email: '',
        username: '',
        password: '',
        designation: 'Support Staff',
        role_id: roles[0]?.id || '',
        status: 'active',
      });
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to create staff', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const openEdit = (staff) => {
    setActiveStaff(staff);
    setForm({
      designation: staff.designation || '',
      role_id: staff.role_id,
      status: staff.status || 'active',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.admin.updateStaff(activeStaff.id, {
        designation: form.designation,
        role_id: form.role_id,
        status: form.status,
      });
      showToast('Staff member updated successfully!');
      setShowEditModal(false);
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to update staff', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (staff) => {
    if (!window.confirm(`Revoke staff privileges for ${staff.username}?`)) return;
    try {
      await api.admin.deleteStaff(staff.id);
      showToast('Staff privileges revoked successfully!');
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to revoke staff', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="dashboard-page-header">
        <div>
          <Breadcrumbs items={[{ label: 'Admin', to: '/admin' }, { label: 'Staff Management' }]} />
          <h1 className="dashboard-page-title mt-1 flex items-center gap-2.5">
            <UserCheck size={26} className="text-primary" />
            <span>Staff Management</span>
          </h1>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={() => setShowAddModal(true)}
        >
          Add Staff Member
        </Button>
      </div>

      {/* Staff Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center"><LoadingSpinner /></div>
          ) : staffList.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-xs">
              <UserCheck size={36} className="mx-auto mb-2 opacity-30" />
              <p>No staff members configured yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-bg-surface-elevated text-muted-foreground uppercase tracking-wider text-[10px] border-b border-border-main">
                  <tr>
                    <th className="px-4 py-3">Staff Member</th>
                    <th className="px-4 py-3">Designation</th>
                    <th className="px-4 py-3">Assigned Role</th>
                    <th className="px-4 py-3">Permissions</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Assigned</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {staffList.map((s) => (
                    <tr key={s.id} className="hover:bg-bg-surface-hover/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/15 text-indigo-400 font-bold flex items-center justify-center text-xs">
                            {s.username?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-text-primary">{s.username}</div>
                            <div className="text-[11px] text-muted-foreground">{s.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-text-primary">
                        {s.designation}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-primary-light text-primary font-bold text-[10px]">
                          {s.role_name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-[11px]">
                        {s.permissions?.includes('*') ? 'All (*)' : `${s.permissions?.length || 0} granted`}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-[11px]">
                        {new Date(s.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(s)}
                            className="p-1.5 rounded hover:bg-bg-surface-hover text-muted-foreground hover:text-text-primary"
                            title="Edit Role & Designation"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(s)}
                            className="p-1.5 rounded hover:bg-bg-surface-hover text-danger hover:text-red-400"
                            title="Revoke Staff Access"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL: ADD STAFF */}
      {showAddModal && (
        <div className="sidebar-overlay flex items-center justify-center p-4 z-50">
          <div className="saas-card w-full max-w-md bg-surface shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-main bg-bg-surface-elevated">
              <h3 className="text-sm font-extrabold text-text-primary flex items-center gap-2">
                <Plus size={18} className="text-primary" />
                <span>Add Staff Member</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-text-primary">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div className="form-group mb-0">
                <label className="form-label text-xs">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="staff@smmuper.com"
                  className="form-control text-xs"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="form-group mb-0">
                  <label className="form-label text-xs">Username (If New)</label>
                  <input
                    type="text"
                    placeholder="agent_sarah"
                    className="form-control text-xs"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                  />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label text-xs">Password (If New)</label>
                  <input
                    type="password"
                    placeholder="******"
                    className="form-control text-xs"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group mb-0">
                <label className="form-label text-xs">Designation / Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lead Support Agent"
                  className="form-control text-xs"
                  value={form.designation}
                  onChange={(e) => setForm({ ...form, designation: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="form-group mb-0">
                  <label className="form-label text-xs">Assign Role</label>
                  <select
                    className="form-control text-xs"
                    value={form.role_id}
                    onChange={(e) => setForm({ ...form, role_id: e.target.value })}
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group mb-0">
                  <label className="form-label text-xs">Status</label>
                  <select
                    className="form-control text-xs"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-border-main flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" size="sm" loading={actionLoading}>Save Staff</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT STAFF */}
      {showEditModal && activeStaff && (
        <div className="sidebar-overlay flex items-center justify-center p-4 z-50">
          <div className="saas-card w-full max-w-md bg-surface shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-main bg-bg-surface-elevated">
              <h3 className="text-sm font-extrabold text-text-primary flex items-center gap-2">
                <Edit2 size={18} className="text-primary" />
                <span>Edit Staff: {activeStaff.username}</span>
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-muted-foreground hover:text-text-primary">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="form-group mb-0">
                <label className="form-label text-xs">Designation</label>
                <input
                  type="text"
                  required
                  className="form-control text-xs"
                  value={form.designation}
                  onChange={(e) => setForm({ ...form, designation: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="form-group mb-0">
                  <label className="form-label text-xs">Role</label>
                  <select
                    className="form-control text-xs"
                    value={form.role_id}
                    onChange={(e) => setForm({ ...form, role_id: e.target.value })}
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group mb-0">
                  <label className="form-label text-xs">Status</label>
                  <select
                    className="form-control text-xs"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-border-main flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowEditModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" size="sm" loading={actionLoading}>Update Staff</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

