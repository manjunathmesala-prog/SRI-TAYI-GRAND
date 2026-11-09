'use client';

import { useState, useEffect, useCallback } from 'react';
import { StaffMember, StaffRole, StaffPermissions } from '@/types';
import {
  UserCog,
  ShieldCheck,
  Mail,
  Phone,
  Check,
  X,
  Lock,
  KeyRound,
  ShieldAlert,
  Building2,
  DollarSign,
  CreditCard,
  Radio,
  Sparkles,
  FileSpreadsheet,
  Moon,
  BedDouble,
  Search,
} from 'lucide-react';
import { useRealtimeSync } from '@/lib/realtime-client';
import { LuxurySelect } from '@/components/ui/LuxurySelect';

const DEPARTMENTS = [
  'Executive Management',
  'Hotel Operations',
  'Front Desk',
  'Housekeeping',
  'Accounts & Finance',
  'Banquets',
] as const;

export default function StaffAdminPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  // RBAC Edit Modal State
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [editDepartment, setEditDepartment] = useState<string>('Front Desk');
  const [permissions, setPermissions] = useState<StaffPermissions>({
    can_override_rates: false,
    can_process_refunds: false,
    can_view_accounting: false,
    can_encode_rfid: false,
    can_run_night_audit: false,
    can_manage_inventory: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchStaff = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/staff', {
        headers: { 'x-staff-role': 'Super Admin' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.staff) setStaff(data.staff);
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  useRealtimeSync({
    onRefresh: fetchStaff,
  });

  // Open Edit Modal
  const handleOpenEdit = (member: StaffMember) => {
    setSelectedStaff(member);
    setEditDepartment(
      member.department?.includes('Front Desk')
        ? 'Front Desk'
        : member.department?.includes('Housekeeping')
        ? 'Housekeeping'
        : member.department?.includes('Accounts')
        ? 'Accounts & Finance'
        : member.department?.includes('Banquet')
        ? 'Banquets'
        : member.department || 'Hotel Operations'
    );
    setPermissions(
      member.permissions || {
        can_override_rates: false,
        can_process_refunds: false,
        can_view_accounting: false,
        can_encode_rfid: false,
        can_run_night_audit: false,
        can_manage_inventory: false,
      }
    );
  };

  // Toggle single permission switch
  const handleTogglePermission = (key: keyof StaffPermissions) => {
    setPermissions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Save Permissions
  const handleSavePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-role': 'Super Admin',
        },
        body: JSON.stringify({
          id: selectedStaff.id,
          permissions,
          department: editDepartment,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update staff permissions');
      }

      setSelectedStaff(null);
      showToast('success', `Permissions updated for ${selectedStaff?.full_name || 'staff member'}.`);
      await fetchStaff();
    } catch (err: any) {
      showToast('error', err.message || 'Error updating permissions');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Department Badge Helper
  const renderDepartmentBadge = (dept?: string) => {
    const d = dept || 'Hotel Operations';
    if (d.includes('Executive')) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-900 border border-purple-300">
          Executive Management
        </span>
      );
    }
    if (d.includes('Operations')) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
          Hotel Operations
        </span>
      );
    }
    if (d.includes('Front Desk') || d.includes('Reception')) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
          Front Desk
        </span>
      );
    }
    if (d.includes('Housekeeping') || d.includes('Facilities')) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
          Housekeeping
        </span>
      );
    }
    if (d.includes('Accounts') || d.includes('Finance')) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-900 border border-cyan-300">
          Accounts & Finance
        </span>
      );
    }
    if (d.includes('Banquet') || d.includes('Convention')) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
          Banquets
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-800 border border-stone-300">
        {d}
      </span>
    );
  };

  const filteredStaff = staff.filter((s) => {
    const matchesSearch =
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery) ||
      s.role.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (departmentFilter === 'all') return true;
    return s.department?.toLowerCase().includes(departmentFilter.toLowerCase());
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border flex items-center gap-3 transition-all animate-in slide-in-from-top-2 ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-xs opacity-70 hover:opacity-100 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EFE3D6]">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-[#D8AD56]">
            SECURITY & ACCESS CONTROL
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#241912] mt-0.5 flex items-center gap-2">
            <UserCog className="w-6 h-6 text-[#D8AD56]" />
            <span>Staff Directory & RBAC Permissions</span>
          </h1>
          <p className="text-xs text-[#786B61] mt-0.5">
            Department assignments, granular role privileges, rate override authority, and audit protection.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#786B61] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search staff, role, email..."
            className="w-full text-xs font-medium pl-9 pr-3 py-2.5 rounded-xl border border-[#EFE3D6] bg-white text-[#241912] focus:border-[#D8AD56] focus:outline-none shadow-sm"
          />
        </div>
      </div>

      {/* Department Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#EFE3D6] pb-2">
        <button
          onClick={() => setDepartmentFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            departmentFilter === 'all'
              ? 'bg-[#382216] text-[#D8AD56] shadow-sm'
              : 'bg-white text-[#786B61] hover:bg-[#FAF7F2]'
          }`}
        >
          All Departments ({staff.length})
        </button>

        {DEPARTMENTS.map((dept) => {
          const count = staff.filter((s) => s.department?.toLowerCase().includes(dept.toLowerCase().split(' ')[0])).length;
          const isSelected = departmentFilter.toLowerCase() === dept.toLowerCase().split(' ')[0];

          return (
            <button
              key={dept}
              onClick={() => setDepartmentFilter(dept.split(' ')[0])}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#382216] text-[#D8AD56] shadow-sm'
                  : 'bg-white text-[#786B61] hover:bg-[#FAF7F2]'
              }`}
            >
              {dept} ({count})
            </button>
          );
        })}
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl border border-[#D8AD56]/30 shadow-luxury overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F2] text-[#786B61] uppercase tracking-wider text-[10px] border-b border-[#EFE3D6]">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Staff Member</th>
                <th className="py-3.5 px-4 font-semibold">Department</th>
                <th className="py-3.5 px-4 font-semibold">Contact</th>
                <th className="py-3.5 px-4 font-semibold">RBAC Permissions Granted</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">Last Session</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE3D6] text-[#241912]">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-[#786B61]">
                    No staff profiles match your criteria.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((s) => {
                  const permCount = s.permissions
                    ? Object.values(s.permissions).filter(Boolean).length
                    : 0;

                  return (
                    <tr key={s.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#382216] flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#382216] text-[#D8AD56] flex items-center justify-center font-bold text-xs shadow-xs">
                            {s.full_name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-[#241912]">{s.full_name}</div>
                            <span className="text-[10px] text-[#786B61] font-mono">{s.role}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {renderDepartmentBadge(s.department)}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-mono text-[#241912]">{s.phone}</div>
                        <div className="text-[11px] text-[#786B61]">{s.email}</div>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {s.permissions?.can_override_rates && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              Override Rates
                            </span>
                          )}
                          {s.permissions?.can_process_refunds && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                              Process Refunds
                            </span>
                          )}
                          {s.permissions?.can_view_accounting && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
                              Accounting
                            </span>
                          )}
                          {s.permissions?.can_encode_rfid && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                              RFID Encoder
                            </span>
                          )}
                          {s.permissions?.can_run_night_audit && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                              Night Audit
                            </span>
                          )}
                          {s.permissions?.can_manage_inventory && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Inventory
                            </span>
                          )}
                          {permCount === 0 && (
                            <span className="text-[10px] text-[#A89F91] italic">Standard Read-Only</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E8F5E9] text-[#2E7D32]">
                          ACTIVE
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-[#786B61]">
                        {s.last_login
                          ? new Date(s.last_login).toLocaleString('en-IN', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : 'Never'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-[#382216] text-[11px] font-bold border border-stone-200 flex items-center gap-1.5 ml-auto cursor-pointer transition-colors"
                          title="Configure Permissions"
                        >
                          <KeyRound className="w-3 h-3 text-[#D8AD56]" />
                          <span>Permissions</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: GRANULAR RBAC PERMISSIONS */}
      {selectedStaff && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#D8AD56]/40 p-6 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#EFE3D6] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#43001F]" />
                <h3 className="font-serif text-lg font-bold text-[#241912]">
                  Staff Permissions: {selectedStaff.full_name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedStaff(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePermissions} className="space-y-4">
              {/* Department Assignment */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#786B61] mb-1.5">
                  Department Assignment
                </label>
                <LuxurySelect
                  size="md"
                  variant="admin"
                  value={editDepartment}
                  onChange={(val) => setEditDepartment(String(val))}
                  options={DEPARTMENTS.map((dept) => ({ value: dept, label: dept }))}
                />
              </div>

              {/* 6 RBAC Switches */}
              <div className="space-y-2.5 pt-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#786B61] block mb-1">
                  Granular Privilege Switches:
                </span>

                {/* 1. can_override_rates */}
                <div
                  onClick={() => handleTogglePermission('can_override_rates')}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    permissions.can_override_rates
                      ? 'border-amber-400 bg-amber-50/50 shadow-xs'
                      : 'border-gray-200 bg-gray-50/50'
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs text-[#241912] flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                      <span>can_override_rates</span>
                    </div>
                    <p className="text-[10px] text-[#786B61]">
                      Authorizes manual tariff discounts & custom rate overrides at reception
                    </p>
                  </div>
                  <div
                    className={`w-10 h-5 rounded-full transition-colors relative ${
                      permissions.can_override_rates ? 'bg-amber-600' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                        permissions.can_override_rates ? 'right-0.5' : 'left-0.5'
                      }`}
                    />
                  </div>
                </div>

                {/* 2. can_process_refunds */}
                <div
                  onClick={() => handleTogglePermission('can_process_refunds')}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    permissions.can_process_refunds
                      ? 'border-rose-400 bg-rose-50/50 shadow-xs'
                      : 'border-gray-200 bg-gray-50/50'
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs text-[#241912] flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-rose-600" />
                      <span>can_process_refunds</span>
                    </div>
                    <p className="text-[10px] text-[#786B61]">
                      Enables in-app Razorpay digital refund disbursements and cash rollbacks
                    </p>
                  </div>
                  <div
                    className={`w-10 h-5 rounded-full transition-colors relative ${
                      permissions.can_process_refunds ? 'bg-rose-600' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                        permissions.can_process_refunds ? 'right-0.5' : 'left-0.5'
                      }`}
                    />
                  </div>
                </div>

                {/* 3. can_view_accounting */}
                <div
                  onClick={() => handleTogglePermission('can_view_accounting')}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    permissions.can_view_accounting
                      ? 'border-cyan-400 bg-cyan-50/50 shadow-xs'
                      : 'border-gray-200 bg-gray-50/50'
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs text-[#241912] flex items-center gap-1.5">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-600" />
                      <span>can_view_accounting</span>
                    </div>
                    <p className="text-[10px] text-[#786B61]">
                      Access to general ledger, profit-loss statements, cash transactions and folio journals
                    </p>
                  </div>
                  <div
                    className={`w-10 h-5 rounded-full transition-colors relative ${
                      permissions.can_view_accounting ? 'bg-cyan-600' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                        permissions.can_view_accounting ? 'right-0.5' : 'left-0.5'
                      }`}
                    />
                  </div>
                </div>

                {/* 4. can_encode_rfid */}
                <div
                  onClick={() => handleTogglePermission('can_encode_rfid')}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    permissions.can_encode_rfid
                      ? 'border-purple-400 bg-purple-50/50 shadow-xs'
                      : 'border-gray-200 bg-gray-50/50'
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs text-[#241912] flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-purple-600" />
                      <span>can_encode_rfid</span>
                    </div>
                    <p className="text-[10px] text-[#786B61]">
                      Ability to issue master keys, encode guest NFC keycards, and clear door locks
                    </p>
                  </div>
                  <div
                    className={`w-10 h-5 rounded-full transition-colors relative ${
                      permissions.can_encode_rfid ? 'bg-purple-600' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                        permissions.can_encode_rfid ? 'right-0.5' : 'left-0.5'
                      }`}
                    />
                  </div>
                </div>

                {/* 5. can_run_night_audit */}
                <div
                  onClick={() => handleTogglePermission('can_run_night_audit')}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    permissions.can_run_night_audit
                      ? 'border-indigo-400 bg-indigo-50/50 shadow-xs'
                      : 'border-gray-200 bg-gray-50/50'
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs text-[#241912] flex items-center gap-1.5">
                      <Moon className="w-3.5 h-3.5 text-indigo-600" />
                      <span>can_run_night_audit</span>
                    </div>
                    <p className="text-[10px] text-[#786B61]">
                      Permission to lock daily closing cash drawers and roll business dates
                    </p>
                  </div>
                  <div
                    className={`w-10 h-5 rounded-full transition-colors relative ${
                      permissions.can_run_night_audit ? 'bg-indigo-600' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                        permissions.can_run_night_audit ? 'right-0.5' : 'left-0.5'
                      }`}
                    />
                  </div>
                </div>

                {/* 6. can_manage_inventory */}
                <div
                  onClick={() => handleTogglePermission('can_manage_inventory')}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    permissions.can_manage_inventory
                      ? 'border-emerald-400 bg-emerald-50/50 shadow-xs'
                      : 'border-gray-200 bg-gray-50/50'
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs text-[#241912] flex items-center gap-1.5">
                      <BedDouble className="w-3.5 h-3.5 text-emerald-600" />
                      <span>can_manage_inventory</span>
                    </div>
                    <p className="text-[10px] text-[#786B61]">
                      Add physical rooms, change operational status, and manage amenities & gallery
                    </p>
                  </div>
                  <div
                    className={`w-10 h-5 rounded-full transition-colors relative ${
                      permissions.can_manage_inventory ? 'bg-emerald-600' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${
                        permissions.can_manage_inventory ? 'right-0.5' : 'left-0.5'
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  onClick={() => setSelectedStaff(null)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-[#43001F] hover:bg-[#2E0015] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save RBAC Privileges'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
