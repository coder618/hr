import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { SalaryStructure } from '../types/payroll';
import {
  Briefcase,
  Plus,
  Trash2,
  X,
  PlusCircle,
  FileText,
} from 'lucide-react';

export const SalaryStructuresPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [structureName, setStructureName] = useState('');
  const [structureDesc, setStructureDesc] = useState('');
  const [components, setComponents] = useState<
    Array<{
      name: string;
      type: 'earning' | 'deduction';
      calculation_type: 'fixed' | 'percentage_of_basic';
      default_amount: number;
      percentage_value: number;
    }>
  >([
    { name: 'House Rent Allowance', type: 'earning', calculation_type: 'percentage_of_basic', default_amount: 0, percentage_value: 20 },
    { name: 'Medical Allowance', type: 'earning', calculation_type: 'fixed', default_amount: 2500, percentage_value: 0 },
    { name: 'Provident Fund', type: 'deduction', calculation_type: 'percentage_of_basic', default_amount: 0, percentage_value: 8 },
  ]);

  const { data: structures = [], isLoading } = useQuery<SalaryStructure[]>({
    queryKey: ['salary-structures'],
    queryFn: async () => {
      const res = await api.get('/payroll/structures');
      return res.data.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/payroll/structures', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-structures'] });
      setIsModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/payroll/structures/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-structures'] });
    },
  });

  const addComponentRow = () => {
    setComponents([
      ...components,
      { name: '', type: 'earning', calculation_type: 'fixed', default_amount: 0, percentage_value: 0 },
    ]);
  };

  const removeComponentRow = (index: number) => {
    setComponents(components.filter((_, i) => i !== index));
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      name: structureName,
      description: structureDesc,
      components,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-zinc-300">
        <div>
          <h1 className="text-2xl font-bold text-zinc-950 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-black" />
            Salary Structures & Components
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Define standardized salary templates with earning allowances and payroll deductions.
          </p>
        </div>

        <button
          onClick={() => {
            setStructureName('');
            setStructureDesc('');
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-black text-white hover:bg-zinc-800 hover:bg-black font-medium rounded-xl shadow-sm text-sm"
        >
          <Plus className="w-4 h-4" />
          Create Structure
        </button>
      </div>

      {/* Grid of Structures */}
      {isLoading ? (
        <div className="p-12 text-center text-zinc-500">Loading salary structures...</div>
      ) : structures.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-zinc-300">
          <FileText className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
          <p className="text-base font-semibold text-zinc-800">No salary structures configured</p>
          <p className="text-sm text-zinc-500">Create your first salary structure using the button above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {structures.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-2xl shadow-sm border border-zinc-300 p-6 space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-lg text-zinc-950">{s.name}</h3>
                  <p className="text-xs text-zinc-500">{s.description || 'Standard Structure'}</p>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(s.id)}
                  className="p-1.5 text-zinc-900 hover:bg-zinc-100 rounded-lg"
                  title="Delete Structure"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Earnings & Deductions Tags */}
              <div className="space-y-3 pt-2">
                <div>
                  <div className="text-xs font-semibold uppercase text-zinc-900 mb-1.5">Earnings / Allowances</div>
                  <div className="flex flex-wrap gap-1.5">
                    {s.components
                      ?.filter((c) => c.type === 'earning')
                      .map((c) => (
                        <span
                          key={c.id}
                          className="px-2 py-1 bg-zinc-100 text-zinc-900 rounded-lg text-xs font-medium"
                        >
                          {c.name}:{' '}
                          {c.calculation_type === 'percentage_of_basic'
                            ? `${c.percentage_value}% Basic`
                            : `Tk ${c.default_amount}`}
                        </span>
                      ))}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase text-zinc-900 mb-1.5">Deductions</div>
                  <div className="flex flex-wrap gap-1.5">
                    {s.components
                      ?.filter((c) => c.type === 'deduction')
                      .map((c) => (
                        <span
                          key={c.id}
                          className="px-2 py-1 bg-zinc-100 text-zinc-900 rounded-lg text-xs font-medium"
                        >
                          {c.name}:{' '}
                          {c.calculation_type === 'percentage_of_basic'
                            ? `${c.percentage_value}% Basic`
                            : `Tk ${c.default_amount}`}
                        </span>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Structure Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-white/40 backdrop-blur-xs backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-zinc-300 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-zinc-300">
              <h3 className="font-semibold text-zinc-950">Create Salary Structure</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-zinc-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Structure Name</label>
                <input
                  type="text"
                  required
                  value={structureName}
                  onChange={(e) => setStructureName(e.target.value)}
                  placeholder="e.g. Senior Software Engineer"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-500 mb-1">Description</label>
                <input
                  type="text"
                  value={structureDesc}
                  onChange={(e) => setStructureDesc(e.target.value)}
                  placeholder="Optional description"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-sm"
                />
              </div>

              {/* Dynamic Components List */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase text-zinc-500">Allowances & Deductions</h4>
                  <button
                    type="button"
                    onClick={addComponentRow}
                    className="inline-flex items-center gap-1 text-xs text-black hover:underline font-semibold"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> Add Component
                  </button>
                </div>

                {components.map((comp, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2 p-3 bg-zinc-50 rounded-xl border border-zinc-300 items-center"
                  >
                    <div className="col-span-4">
                      <input
                        type="text"
                        required
                        placeholder="Component Name"
                        value={comp.name}
                        onChange={(e) => {
                          const copy = [...components];
                          copy[idx].name = e.target.value;
                          setComponents(copy);
                        }}
                        className="w-full px-2.5 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs"
                      />
                    </div>

                    <div className="col-span-2">
                      <select
                        value={comp.type}
                        onChange={(e) => {
                          const copy = [...components];
                          copy[idx].type = e.target.value as any;
                          setComponents(copy);
                        }}
                        className="w-full px-2 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs"
                      >
                        <option value="earning">Earning</option>
                        <option value="deduction">Deduction</option>
                      </select>
                    </div>

                    <div className="col-span-3">
                      <select
                        value={comp.calculation_type}
                        onChange={(e) => {
                          const copy = [...components];
                          copy[idx].calculation_type = e.target.value as any;
                          setComponents(copy);
                        }}
                        className="w-full px-2 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs"
                      >
                        <option value="percentage_of_basic">% of Basic</option>
                        <option value="fixed">Fixed Amount</option>
                      </select>
                    </div>

                    <div className="col-span-2">
                      <input
                        type="number"
                        step="0.5"
                        placeholder="Val"
                        value={comp.calculation_type === 'percentage_of_basic' ? comp.percentage_value : comp.default_amount}
                        onChange={(e) => {
                          const copy = [...components];
                          if (comp.calculation_type === 'percentage_of_basic') {
                            copy[idx].percentage_value = Number(e.target.value);
                          } else {
                            copy[idx].default_amount = Number(e.target.value);
                          }
                          setComponents(copy);
                        }}
                        className="w-full px-2 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs"
                      />
                    </div>

                    <div className="col-span-1 text-right">
                      <button
                        type="button"
                        onClick={() => removeComponentRow(idx)}
                        className="p-1 text-zinc-500 hover:text-zinc-900 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-300">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 text-sm font-medium bg-black text-white hover:bg-zinc-800 hover:bg-black rounded-xl shadow-sm"
                >
                  {createMutation.isPending ? 'Saving...' : 'Save Structure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryStructuresPage;
