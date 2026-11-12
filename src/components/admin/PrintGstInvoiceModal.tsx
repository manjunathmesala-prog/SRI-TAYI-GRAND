'use client';

import React from 'react';
import Image from 'next/image';
import { Booking, FolioCharge } from '@/types';
import { Printer, X, CheckCircle, ShieldCheck } from 'lucide-react';

interface PrintGstInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  folioCharges?: FolioCharge[];
}

// Convert numbers to Indian Rupees in words
function numberToWords(num: number): string {
  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ',
    'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ',
    'Seventeen ', 'Eighteen ', 'Nineteen ',
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = Math.floor(Math.abs(num));
  if (n === 0) return 'Rupees Zero Only';

  function convertGroup(val: number): string {
    let str = '';
    if (val > 99) {
      str += a[Math.floor(val / 100)] + 'Hundred ';
      val %= 100;
    }
    if (val > 19) {
      str += b[Math.floor(val / 10)] + (val % 10 ? ' ' + a[val % 10] : ' ');
    } else if (val > 0) {
      str += a[val];
    }
    return str;
  }

  let result = '';
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const remaining = n % 1000;

  if (crore > 0) result += convertGroup(crore) + 'Crore ';
  if (lakh > 0) result += convertGroup(lakh) + 'Lakh ';
  if (thousand > 0) result += convertGroup(thousand) + 'Thousand ';
  if (remaining > 0) result += convertGroup(remaining);

  return 'Rupees ' + result.trim() + ' Only';
}

