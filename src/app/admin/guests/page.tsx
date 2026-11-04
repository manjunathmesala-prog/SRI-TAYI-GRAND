'use client';

import { useState } from 'react';
import { repo } from '@/lib/db/repository';
import { Users, Search, Phone, Mail, MapPin, Award, Calendar } from 'lucide-react';

export default function GuestsAdminPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const guests = repo.getGuests();

  const filteredGuests = guests.filter((g) =>
    g.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.phone.includes(searchQuery) ||
    (g.email && g.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (g.city && g.city.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EFE3D6]">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-[#D8AD56]">
            CRM & DIRECTORY
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#241912] mt-0.5 flex items-center gap-2">
            <Users className="w-6 h-6 text-[#D8AD56]" />
            <span>Guest Profiles & Stays</span>
          </h1>
          <p className="text-xs text-[#786B61] mt-0.5">
            Maintain guest history, contact preferences, repeat visits, and operational loyalty records.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#786B61] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search guest name, phone, city..."
            className="w-full text-xs font-medium pl-9 pr-3 py-2.5 rounded-xl border border-[#EFE3D6] bg-white text-[#241912] focus:border-[#D8AD56] focus:outline-none shadow-sm"
          />
        </div>
      </div>

      {/* Guest Directory Cards / Table */}
      <div className="bg-white rounded-2xl border border-[#D8AD56]/30 shadow-luxury overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F2] text-[#786B61] uppercase tracking-wider text-[10px] border-b border-[#EFE3D6]">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Guest Name</th>
                <th className="py-3.5 px-4 font-semibold">Phone (WhatsApp)</th>
                <th className="py-3.5 px-4 font-semibold">Email</th>
                <th className="py-3.5 px-4 font-semibold">City / State</th>
                <th className="py-3.5 px-4 font-semibold">Total Stays</th>
                <th className="py-3.5 px-4 font-semibold">Member Since</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE3D6] text-[#241912]">
              {filteredGuests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-[#786B61]">
                    No guest profiles match your search.
                  </td>
                </tr>
              ) : (
                filteredGuests.map((g) => (
                  <tr key={g.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#382216] flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#FAF7F2] border border-[#EFE3D6] flex items-center justify-center text-[10px] font-bold text-[#D8AD56]">
                          {g.full_name.charAt(0)}
                        </div>
                        <span>{g.full_name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium">{g.phone}</td>
                    <td className="py-3.5 px-4 text-[#786B61]">{g.email || 'N/A'}</td>
                    <td className="py-3.5 px-4">
                      {g.city ? `${g.city}, ${g.state || ''}` : 'India'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#E8F5E9] text-[#2E7D32] inline-flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        <span>{g.total_stays} {g.total_stays === 1 ? 'Stay' : 'Stays'}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#786B61]">
                      {new Date(g.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
