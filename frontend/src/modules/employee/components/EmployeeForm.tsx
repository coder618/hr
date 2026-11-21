import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Branch, Department, Designation, Employee } from '../types/employee';
import { MediaItem } from '@/modules/media/types/media';
import { MediaPicker } from '@/components/media/MediaPicker';
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Loader2,
  FolderOpen,
  Plus,
  Trash2,
  File,
  Check,
} from 'lucide-react';

interface DocumentEntry {
  id: string;
  file?: File;
  media?: MediaItem;
  title: string;
  size: number;
  name: string;
  extension: string;
}

interface EmployeeFormProps {
  onSuccess?: (employee: Employee) => void;
  onCancel?: () => void;
  isModal?: boolean;
}

export const EmployeeForm: React.FC<EmployeeFormProps> = ({
  onSuccess,
  onCancel,
}) => {
  const queryClient = useQueryClient();

  // Basic Details State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  // Employment Details State
  const [branchId, setBranchId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [designationId, setDesignationId] = useState('');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [employmentType, setEmploymentType] = useState('full_time');
  const [status, setStatus] = useState('active');

  // Portal Account State
  const [createUserAccount, setCreateUserAccount] = useState(false);
  const [userPassword, setUserPassword] = useState('');

  // User Image Upload State
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarMedia, setAvatarMedia] = useState<MediaItem | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Document Upload State
  const [documents, setDocuments] = useState<DocumentEntry[]>([]);
  const [isDocPickerOpen, setIsDocPickerOpen] = useState(false);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Auxiliary data queries
  const { data: branches = [] } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await api.get('/branches');
      return res.data.data;
    },
  });

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ['departments', branchId],
    queryFn: async () => {
      const res = await api.get('/departments', { params: { branch_id: branchId || undefined } });
      return res.data.data;
    },
  });

  const { data: designations = [] } = useQuery<Designation[]>({
    queryKey: ['designations'],
    queryFn: async () => {
      const res = await api.get('/designations');
      return res.data.data;
    },
  });

  // Handle Local Avatar Selection
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarMedia(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        setAvatarFile(file);
        setAvatarMedia(null);
        const reader = new FileReader();
        reader.onloadend = () => {
          setAvatarPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Handle Media Picker for Avatar
  const handleAvatarMediaSelect = (selected: MediaItem | MediaItem[]) => {
    const item = Array.isArray(selected) ? selected[0] : selected;
    if (item) {
      setAvatarMedia(item);
      setAvatarFile(null);
      setAvatarPreview(item.preview_url || item.thumbnail_url || null);
    }
    setIsAvatarPickerOpen(false);
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setAvatarMedia(null);
    setAvatarPreview(null);
    if (avatarInputRef.current) {
      avatarInputRef.current.value = '';
    }
  };

  // Handle Document Files (local upload)
  const handleDocFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newEntries: DocumentEntry[] = Array.from(files).map((f) => {
        const ext = f.name.split('.').pop() || '';
        return {
          id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          file: f,
          name: f.name,
          title: f.name.replace(/\.[^/.]+$/, ''),
          size: f.size,
          extension: ext.toLowerCase(),
        };
      });
      setDocuments((prev) => [...prev, ...newEntries]);
    }
    if (docInputRef.current) {
      docInputRef.current.value = '';
    }
  };

  // Handle Media Picker for Documents
  const handleDocMediaSelect = (selected: MediaItem | MediaItem[]) => {
    const items = Array.isArray(selected) ? selected : [selected];
    const newEntries: DocumentEntry[] = items.map((item) => ({
      id: `${Date.now()}_${item.id}_${Math.random().toString(36).substring(2, 9)}`,
      media: item,
      name: item.file_name,
      title: item.title || item.file_name,
      size: item.file_size,
      extension: item.extension,
    }));
    setDocuments((prev) => [...prev, ...newEntries]);
    setIsDocPickerOpen(false);
  };

  const handleRemoveDoc = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const handleDocTitleChange = (id: string, newTitle: string) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, title: newTitle } : d))
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Create Employee Mutation
  const createEmployeeMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('first_name', firstName);
      formData.append('last_name', lastName);
      formData.append('email', email);
      formData.append('employee_code', employeeCode);
      formData.append('branch_id', branchId);
      if (departmentId) formData.append('department_id', departmentId);
      if (designationId) formData.append('designation_id', designationId);
      if (phone) formData.append('phone', phone);
      if (gender) formData.append('gender', gender);
      if (dateOfBirth) formData.append('date_of_birth', dateOfBirth);
      formData.append('joining_date', joiningDate);
      formData.append('employment_type', employmentType);
      formData.append('status', status);

      if (createUserAccount) {
        formData.append('create_user_account', '1');
        if (userPassword) formData.append('user_password', userPassword);
      }

      // Avatar
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      } else if (avatarMedia) {
        formData.append('avatar_media_id', String(avatarMedia.id));
      }

      // Documents
      let docIndex = 0;
      documents.forEach((doc) => {
        if (doc.file) {
          formData.append(`documents[${docIndex}]`, doc.file);
          if (doc.title) {
            formData.append(`document_titles[${docIndex}]`, doc.title);
          }
          docIndex++;
        } else if (doc.media) {
          formData.append(`document_media_ids[]`, String(doc.media.id));
        }
      });

      const res = await api.post('/employees', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return res.data.data as Employee;
    },
    onSuccess: (newEmployee) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      if (onSuccess) {
        onSuccess(newEmployee);
      }
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to create employee.';
      alert(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId) {
      alert('Please select an office branch.');
      return;
    }
    createEmployeeMutation.mutate();
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: USER IMAGE UPLOAD */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 sm:p-5">
          <label className="block text-xs font-semibold text-zinc-900 uppercase tracking-wider mb-2">
            Employee Photo / Profile Picture
          </label>
          <div className="flex flex-col sm:flex-row items-center gap-5">
            {/* Avatar Preview Box */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleAvatarDrop}
              onClick={() => avatarInputRef.current?.click()}
              className="group relative flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-zinc-300 bg-white overflow-hidden shadow-xs hover:border-black transition-colors"
            >
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-2 text-center text-zinc-400 group-hover:text-zinc-700">
                  <ImageIcon className="h-6 w-6 mb-1" />
                  <span className="text-[10px] font-medium leading-tight">Upload</span>
                </div>
              )}
            </div>

            {/* Avatar Upload Actions */}
            <div className="flex-1 space-y-2 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-100 shadow-xs transition-colors"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Choose Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAvatarPickerOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-100 shadow-xs transition-colors"
                >
                  <FolderOpen className="h-3.5 w-3.5 text-zinc-500" />
                  <span>Media Vault</span>
                </button>
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-zinc-500">
                Supports JPG, PNG, or WebP (max 10MB). Drag and drop or browse from local device or Media Vault.
              </p>
              {avatarFile && (
                <p className="text-[11px] font-medium text-zinc-700">
                  Selected file: <span className="font-semibold text-zinc-950">{avatarFile.name}</span> ({formatFileSize(avatarFile.size)})
                </p>
              )}
              {avatarMedia && (
                <p className="text-[11px] font-medium text-zinc-700">
                  Vault media: <span className="font-semibold text-zinc-950">{avatarMedia.file_name}</span> ({formatFileSize(avatarMedia.file_size)})
                </p>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: PERSONAL & CONTACT INFORMATION */}
        <div className="space-y-4">
          <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
            Personal Information
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-800">
                First Name *
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Sarah"
                className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-800">
                Last Name *
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Jenkins"
                className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-800">
                Official Email *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah.jenkins@company.com"
                className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-800">
                Employee Code *
              </label>
              <input
                type="text"
                required
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                placeholder="EMP-001"
                className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs font-mono focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-800">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555-0199"
                className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-800">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-800">
                Date of Birth
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: EMPLOYMENT & ORGANIZATION DETAILS */}
        <div className="space-y-4 pt-2 border-t border-zinc-200">
          <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
            Job & Organizational Structure
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-800">
                Branch *
              </label>
              <select
                required
                value={branchId}
                onChange={(e) => {
                  setBranchId(e.target.value);
                  setDepartmentId('');
                }}
                className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
              >
                <option value="">Select Branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-800">
                Department
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
              >
                <option value="">None</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-800">
                Designation
              </label>
              <select
                value={designationId}
                onChange={(e) => setDesignationId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
              >
                <option value="">None</option>
                {designations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-800">
                Joining Date *
              </label>
              <input
                type="date"
                required
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-800">
                Employment Type
              </label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
              >
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-800">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
              >
                <option value="active">Active</option>
                <option value="probation">Probation</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 4: DOCUMENT UPLOAD & ATTACHMENTS */}
        <div className="space-y-3 pt-2 border-t border-zinc-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
                Document Upload & Verification
              </h4>
              <p className="text-[11px] text-zinc-500">
                Attach contracts, resume/CV, national ID, passport, or academic certificates.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={docInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg"
                onChange={handleDocFilesChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => docInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 shadow-xs transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Upload Documents</span>
              </button>
              <button
                type="button"
                onClick={() => setIsDocPickerOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 shadow-xs transition-colors"
              >
                <FolderOpen className="h-3.5 w-3.5 text-zinc-500" />
                <span>Media Vault</span>
              </button>
            </div>
          </div>

          {/* Document list */}
          {documents.length === 0 ? (
            <div
              onClick={() => docInputRef.current?.click()}
              className="cursor-pointer rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50/50 p-6 text-center hover:border-zinc-400 hover:bg-zinc-50 transition-colors"
            >
              <FileText className="mx-auto mb-2 h-8 w-8 text-zinc-400" />
              <p className="text-xs font-medium text-zinc-700">No documents attached yet</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Click here or use the buttons above to select files (PDF, DOCX, Images max 50MB)
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-300 bg-white shadow-xs overflow-hidden">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 gap-3 hover:bg-zinc-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 font-semibold text-[11px] uppercase">
                      {doc.extension || <File className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={doc.title}
                          onChange={(e) => handleDocTitleChange(doc.id, e.target.value)}
                          placeholder="Document Title (e.g. Resume, ID Card)"
                          className="text-xs font-semibold text-zinc-950 border-b border-transparent hover:border-zinc-300 focus:border-black focus:outline-none bg-transparent w-full max-w-sm"
                        />
                      </div>
                      <p className="text-[11px] text-zinc-500 truncate">
                        {doc.name} • {formatFileSize(doc.size)}
                        {doc.media && <span className="ml-1 text-zinc-400">(from Vault)</span>}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveDoc(doc.id)}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Remove Document"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 5: PORTAL LOGIN ACCOUNT */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="create_user_account_toggle"
              checked={createUserAccount}
              onChange={(e) => setCreateUserAccount(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-black focus:ring-black"
            />
            <label
              htmlFor="create_user_account_toggle"
              className="text-xs font-semibold text-zinc-900 cursor-pointer select-none"
            >
              Create Portal Login Account for Employee
            </label>
          </div>
          <p className="mt-1 text-[11px] text-zinc-500 ml-6">
            Enables employee self-service login for viewing payslips, punching attendance, and leave requests.
          </p>

          {createUserAccount && (
            <div className="mt-3 ml-6 max-w-md">
              <label className="block text-xs font-medium text-zinc-800">
                Account Password (optional - defaults to auto-generated secure password)
              </label>
              <input
                type="password"
                value={userPassword}
                onChange={(e) => setUserPassword(e.target.value)}
                placeholder="Enter password (minimum 8 characters)"
                minLength={8}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white p-2 text-xs focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* FORM ACTIONS */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-50 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={createEmployeeMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-black text-white hover:bg-zinc-800 px-5 py-2 text-xs font-medium shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
          >
            {createEmployeeMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving Employee...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>Create Employee</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Media Picker Modal for Avatar */}
      <MediaPicker
        isOpen={isAvatarPickerOpen}
        onClose={() => setIsAvatarPickerOpen(false)}
        onSelect={handleAvatarMediaSelect}
        typeFilter="image"
        multiple={false}
        title="Select Employee Profile Picture"
      />

      {/* Media Picker Modal for Documents */}
      <MediaPicker
        isOpen={isDocPickerOpen}
        onClose={() => setIsDocPickerOpen(false)}
        onSelect={handleDocMediaSelect}
        typeFilter="all"
        multiple={true}
        title="Attach Documents from Media Vault"
      />
    </>
  );
};