export function PrintGstInvoiceModal({
  isOpen,
  onClose,
  booking,
  folioCharges = [],
}: PrintGstInvoiceModalProps) {
  if (!isOpen || !booking) return null;

  // SAC classification
  const getSacCode = (category: string) => {
    switch (category) {
      case 'extra_bed':
        return '996311';
      case 'laundry':
        return '999799';
      case 'room_service':
        return '996331';
      case 'late_checkout':
      case 'early_checkin':
        return '996313';
      default:
        return '999799';
    }
  };

  // Base stay room calculations
  const baseRoomTariff = Number(booking.room_charges_amount || booking.subtotal_amount || 0);
  const taxAmount = Number(booking.tax_amount || 0);
  const roomCgst = Math.round((taxAmount / 2) * 100) / 100;
  const roomSgst = Math.round((taxAmount - roomCgst) * 100) / 100;
  const roomTotal = Math.round((baseRoomTariff + taxAmount) * 100) / 100;

  // Filter charges for this booking
  const charges = folioCharges.filter(
    (c) => c.booking_id === booking.id || c.booking_reference === booking.booking_reference
  );

  // Compute grand totals
  const totalTaxable =
    baseRoomTariff + charges.reduce((acc, c) => acc + (c.amount || 0), 0);
  const totalCgst =
    roomCgst + charges.reduce((acc, c) => acc + (c.tax_amount ? c.tax_amount / 2 : 0), 0);
  const totalSgst =
    roomSgst + charges.reduce((acc, c) => acc + (c.tax_amount ? c.tax_amount / 2 : 0), 0);
  const grandTotal = Math.round((totalTaxable + totalCgst + totalSgst) * 100) / 100;

  const totalPaid = booking.paid_amount || 0;
  const balanceDue = Math.max(0, Math.round((grandTotal - totalPaid) * 100) / 100);
  const isSettled = balanceDue <= 0 || booking.payment_status === 'successful';

  const invoiceNo = `INV-STG-${booking.booking_reference.replace(/^TG-|^STG-/, '')}`;
  const invoiceDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl border border-[#D8AD56]/40 shadow-2xl max-w-4xl w-full max-h-[94vh] overflow-y-auto print:max-h-none print:overflow-visible print:border-none print:shadow-none print:w-full">
        {/* Modal Controls Bar (Hidden during Print) */}
        <div className="print:hidden flex items-center justify-between p-4 bg-[#FAF7F2] border-b border-[#EFE3D6] sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-sm text-[#241912]">
              Print GST Tax Invoice & Guest Folio
            </span>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[#382216] text-[#D8AD56]">
              {booking.booking_reference}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-[#382216] hover:bg-[#25150F] text-[#D8AD56] text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Tax Invoice (A4)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE INVOICE BODY */}
        <div className="p-6 sm:p-8 space-y-6 text-[#241912] font-sans print:p-8 print:text-black">
          {/* Header & Luxury Hotel Branding */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-[#382216] pb-5">
            <div className="flex items-center gap-3">
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0">
                <Image
                  src="/images/hotel/tayi-grand-logo.png"
                  alt="Sri Tayi Grand Emblem"
                  width={80}
                  height={80}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
              <div>
                <h1 className="font-serif text-2xl sm:text-3xl font-extrabold tracking-wide text-[#382216] uppercase">
                  SRI TAYI GRAND
                </h1>
                <p className="text-[11px] font-semibold text-[#786B61] tracking-wider uppercase">
                  Luxury Accommodation & Convention Hall &bull; Kadiri
                </p>
                <p className="text-[11px] text-[#4A3E36] mt-1 leading-relaxed max-w-md">
                  Opp. Girls High School, Bypass Road, Kadiri – 515591, Anantapur Dist., Andhra Pradesh
                </p>
                <div className="flex flex-wrap gap-x-3 text-[10px] text-[#786B61] mt-0.5 font-mono">
                  <span><strong>GSTIN:</strong> 37AAAAA0000A1Z5</span>
                  <span>&bull;</span>
                  <span><strong>Phone:</strong> 084942 23379</span>
                  <span>&bull;</span>
                  <span><strong>Email:</strong> info@sritayigrand.com</span>
                </div>
              </div>
            </div>

            <div className="text-right sm:border-l sm:border-[#EFE3D6] sm:pl-5 space-y-1">
              <span className="inline-block px-3 py-1 rounded bg-[#382216] text-[#D8AD56] font-serif font-bold text-xs uppercase tracking-wider">
                TAX INVOICE / GUEST FOLIO
              </span>
              <p className="text-[10px] text-[#786B61] italic">Original for Recipient</p>
              <div className="text-xs pt-1">
                <div>Invoice No: <strong className="font-mono text-[#382216]">{invoiceNo}</strong></div>
                <div>Invoice Date: <strong>{invoiceDate}</strong></div>
                <div>Booking Ref: <strong className="font-mono">{booking.booking_reference}</strong></div>
                <div>Allocated Room: <strong className="font-bold text-[#D8AD56] bg-[#382216] px-1.5 py-0.2 rounded text-[11px]">Room {booking.assigned_room_number || booking.room_number || 'Standard'}</strong></div>
              </div>
            </div>
          </div>

          {/* Guest Details & Stay Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-[#FAF7F2] p-4 rounded-xl border border-[#EFE3D6] print:bg-white print:border-gray-300">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#D8AD56] tracking-wider block">
                Guest Details
              </span>
              <div className="font-serif font-bold text-base text-[#241912]">{booking.guest_name}</div>
              <div>Phone: <span className="font-mono">{booking.guest_phone}</span></div>
              {booking.guest_email && <div>Email: <span>{booking.guest_email}</span></div>}
              <div>City / State: <strong>{booking.city_of_origin || 'Andhra Pradesh, India'}</strong></div>
              <div>Nationality: <strong>{booking.nationality || 'Indian'}</strong></div>
              <div>
                Govt ID Proof: <strong>{booking.id_proof_type || 'Aadhaar Card'}</strong> &bull; <span className="font-mono">{booking.id_proof_number || 'Verified at Desk'}</span>
              </div>
            </div>

            <div className="space-y-1 sm:text-right">
              <span className="text-[10px] uppercase font-bold text-[#D8AD56] tracking-wider block">
                Stay Particulars
              </span>
              <div>Room Category: <strong>{booking.category_name}</strong></div>
              <div>
                Check-In Date: <strong>{booking.check_in_date}</strong> {booking.checked_in_at ? `(${new Date(booking.checked_in_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })})` : '(12:00 PM)'}
              </div>
              <div>
                Check-Out Date: <strong>{booking.check_out_date}</strong> {booking.checked_out_at ? `(${new Date(booking.checked_out_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })})` : '(11:00 AM)'}
              </div>
              <div>Occupancy: <strong>{booking.adults_count || 2} Adults{booking.children_count ? `, ${booking.children_count} Children` : ''}</strong></div>
              <div>Purpose of Visit: <strong>{booking.purpose_of_visit || 'Pilgrimage / Temple Darshan'}</strong></div>
              <div>Source: <strong>{booking.booking_source === 'walk_in_qr' ? 'Walk-In QR Counter' : (booking.booking_source === 'front_desk_manual' ? 'Front Desk Walk-In' : 'Online Direct')}</strong></div>
            </div>
          </div>

          {/* Itemized GST Charges Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-[#382216]/30">
              <thead className="bg-[#382216] text-[#D8AD56] uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">#</th>
                  <th className="py-2.5 px-3 font-semibold">Description / Particulars</th>
                  <th className="py-2.5 px-3 font-semibold text-center">SAC Code</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Taxable Val (₹)</th>
                  <th className="py-2.5 px-3 font-semibold text-right">CGST 2.5% (₹)</th>
                  <th className="py-2.5 px-3 font-semibold text-right">SGST 2.5% (₹)</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Line Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE3D6] text-[#241912] print:divide-gray-300">
                {/* 1. Room Accommodation */}
                <tr className="hover:bg-[#FAF7F2]">
                  <td className="py-3 px-3 font-mono font-bold">1</td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-sm">Room Accommodation Tariff</div>
                    <div className="text-[10px] text-[#786B61]">
                      {booking.category_name} &bull; Room {booking.assigned_room_number || 'Standard'} ({booking.check_in_date} to {booking.check_out_date})
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono text-center">996311</td>
                  <td className="py-3 px-3 text-right font-mono">₹ {baseRoomTariff.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="py-3 px-3 text-right font-mono">₹ {roomCgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="py-3 px-3 text-right font-mono">₹ {roomSgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className="py-3 px-3 text-right font-mono font-bold">₹ {roomTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>

                {/* 2. Folio Incidentals */}
                {charges.map((charge, idx) => {
                  const sac = getSacCode(charge.category);
                  const cgst = Math.round((charge.tax_amount / 2) * 100) / 100;
                  const sgst = Math.round((charge.tax_amount - cgst) * 100) / 100;

                  return (
                    <tr key={charge.id} className="hover:bg-[#FAF7F2]">
                      <td className="py-3 px-3 font-mono font-bold">{idx + 2}</td>
                      <td className="py-3 px-3">
                        <div className="font-semibold">{charge.description}</div>
                        <div className="text-[10px] text-[#786B61] capitalize">
                          Category: {charge.category.replace('_', ' ')} &bull; Posted by {charge.posted_by}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-center">{sac}</td>
                      <td className="py-3 px-3 text-right font-mono">₹ {charge.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-3 text-right font-mono">₹ {cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-3 text-right font-mono">₹ {sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold">₹ {charge.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  );
                })}
              </tbody>

              <tfoot className="bg-[#FAF7F2] font-semibold text-xs border-t-2 border-[#382216] print:bg-white">
                <tr>
                  <td colSpan={3} className="py-2.5 px-3 text-right uppercase text-[11px] font-bold">
                    Subtotals:
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    ₹ {totalTaxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    ₹ {totalCgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    ₹ {totalSgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-sm text-[#382216]">
                    ₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Amount In Words & Financial Settlement Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start pt-2">
            <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#EFE3D6] text-xs space-y-2 print:bg-white print:border-gray-300">
              <span className="text-[10px] font-bold uppercase text-[#786B61] block">
                Total Amount in Words:
              </span>
              <p className="font-serif font-bold text-sm text-[#382216] italic">
                {numberToWords(grandTotal)}
              </p>
              <div className="text-[10px] text-[#786B61] pt-1 border-t border-[#EFE3D6] leading-relaxed">
                <strong>Statutory Notes:</strong> Rates include 5% Goods and Services Tax (2.5% CGST + 2.5% SGST). Computer generated Tax Invoice in full compliance with the Andhra Pradesh Goods and Services Tax Rules.
              </div>
            </div>

            {/* Payment Summary Box */}
            <div className="p-3.5 rounded-xl border border-[#D8AD56] bg-white text-xs space-y-2 shadow-xs">
              <div className="flex justify-between items-center text-sm font-bold text-[#241912]">
                <span>Grand Total Folio Bill:</span>
                <span className="font-mono">₹ {grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-[#2E7D32]">
                <span>Amount Paid:</span>
                <span className="font-mono font-bold">₹ {totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-700">
                <span>Payment Method:</span>
                <span className="uppercase font-bold">{booking.payment_method || 'CASH'}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-extrabold pt-2 border-t border-[#EFE3D6]">
                <span>Balance Due:</span>
                <span className={balanceDue > 0 ? 'text-red-600 font-mono' : 'text-green-700 font-mono'}>
                  {balanceDue > 0 ? `₹ ${balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹ 0.00 (Fully Settled)'}
                </span>
              </div>

              {/* Settlement Stamp Badge */}
              <div className="pt-2 text-center">
                {isSettled ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-[11px] font-extrabold tracking-wider uppercase">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>PAID & SETTLED</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-[11px] font-extrabold tracking-wider uppercase">
                    <span>PAY AT HOTEL / DUE</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Statutory Signatory & Seal */}
          <div className="pt-8 flex flex-col sm:flex-row justify-between items-end gap-6 text-xs border-t border-[#EFE3D6] print:pt-6">
            <div className="text-[10px] text-[#786B61] space-y-1">
              <div>&bull; Standard Check-in: 12:00 PM | Check-out: 11:00 AM</div>
              <div>&bull; Subject to Kadiri, Anantapur District jurisdiction</div>
              <div>&bull; Thank you for choosing Sri Tayi Grand. Have a peaceful stay!</div>
            </div>

            <div className="text-center sm:text-right space-y-8">
              <div className="text-[11px] font-bold text-[#382216]">
                For <strong>SRI TAYI GRAND</strong>
              </div>
              <div className="border-t border-[#382216] pt-1 px-6 text-[10px] text-[#786B61] inline-block">
                Authorized Signatory / Front Desk Manager
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
