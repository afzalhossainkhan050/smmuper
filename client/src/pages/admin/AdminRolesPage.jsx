import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import LoadingSpinner from '../../components/LoadingSpinner';
import Breadcrumbs from '../../components/ui/Breadcrumbs';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import {
  Shield, Plus, Edit3, Trash2, X, CheckSquare, Square,
  Users, Key, AlertCircle, Check
} from 'lucide-react';

export default function AdminRolesPage() {
  const { showToast } = useAuth();
  const [roles, setRoles] = useState([]);
  const [permissionsCatalog, setPermissionsCatalog] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: '',
    description: '',
    permissions: [],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rolesRes, permRes] = await Promise.all([
        api.admin.getRoles(),
        api.admin.getPermissionsList(),
      ]);
      setRoles(rolesRes.roles || []);
      setPermissionsCatalog(permRes.permissions || []);
    } catch (err) {
      showToast(err.message || 'Failed to load roles', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingRole(null);
    setForm({
      name: '',
      description: '',
      permissions: ['dashboard.view', 'orders.view'],
    });
    setShowModal(true);
  };

  const openEdit = (role) => {
    setEditingRole(role);
    setForm({
      name: role.name,
      description: role.description || '',
      permissions: Array.isArray(role.permissions) ? role.permissions : [],
    });
    setShowModal(true);
  };

  const togglePermission = (key) => {
    setForm(prev => {
      const perms = prev.permissions.includes(key)
        ? prev.permissions.filter(k => k !== key)
        : [...prev.permissions, key];
      return { ...prev, permissions: perms };
    });
  };

  const toggleGroup = (groupPerms) => {
    const keys = groupPerms.map(p => p.key);
    const allSelected = keys.every(k => form.permissions.includes(k));
    setForm(prev => {
      let perms;
      if (allSelected) {
        perms = prev.permissions.filter(k => !keys.includes(k));
      } else {
        perms = Array.from(new Set([...prev.permissions, ...keys]));
      }
      return { ...prev, permissions: perms };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Role name is required', 'error');
      return;
    }
    setActionLoading(true);
    try {
      if (editingRole) {
        await api.admin.updateRole(editingRole.id, form);
        showToast('Role updated successfully!');
      } else {
        await api.admin.createRole(form);
        showToast('Role created successfully!');
      }
      setShowModal(false);
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to save role', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (role) => {
    if (!window.confirm(`Are you sure you want to delete role '${role.name}'?`)) return;
    try {
      await api.admin.deleteRole(role.id);
      showToast('Role deleted successfully!');
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to delete role', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="dashboard-page-header">
        <div>
          <Breadcrumbs items={[{ label: 'Admin', to: '/admin' }, { label: 'Roles & Permissions' }]} />
          <h1 className="dashboard-page-title mt-1 flex items-center gap-2.5">
            <Shield size={26} className="text-primary" />
            <span>Roles & Permissions</span>
          </h1>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={openCreate}
        >
          Create New Role
        </Button>
      </div>

      {/* Roles Grid */}
      {loading ? (
        <div className="p-12 text-center"><LoadingSpinner /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((r) => {
            const isSuper = r.name === 'Super Admin' || r.permissions?.includes('*');
            return (
              <Card key={r.id} className="hover:border-primary/40 flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <span>{r.name}</span>
                        {isSuper && (
                          <span className="badge badge-active text-[10px]">Universal</span>
                        )}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {r.description || 'No description configured'}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-bg-surface-elevated border border-border-main">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Users size={14} /> Assigned Staff:
                    </span>
                    <span className="font-bold text-text-primary">{r.staff_count || 0} members</span>
                  </div>

                  <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-bg-surface-elevated border border-border-main">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Key size={14} /> Permissions:
                    </span>
                    <span className="font-bold text-primary">
                      {isSuper ? 'All Privileges (*)' : `${r.permissions?.length || 0} assigned`}
                    </span>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-border-subtle">
                    <button
                      onClick={() => openEdit(r)}
                      className="btn btn-secondary btn-sm text-xs flex items-center gap-1.5"
                    >
                      <Edit3 size={14} /> Edit
                    </button>
                    {!isSuper && (
                      <button
                        onClick={() => handleDelete(r)}
                        className="btn btn-ghost btn-sm text-danger hover:bg-danger-bg text-xs"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* MODAL: ADD / EDIT ROLE */}
      {showModal && (
        <div className="sidebar-overlay flex items-center justify-center p-4 z-50">
          <div className="saas-card w-full max-w-2xl bg-surface shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-main bg-bg-surface-elevated flex-shrink-0">
              <h3 className="text-sm font-extrabold text-text-primary flex items-center gap-2">
                <Shield size={18} className="text-primary" />
                <span>{editingRole ? `Edit Role: ${editingRole.name}` : 'Create New System Role'}</span>
              </h3>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-text-primary">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group mb-0">
                  <label className="form-label text-xs">Role Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Order Dispatcher"
                    className="form-control text-xs"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label text-xs">Description</label>
                  <input
                    type="text"
                    placeholder="Responsibilities & scope"
                    className="form-control text-xs"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <div className="text-xs font-extrabold text-text-primary uppercase tracking-wider mb-2">
                  Assign Granular Permissions
                </div>

                <div className="space-y-4">
                  {permissionsCatalog.map((group, gIdx) => {
                    const allSelected = group.permissions.every(p => form.permissions.includes(p.key));
                    return (
                      <div key={gIdx} className="p-3.5 rounded-xl bg-bg-surface-elevated border border-border-main space-y-2.5">
                        <div className="flex items-center justify-between border-b border-border-subtle pb-2">
                          <span className="font-extrabold text-xs text-text-primary">{group.group}</span>
                          <button
                            type="button"
                            onClick={() => toggleGroup(group.permissions)}
                            className="text-[11px] font-bold text-primary hover:underline"
                          >
                            {allSelected ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {group.permissions.map((p) => {
                            const isChecked = form.permissions.includes(p.key);
                            return (
                              <button
                                key={p.key}
                                type="button"
                                onClick={() => togglePermission(p.key)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs transition-colors border ${isChecked ? 'bg-primary-light border-primary/40 text-primary font-bold' : 'bg-surface border-border-main text-text-primary hover:bg-bg-surface-hover'}`}
                              >
                                {isChecked ? <CheckSquare size={15} /> : <Square size={15} className="text-muted-foreground" />}
                                <span>{p.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-border-main flex justify-end gap-2 sticky bottom-0 bg-surface">
                <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" size="sm" loading={actionLoading}>Save Role</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

