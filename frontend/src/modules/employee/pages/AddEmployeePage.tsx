import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { EmployeeForm } from '../components/EmployeeForm';
import { usePermission } from '@/hooks/usePermission';

export const AddEmployeePage: React.FC = () => {
  const navigate = useNavigate();
  const { hasRole } = usePermission();
  const canManage = hasRole('admin,hr');

  if (!canManage) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center text-zinc-600 shadow-sm max-w-lg mx-auto mt-8">
        <UserPlus className="mx-auto mb-3 h-10 w-10 text-zinc-400" />
        <h2 className="text-base font-semibold text-zinc-900">Access Restricted</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Only administrators and HR personnel can onboard new employees.
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

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate('/employees')}
          className="rounded-lg border border-zinc-300 p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-0.5">
            <Link to="/employees" className="hover:text-black">
              Employees
            </Link>
            <span>/</span>
            <span className="text-zinc-900 font-medium">Add Employee</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950">
            Add New Employee
          </h1>
        </div>
      </div>

      {/* Main Form Card */}
      <div className="rounded-xl border border-zinc-300 bg-white p-6 shadow-sm">
        <EmployeeForm
          onSuccess={(emp) => {
            navigate(`/employees/${emp.id}`);
          }}
          onCancel={() => {
            navigate('/employees');
          }}
        />
      </div>
    </div>
  );
};

export default AddEmployeePage;
