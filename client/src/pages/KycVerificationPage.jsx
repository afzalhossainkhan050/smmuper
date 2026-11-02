import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, AlertCircle, Clock, CheckCircle2, Upload,
  FileText, User, ArrowRight, RefreshCw, XCircle, Shield
} from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

export default function KycVerificationPage() {
  const { user, showToast } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [kycData, setKycData] = useState({
    status: 'unsubmitted',
    is_verified: false,
    submission: null,
    setting: null
  });

  const [formData, setFormData] = useState({});
  const [previews, setPreviews] = useState({});

  const loadKyc = async () => {
    try {
      setLoading(true);
      const res = await api.kyc.getStatus();
      setKycData({
        status: res.status || 'unsubmitted',
        is_verified: !!res.is_verified,
        submission: res.submission || null,
        setting: res.setting || null
      });

      // Prepopulate form data if fields exist
      if (res.setting && res.setting.fields) {
        const initial = {};
        res.setting.fields.forEach(f => {
          initial[f.name] = '';
        });
        setFormData(initial);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load KYC verification status', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKyc();
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (field, e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => ({ ...prev, [field]: reader.result }));
        setFormData(prev => ({ ...prev, [field]: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (kycData.setting && kycData.setting.fields) {
      for (const field of kycData.setting.fields) {
        if (field.required && !formData[field.name]) {
          showToast(`Please fill in or upload: ${field.label}`, 'error');
          return;
        }
      }
    }

    try {
      setSubmitting(true);
      const res = await api.kyc.submit({ form_data: formData });
      showToast(res.message || 'KYC documents submitted for review!', 'success');
      await loadKyc();
    } catch (err) {
      showToast(err.message || 'Failed to submit KYC verification', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-500 flex flex-col items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500 mb-3" />
        Loading verification data...
      </div>
    );
  }

  const { status, is_verified, submission, setting } = kycData;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Shield className="w-7 h-7 text-indigo-400" />
          KYC Identity Verification
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Verify your account identity to unlock higher transaction thresholds, automated card gateways, and fraud protection.
        </p>
      </div>

      {/* Status Banner */}
      {is_verified ? (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 flex items-start gap-4">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-emerald-400">Identity Verified</h2>
            <p className="text-sm text-slate-300 mt-1">
              Your government identity documentation has been successfully reviewed and approved. Your account is fully unlocked with tier-1 limits and instant automated fulfillment.
            </p>
            {submission?.reviewed_at && (
              <div className="text-xs text-emerald-500/80 mt-2">
                Verified on {new Date(submission.reviewed_at).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      ) : status === 'pending' ? (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 flex items-start gap-4">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl">
            <Clock className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-amber-400">Verification Under Review</h2>
            <p className="text-sm text-slate-300 mt-1">
              Your submitted documents are currently under queue review by the SMMuper compliance staff. Review usually takes between 15 minutes to a few hours during business hours.
            </p>
            <div className="text-xs text-amber-400/80 mt-2">
              Submitted: {new Date(submission?.created_at).toLocaleString()}
            </div>
          </div>
        </div>
      ) : status === 'rejected' ? (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-6 flex items-start gap-4">
          <div className="p-3 bg-rose-500/20 text-rose-400 rounded-xl">
            <XCircle className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-rose-400">Verification Rejected</h2>
            <p className="text-sm text-slate-300">
              Your previous submission could not be approved due to the following reason:
            </p>
            <div className="bg-rose-950/60 border border-rose-800/60 rounded-xl p-3 text-xs text-rose-200 font-medium">
              "{submission?.rejection_reason || 'Document was unreadable or expired. Please upload a clear original.'}"
            </div>
            <p className="text-xs text-slate-400 pt-1">
              Please review the feedback above and submit fresh, high-resolution documentation below.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-2xl p-6 flex items-start gap-4">
          <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-indigo-300">Verification Required for Elevated Access</h2>
            <p className="text-sm text-slate-300 mt-1">
              {setting?.description || 'To comply with international AML/KYC regulations and safeguard payment transactions, please complete our quick one-time identity verification.'}
            </p>
          </div>
        </div>
      )}

      {/* Dynamic Submission Form (only shown if not verified and not currently pending) */}
      {(!is_verified && status !== 'pending') && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            {setting?.title || 'Identity Verification Form'}
          </h2>
          <p className="text-xs text-slate-400 mb-6">
            All documents are stored encrypted and processed strictly in accordance with our data protection policy.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {setting?.fields?.map((field) => {
              const isRequired = field.required;

              if (field.type === 'select') {
                return (
                  <div key={field.name}>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      {field.label} {isRequired && <span className="text-rose-400">*</span>}
                    </label>
                    <select
                      value={formData[field.name] || ''}
                      onChange={(e) => handleInputChange(field.name, e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                      required={isRequired}
                    >
                      <option value="">Select an option</option>
                      {field.options?.map((opt, i) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                );
              }

              if (field.type === 'file') {
                return (
                  <div key={field.name}>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      {field.label} {isRequired && <span className="text-rose-400">*</span>}
                    </label>
                    <div className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-xl p-4 transition-colors text-center relative bg-slate-950">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleFileChange(field.name, e)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        required={isRequired && !formData[field.name]}
                      />
                      {previews[field.name] ? (
                        <div className="flex flex-col items-center">
                          <img
                            src={previews[field.name]}
                            alt={field.label}
                            className="max-h-36 rounded-lg object-contain mb-2 border border-slate-800"
                          />
                          <span className="text-xs text-emerald-400 font-medium">Click or drag to change image</span>
                        </div>
                      ) : (
                        <div className="py-4">
                          <Upload className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                          <div className="text-xs text-white font-medium">Click or drop file to upload</div>
                          <div className="text-[11px] text-slate-500 mt-1">Supports PNG, JPG, or PDF (Max 10MB)</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              // Default text / number
              return (
                <div key={field.name}>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    {field.label} {isRequired && <span className="text-rose-400">*</span>}
                  </label>
                  <input
                    type={field.type || 'text'}
                    placeholder={field.placeholder || `Enter ${field.label}`}
                    value={formData[field.name] || ''}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    required={isRequired}
                  />
                </div>
              );
            })}

            <div className="pt-4 border-t border-slate-800">
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium py-3 rounded-xl shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-all text-sm"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Submitting Documents...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Submit Verification Documents
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

