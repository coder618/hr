import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Building, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationSlug, setOrganizationSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/auth/login', {
        email,
        password,
        organization_slug: organizationSlug || undefined,
      });

      const { token, user, organization, enabled_modules } = response.data.data;
      login(token, user, organization, enabled_modules || []);

      if (user.is_super_admin) {
        navigate('/platform');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const autofillSuperAdmin = () => {
    setEmail('superadmin@platform.local');
    setPassword('Password123!');
    setOrganizationSlug('');
  };

  const autofillDemoAdmin = () => {
    setEmail('admin@acme.local');
    setPassword('Password123!');
    setOrganizationSlug('acme');
  };

  const autofillHR = () => {
    setEmail('hr@acme.local');
    setPassword('Password123!');
    setOrganizationSlug('acme');
  };

  const autofillManager = () => {
    setEmail('manager@acme.local');
    setPassword('Password123!');
    setOrganizationSlug('acme');
  };

  const autofillEmployee = () => {
    setEmail('employee@acme.local');
    setPassword('Password123!');
    setOrganizationSlug('acme');
  };

  return (
    <div>
      <h3 className="text-lg font-bold text-zinc-950 mb-6 text-center">Sign in to your account</h3>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-zinc-100 border border-zinc-300 text-zinc-950 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-black" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-1.5">Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@company.com"
              className="w-full bg-white border border-zinc-300 rounded-lg pl-10 pr-4 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-1.5">Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-white border border-zinc-300 rounded-lg pl-10 pr-4 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-zinc-900 uppercase tracking-wider">
              Workspace Identifier (Tenant Slug)
            </label>
            <span className="text-[11px] text-zinc-500">Optional</span>
          </div>
          <div className="relative">
            <Building className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
            <input
              type="text"
              value={organizationSlug}
              onChange={(e) => setOrganizationSlug(e.target.value)}
              placeholder="e.g. acme"
              className="w-full bg-white border border-zinc-300 rounded-lg pl-10 pr-4 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 mt-6 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-black hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <>
              <span>Sign in</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </>
          )}
        </button>
      </form>

      {/* Quick Demo Accounts for Testing */}
      <div className="mt-8 pt-6 border-t border-zinc-200">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-3 text-center">
          Quick Demo Accounts (1-Click Fill)
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={autofillSuperAdmin}
            className="p-2 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-950 border border-zinc-200 transition-colors text-left"
          >
            <span className="font-semibold block text-zinc-950">Super Admin</span>
            <span className="text-[10px] text-zinc-500">Platform Global</span>
          </button>
          <button
            type="button"
            onClick={autofillDemoAdmin}
            className="p-2 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-950 border border-zinc-200 transition-colors text-left"
          >
            <span className="font-semibold block text-zinc-950">Admin (Acme)</span>
            <span className="text-[10px] text-zinc-500">Tenant Admin</span>
          </button>
          <button
            type="button"
            onClick={autofillHR}
            className="p-2 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-950 border border-zinc-200 transition-colors text-left"
          >
            <span className="font-semibold block text-zinc-950">HR Manager</span>
            <span className="text-[10px] text-zinc-500">Sarah Jenkins</span>
          </button>
          <button
            type="button"
            onClick={autofillManager}
            className="p-2 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-950 border border-zinc-200 transition-colors text-left"
          >
            <span className="font-semibold block text-zinc-950">Manager</span>
            <span className="text-[10px] text-zinc-500">David Miller</span>
          </button>
          <button
            type="button"
            onClick={autofillEmployee}
            className="col-span-2 p-2 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-950 border border-zinc-200 transition-colors text-center"
          >
            <span className="font-semibold block text-zinc-950">Employee</span>
            <span className="text-[10px] text-zinc-500">Alex Developer (Self-Service)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
