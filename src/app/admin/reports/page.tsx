'use client';

import { useState } from 'react';
import { repo } from '@/lib/db/repository';
import { BarChart3, Download, Calendar, TrendingUp, DollarSign, BedDouble } from 'lucide-react';

export default function ReportsAdminPage() {
  const [selectedRange, setSelectedRange] = useState('Month');
  const bookings = repo.getBookings();
  const rooms = repo.getRooms();
  const payments = repo.getPayments();

  const totalBookings = bookings.length;
  const totalRevenue = bookings.filter((b) => b.status !== 'cancelled').reduce((sum, b) => sum + b.total_amount, 0);
  const collected = payments.filter((p) => p.status === 'successful').reduce((sum, p) => sum + p.amount, 0);
  const occupancy = rooms.length > 0 ? Math.round((rooms.filter((r) => r.operational_status === 'occupied').length / rooms.length) * 100) : 0;

  // Export CSV
  const handleExportCSV = () => {
    const headers = 'Booking Reference,Guest Name,Phone,Category,Check In,Check Out,Total,Status\n';
    const rows = bookings.map((b) =>
      `"${b.booking_reference}","${b.guest_name}","${b.guest_phone}","${b.category_name}","${b.check_in_date}","${b.check_out_date}",${b.total_amount},"${b.status}"`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sri_tayi_grand_bookings_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EFE3D6]">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-[#D8AD56]">
            FINANCE & ANALYTICS
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#241912] mt-0.5 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#D8AD56]" />
            <span>Reports & Financial Analytics</span>
          </h1>
          <p className="text-xs text-[#786B61] mt-0.5">
            Operational KPIs, occupancy rates, RevPAR, booking metrics, and official CSV exports.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2.5 rounded-xl bg-[#D8AD56] hover:bg-[#C69940] text-[#25150F] text-xs font-bold transition-colors flex items-center gap-2 shadow-sm"
        >
          <Download className="w-4 h-4" />
          <span>Export All Bookings (CSV)</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl border border-[#D8AD56]/30 p-5 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#786B61]">Cumulative Revenue</span>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-[#241912] mt-2">
            ₹ {totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-[#2E7D32] mt-1 font-semibold">{totalBookings} reservations recorded</div>
        </div>

        <div className="bg-white rounded-2xl border border-[#D8AD56]/30 p-5 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#786B61]">Total Collections</span>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-[#1565C0] mt-2">
            ₹ {collected.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-[#786B61] mt-1">Settled online & reception</div>
        </div>

        <div className="bg-white rounded-2xl border border-[#D8AD56]/30 p-5 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#786B61]">Occupancy Benchmark</span>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-[#382216] mt-2">
            {occupancy}%
          </div>
          <div className="text-xs text-[#786B61] mt-1">Based on 18 physical rooms</div>
        </div>

        <div className="bg-white rounded-2xl border border-[#D8AD56]/30 p-5 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#786B61]">Avg. Daily Rate (ADR)</span>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-[#D8AD56] mt-2">
            ₹ 3,499
          </div>
          <div className="text-xs text-[#786B61] mt-1">Across all room tiers</div>
        </div>
      </div>
    </div>
  );
}
