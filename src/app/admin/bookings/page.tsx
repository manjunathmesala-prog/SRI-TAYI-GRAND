'use client';

import { useState } from 'react';
import { repo } from '@/lib/db/repository';
import { Booking, BookingStatus } from '@/types';
import {
  CalendarCheck,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Eye,
  CreditCard,
  X,
  Phone,
  Mail,
  Printer,
} from 'lucide-react';

export default function BookingsAdminPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const bookings = repo.getBookings();
  const rooms = repo.getRooms();

  const filteredBookings = bookings.filter((b) => {
    if (activeTab !== 'all' && b.status !== activeTab) return false;
    if (
      searchQuery &&
      !b.guest_name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !b.booking_reference.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !b.guest_phone.includes(searchQuery)
    ) {
      return false;
    }
    return true;
  });

  const handleUpdateStatus = (bookingRef: string, status: BookingStatus) => {
    repo.updateBookingStatus(bookingRef, status);
    if (selectedBooking && selectedBooking.booking_reference === bookingRef) {
      setSelectedBooking({ ...selectedBooking, status });
    }
    setRefreshKey((k) => k + 1);
  };

  const tabs = [
    { label: 'All Bookings', key: 'all', count: bookings.length },
    { label: 'Confirmed', key: 'confirmed', count: bookings.filter((b) => b.status === 'confirmed').length },
    { label: 'In-House (Checked-In)', key: 'checked_in', count: bookings.filter((b) => b.status === 'checked_in').length },
    { label: 'Completed (Checked-Out)', key: 'checked_out', count: bookings.filter((b) => b.status === 'checked_out').length },
    { label: 'Pending', key: 'pending', count: bookings.filter((b) => b.status === 'pending').length },
    { label: 'Cancelled', key: 'cancelled', count: bookings.filter((b) => b.status === 'cancelled').length },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto" key={refreshKey}>
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EFE3D6]">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-[#D8AD56]">
            RESERVATION DIRECTORY
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#241912] mt-0.5 flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-[#D8AD56]" />
            <span>Booking Management</span>
          </h1>
          <p className="text-xs text-[#786B61] mt-0.5">
            View, search, filter, and manage all guest reservations, payments, and room allocations.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#786B61] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reference, guest, or phone..."
            className="w-full text-xs font-medium pl-9 pr-3 py-2.5 rounded-xl border border-[#EFE3D6] bg-white text-[#241912] focus:border-[#D8AD56] focus:outline-none shadow-sm"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === tab.key
                ? 'bg-[#382216] text-[#D8AD56] shadow-sm'
                : 'bg-white text-[#786B61] hover:text-[#241912] border border-[#EFE3D6]'
            }`}
          >
            <span>{tab.label}</span>
            <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-black/10">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-2xl border border-[#D8AD56]/30 shadow-luxury overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F2] text-[#786B61] uppercase tracking-wider text-[10px] border-b border-[#EFE3D6]">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Reference</th>
                <th className="py-3.5 px-4 font-semibold">Guest</th>
                <th className="py-3.5 px-4 font-semibold">Category</th>
                <th className="py-3.5 px-4 font-semibold">Dates</th>
                <th className="py-3.5 px-4 font-semibold">Room Assigned</th>
                <th className="py-3.5 px-4 font-semibold">Total</th>
                <th className="py-3.5 px-4 font-semibold">Payment</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE3D6] text-[#241912]">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#786B61]">
                    No bookings found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#382216]">
                      {b.booking_reference}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold">{b.guest_name}</div>
                      <div className="text-[10px] text-[#786B61]">{b.guest_phone}</div>
                    </td>
                    <td className="py-3.5 px-4">{b.category_name}</td>
                    <td className="py-3.5 px-4">
                      <div>{b.check_in_date}</div>
                      <div className="text-[10px] text-[#786B61]">to {b.check_out_date}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {b.assigned_room_number ? (
                        <span className="px-2 py-0.5 rounded bg-[#FAF7F2] border border-[#EFE3D6] font-bold text-[#241912]">
                          Room {b.assigned_room_number}
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#E65100] italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-semibold">
                      ₹ {b.total_amount.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        b.payment_status === 'successful'
                          ? 'bg-[#E8F5E9] text-[#2E7D32]'
                          : b.payment_status === 'pay_at_hotel'
                          ? 'bg-[#FFF3E0] text-[#E65100]'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {b.payment_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        b.status === 'checked_in'
                          ? 'bg-[#E8F5E9] text-[#2E7D32]'
                          : b.status === 'confirmed'
                          ? 'bg-[#E3F2FD] text-[#1565C0]'
                          : b.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedBooking(b)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#FAF7F2] hover:bg-[#EFE3D6] text-xs font-semibold text-[#382216] transition-colors inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Manage</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* BOOKING DETAILS & MANAGEMENT MODAL */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#D8AD56]/40 p-6 sm:p-7 max-w-xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#EFE3D6] pb-3">
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#D8AD56]">RESERVATION DETAIL</span>
                <h3 className="font-serif text-lg font-bold text-[#241912]">
                  {selectedBooking.booking_reference}
                </h3>
              </div>
              <button onClick={() => setSelectedBooking(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-[#FAF7F2] space-y-1">
                <span className="text-[10px] uppercase font-semibold text-[#786B61] block">Guest</span>
                <div className="font-bold text-sm text-[#241912]">{selectedBooking.guest_name}</div>
                <div>{selectedBooking.guest_phone}</div>
                <div>{selectedBooking.guest_email}</div>
              </div>

              <div className="p-3 rounded-lg bg-[#FAF7F2] space-y-1">
                <span className="text-[10px] uppercase font-semibold text-[#786B61] block">Stay</span>
                <div className="font-bold text-sm text-[#241912]">{selectedBooking.category_name}</div>
                <div>{selectedBooking.check_in_date} to {selectedBooking.check_out_date}</div>
                <div>Assigned: <strong>{selectedBooking.assigned_room_number ? `Room ${selectedBooking.assigned_room_number}` : 'None'}</strong></div>
              </div>
            </div>

            {/* Financials Breakdown */}
            <div className="p-3 rounded-lg border border-[#EFE3D6] text-xs space-y-1">
              <div className="flex justify-between">
                <span>Room Subtotal:</span>
                <span>₹ {selectedBooking.subtotal_amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span>GST Taxes (12%):</span>
                <span>₹ {selectedBooking.tax_amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-[#241912] pt-2 border-t border-[#EFE3D6]">
                <span>Total Folio Amount:</span>
                <span>₹ {selectedBooking.total_amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-[#2E7D32]">
                <span>Paid Amount:</span>
                <span>₹ {selectedBooking.paid_amount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Status Change Buttons */}
            <div>
              <span className="text-[11px] uppercase font-semibold text-[#786B61] block mb-2">
                Operational Status Actions
              </span>
              <div className="flex flex-wrap gap-2">
                {selectedBooking.status !== 'confirmed' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedBooking.booking_reference, 'confirmed')}
                    className="px-3 py-1.5 rounded-lg bg-[#E3F2FD] text-[#1565C0] text-xs font-semibold hover:bg-[#BBDEFB]"
                  >
                    Mark Confirmed
                  </button>
                )}
                {selectedBooking.status !== 'checked_in' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedBooking.booking_reference, 'checked_in')}
                    className="px-3 py-1.5 rounded-lg bg-[#E8F5E9] text-[#2E7D32] text-xs font-semibold hover:bg-[#C8E6C9]"
                  >
                    Mark Checked-In
                  </button>
                )}
                {selectedBooking.status !== 'checked_out' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedBooking.booking_reference, 'checked_out')}
                    className="px-3 py-1.5 rounded-lg bg-[#F3E5F5] text-[#6A1B9A] text-xs font-semibold hover:bg-[#E1BEE7]"
                  >
                    Mark Checked-Out
                  </button>
                )}
                {selectedBooking.status !== 'cancelled' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedBooking.booking_reference, 'cancelled')}
                    className="px-3 py-1.5 rounded-lg bg-red-100 text-red-800 text-xs font-semibold hover:bg-red-200"
                  >
                    Cancel Booking
                  </button>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-[#EFE3D6] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="px-4 py-2 rounded-lg bg-[#382216] text-[#EFE3D6] text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
