import React, { useEffect, useState } from 'react';
import { Plus, Search, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

export const PlatformOrganizationsPage: React.FC = () => {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showModulesModal, setShowModulesModal] = useState<any | null>(null);
  const [modulesList, setModulesList] = useState<any[]>([]);

  const [newOrg, setNewOrg] = useState({
    name: '',
    slug: '',
    domain: '',
    admin_name: '',
    admin_email: '',
    admin_password: 'password123',
  });

  const setImpersonation = useAuthStore((state) => state.setImpersonation);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const res = await api.get('/platform/organizations', {
        params: { search: search || undefined },
      });
      setOrganizations(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, [search]);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/platform/organizations', newOrg);
      setShowCreateModal(false);
      setNewOrg({
        name: '',
        slug: '',
        domain: '',
        admin_name: '',
        admin_email: '',
        admin_password: 'password123',
      });
      fetchOrganizations();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create organization');
    }
  };

  const handleImpersonate = async (orgId: number) => {
    try {
      const res = await api.post(`/platform/organizations/${orgId}/impersonate`);
      const { token, user, organization } = res.data.data;
      setImpersonation(token, user, organization);
      window.location.href = '/dashboard';
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to impersonate');
    }
  };

  const openModulesModal = async (org: any) => {
    setShowModulesModal(org);
    try {
      const res = await api.get(`/platform/organizations/${org.id}/modules`);
      setModulesList(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleModule = async (moduleName: string, currentStatus: boolean) => {
    if (!showModulesModal) return;
    try {
      await api.put(`/platform/organizations/${showModulesModal.id}/modules`, {
        modules: [{ module_name: moduleName, is_enabled: !currentStatus }],
      });
      setModulesList((prev) =>
        prev.map((m) => (m.module_name === moduleName ? { ...m, is_enabled: !currentStatus } : m))
      );
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-zinc-950 tracking-tight">Tenant Organizations</h2>
          <p className="text-sm text-zinc-500">Manage client organizations, impersonate admins, and toggle module limits</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-black text-white hover:bg-zinc-800 hover:bg-black text-sm font-semibold rounded-xl shadow-lg shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Organization</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search organizations by name or slug..."
          className="w-full bg-white border border-zinc-300 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
        />
      </div>

      {/* Organizations Table */}
      <div className="bg-white border border-zinc-300 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm text-zinc-600">
          <thead className="bg-white text-xs uppercase font-semibold text-zinc-500 border-b border-zinc-300">
            <tr>
              <th className="px-6 py-4">Organization</th>
              <th className="px-6 py-4">Slug / Domain</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Users</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-zinc-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Loading organizations...
                </td>
              </tr>
            ) : organizations.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-zinc-500">
                  No organizations found.
                </td>
              </tr>
            ) : (
              organizations.map((org) => (
                <tr key={org.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-zinc-950 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-black text-white hover:bg-zinc-800/10 text-black flex items-center justify-center font-bold text-sm border border-zinc-300">
                      {org.name.charAt(0)}
                    </div>
                    <div>
                      <div>{org.name}</div>
                      <div className="text-[11px] text-zinc-500 font-mono">{org.uuid}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs bg-zinc-50 px-2 py-1 rounded text-zinc-600">
                      {org.slug}
                    </span>
                    {org.domain && <div className="text-xs text-zinc-500 mt-1">{org.domain}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        org.status === 'active'
                          ? 'bg-black text-white hover:bg-zinc-800/10 text-zinc-900 border border-zinc-300'
                          : 'bg-black text-white hover:bg-zinc-800/10 text-zinc-900 border border-zinc-300'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${org.status === 'active' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                      {org.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">{org.users_count ?? 1} members</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => openModulesModal(org)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium rounded-lg text-zinc-600 border border-zinc-300 cursor-pointer"
                    >
                      Modules
                    </button>
                    <button
                      onClick={() => handleImpersonate(org.id)}
                      className="px-3 py-1.5 bg-black text-white hover:bg-zinc-800/20 hover:bg-black hover:bg-zinc-800/30 text-indigo-300 text-xs font-semibold rounded-lg border border-zinc-300 cursor-pointer"
                    >
                      Impersonate
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Org Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/40 backdrop-blur-xs backdrop-blur-sm p-4">
          <div className="bg-white border border-zinc-300 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-zinc-950 mb-4">Create New Tenant Organization</h3>
            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={newOrg.name}
                  onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                  placeholder="e.g. Wayne Enterprises"
                  className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Slug (Optional)</label>
                  <input
                    type="text"
                    value={newOrg.slug}
                    onChange={(e) => setNewOrg({ ...newOrg, slug: e.target.value })}
                    placeholder="wayne"
                    className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Custom Domain</label>
                  <input
                    type="text"
                    value={newOrg.domain}
                    onChange={(e) => setNewOrg({ ...newOrg, domain: e.target.value })}
                    placeholder="wayne.com"
                    className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>
              <div className="border-t border-zinc-300 pt-3">
                <h4 className="text-xs font-semibold text-black mb-2">Initial Tenant Administrator</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Admin Name</label>
                    <input
                      type="text"
                      required
                      value={newOrg.admin_name}
                      onChange={(e) => setNewOrg({ ...newOrg, admin_name: e.target.value })}
                      placeholder="Bruce Wayne"
                      className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 mb-1">Admin Email</label>
                    <input
                      type="email"
                      required
                      value={newOrg.admin_email}
                      onChange={(e) => setNewOrg({ ...newOrg, admin_email: e.target.value })}
                      placeholder="bruce@wayne.local"
                      className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-sm text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-300">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 text-zinc-600 text-xs rounded-xl hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-black text-white hover:bg-zinc-800 text-xs font-semibold rounded-xl hover:bg-black cursor-pointer"
                >
                  Create Tenant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Module Toggles Modal */}
      {showModulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/40 backdrop-blur-xs backdrop-blur-sm p-4">
          <div className="bg-white border border-zinc-300 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-zinc-950 mb-2">Module Access Control</h3>
            <p className="text-xs text-zinc-500 mb-4">Toggle module visibility for <strong>{showModulesModal.name}</strong></p>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {modulesList.map((m) => (
                <div key={m.module_name} className="flex items-center justify-between p-3 bg-white rounded-xl border border-zinc-300">
                  <span className="text-xs font-medium text-slate-200 capitalize">
                    {m.module_name.replace('_', ' ')} Module
                  </span>
                  <button
                    onClick={() => toggleModule(m.module_name, m.is_enabled)}
                    className="cursor-pointer"
                  >
                    {m.is_enabled ? (
                      <ToggleRight className="w-6 h-6 text-zinc-900" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-zinc-700" />
                    )}
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4 mt-4 border-t border-zinc-300">
              <button
                type="button"
                onClick={() => setShowModulesModal(null)}
                className="px-4 py-2 bg-black text-white hover:bg-zinc-800 text-xs font-semibold rounded-xl hover:bg-black cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default PlatformOrganizationsPage;
