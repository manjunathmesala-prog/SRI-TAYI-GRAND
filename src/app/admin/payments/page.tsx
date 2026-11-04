'use client';

import { useState } from 'react';
import { repo } from '@/lib/db/repository';
import { CreditCard, Search, ArrowUpRight, CheckCircle2, ShieldCheck, Download } from 'lucide-react';

export default function PaymentsAdminPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const payments = repo.getPayments();

  const totalCollected = payments
    .filter((p) => p.status === 'successful')
    .reduce((sum, p) => sum + p.amount, 0);

  const onlineCollected = payments
    .filter((p) => p.status === 'successful' && p.payment_method === 'online')
    .reduce((sum, p) => sum + p.amount, 0);

  const offlineCollected = totalCollected - onlineCollected;

  const filteredPayments = payments.filter((p) =>
    p.payment_reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.booking_reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.guest_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.gateway_payment_id && p.gateway_payment_id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto" key={refreshKey}>
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EFE3D6]">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-[#D8AD56]">
            ACCOUNTS & REVENUE
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#241912] mt-0.5 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-[#D8AD56]" />
            <span>Payments & Financial Ledger</span>
          </h1>
          <p className="text-xs text-[#786B61] mt-0.5">
            Audit-safe tracking of Razorpay online transactions, reception cash/UPI settlements, and refunds.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#786B61] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search payment ref, booking, guest..."
            className="w-full text-xs font-medium pl-9 pr-3 py-2.5 rounded-xl border border-[#EFE3D6] bg-white text-[#241912] focus:border-[#D8AD56] focus:outline-none shadow-sm"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-[#D8AD56]/30 p-5 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#786B61]">Total Collections</span>
          <div className="font-serif text-3xl font-bold text-[#241912] mt-2">
            ₹ {totalCollected.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-[#2E7D32] mt-1 font-semibold">100% verified ledger records</div>
        </div>

        <div className="bg-white rounded-2xl border border-[#D8AD56]/30 p-5 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#786B61]">Razorpay Online</span>
          <div className="font-serif text-3xl font-bold text-[#1565C0] mt-2">
            ₹ {onlineCollected.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-[#786B61] mt-1">UPI, Cards, Net Banking</div>
        </div>

        <div className="bg-white rounded-2xl border border-[#D8AD56]/30 p-5 shadow-sm">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-[#786B61]">Reception Front Desk</span>
          <div className="font-serif text-3xl font-bold text-[#E65100] mt-2">
            ₹ {offlineCollected.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-[#786B61] mt-1">Cash, Terminal UPI & POS</div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-2xl border border-[#D8AD56]/30 shadow-luxury overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F2] text-[#786B61] uppercase tracking-wider text-[10px] border-b border-[#EFE3D6]">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Payment Ref</th>
                <th className="py-3.5 px-4 font-semibold">Booking Ref</th>
                <th className="py-3.5 px-4 font-semibold">Guest Name</th>
                <th className="py-3.5 px-4 font-semibold">Method</th>
                <th className="py-3.5 px-4 font-semibold">Gateway ID</th>
                <th className="py-3.5 px-4 font-semibold">Amount</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold">Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE3D6] text-[#241912]">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[#786B61]">
                    No payment records found.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#382216]">
                      {p.payment_reference}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-[#786B61]">
                      {p.booking_reference}
                    </td>
                    <td className="py-3.5 px-4 font-semibold">{p.guest_name}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-800">
                        {p.payment_method}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[10px] text-[#786B61]">
                      {p.gateway_payment_id || 'Cash/Desk'}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-sm text-[#241912]">
                      ₹ {p.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#E8F5E9] text-[#2E7D32]">
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[#786B61]">
                      {new Date(p.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
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
