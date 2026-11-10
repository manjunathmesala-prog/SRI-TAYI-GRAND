'use client';

import React from 'react';
import { Booking } from '@/types';
import { Printer, X, ShieldCheck, CheckCircle2, BedDouble, Calendar, User, Phone, MapPin } from 'lucide-react';

interface PrintGrcModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
}

export function PrintGrcModal({ isOpen, onClose, booking }: PrintGrcModalProps) {
  if (!isOpen || !booking) return null;

  const handlePrint = () => {
    window.print();
  };

  const todayFormatted = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date());

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Screen Container */}
      <div className="bg-white rounded-2xl border border-[#D8AD56]/40 max-w-3xl w-full shadow-2xl overflow-hidden my-auto print:m-0 print:p-0 print:border-none print:shadow-none print:max-w-none print:w-full">
        {/* Screen Action Bar (Hidden in Print) */}
        <div className="flex items-center justify-between p-4 bg-[#241912] text-white border-b border-[#D8AD56]/30 print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#D8AD56]" />
            <div>
              <h3 className="font-serif text-sm font-bold tracking-wide">
                Guest Registration Card (GRC) • Statutory Form C
              </h3>
              <p className="text-[11px] text-[#EFE3D6]/70">
                Official guest check-in declaration & counter signature document
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-[#D8AD56] hover:bg-[#b58e3e] text-[#241912] text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Registration Card</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable GRC Document Content */}
        <div className="p-6 sm:p-8 bg-white text-[#241912] print:p-4 print:text-black">
          {/* Hotel Letterhead */}
          <div className="border-b-2 border-[#241912] pb-4 mb-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#8D672F] print:text-gray-700">
                  HOTEL MANAGEMENT & STATUTORY GUEST LOG
                </span>
                <h1 className="font-serif text-2xl font-black text-[#241912] tracking-wide print:text-2xl">
                  SRI TAYI GRAND
                </h1>
                <p className="text-xs text-[#5D534A] mt-0.5 print:text-gray-600">
                  Near Clock Tower, Bypass Road, Kadiri, Sri Sathya Sai District, Andhra Pradesh &ndash; 515591
                </p>
                <p className="text-[11px] text-[#5D534A] print:text-gray-600">
                  Phone: <strong>+91 94401 25899</strong> | Email: <strong>stay@sritayigrand.com</strong> | Web: <strong>sritayigrand.com</strong>
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-[#FAF6EE] border border-[#D8AD56] text-[#241912] font-serif font-black text-xs uppercase tracking-wider rounded print:border-black print:bg-white">
                  GUEST REGISTRATION CARD (GRC)
                </span>
                <p className="text-[10px] font-mono font-bold text-[#786B61] mt-1">
                  GRC No: {booking.booking_reference}
                </p>
                <p className="text-[10px] text-[#786B61]">
                  Printed: {todayFormatted}
                </p>
              </div>
            </div>
          </div>

          {/* Section 1: Room & Stay Particulars */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 p-3 bg-[#FAF7F2] border border-[#EFE3D6] rounded-lg text-xs print:bg-white print:border-gray-300">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#786B61] block">Assigned Room</span>
              <span className="font-serif font-bold text-base text-[#241912]">
                Room {booking.assigned_room_number || 'TBD'}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#786B61] block">Category</span>
              <span className="font-bold text-[#241912]">{booking.category_name}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#786B61] block">Check-In Date</span>
              <span className="font-mono font-bold text-[#241912]">{booking.check_in_date} (12:00 PM)</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-[#786B61] block">Check-Out Date</span>
              <span className="font-mono font-bold text-[#241912]">{booking.check_out_date} (11:00 AM)</span>
            </div>
          </div>

          {/* Section 2: Statutory Guest Details Table */}
          <div className="mb-4">
            <h4 className="text-[11px] uppercase font-black tracking-wider text-[#8D672F] mb-2 flex items-center gap-1.5 print:text-black">
              <span>1. Guest Particulars (Form C Compliance)</span>
            </h4>
            <div className="border border-[#241912] rounded overflow-hidden text-xs">
              <table className="w-full border-collapse">
                <tbody>
                  <tr className="border-b border-gray-300">
                    <td className="p-2 font-bold bg-[#FAF7F2] w-1/4 border-r border-gray-300 print:bg-gray-100">Full Name</td>
                    <td className="p-2 font-bold text-sm w-1/4 border-r border-gray-300">{booking.guest_name}</td>
                    <td className="p-2 font-bold bg-[#FAF7F2] w-1/4 border-r border-gray-300 print:bg-gray-100">Mobile Phone</td>
                    <td className="p-2 font-mono font-bold w-1/4">{booking.guest_phone}</td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="p-2 font-bold bg-[#FAF7F2] border-r border-gray-300 print:bg-gray-100">Email Address</td>
                    <td className="p-2 border-r border-gray-300">{booking.guest_email || 'Not Provided'}</td>
                    <td className="p-2 font-bold bg-[#FAF7F2] border-r border-gray-300 print:bg-gray-100">Nationality</td>
                    <td className="p-2 font-bold">{booking.nationality || 'Indian'}</td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="p-2 font-bold bg-[#FAF7F2] border-r border-gray-300 print:bg-gray-100">Govt ID Type</td>
                    <td className="p-2 font-bold border-r border-gray-300">{booking.id_proof_type || 'Aadhaar Card'}</td>
                    <td className="p-2 font-bold bg-[#FAF7F2] border-r border-gray-300 print:bg-gray-100">Govt ID Number</td>
                    <td className="p-2 font-mono font-bold">{booking.id_proof_number || 'To be verified at counter'}</td>
                  </tr>
                  <tr className="border-b border-gray-300">
                    <td className="p-2 font-bold bg-[#FAF7F2] border-r border-gray-300 print:bg-gray-100">City / State of Origin</td>
                    <td className="p-2 border-r border-gray-300">{booking.city_of_origin || 'Kadiri, Andhra Pradesh'}</td>
                    <td className="p-2 font-bold bg-[#FAF7F2] border-r border-gray-300 print:bg-gray-100">Purpose of Visit</td>
                    <td className="p-2">{booking.purpose_of_visit || 'Pilgrimage / Temple Darshan'}</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold bg-[#FAF7F2] border-r border-gray-300 print:bg-gray-100">No. of Occupants</td>
                    <td className="p-2 border-r border-gray-300">
                      {booking.adults_count || 1} Adult(s), {booking.children_count || 0} Child(ren)
                    </td>
                    <td className="p-2 font-bold bg-[#FAF7F2] border-r border-gray-300 print:bg-gray-100">Keycard SN / UID</td>
                    <td className="p-2 font-mono">{booking.keycard_uid || 'RFID Issued'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Tariff & Settlement Particulars */}
          <div className="mb-4">
            <h4 className="text-[11px] uppercase font-black tracking-wider text-[#8D672F] mb-2 flex items-center gap-1.5 print:text-black">
              <span>2. Tariff & Financial Settlement</span>
            </h4>
            <div className="border border-[#241912] rounded overflow-hidden text-xs">
              <table className="w-full border-collapse">
                <tbody>
                  <tr className="border-b border-gray-300">
                    <td className="p-2 font-bold bg-[#FAF7F2] w-1/4 border-r border-gray-300 print:bg-gray-100">Room Rent Subtotal</td>
                    <td className="p-2 font-mono w-1/4 border-r border-gray-300">₹ {booking.subtotal_amount.toLocaleString('en-IN')}</td>
                    <td className="p-2 font-bold bg-[#FAF7F2] w-1/4 border-r border-gray-300 print:bg-gray-100">GST (12% CGST+SGST)</td>
                    <td className="p-2 font-mono w-1/4">₹ {booking.tax_amount.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold bg-[#FAF7F2] border-r border-gray-300 print:bg-gray-100">Total Stay Tariff</td>
                    <td className="p-2 font-mono font-bold text-sm border-r border-gray-300">₹ {booking.total_amount.toLocaleString('en-IN')}</td>
                    <td className="p-2 font-bold bg-[#FAF7F2] border-r border-gray-300 print:bg-gray-100">Advance Paid / Mode</td>
                    <td className="p-2 font-mono font-bold text-sm text-[#2E7D32]">
                      ₹ {booking.paid_amount.toLocaleString('en-IN')} ({booking.payment_method || 'counter'})
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Rules & Guest Declaration */}
          <div className="mb-6 p-3 bg-gray-50 border border-gray-300 rounded text-[10px] text-gray-700 leading-relaxed print:bg-white print:text-black print:border-gray-400">
            <h5 className="font-bold uppercase text-[10px] text-[#241912] mb-1 print:text-black">
              Guest Declaration & Hotel Terms (Sarais Act, 1867 & AP Police Norms):
            </h5>
            <ol className="list-decimal pl-4 space-y-0.5">
              <li>Check-out time is strictly <strong>11:00 AM IST</strong>. Extensions are subject to availability and extra tariff charges.</li>
              <li>Management shall not be held liable for any loss, theft, or damage of jewelry, money, or valuables not deposited in hotel safe.</li>
              <li>Smoking, consumption of alcohol in corridors/public areas, and prohibited illegal substances are strictly forbidden on hotel premises.</li>
              <li>Guests are financially liable for any physical damage or breakage to hotel room inventory, linen, or electronic fixtures.</li>
              <li>I solemnly declare that all personal and identification particulars stated above are true and accurate.</li>
            </ol>
          </div>

          {/* Section 5: Signature Blocks */}
          <div className="grid grid-cols-2 gap-8 pt-4 border-t border-gray-300">
            <div className="text-center pt-8 border-t-2 border-dashed border-gray-400">
              <p className="text-xs font-bold text-[#241912] uppercase tracking-wider">
                Guest Signature
              </p>
              <p className="text-[10px] text-[#786B61] mt-0.5">
                ({booking.guest_name})
              </p>
            </div>
            <div className="text-center pt-8 border-t-2 border-dashed border-gray-400">
              <p className="text-xs font-bold text-[#241912] uppercase tracking-wider">
                Front Desk Executive / Duty Manager
              </p>
              <p className="text-[10px] text-[#786B61] mt-0.5">
                Sri Tayi Grand, Kadiri
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
