import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';
import api from '@/lib/api';

export const WebInstallerPage: React.FC = () => {
  const [formData, setFormData] = useState({
    super_admin_name: 'System Administrator',
    super_admin_email: 'superadmin@platform.local',
    super_admin_password: 'password123',
    demo_org_name: 'Acme Corporation',
    demo_admin_email: 'admin@acme.local',
    demo_admin_password: 'password123',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleInstall = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/installer/install', formData);
      setSuccess(response.data.message);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Installation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-black text-white hover:bg-zinc-800/10 rounded-2xl border border-zinc-300 text-zinc-900 mb-3">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-extrabold text-zinc-950">cPanel Web Installer</h2>
          <p className="mt-1 text-sm text-zinc-500">One-time initial system setup for no-SSH hosting</p>
        </div>

        <div className="bg-white border border-zinc-300 rounded-2xl p-8 shadow-2xl">
          {success ? (
            <div className="text-center py-6">
              <CheckCircle2 className="w-12 h-12 text-zinc-900 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-zinc-950 mb-2">Setup Completed!</h3>
              <p className="text-sm text-zinc-500 mb-4">{success}</p>
              <p className="text-xs text-zinc-500">Redirecting to login in 3 seconds...</p>
            </div>
          ) : (
            <form onSubmit={handleInstall} className="space-y-6">
              {error && (
                <div className="p-3 bg-black text-white hover:bg-zinc-800/10 border border-zinc-300 text-zinc-900 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <h4 className="text-sm font-semibold text-zinc-950 border-b border-zinc-300 pb-2 mb-4">
                  1. Platform Super Admin Setup
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Admin Name</label>
                    <input
                      type="text"
                      required
                      value={formData.super_admin_name}
                      onChange={(e) => setFormData({ ...formData, super_admin_name: e.target.value })}
                      className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Admin Email</label>
                    <input
                      type="email"
                      required
                      value={formData.super_admin_email}
                      onChange={(e) => setFormData({ ...formData, super_admin_email: e.target.value })}
                      className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Admin Password</label>
                    <input
                      type="password"
                      required
                      value={formData.super_admin_password}
                      onChange={(e) => setFormData({ ...formData, super_admin_password: e.target.value })}
                      className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-sm text-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-zinc-950 border-b border-zinc-300 pb-2 mb-4">
                  2. Demo Organization Tenant Setup
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Company Name</label>
                    <input
                      type="text"
                      required
                      value={formData.demo_org_name}
                      onChange={(e) => setFormData({ ...formData, demo_org_name: e.target.value })}
                      className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Tenant Admin Email</label>
                    <input
                      type="email"
                      required
                      value={formData.demo_admin_email}
                      onChange={(e) => setFormData({ ...formData, demo_admin_email: e.target.value })}
                      className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Tenant Admin Password</label>
                    <input
                      type="password"
                      required
                      value={formData.demo_admin_password}
                      onChange={(e) => setFormData({ ...formData, demo_admin_password: e.target.value })}
                      className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-sm text-white"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-black text-white hover:bg-zinc-800 hover:bg-black text-zinc-950 font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/25 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span>Execute Installation & Lock Wizard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
export default WebInstallerPage;
