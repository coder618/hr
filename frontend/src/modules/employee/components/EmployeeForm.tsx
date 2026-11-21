import React, { useState, useRef, useEffect } from 'react';
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
  Phone,
  ShieldCheck,
  CreditCard,
  MapPin,
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
  initialData?: Employee | null;
  onSuccess?: (employee: Employee) => void;
  onCancel?: () => void;
  isModal?: boolean;
}

export const EmployeeForm: React.FC<EmployeeFormProps> = ({
  initialData,
  onSuccess,
  onCancel,
}) => {
  const queryClient = useQueryClient();
  const isEdit = Boolean(initialData?.id);

  // Basic Details State
  const [firstName, setFirstName] = useState(initialData?.first_name || '');
  const [lastName, setLastName] = useState(initialData?.last_name || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [employeeCode, setEmployeeCode] = useState(initialData?.employee_code || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>(initialData?.gender || '');
  const [dateOfBirth, setDateOfBirth] = useState(
    initialData?.date_of_birth ? initialData.date_of_birth.split('T')[0] : ''
  );

  // Employment Details State
  const [branchId, setBranchId] = useState(initialData?.branch_id ? String(initialData.branch_id) : '');
  const [departmentId, setDepartmentId] = useState(initialData?.department_id ? String(initialData.department_id) : '');
  const [designationId, setDesignationId] = useState(initialData?.designation_id ? String(initialData.designation_id) : '');
  const [reportingManagerId, setReportingManagerId] = useState(
    initialData?.reporting_manager_id ? String(initialData.reporting_manager_id) : ''
  );
  const [joiningDate, setJoiningDate] = useState(
    initialData?.joining_date ? initialData.joining_date.split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [employmentType, setEmploymentType] = useState(initialData?.employment_type || 'full_time');
  const [status, setStatus] = useState(initialData?.status || 'active');

  // Emergency Contact State
  const [emergencyName, setEmergencyName] = useState(initialData?.emergency_contact?.name || '');
  const [emergencyRelationship, setEmergencyRelationship] = useState(initialData?.emergency_contact?.relationship || '');
  const [emergencyPhone, setEmergencyPhone] = useState(initialData?.emergency_contact?.phone || '');

  // Address State
  const [street, setStreet] = useState(initialData?.address?.street || '');
  const [city, setCity] = useState(initialData?.address?.city || '');
  const [stateName, setStateName] = useState(initialData?.address?.state || '');
  const [postalCode, setPostalCode] = useState(initialData?.address?.postal_code || '');
  const [country, setCountry] = useState(initialData?.address?.country || '');

  // Bank Details State
  const [bankName, setBankName] = useState(initialData?.bank_details?.bank_name || '');
  const [accountName, setAccountName] = useState(initialData?.bank_details?.account_name || '');
  const [accountNumber, setAccountNumber] = useState(initialData?.bank_details?.account_number || '');
  const [routingNumber, setRoutingNumber] = useState(initialData?.bank_details?.routing_number || '');
  const [swiftBic, setSwiftBic] = useState(initialData?.bank_details?.swift_bic || '');

  // Portal Account State
  const [createUserAccount, setCreateUserAccount] = useState(false);
  const [userPassword, setUserPassword] = useState('');

  // User Image Upload State
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarMedia, setAvatarMedia] = useState<MediaItem | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialData?.avatar_url || null);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Document Upload State
  const [documents, setDocuments] = useState<DocumentEntry[]>([]);
  const [isDocPickerOpen, setIsDocPickerOpen] = useState(false);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Sync state if initialData changes (e.g. after async fetch)
  useEffect(() => {
    if (initialData) {
      setFirstName(initialData.first_name || '');
      setLastName(initialData.last_name || '');
      setEmail(initialData.email || '');
      setEmployeeCode(initialData.employee_code || '');
      setPhone(initialData.phone || '');
      setGender(initialData.gender || '');
      setDateOfBirth(initialData.date_of_birth ? initialData.date_of_birth.split('T')[0] : '');
      setBranchId(initialData.branch_id ? String(initialData.branch_id) : '');
      setDepartmentId(initialData.department_id ? String(initialData.department_id) : '');
      setDesignationId(initialData.designation_id ? String(initialData.designation_id) : '');
      setReportingManagerId(initialData.reporting_manager_id ? String(initialData.reporting_manager_id) : '');
      setJoiningDate(initialData.joining_date ? initialData.joining_date.split('T')[0] : new Date().toISOString().split('T')[0]);
      setEmploymentType(initialData.employment_type || 'full_time');
      setStatus(initialData.status || 'active');
      setAvatarPreview(initialData.avatar_url || null);

      setEmergencyName(initialData.emergency_contact?.name || '');
      setEmergencyRelationship(initialData.emergency_contact?.relationship || '');
      setEmergencyPhone(initialData.emergency_contact?.phone || '');

      setStreet(initialData.address?.street || '');
      setCity(initialData.address?.city || '');
      setStateName(initialData.address?.state || '');
      setPostalCode(initialData.address?.postal_code || '');
      setCountry(initialData.address?.country || '');

      setBankName(initialData.bank_details?.bank_name || '');
      setAccountName(initialData.bank_details?.account_name || '');
      setAccountNumber(initialData.bank_details?.account_number || '');
      setRoutingNumber(initialData.bank_details?.routing_number || '');
      setSwiftBic(initialData.bank_details?.swift_bic || '');
    }
  }, [initialData]);

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

  const { data: managers = [] } = useQuery<Employee[]>({
    queryKey: ['employees', 'managers-select'],
    queryFn: async () => {
      const res = await api.get('/employees', { params: { per_page: 100 } });
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

  // Save / Update Employee Mutation
  const saveEmployeeMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('first_name', firstName);
      formData.append('last_name', lastName);
      formData.append('email', email);
      formData.append('employee_code', employeeCode);
      formData.append('branch_id', branchId);
      if (departmentId) formData.append('department_id', departmentId);
      if (designationId) formData.append('designation_id', designationId);
      if (reportingManagerId) formData.append('reporting_manager_id', reportingManagerId);
      if (phone) formData.append('phone', phone);
      if (gender) formData.append('gender', gender);
      if (dateOfBirth) formData.append('date_of_birth', dateOfBirth);
      formData.append('joining_date', joiningDate);
      formData.append('employment_type', employmentType);
      formData.append('status', status);

      // Emergency Contact
      const emergencyData = {
        name: emergencyName || null,
        relationship: emergencyRelationship || null,
        phone: emergencyPhone || null,
      };
      formData.append('emergency_contact', JSON.stringify(emergencyData));

      // Address
      const addressData = {
        street: street || null,
        city: city || null,
        state: stateName || null,
        postal_code: postalCode || null,
        country: country || null,
      };
      formData.append('address', JSON.stringify(addressData));

      // Bank Details
      const bankData = {
        bank_name: bankName || null,
        account_name: accountName || null,
        account_number: accountNumber || null,
        routing_number: routingNumber || null,
        swift_bic: swiftBic || null,
      };
      formData.append('bank_details', JSON.stringify(bankData));

      if (createUserAccount && !initialData?.user) {
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

      if (isEdit && initialData?.id) {
        formData.append('_method', 'PUT');
        const res = await api.post(`/employees/${initialData.id}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        return res.data.data as Employee;
      } else {
        const res = await api.post('/employees', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        return res.data.data as Employee;
      }
    },
    onSuccess: (savedEmployee) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      if (initialData?.id) {
        queryClient.invalidateQueries({ queryKey: ['employee', String(initialData.id)] });
        queryClient.invalidateQueries({ queryKey: ['employee-detail', String(initialData.id)] });
      }
      if (onSuccess) {
        onSuccess(savedEmployee);
      }
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.message ||
        err.message ||
        (isEdit ? 'Failed to update employee.' : 'Failed to create employee.');
      alert(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId) {
      alert('Please select an office branch.');
      return;
    }
    saveEmployeeMutation.mutate();
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
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 shadow-xs transition-colors"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>{avatarPreview ? 'Change Photo' : 'Upload File'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAvatarPickerOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 shadow-xs transition-colors"
                >
                  <FolderOpen className="h-3.5 w-3.5 text-zinc-500" />
                  <span>Choose from Vault</span>
                </button>
                {avatarPreview && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-zinc-500">
                Recommended: Square image, max 10MB (PNG, JPG, WebP)
              </p>
              {avatarFile && (
                <p className="text-[11px] text-zinc-600">
                  Selected file: <span className="font-semibold text-zinc-950">{avatarFile.name}</span> ({formatFileSize(avatarFile.size)})
                </p>
              )}
              {avatarMedia && (
                <p className="text-[11px] text-zinc-600">
                  Vault media: <span className="font-semibold text-zinc-950">{avatarMedia.file_name}</span> ({formatFileSize(avatarMedia.file_size)})
                </p>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: BASIC PERSONAL INFORMATION */}
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

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-800">
                Reporting Manager
              </label>
              <select
                value={reportingManagerId}
                onChange={(e) => setReportingManagerId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
              >
                <option value="">None / Self</option>
                {managers
                  .filter((m) => !initialData?.id || m.id !== initialData.id)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.first_name} {m.last_name} ({m.employee_code})
                    </option>
                  ))}
              </select>
            </div>
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
                onChange={(e) => setEmploymentType(e.target.value as any)}
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
                onChange={(e) => setStatus(e.target.value as any)}
                className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
              >
                <option value="active">Active</option>
                <option value="probation">Probation</option>
                <option value="suspended">Suspended</option>
                <option value="terminated">Terminated</option>
                <option value="resigned">Resigned</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 4: EMERGENCY CONTACT */}
        <div className="space-y-4 pt-2 border-t border-zinc-200">
          <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 text-zinc-500" />
            Emergency Contact Information
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-800">Contact Name</label>
              <input
                type="text"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                placeholder="e.g. John Jenkins"
                className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-800">Relationship</label>
              <input
                type="text"
                value={emergencyRelationship}
                onChange={(e) => setEmergencyRelationship(e.target.value)}
                placeholder="e.g. Spouse, Father"
                className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-800">Emergency Phone</label>
              <input
                type="tel"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                placeholder="+1 555-0198"
                className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* SECTION 5: ADDRESS INFORMATION */}
        <div className="space-y-4 pt-2 border-t border-zinc-200">
          <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-zinc-500" />
            Residential Address
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-zinc-800">Street Address</label>
              <input
                type="text"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="123 Corporate Blvd, Suite 400"
                className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-800">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="New York"
                className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-800">State / Province</label>
              <input
                type="text"
                value={stateName}
                onChange={(e) => setStateName(e.target.value)}
                placeholder="NY"
                className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-800">Postal / Zip Code</label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="10001"
                className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-800">Country</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="United States"
                className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* SECTION 6: BANKING & PAYROLL DETAILS */}
        <div className="space-y-4 pt-2 border-t border-zinc-200">
          <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
            <CreditCard className="h-3.5 w-3.5 text-zinc-500" />
            Banking & Compensation Info
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-800">Bank Name</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="Chase Bank"
                className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-800">Account Name</label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Sarah Jenkins"
                className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-800">Account Number</label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="•••• •••• •••• 9812"
                className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs font-mono focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-800">Routing Number</label>
              <input
                type="text"
                value={routingNumber}
                onChange={(e) => setRoutingNumber(e.target.value)}
                placeholder="021000021"
                className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs font-mono focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-800">SWIFT / BIC Code</label>
              <input
                type="text"
                value={swiftBic}
                onChange={(e) => setSwiftBic(e.target.value)}
                placeholder="CHASUS33"
                className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-xs font-mono focus:border-black focus:ring-1 focus:ring-black focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* SECTION 7: DOCUMENT UPLOAD & ATTACHMENTS */}
        <div className="space-y-3 pt-2 border-t border-zinc-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
                Document Attachments
              </h4>
              <p className="text-[11px] text-zinc-500">
                Attach contracts, resume/CV, national ID, passport, or certificates.
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
              <p className="text-xs font-medium text-zinc-700">No new documents staged</p>
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

        {/* SECTION 8: PORTAL LOGIN ACCOUNT */}
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          {initialData?.user ? (
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <span className="text-xs font-semibold text-zinc-900 block">
                  Linked Portal Account
                </span>
                <span className="text-[11px] text-zinc-500 font-mono">
                  {initialData.user.email} • {initialData.user.is_active ? 'Active Account' : 'Account Disabled'}
                </span>
              </div>
            </div>
          ) : (
            <>
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
            </>
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
            disabled={saveEmployeeMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-black text-white hover:bg-zinc-800 px-5 py-2 text-xs font-medium shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
          >
            {saveEmployeeMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{isEdit ? 'Updating Employee...' : 'Saving Employee...'}</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>{isEdit ? 'Update Employee' : 'Create Employee'}</span>
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
