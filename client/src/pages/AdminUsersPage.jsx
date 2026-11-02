import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSystem } from '../contexts/SystemContext';
import api from '../utils/api';
import LoadingSpinner from '../components/LoadingSpinner';
import Breadcrumbs from '../components/ui/Breadcrumbs';
import StatusBadge from '../components/ui/StatusBadge';
import Button from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import {
  Users, Search, UserPlus, Eye, Edit3, DollarSign, LogIn,
  Trash2, Mail, Filter, CheckSquare, Square, X, AlertTriangle,
  ArrowRight, Shield, CheckCircle2, ChevronLeft, ChevronRight
} from 'lucide-react';

export default function AdminUsersPage() {
  const { showToast } = useAuth();
  const { formatPrice } = useSystem();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });

  // Selected for bulk actions
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [activeUser, setActiveUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);

  // Forms
  const [addForm, setAddForm] = useState({
    username: '',
    email: '',
    password: '',
    phone: '',
    role: 'user',
    status: 'active',
    balance: 0,
  });

  const [editForm, setEditForm] = useState({
    username: '',
    email: '',
    phone: '',
    role: 'user',
    status: 'active',
  });

  const [balanceForm, setBalanceForm] = useState({
    amount: '',
    type: 'credit',
    reason: '',
  });

  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [page, statusFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(search ? { search } : {}),
      }).toString();

      const res = await api.admin.getUsers(params);
      setUsers(res.users || []);
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (err) {
      showToast(err.message || 'Failed to fetch users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  // Add User
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.admin.createUser(addForm);
      showToast('User created successfully!');
      setShowAddModal(false);
      setAddForm({ username: '', email: '', password: '', phone: '', role: 'user', status: 'active', balance: 0 });
      fetchUsers();
    } catch (err) {
      showToast(err.message || 'Failed to create user', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Open View User
  const openView = async (user) => {
    setActiveUser(user);
    setShowViewModal(true);
    try {
      const res = await api.admin.getUserById(user.id);
      setUserDetails(res);
    } catch (err) {
      console.error(err);
    }
  };

  // Open Edit User
  const openEdit = (user) => {
    setActiveUser(user);
    setEditForm({
      username: user.username,
      email: user.email,
      phone: user.phone || '',
      role: user.role || 'user',
      status: user.status || 'active',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.admin.updateUser(activeUser.id, editForm);
      showToast('User updated successfully!');
      setShowEditModal(false);
      fetchUsers();
    } catch (err) {
      showToast(err.message || 'Failed to update user', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Balance Adjust
  const openBalance = (user) => {
    setActiveUser(user);
    setBalanceForm({ amount: '', type: 'credit', reason: '' });
    setShowBalanceModal(true);
  };

  const handleBalanceSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await api.admin.adjustBalance(activeUser.id, balanceForm);
      showToast(`Balance ${balanceForm.type === 'credit' ? 'credited' : 'debited'} successfully!`);
      setShowBalanceModal(false);
      fetchUsers();
    } catch (err) {
      showToast(err.message || 'Failed to adjust balance', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Login as User
  const handleLoginAs = async (user) => {
    try {
      const res = await api.admin.loginAsUser(user.id);
      if (res.token) {
        localStorage.setItem('token', res.token);
        showToast(`Impersonating ${user.username}...`);
        window.location.href = '/dashboard';
      }
    } catch (err) {
      showToast(err.message || 'Impersonation failed', 'error');
    }
  };

  // Delete User
  const confirmDelete = (user) => {
    setActiveUser(user);
    setShowDeleteModal(true);
  };

  const handleDeleteSubmit = async () => {
    setActionLoading(true);
    try {
      await api.admin.deleteUser(activeUser.id);
      showToast('User deleted successfully!');
      setShowDeleteModal(false);
      fetchUsers();
    } catch (err) {
      showToast(err.message || 'Failed to delete user', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk Actions
  const toggleSelectAll = () => {
    if (selectedIds.length === users.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(users.map(u => u.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleBulkAction = async (action) => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Are you sure you want to ${action} ${selectedIds.length} selected users?`)) return;

    try {
      await api.admin.bulkActionUsers({ action, userIds: selectedIds });
      showToast(`Bulk ${action} executed successfully!`);
      setSelectedIds([]);
      fetchUsers();
    } catch (err) {
      showToast(err.message || 'Bulk action failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="dashboard-page-header">
        <div>
          <Breadcrumbs items={[{ label: 'Admin', to: '/admin' }, { label: 'User Management' }]} />
          <h1 className="dashboard-page-title mt-1 flex items-center gap-2.5">
            <Users size={26} className="text-primary" />
            <span>User Management</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            icon={UserPlus}
            onClick={() => setShowAddModal(true)}
          >
            Add New User
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-auto flex-1">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by username, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-control pl-9 text-xs"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">Search</Button>
          </form>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Filter size={14} />
              <span>Status:</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="form-control text-xs w-36 py-1.5"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="banned">Banned</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Action Controls */}
      {selectedIds.length > 0 && (
        <div className="p-3 rounded-xl bg-primary-light border border-primary/30 flex items-center justify-between text-xs animate-in fade-in duration-150">
          <span className="font-bold text-text-primary">
            {selectedIds.length} user{selectedIds.length > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkAction('activate')}
              className="px-2.5 py-1 rounded bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-colors"
            >
              Activate
            </button>
            <button
              onClick={() => handleBulkAction('suspend')}
              className="px-2.5 py-1 rounded bg-amber-500 text-white font-bold hover:bg-amber-600 transition-colors"
            >
              Suspend
            </button>
            <button
              onClick={() => handleBulkAction('ban')}
              className="px-2.5 py-1 rounded bg-danger text-white font-bold hover:bg-danger/80 transition-colors"
            >
              Ban
            </button>
            <button
              onClick={() => handleBulkAction('delete')}
              className="px-2.5 py-1 rounded bg-bg-surface-elevated text-danger border border-danger/40 font-bold hover:bg-danger-bg transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center"><LoadingSpinner /></div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-xs">
              <Users size={36} className="mx-auto mb-2 opacity-30" />
              <p>No users found matching query.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-bg-surface-elevated text-muted-foreground uppercase tracking-wider text-[10px] border-b border-border-main">
                  <tr>
                    <th className="px-4 py-3 w-8">
                      <button onClick={toggleSelectAll} className="flex items-center text-muted-foreground hover:text-text-primary">
                        {selectedIds.length === users.length && users.length > 0 ? (
                          <CheckSquare size={16} className="text-primary" />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Balance</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Registered</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {users.map((u) => {
                    const isSelected = selectedIds.includes(u.id);
                    return (
                      <tr key={u.id} className={`hover:bg-bg-surface-hover/50 transition-colors ${isSelected ? 'bg-primary-light/40' : ''}`}>
                        <td className="px-4 py-3">
                          <button onClick={() => toggleSelect(u.id)} className="flex items-center text-muted-foreground">
                            {isSelected ? <CheckSquare size={16} className="text-primary" /> : <Square size={16} />}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center font-bold text-xs flex-shrink-0">
                              {u.username?.charAt(0)?.toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-text-primary hover:text-primary cursor-pointer" onClick={() => openView(u)}>
                                {u.username}
                              </div>
                              <div className="text-[11px] text-muted-foreground">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-mono">
                          {u.phone || '—'}
                        </td>
                        <td className="px-4 py-3 font-bold text-text-primary">
                          {formatPrice(u.balance || 0)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${u.role === 'admin' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-bg-surface-elevated text-muted-foreground'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={u.status} />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-[11px]">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openView(u)}
                              className="p-1.5 rounded hover:bg-bg-surface-hover text-muted-foreground hover:text-text-primary"
                              title="View Profile Details"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => openEdit(u)}
                              className="p-1.5 rounded hover:bg-bg-surface-hover text-muted-foreground hover:text-text-primary"
                              title="Edit User Info"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              onClick={() => openBalance(u)}
                              className="p-1.5 rounded hover:bg-bg-surface-hover text-emerald-400 hover:text-emerald-300"
                              title="Credit / Debit Balance"
                            >
                              <DollarSign size={15} />
                            </button>
                            <button
                              onClick={() => handleLoginAs(u)}
                              className="p-1.5 rounded hover:bg-bg-surface-hover text-cyan-400 hover:text-cyan-300"
                              title="Login as User"
                            >
                              <LogIn size={15} />
                            </button>
                            {u.id !== 1 && (
                              <button
                                onClick={() => confirmDelete(u)}
                                className="p-1.5 rounded hover:bg-bg-surface-hover text-danger hover:text-red-400"
                                title="Delete User"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
          <span>Showing page {page} of {pagination.totalPages} ({pagination.total} users)</span>
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

      {/* MODAL 1: ADD NEW USER */}
      {showAddModal && (
        <div className="sidebar-overlay flex items-center justify-center p-4 z-50">
          <div className="saas-card w-full max-w-lg bg-surface shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-main bg-bg-surface-elevated">
              <h3 className="text-sm font-extrabold text-text-primary flex items-center gap-2">
                <UserPlus size={18} className="text-primary" />
                <span>Create New User Account</span>
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-text-primary">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group mb-0">
                  <label className="form-label text-xs">Username</label>
                  <input
                    type="text"
                    required
                    className="form-control text-xs"
                    placeholder="e.g. jason_smm"
                    value={addForm.username}
                    onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                  />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label text-xs">Email Address</label>
                  <input
                    type="email"
                    required
                    className="form-control text-xs"
                    placeholder="user@example.com"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group mb-0">
                  <label className="form-label text-xs">Password</label>
                  <input
                    type="password"
                    required
                    className="form-control text-xs"
                    placeholder="At least 6 characters"
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label text-xs">Phone (Optional)</label>
                  <input
                    type="text"
                    className="form-control text-xs"
                    placeholder="+880..."
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="form-group mb-0">
                  <label className="form-label text-xs">Initial Balance ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control text-xs"
                    value={addForm.balance}
                    onChange={(e) => setAddForm({ ...addForm, balance: e.target.value })}
                  />
                </div>
                <div className="form-group mb-0">
                  <label className="form-label text-xs">Account Role</label>
                  <select
                    className="form-control text-xs"
                    value={addForm.role}
                    onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                  >
                    <option value="user">Customer (User)</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div className="form-group mb-0">
                  <label className="form-label text-xs">Status</label>
                  <select
                    className="form-control text-xs"
                    value={addForm.status}
                    onChange={(e) => setAddForm({ ...addForm, status: e.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="banned">Banned</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-border-main flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" size="sm" loading={actionLoading}>Create User</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: VIEW USER DETAILS */}
      {showViewModal && activeUser && (
        <div className="sidebar-overlay flex items-center justify-center p-4 z-50">
          <div className="saas-card w-full max-w-lg bg-surface shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-main bg-bg-surface-elevated">
              <h3 className="text-sm font-extrabold text-text-primary flex items-center gap-2">
                <Eye size={18} className="text-primary" />
                <span>User Profile: {activeUser.username}</span>
              </h3>
              <button onClick={() => setShowViewModal(false)} className="text-muted-foreground hover:text-text-primary">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-bg-surface-elevated border border-border-main">
                <div className="w-12 h-12 rounded-xl bg-primary text-white font-extrabold text-lg flex items-center justify-center">
                  {activeUser.username?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <div className="font-extrabold text-base text-text-primary">{activeUser.username}</div>
                  <div className="text-xs text-muted-foreground">{activeUser.email}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">Joined: {new Date(activeUser.created_at).toLocaleString()}</div>
                </div>
                <div className="ml-auto text-right">
                  <StatusBadge status={activeUser.status} />
                  <div className="text-sm font-extrabold text-primary mt-1">{formatPrice(activeUser.balance || 0)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-bg-surface-subtle border border-border-main">
                  <div className="text-muted-foreground">Total Orders Placed:</div>
                  <div className="font-bold text-text-primary text-sm mt-0.5">{userDetails?.stats?.total_orders || 0}</div>
                </div>
                <div className="p-3 rounded-lg bg-bg-surface-subtle border border-border-main">
                  <div className="text-muted-foreground">Total Lifetime Spent:</div>
                  <div className="font-bold text-text-primary text-sm mt-0.5">{formatPrice(userDetails?.stats?.total_spent || 0)}</div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-bg-surface-subtle border border-border-main text-xs space-y-1">
                <div className="font-bold text-text-primary">Reseller API Key:</div>
                <div className="font-mono text-[11px] text-muted-foreground break-all bg-bg-surface p-1.5 rounded border border-border-subtle">
                  {activeUser.api_key || 'No API key generated'}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => setShowViewModal(false)}>Close</Button>
                <Button variant="primary" size="sm" onClick={() => { setShowViewModal(false); openBalance(activeUser); }}>Adjust Balance</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT USER */}
      {showEditModal && activeUser && (
        <div className="sidebar-overlay flex items-center justify-center p-4 z-50">
          <div className="saas-card w-full max-w-md bg-surface shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-main bg-bg-surface-elevated">
              <h3 className="text-sm font-extrabold text-text-primary flex items-center gap-2">
                <Edit3 size={18} className="text-primary" />
                <span>Edit User: {activeUser.username}</span>
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-muted-foreground hover:text-text-primary">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div className="form-group mb-0">
                <label className="form-label text-xs">Username</label>
                <input
                  type="text"
                  required
                  className="form-control text-xs"
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                />
              </div>
              <div className="form-group mb-0">
                <label className="form-label text-xs">Email Address</label>
                <input
                  type="email"
                  required
                  className="form-control text-xs"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <div className="form-group mb-0">
                <label className="form-label text-xs">Phone</label>
                <input
                  type="text"
                  className="form-control text-xs"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="form-group mb-0">
                  <label className="form-label text-xs">Status</label>
                  <select
                    className="form-control text-xs"
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="banned">Banned</option>
                  </select>
                </div>
                <div className="form-group mb-0">
                  <label className="form-label text-xs">Role</label>
                  <select
                    className="form-control text-xs"
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  >
                    <option value="user">Customer</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-border-main flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowEditModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" size="sm" loading={actionLoading}>Save Changes</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: ADJUST BALANCE */}
      {showBalanceModal && activeUser && (
        <div className="sidebar-overlay flex items-center justify-center p-4 z-50">
          <div className="saas-card w-full max-w-md bg-surface shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-main bg-bg-surface-elevated">
              <h3 className="text-sm font-extrabold text-text-primary flex items-center gap-2">
                <DollarSign size={18} className="text-emerald-400" />
                <span>Adjust Wallet: {activeUser.username}</span>
              </h3>
              <button onClick={() => setShowBalanceModal(false)} className="text-muted-foreground hover:text-text-primary">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleBalanceSubmit} className="p-6 space-y-4">
              <div className="p-3 rounded-lg bg-bg-surface-elevated border border-border-main text-xs flex justify-between">
                <span className="text-muted-foreground">Current Balance:</span>
                <span className="font-extrabold text-primary">{formatPrice(activeUser.balance || 0)}</span>
              </div>

              <div className="form-group mb-0">
                <label className="form-label text-xs">Operation Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBalanceForm({ ...balanceForm, type: 'credit' })}
                    className={`p-2 rounded-lg text-xs font-bold border transition-colors ${balanceForm.type === 'credit' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500' : 'bg-surface border-border-main text-muted-foreground'}`}
                  >
                    + Add / Credit
                  </button>
                  <button
                    type="button"
                    onClick={() => setBalanceForm({ ...balanceForm, type: 'debit' })}
                    className={`p-2 rounded-lg text-xs font-bold border transition-colors ${balanceForm.type === 'debit' ? 'bg-danger/20 text-danger border-danger' : 'bg-surface border-border-main text-muted-foreground'}`}
                  >
                    - Deduct / Debit
                  </button>
                </div>
              </div>

              <div className="form-group mb-0">
                <label className="form-label text-xs">Amount ($ USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  className="form-control text-xs"
                  placeholder="0.00"
                  value={balanceForm.amount}
                  onChange={(e) => setBalanceForm({ ...balanceForm, amount: e.target.value })}
                />
              </div>

              <div className="form-group mb-0">
                <label className="form-label text-xs">Adjustment Reason</label>
                <input
                  type="text"
                  required
                  className="form-control text-xs"
                  placeholder="e.g. Manual deposit via bKash TrxID #91823"
                  value={balanceForm.reason}
                  onChange={(e) => setBalanceForm({ ...balanceForm, reason: e.target.value })}
                />
              </div>

              <div className="pt-4 border-t border-border-main flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowBalanceModal(false)}>Cancel</Button>
                <Button type="submit" variant="primary" size="sm" loading={actionLoading}>Confirm Adjustment</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: DELETE CONFIRMATION */}
      {showDeleteModal && activeUser && (
        <div className="sidebar-overlay flex items-center justify-center p-4 z-50">
          <div className="saas-card w-full max-w-sm bg-surface shadow-2xl p-6 border border-border-main text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-danger/20 text-danger flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-text-primary">Delete User Account?</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Are you sure you want to permanently delete user <span className="font-bold text-text-primary">{activeUser.username}</span>? This action is irreversible.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
              <Button variant="danger" size="sm" loading={actionLoading} onClick={handleDeleteSubmit}>Yes, Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
