import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { usePermission } from '@/hooks/usePermission';
import api from '@/lib/api';
import { Employee } from '../types/employee';
import { MediaItem } from '../../media/types/media';
import { MediaPicker } from '../../media/components/MediaPicker';
import {
  ArrowLeft,
  Mail,
  Phone,
  Building2,
  Calendar,
  CreditCard,
  FileText,
  Plus,
  Trash2,
  ExternalLink,
  Download,
  ShieldCheck,
} from 'lucide-react';

export const EmployeeDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { hasRole } = usePermission();
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);

  const canManage = hasRole('admin,hr');

  const { data: employee, isLoading, isError } = useQuery<Employee>({
    queryKey: ['employee', id],
    queryFn: async () => {
      const res = await api.get(`/employees/${id}`);
      return res.data.data;
    },
  });

  const attachDocMutation = useMutation({
    mutationFn: async (media: MediaItem) => {
      return api.post(`/employees/${id}/documents`, {
        media_id: media.id,
        collection_name: 'documents',
        document_title: media.title || media.file_name,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to attach document.');
    },
  });

  const detachDocMutation = useMutation({
    mutationFn: async (mediaId: number) => {
      return api.delete(`/employees/${id}/documents/${mediaId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to detach document.');
    },
  });

  const isOwner = Boolean(
    employee && (user?.email === employee.email || (employee.user_id && user?.id === employee.user_id))
  );
  const canAccessSensitive = canManage || isOwner;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  if (isError || !employee) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
        <p className="font-semibold">Failed to load employee details</p>
        <Link to="/employees" className="mt-2 inline-block text-sm underline">
          Back to employee directory
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top back button and header */}
      <div className="flex items-center gap-4">
        <Link
          to="/employees"
          className="rounded-lg border border-zinc-300 p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
            {employee.full_name}
          </h1>
          <p className="text-sm font-mono text-zinc-500">
            {employee.employee_code} • {employee.designation?.name || 'No Designation'}
          </p>
        </div>
        <div className="ml-auto">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
              employee.status === 'active'
                ? 'bg-zinc-100 text-zinc-900  '
                : 'bg-zinc-100 text-zinc-900  '
            }`}
          >
            {employee.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column: Key Cards */}
        <div className="space-y-6 lg:col-span-1">
          {/* Profile Card */}
          <div className="rounded-xl border border-zinc-300 bg-white p-6 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100 text-2xl font-bold text-black">
                {employee.first_name[0]}
                {employee.last_name[0]}
              </div>
              <h2 className="mt-3 text-lg font-bold text-zinc-950">
                {employee.full_name}
              </h2>
              <span className="text-xs text-zinc-500">{employee.designation?.name || 'Staff Member'}</span>

              <div className="mt-4 w-full space-y-2 border-t border-zinc-200 pt-4 text-left text-xs text-zinc-700">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-zinc-500" />
                  <a href={`mailto:${employee.email}`} className="truncate hover:text-black">
                    {employee.email}
                  </a>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-zinc-500" />
                  <span>{employee.phone || 'No phone number'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-zinc-500" />
                  <span>
                    {employee.branch?.name} ({employee.department?.name || 'No Dept'})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-zinc-500" />
                  <span>Joined: {employee.joining_date}</span>
                </div>
              </div>
            </div>
          </div>

          {/* User Account Link */}
          <div className="rounded-xl border border-zinc-300 bg-white p-6 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-950">
              <ShieldCheck className="h-4 w-4 text-black" /> User Login Account
            </h3>
            {employee.user ? (
              <div className="mt-3 space-y-1 text-xs text-zinc-700">
                <p>
                  Status:{' '}
                  <span className="font-semibold text-zinc-900">
                    {employee.user.is_active ? 'Active Account' : 'Disabled'}
                  </span>
                </p>
                <p className="font-mono text-zinc-500">{employee.user.email}</p>
              </div>
            ) : (
              <div className="mt-2 text-xs text-zinc-500">
                No portal login account is currently linked to this employee profile.
              </div>
            )}
          </div>

          {/* Emergency Contact */}
          {employee.emergency_contact && (
            <div className="rounded-xl border border-zinc-300 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-zinc-950">Emergency Contact</h3>
              <div className="mt-3 space-y-1 text-xs text-zinc-700">
                <p className="font-medium text-zinc-950">
                  {employee.emergency_contact.name || '—'}
                </p>
                <p>Relationship: {employee.emergency_contact.relationship || '—'}</p>
                <p>Phone: {employee.emergency_contact.phone || '—'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right column: Bank & Documents */}
        <div className="space-y-6 lg:col-span-2">
          {/* Bank & Salary Details */}
          {canAccessSensitive && (
            <div className="rounded-xl border border-zinc-300 bg-white p-6 shadow-sm">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-950">
                <CreditCard className="h-5 w-5 text-black" /> Banking & Payroll Information
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
                <div className="rounded-lg bg-zinc-50 p-3">
                  <span className="text-zinc-500">Bank Name</span>
                  <p className="mt-1 font-semibold text-zinc-950">
                    {employee.bank_details?.bank_name || 'Not configured'}
                  </p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-3">
                  <span className="text-zinc-500">Account Holder Name</span>
                  <p className="mt-1 font-semibold text-zinc-950">
                    {employee.bank_details?.account_name || 'Not configured'}
                  </p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-3">
                  <span className="text-zinc-500">Account Number / IBAN</span>
                  <p className="mt-1 font-mono font-semibold text-zinc-950">
                    {employee.bank_details?.account_number || '••••••••'}
                  </p>
                </div>
                <div className="rounded-lg bg-zinc-50 p-3">
                  <span className="text-zinc-500">Routing / Branch Code</span>
                  <p className="mt-1 font-mono font-semibold text-zinc-950">
                    {employee.bank_details?.routing_number || '—'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Attached Documents via Media Module */}
          <div className="rounded-xl border border-zinc-300 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-950">
                  <FileText className="h-5 w-5 text-black" /> Documents & Verification
                </h2>
                <p className="text-xs text-zinc-500">
                  Passport, national ID, academic credentials, and contracts stored securely in private storage.
                </p>
              </div>
              {canAccessSensitive && (
                <button
                  onClick={() => setIsMediaPickerOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-black text-white hover:bg-zinc-800 px-3 py-1.5 text-xs font-medium transition-colors"
                >
                  <Plus className="h-4 w-4" /> Attach File
                </button>
              )}
            </div>

            <div className="mt-4">
              {!employee.media || employee.media.length === 0 ? (
                <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-xs text-zinc-500">
                  No documents attached yet. Click "Attach File" to link files from the Media Library.
                </div>
              ) : (
                <div className="divide-y divide-zinc-200 rounded-lg border border-zinc-300">
                  {employee.media.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3.5 hover:bg-zinc-50/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded bg-zinc-100 text-zinc-500">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-zinc-950">
                            {doc.file_name}
                          </p>
                          <span className="text-[11px] text-zinc-500 uppercase">
                            {doc.extension} • {(doc.file_size / 1024).toFixed(0)} KB
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={`/api/v1/media/${doc.uuid}/preview`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                          title="Preview"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <a
                          href={`/api/v1/media/${doc.uuid}/download`}
                          className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        {canAccessSensitive && (
                          <button
                            onClick={() => {
                              if (confirm(`Detach document ${doc.file_name}?`)) {
                                detachDocMutation.mutate(doc.id);
                              }
                            }}
                            className="rounded p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="Detach"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Media Picker Modal */}
      <MediaPicker
        isOpen={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        onSelect={(media) => {
          attachDocMutation.mutate(media);
        }}
        title="Attach Employee Document"
      />
    </div>
  );
};

export default EmployeeDetailsPage;
