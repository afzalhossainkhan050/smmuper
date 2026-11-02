import React, { useState, useEffect } from 'react';
import {
  FileCheck, Plus, Search, Edit3, Trash2, CheckCircle2,
  AlertCircle, ShieldCheck, X, RefreshCw, Layers, Check
} from 'lucide-react';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminKycSettingsPage() {
  const { showToast } = useAuth();

  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'create' | 'edit'
  const [editingSetting, setEditingSetting] = useState(null);
  const [deletingSetting, setDeletingSetting] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'active',
    fields: [
      { name: 'full_name', label: 'Full Legal Name', type: 'text', required: true, placeholder: 'Enter your legal name' },
      { name: 'document_type', label: 'Document Type', type: 'select', required: true, options: ['National ID', 'Passport', 'Driving License'] },
      { name: 'front_image', label: 'Front Document Image', type: 'file', required: true, placeholder: '' }
    ]
  });

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await api.admin.getKycSettings();
      setSettings(res.settings || []);
    } catch (err) {
      showToast(err.message || 'Failed to load KYC settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleOpenCreate = () => {
    setFormData({
      title: '',
      description: '',
      status: 'active',
      fields: [
        { name: 'full_name', label: 'Full Legal Name', type: 'text', required: true, placeholder: 'Enter full legal name' },
        { name: 'document_type', label: 'Document Type', type: 'select', required: true, options: ['National ID', 'Passport', 'Driving License'] },
        { name: 'document_number', label: 'Document ID Number', type: 'text', required: true, placeholder: 'e.g. NID or Passport number' },
        { name: 'front_image', label: 'Front Document Image', type: 'file', required: true, placeholder: '' }
      ]
    });
    setEditingSetting(null);
    setViewMode('create');
  };

  const handleOpenEdit = (setting) => {
    setEditingSetting(setting);
    setFormData({
      title: setting.title,
      description: setting.description || '',
      status: setting.status || 'active',
      fields: Array.isArray(setting.fields) ? setting.fields : []
    });
    setViewMode('edit');
  };

  const handleAddField = () => {
    setFormData(prev => ({
      ...prev,
      fields: [
        ...prev.fields,
        { name: `field_${Date.now()}`, label: 'New Field', type: 'text', required: true, placeholder: '' }
      ]
    }));
  };

  const handleRemoveField = (index) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index)
    }));
  };

  const handleFieldChange = (index, key, val) => {
    setFormData(prev => {
      const updated = [...prev.fields];
      updated[index] = { ...updated[index], [key]: val };
      return { ...prev, fields: updated };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast('Form title is required', 'error');
      return;
    }
    if (formData.fields.length === 0) {
      showToast('Please add at least one form field', 'error');
      return;
    }

    try {
      setSaving(true);
      if (editingSetting) {
        await api.admin.updateKycSetting(editingSetting.id, formData);
        showToast('KYC form configuration updated', 'success');
      } else {
        await api.admin.createKycSetting(formData);
        showToast('New KYC form created', 'success');
      }
      setViewMode('list');
      loadSettings();
    } catch (err) {
      showToast(err.message || 'Failed to save KYC form', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingSetting) return;
    try {
      await api.admin.deleteKycSetting(deletingSetting.id);
      showToast('KYC setting deleted', 'success');
      setDeletingSetting(null);
      loadSettings();
    } catch (err) {
      showToast(err.message || 'Failed to delete KYC setting', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileCheck className="w-7 h-7 text-indigo-400" />
            KYC Form Settings & Field Builder
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Build dynamic verification forms with customizable file upload, select dropdowns, and identity fields.
          </p>
        </div>

        {viewMode === 'list' && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium shadow-lg shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Create KYC Form
          </button>
        )}
      </div>

      {viewMode === 'list' ? (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
          {loading ? (
            <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
              Loading KYC settings...
            </div>
          ) : settings.length === 0 ? (
            <div className="py-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
              <FileCheck className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-400">No KYC form schemas defined</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Form Title</th>
                    <th className="pb-3 font-semibold">Description</th>
                    <th className="pb-3 font-semibold">Fields Configured</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {settings.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-4">
                        <div className="font-semibold text-white">{s.title}</div>
                        <div className="text-[11px] text-slate-500">ID #{s.id}</div>
                      </td>
                      <td className="py-4 text-xs text-slate-300 max-w-sm truncate">
                        {s.description || '—'}
                      </td>
                      <td className="py-4 text-xs text-indigo-300 font-medium">
                        {(s.fields || []).length} field(s) defined
                      </td>
                      <td className="py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          s.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(s)}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-indigo-400 transition-colors"
                            title="Edit Form"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeletingSetting(s)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                            title="Delete Form"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Form Builder View */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl max-w-4xl">
          <div className="flex items-center justify-between pb-6 border-b border-slate-800 mb-6">
            <h2 className="text-lg font-bold text-white">
              {viewMode === 'edit' ? 'Edit KYC Verification Form' : 'Create New KYC Form'}
            </h2>
            <button
              onClick={() => setViewMode('list')}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel & Return
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Form Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Individual Identity Verification"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="active">Active (Available for customer submissions)</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Customer Instructions / Description
              </label>
              <textarea
                rows={2}
                placeholder="Explain why verification is needed and what documents are accepted..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Dynamic Fields Repeater */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    Form Fields Schema
                  </h3>
                  <p className="text-xs text-slate-400">Configure questions, input formats, and file upload requirements.</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddField}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-medium border border-indigo-500/30"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Field
                </button>
              </div>

              <div className="space-y-3">
                {formData.fields.map((field, idx) => (
                  <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center gap-3">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Field Label</label>
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => handleFieldChange(idx, 'label', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">Field Type</label>
                        <select
                          value={field.type}
                          onChange={(e) => handleFieldChange(idx, 'type', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                        >
                          <option value="text">Text Input</option>
                          <option value="select">Dropdown Select</option>
                          <option value="file">File Upload (Image/PDF)</option>
                          <option value="number">Number</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          {field.type === 'select' ? 'Options (comma-separated)' : 'System Identifier'}
                        </label>
                        {field.type === 'select' ? (
                          <input
                            type="text"
                            placeholder="Option 1, Option 2, Option 3"
                            value={Array.isArray(field.options) ? field.options.join(', ') : (field.options || '')}
                            onChange={(e) => handleFieldChange(idx, 'options', e.target.value.split(',').map(s => s.trim()))}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                        ) : (
                          <input
                            type="text"
                            value={field.name}
                            onChange={(e) => handleFieldChange(idx, 'name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                            required
                          />
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2 md:pt-4">
                      <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => handleFieldChange(idx, 'required', e.target.checked)}
                          className="rounded border-slate-800 text-indigo-600 focus:ring-indigo-500 bg-slate-900"
                        />
                        Required
                      </label>

                      <button
                        type="button"
                        onClick={() => handleRemoveField(idx)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors"
                        title="Remove field"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white shadow-lg shadow-indigo-600/20"
              >
                {saving ? 'Saving...' : 'Save KYC Form Configuration'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingSetting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Delete KYC Setting</h3>
            <p className="text-sm text-slate-300">
              Are you sure you want to delete form <span className="font-semibold text-rose-400">"{deletingSetting.title}"</span>?
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setDeletingSetting(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-medium text-white shadow-lg shadow-rose-600/20"
              >
                Delete Form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

