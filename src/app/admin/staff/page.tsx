'use client';

import { useState } from 'react';
import { repo } from '@/lib/db/repository';
import { StaffMember, StaffRole } from '@/types';
import { UserCog, ShieldCheck, Mail, Phone, Plus, Check } from 'lucide-react';

export default function StaffAdminPage() {
  const staff = repo.getStaff();

  const getRoleBadge = (role: StaffRole) => {
    switch (role) {
      case 'Super Admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Hotel Manager':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Front Desk':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Housekeeping':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'Accounts':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'Event Manager':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EFE3D6]">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-[#D8AD56]">
            ACCESS CONTROL & RBAC
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#241912] mt-0.5 flex items-center gap-2">
            <UserCog className="w-6 h-6 text-[#D8AD56]" />
            <span>Staff Accounts & Permissions</span>
          </h1>
          <p className="text-xs text-[#786B61] mt-0.5">
            Role-Based Access Control (RBAC) governing system privileges for front desk, managers, accounts, and housekeeping.
          </p>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl border border-[#D8AD56]/30 shadow-luxury overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F2] text-[#786B61] uppercase tracking-wider text-[10px] border-b border-[#EFE3D6]">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Staff Member</th>
                <th className="py-3.5 px-4 font-semibold">System Role</th>
                <th className="py-3.5 px-4 font-semibold">Email</th>
                <th className="py-3.5 px-4 font-semibold">Contact Phone</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">Last Session</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE3D6] text-[#241912]">
              {staff.map((s) => (
                <tr key={s.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-[#382216] flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#382216] text-[#D8AD56] flex items-center justify-center font-bold text-[10px]">
                        {s.full_name.charAt(0)}
                      </div>
                      <span>{s.full_name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getRoleBadge(s.role)}`}>
                      {s.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-[#786B61] font-mono">{s.email}</td>
                  <td className="py-3.5 px-4 font-mono">{s.phone}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E8F5E9] text-[#2E7D32]">
                      ACTIVE
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-[#786B61]">
                    {s.last_login ? new Date(s.last_login).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
