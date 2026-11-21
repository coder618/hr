import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, UserCog, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { Employee } from '../types/employee';
import { EmployeeForm } from '../components/EmployeeForm';
import { usePermission } from '@/hooks/usePermission';

export const EditEmployeePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole } = usePermission();
  const canManage = hasRole('admin,hr');

  const {
    data: employee,
    isLoading,
    isError,
    error,
  } = useQuery<Employee>({
    queryKey: ['employee-edit', id],
    queryFn: async () => {
      const res = await api.get(`/employees/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });

  if (!canManage) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center text-zinc-600 shadow-sm max-w-lg mx-auto mt-8">
        <UserCog className="mx-auto mb-3 h-10 w-10 text-zinc-400" />
        <h2 className="text-base font-semibold text-zinc-900">Access Restricted</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Only administrators and HR personnel can modify employee information.
        </p>
        <Link
          to="/employees"
          className="mt-4 inline-block rounded-lg bg-black px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800 transition-colors"
        >
          Return to Employee Directory
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-zinc-500 space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-black" />
        <p className="text-xs">Loading employee information...</p>
      </div>
    );
  }

  if (isError || !employee) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50/50 p-8 text-center max-w-lg mx-auto mt-8">
        <p className="text-sm font-semibold text-red-800">Failed to load employee details</p>
        <p className="text-xs text-red-600 mt-1">
          {(error as any)?.response?.data?.message || 'The requested employee could not be found.'}
        </p>
        <button
          onClick={() => navigate('/employees')}
          className="mt-4 rounded-lg bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-800 border border-zinc-300 hover:bg-zinc-50"
        >
          Back to Employees
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate(`/employees/${id}`)}
          className="rounded-lg border border-zinc-300 p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors cursor-pointer"
          title="Back to Employee Details"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-0.5">
            <Link to="/employees" className="hover:text-black">
              Employees
            </Link>
            <span>/</span>
            <Link to={`/employees/${id}`} className="hover:text-black">
              {employee.full_name}
            </Link>
            <span>/</span>
            <span className="text-zinc-900 font-medium">Edit Profile</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
            Edit Employee: {employee.full_name}
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Modify organizational placement, employment status, personal credentials, and documents.
          </p>
        </div>
      </div>

      {/* Main Form Container */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <EmployeeForm
          initialData={employee}
          onSuccess={(updated) => {
            navigate(`/employees/${updated.id}`);
          }}
          onCancel={() => {
            navigate(`/employees/${id}`);
          }}
        />
      </div>
    </div>
  );
};

export default EditEmployeePage;
