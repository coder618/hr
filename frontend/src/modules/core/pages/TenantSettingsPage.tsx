import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Save,
  Loader2,
  CheckCircle2,
  Building,
  Globe,
  Palette,
  Phone,
  Clock,
  AlertCircle,
  Eye,
  Calendar,
  Plus,
  Trash2,
  Edit2,
  Mail,
  MapPin,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

interface Holiday {
  id: number;
  name: string;
  from_date: string;
  to_date: string;
  total_days: number;
  is_recurring: boolean;
  branch_id?: number | null;
  branch?: {
    id: number;
    name: string;
    code: string;
  } | null;
}

export const TenantSettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'profile' | 'holidays' | 'localization' | 'branding'>('profile');
  const [settings, setSettings] = useState<any>({
    company_name: '',
    tagline: 'Enterprise Office Portal',
    company_registration_no: '',
    tax_id: '',
    primary_color: '#000000',
    secondary_color: '#52525b',
    logo_url: '',
    favicon_url: '',
    timezone: 'Asia/Dhaka',
    currency: 'BDT',
    date_format: 'Y-m-d',
    time_format: 'H:i',
    working_days: [1, 2, 3, 4, 5],
    address: '',
    contact_email: '',
    contact_phone: '',
    website: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Holiday Modal State
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [holidayForm, setHolidayForm] = useState({
    name: '',
    from_date: '',
    to_date: '',
    branch_id: '',
    is_recurring: false,
  });

  const updateOrganization = useAuthStore((state) => state.updateOrganization);

  // Fetch Settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.get('/settings');
        setSettings(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // Fetch Branches for Holiday Assignment
  const { data: branches = [] } = useQuery({
    queryKey: ['branches-settings'],
    queryFn: async () => {
      const res = await api.get('/branches');
      return res.data.data;
    },
  });

  // Fetch Organization Holidays
  const { data: holidays = [], isLoading: isLoadingHolidays } = useQuery<Holiday[]>({
    queryKey: ['organization-holidays'],
    queryFn: async () => {
      const res = await api.get('/leave/holidays');
      return res.data.data;
    },
  });

  // Holiday Mutations
  const saveHolidayMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingHoliday) {
        return api.put(`/leave/holidays/${editingHoliday.id}`, payload);
      }
      return api.post('/leave/holidays', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-holidays'] });
      setIsHolidayModalOpen(false);
      setEditingHoliday(null);
      setMessage(editingHoliday ? 'Holiday updated successfully.' : 'Holiday added successfully.');
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Failed to save holiday.');
    },
  });

  const deleteHolidayMutation = useMutation({
    mutationFn: async (id: number) => {
      return api.delete(`/leave/holidays/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-holidays'] });
      setMessage('Holiday removed successfully.');
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.message || 'Failed to delete holiday.');
    },
  });

  const handleSubmitSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      const res = await api.put('/settings', settings);
      setMessage('Organization settings saved successfully.');
      updateOrganization(res.data.data);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const openAddHoliday = () => {
    setEditingHoliday(null);
    setHolidayForm({
      name: '',
      from_date: new Date().toISOString().split('T')[0],
      to_date: new Date().toISOString().split('T')[0],
      branch_id: '',
      is_recurring: false,
    });
    setIsHolidayModalOpen(true);
  };

  const openEditHoliday = (h: Holiday) => {
    setEditingHoliday(h);
    setHolidayForm({
      name: h.name,
      from_date: h.from_date,
      to_date: h.to_date,
      branch_id: h.branch_id ? String(h.branch_id) : '',
      is_recurring: h.is_recurring,
    });
    setIsHolidayModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-zinc-500 text-sm">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-black" />
        Loading organization settings...
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-zinc-950 tracking-tight flex items-center gap-2">
          <Building className="w-6 h-6 text-black" />
          Organization Settings & Master Configuration
        </h2>
        <p className="text-xs text-zinc-500 mt-1">
          Manage your organization's official profile, email, physical address, annual public holidays, working hours, and white-label branding.
        </p>
      </div>

      {/* Notifications */}
      {message && (
        <div className="p-3.5 rounded-lg bg-zinc-100 border border-zinc-300 text-zinc-950 text-xs flex items-center justify-between font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-black shrink-0" />
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-zinc-400 hover:text-black text-xs">✕</button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-700 text-xs">✕</button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-zinc-200 gap-6 text-sm overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`pb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'profile'
              ? 'border-b-2 border-black text-black'
              : 'text-zinc-500 hover:text-black'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Organization Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('holidays')}
          className={`pb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'holidays'
              ? 'border-b-2 border-black text-black'
              : 'text-zinc-500 hover:text-black'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Organization Holidays ({holidays.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('localization')}
          className={`pb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'localization'
              ? 'border-b-2 border-black text-black'
              : 'text-zinc-500 hover:text-black'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Working Hours & Localization</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('branding')}
          className={`pb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'branding'
              ? 'border-b-2 border-black text-black'
              : 'text-zinc-500 hover:text-black'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span>Branding & Appearance</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: ORGANIZATION PROFILE & CONTACT                           */}
      {/* ============================================================== */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSubmitSettings} className="space-y-6">
          <div className="bg-white border border-zinc-300 rounded-xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
              <Building className="w-4 h-4" /> Organization Identity
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-1.5">
                  Organization / Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={settings.company_name || ''}
                  onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                  className="w-full bg-white border border-zinc-300 rounded-lg px-3.5 py-2.5 text-zinc-950 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-1.5">
                  Organization Tagline / Subtitle
                </label>
                <input
                  type="text"
                  value={settings.tagline || ''}
                  onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                  placeholder="e.g. Enterprise Technology Solutions"
                  className="w-full bg-white border border-zinc-300 rounded-lg px-3.5 py-2.5 text-zinc-950 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-1.5">
                  Registration / Incorporation Number
                </label>
                <input
                  type="text"
                  value={settings.company_registration_no || ''}
                  onChange={(e) => setSettings({ ...settings, company_registration_no: e.target.value })}
                  placeholder="e.g. REG-2024-987654"
                  className="w-full bg-white border border-zinc-300 rounded-lg px-3.5 py-2.5 text-zinc-950 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-1.5">
                  Tax Identification Number (TIN / VAT)
                </label>
                <input
                  type="text"
                  value={settings.tax_id || ''}
                  onChange={(e) => setSettings({ ...settings, tax_id: e.target.value })}
                  placeholder="e.g. VAT-123456789"
                  className="w-full bg-white border border-zinc-300 rounded-lg px-3.5 py-2.5 text-zinc-950 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors font-mono"
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-zinc-300 rounded-xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
              <Mail className="w-4 h-4" /> Official Contact & Headquarters Address
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-1.5">
                  Organization Official Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={settings.contact_email || ''}
                    onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
                    placeholder="contact@company.com"
                    className="w-full bg-white border border-zinc-300 rounded-lg pl-9 pr-3.5 py-2.5 text-zinc-950 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-1.5">
                  Organization Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={settings.contact_phone || ''}
                    onChange={(e) => setSettings({ ...settings, contact_phone: e.target.value })}
                    placeholder="+1 (555) 123-4567"
                    className="w-full bg-white border border-zinc-300 rounded-lg pl-9 pr-3.5 py-2.5 text-zinc-950 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-1.5">
                  Official Website
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  <input
                    type="url"
                    value={settings.website || ''}
                    onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                    placeholder="https://company.com"
                    className="w-full bg-white border border-zinc-300 rounded-lg pl-9 pr-3.5 py-2.5 text-zinc-950 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-1.5">
                Headquarters Physical Address
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                <textarea
                  rows={2}
                  value={settings.address || ''}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  placeholder="Street address, Suite, City, State, Postal Code, Country"
                  className="w-full bg-white border border-zinc-300 rounded-lg pl-9 pr-3.5 py-2.5 text-zinc-950 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-black hover:bg-zinc-800 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Save className="w-4 h-4 text-white" />}
              <span>Save Organization Information</span>
            </button>
          </div>
        </form>
      )}

      {/* ============================================================== */}
      {/* TAB 2: ORGANIZATION HOLIDAYS                                    */}
      {/* ============================================================== */}
      {activeTab === 'holidays' && (
        <div className="space-y-6">
          <div className="bg-white border border-zinc-300 rounded-xl p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
              <div>
                <h3 className="text-base font-bold text-zinc-950 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-black" />
                  Official Organization Holidays
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Public and company holidays observed by staff. Only Tenant Administrators and Super Admins can manage this schedule.
                </p>
              </div>

              <button
                type="button"
                onClick={openAddHoliday}
                className="flex items-center gap-2 px-4 py-2 bg-black hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Holiday</span>
              </button>
            </div>

            {isLoadingHolidays ? (
              <div className="py-12 text-center text-xs text-zinc-500">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-black" />
                Loading official holidays...
              </div>
            ) : holidays.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 bg-zinc-50 rounded-xl border border-dashed border-zinc-300 mt-4">
                <Calendar className="w-10 h-10 mx-auto text-zinc-400 mb-2" />
                <p className="text-sm font-semibold text-zinc-900">No holidays scheduled</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Click "Add Holiday" above to configure your organization's annual holidays.
                </p>
              </div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-700">
                  <thead className="border-b border-zinc-200 bg-zinc-50 text-[11px] uppercase tracking-wider text-zinc-500">
                    <tr>
                      <th className="px-4 py-3">Holiday Name</th>
                      <th className="px-4 py-3">Dates</th>
                      <th className="px-4 py-3">Duration</th>
                      <th className="px-4 py-3">Branch Scope</th>
                      <th className="px-4 py-3">Recurrence</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {holidays.map((h) => (
                      <tr key={h.id} className="hover:bg-zinc-50/50">
                        <td className="px-4 py-3 font-semibold text-zinc-950">
                          {h.name}
                        </td>
                        <td className="px-4 py-3 font-mono text-zinc-600">
                          {h.from_date} {h.from_date !== h.to_date && `→ ${h.to_date}`}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-zinc-900 font-mono font-medium">
                            {h.total_days} {h.total_days === 1 ? 'day' : 'days'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {h.branch ? (
                            <span className="font-medium text-zinc-900">{h.branch.name}</span>
                          ) : (
                            <span className="text-zinc-500">All Organization Branches</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {h.is_recurring ? (
                            <span className="text-emerald-700 font-medium">Annual Recurring</span>
                          ) : (
                            <span className="text-zinc-500">One-time</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditHoliday(h)}
                              className="p-1 rounded text-zinc-500 hover:text-black hover:bg-zinc-100 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Remove holiday "${h.name}"?`)) {
                                  deleteHolidayMutation.mutate(h.id);
                                }
                              }}
                              className="p-1 rounded text-red-400 hover:text-red-700 hover:bg-red-50 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: WORKING HOURS & LOCALIZATION                            */}
      {/* ============================================================== */}
      {activeTab === 'localization' && (
        <form onSubmit={handleSubmitSettings} className="space-y-6">
          <div className="bg-white border border-zinc-300 rounded-xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-zinc-950 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Working Days & Business Weekends
            </h3>

            <div>
              <label className="block text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-2">
                Standard Working Days (Checked days indicate active working hours)
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { id: 1, label: 'Mon (Monday)' },
                  { id: 2, label: 'Tue (Tuesday)' },
                  { id: 3, label: 'Wed (Wednesday)' },
                  { id: 4, label: 'Thu (Thursday)' },
                  { id: 5, label: 'Fri (Friday)' },
                  { id: 6, label: 'Sat (Saturday)' },
                  { id: 7, label: 'Sun (Sunday)' },
                ].map((d) => {
                  const days: number[] = settings.working_days || [1, 2, 3, 4, 5];
                  const checked = days.includes(d.id);
                  return (
                    <label
                      key={d.id}
                      className={`px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                        checked
                          ? 'bg-black border-black text-white'
                          : 'bg-white border-zinc-300 text-zinc-700 hover:bg-zinc-100'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const updated = e.target.checked
                            ? [...days, d.id]
                            : days.filter((x) => x !== d.id);
                          setSettings({ ...settings, working_days: updated });
                        }}
                        className="sr-only"
                      />
                      {d.label}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-zinc-100">
              <div>
                <label className="block text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-1.5">
                  Primary Timezone
                </label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
                  <select
                    value={settings.timezone || 'Asia/Dhaka'}
                    onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                    className="w-full bg-white border border-zinc-300 rounded-lg pl-10 pr-4 py-2.5 text-zinc-950 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                  >
                    <option value="Asia/Dhaka">Asia/Dhaka (BST)</option>
                    <option value="UTC">UTC (Universal Coordinated Time)</option>
                    <option value="America/New_York">America/New_York (EST/EDT)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST/PDT)</option>
                    <option value="Europe/London">Europe/London (GMT/BST)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                    <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-1.5">
                  Base Currency Code
                </label>
                <div className="relative">
                  <span className="text-xs font-bold text-zinc-500 absolute left-3.5 top-3">Tk</span>
                  <input
                    type="text"
                    maxLength={3}
                    value={settings.currency || 'BDT'}
                    onChange={(e) => setSettings({ ...settings, currency: e.target.value.toUpperCase() })}
                    placeholder="BDT"
                    className="w-full bg-white border border-zinc-300 rounded-lg pl-10 pr-4 py-2.5 text-zinc-950 text-sm uppercase font-mono focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-1.5">
                  Date Display Format
                </label>
                <select
                  value={settings.date_format || 'Y-m-d'}
                  onChange={(e) => setSettings({ ...settings, date_format: e.target.value })}
                  className="w-full bg-white border border-zinc-300 rounded-lg px-3.5 py-2.5 text-zinc-950 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                >
                  <option value="Y-m-d">YYYY-MM-DD (e.g. 2026-11-20)</option>
                  <option value="d/m/Y">DD/MM/YYYY (e.g. 20/11/2026)</option>
                  <option value="m/d/Y">MM/DD/YYYY (e.g. 11/20/2026)</option>
                  <option value="d M Y">DD Mon YYYY (e.g. 20 Nov 2026)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-1.5">
                  Time Display Format
                </label>
                <select
                  value={settings.time_format || 'H:i'}
                  onChange={(e) => setSettings({ ...settings, time_format: e.target.value })}
                  className="w-full bg-white border border-zinc-300 rounded-lg px-3.5 py-2.5 text-zinc-950 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                >
                  <option value="H:i">24-Hour (e.g. 18:30)</option>
                  <option value="h:i A">12-Hour AM/PM (e.g. 06:30 PM)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-black hover:bg-zinc-800 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Save className="w-4 h-4 text-white" />}
              <span>Save Localization Rules</span>
            </button>
          </div>
        </form>
      )}

      {/* ============================================================== */}
      {/* TAB 4: BRANDING & APPEARANCE                                   */}
      {/* ============================================================== */}
      {activeTab === 'branding' && (
        <form onSubmit={handleSubmitSettings} className="space-y-6">
          {/* Live Branding Preview */}
          <div className="bg-white border border-zinc-300 rounded-xl p-5 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              <Eye className="w-4 h-4 text-black" />
              Live White-Label Preview
            </div>
            <div className="rounded-lg p-4 border border-zinc-200 bg-zinc-50 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {settings.logo_url ? (
                  <img src={settings.logo_url} alt="Logo" className="w-10 h-10 object-contain rounded" />
                ) : (
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white bg-black shadow-xs">
                    {settings.company_name ? settings.company_name.charAt(0).toUpperCase() : 'O'}
                  </div>
                )}
                <div>
                  <div className="text-base font-bold text-zinc-950">
                    {settings.company_name || 'Your Company Name'}
                  </div>
                  <div className="text-xs text-zinc-500">{settings.tagline || 'Office Management Portal'}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-black">
                  Primary Accent
                </span>
                <span className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-900 bg-zinc-200 border border-zinc-300">
                  Secondary Accent
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-zinc-300 rounded-xl p-6 shadow-xs space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-1.5">
                  Primary Brand Color (Hex)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.primary_color || '#000000'}
                    onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                    className="w-10 h-10 rounded border border-zinc-300 bg-transparent cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={settings.primary_color || '#000000'}
                    onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                    className="flex-1 bg-white border border-zinc-300 rounded-lg px-3.5 py-2.5 text-zinc-950 text-sm font-mono focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-1.5">
                  Secondary Accent Color (Hex)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.secondary_color || '#52525b'}
                    onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                    className="w-10 h-10 rounded border border-zinc-300 bg-transparent cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={settings.secondary_color || '#52525b'}
                    onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                    className="flex-1 bg-white border border-zinc-300 rounded-lg px-3.5 py-2.5 text-zinc-950 text-sm font-mono focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-1.5">Logo URL</label>
                <input
                  type="url"
                  value={settings.logo_url || ''}
                  onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
                  placeholder="https://yourdomain.com/logo.png"
                  className="w-full bg-white border border-zinc-300 rounded-lg px-3.5 py-2.5 text-zinc-950 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-1.5">Favicon URL</label>
                <input
                  type="url"
                  value={settings.favicon_url || ''}
                  onChange={(e) => setSettings({ ...settings, favicon_url: e.target.value })}
                  placeholder="https://yourdomain.com/favicon.ico"
                  className="w-full bg-white border border-zinc-300 rounded-lg px-3.5 py-2.5 text-zinc-950 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-black hover:bg-zinc-800 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Save className="w-4 h-4 text-white" />}
              <span>Save Appearance & Branding</span>
            </button>
          </div>
        </form>
      )}

      {/* ============================================================== */}
      {/* MODAL: ADD / EDIT HOLIDAY                                      */}
      {/* ============================================================== */}
      {isHolidayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <h3 className="text-base font-bold text-zinc-950">
                {editingHoliday ? 'Edit Organization Holiday' : 'Add Organization Holiday'}
              </h3>
              <button
                onClick={() => setIsHolidayModalOpen(false)}
                className="text-zinc-400 hover:text-black text-sm"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveHolidayMutation.mutate({
                  name: holidayForm.name,
                  from_date: holidayForm.from_date,
                  to_date: holidayForm.to_date,
                  branch_id: holidayForm.branch_id ? Number(holidayForm.branch_id) : null,
                  is_recurring: holidayForm.is_recurring,
                });
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-1.5">
                  Holiday Name *
                </label>
                <input
                  type="text"
                  required
                  value={holidayForm.name}
                  onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                  placeholder="e.g. Independence Day / Annual Company Retreat"
                  className="w-full rounded-lg border border-zinc-300 p-2 text-xs text-zinc-900 focus:border-black focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-1.5">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={holidayForm.from_date}
                    onChange={(e) => {
                      const from = e.target.value;
                      setHolidayForm((prev) => ({
                        ...prev,
                        from_date: from,
                        to_date: prev.to_date && prev.to_date < from ? from : prev.to_date,
                      }));
                    }}
                    className="w-full rounded-lg border border-zinc-300 p-2 text-xs text-zinc-900 focus:border-black focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-1.5">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    min={holidayForm.from_date}
                    value={holidayForm.to_date}
                    onChange={(e) => setHolidayForm({ ...holidayForm, to_date: e.target.value })}
                    className="w-full rounded-lg border border-zinc-300 p-2 text-xs text-zinc-900 focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-1.5">
                  Applicable Branch
                </label>
                <select
                  value={holidayForm.branch_id}
                  onChange={(e) => setHolidayForm({ ...holidayForm, branch_id: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 p-2 text-xs text-zinc-900 focus:border-black focus:outline-none"
                >
                  <option value="">All Branches (Organization-Wide)</option>
                  {branches.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_recurring"
                  checked={holidayForm.is_recurring}
                  onChange={(e) => setHolidayForm({ ...holidayForm, is_recurring: e.target.checked })}
                  className="rounded border-zinc-300 text-black focus:ring-black"
                />
                <label htmlFor="is_recurring" className="text-xs text-zinc-800 font-medium">
                  Annual Recurring Holiday (repeats every calendar year)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setIsHolidayModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-zinc-300 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveHolidayMutation.isPending}
                  className="px-5 py-2 rounded-lg bg-black text-white hover:bg-zinc-800 text-xs font-semibold disabled:opacity-50"
                >
                  {saveHolidayMutation.isPending ? 'Saving...' : editingHoliday ? 'Update Holiday' : 'Create Holiday'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantSettingsPage;
