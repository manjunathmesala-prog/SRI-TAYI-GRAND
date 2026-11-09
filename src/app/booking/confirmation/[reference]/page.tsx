'use client';

import { LuxurySelect } from '@/components/ui/LuxurySelect';
import { use, useState, useEffect } from 'react';
import NextLink from 'next/link';
import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Booking } from '@/types';
import {
  CheckCircle2,
  Printer,
  ArrowRight,
  Building,
  Calendar,
  XCircle,
  AlertCircle,
  X,
  RefreshCw,
} from 'lucide-react';

interface ConfirmationPageProps {
  params: Promise<{ reference: string }>;
}

export default function ConfirmationPage({ params }: ConfirmationPageProps) {
  const resolvedParams = use(params);
  const reference = resolvedParams.reference;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!booking && reference) {
      fetch(`/api/bookings/verify?reference=${encodeURIComponent(reference)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.booking) {
            setBooking(data.booking);
          }
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  }, [booking, reference]);

  // Modals state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Change of travel plans');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [newCheckIn, setNewCheckIn] = useState(booking?.check_in_date || '');
  const [newCheckOut, setNewCheckOut] = useState(booking?.check_out_date || '');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <RefreshCw className="w-6 h-6 animate-spin text-[#D8AD56]" />
      </div>
    );
  }

  if (!booking) {
    notFound();
  }
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const handleCancelBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setCancelLoading(true);
    setCancelError(null);
    try {
      const res = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingReference: booking.booking_reference,
          reason: cancelReason,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to cancel booking');
      }
      setBooking((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
      setShowCancelModal(false);
    } catch (err: any) {
      setCancelError(err.message || 'Error processing cancellation');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleRescheduleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setRescheduleLoading(true);
    setRescheduleError(null);
    try {
      const res = await fetch('/api/bookings/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingReference: booking.booking_reference,
          newCheckInDate: newCheckIn,
          newCheckOutDate: newCheckOut,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to reschedule dates');
      }
      if (data.booking) {
        setBooking(data.booking);
      }
      setShowRescheduleModal(false);
    } catch (err: any) {
      setRescheduleError(err.message || 'Error processing reschedule');
    } finally {
      setRescheduleLoading(false);
    }
  };

  const isCancelled = booking.status === 'cancelled';
  const isConfirmed = booking.status === 'confirmed';

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F1E9]">
      <Header transparentInitially={false} />

      <main className="flex-grow pt-28 sm:pt-32 pb-24 print:pt-4 print:pb-4">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Confirmation Card */}
          <div className="bg-white rounded-3xl border border-[#D8AD56]/30 shadow-luxury overflow-hidden">
            {/* Header Success / Cancel Banner */}
            <div
              className={`p-8 sm:p-10 text-center relative overflow-hidden text-white ${
                isCancelled ? 'bg-[#3A1414]' : 'bg-[#20120B]'
              }`}
            >
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  isCancelled
                    ? 'bg-red-500/20 border border-red-400 text-red-300'
                    : 'bg-[#D8AD56]/20 border border-[#D8AD56] text-[#D8AD56]'
                }`}
              >
                {isCancelled ? <XCircle className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
              </div>
              <span
                className={`text-[11px] uppercase tracking-[0.25em] font-semibold block mb-1 ${
                  isCancelled ? 'text-red-300' : 'text-[#D8AD56]'
                }`}
              >
                {isCancelled ? 'Reservation Cancelled' : 'Reservation Confirmed'}
              </span>
              <h1 className="font-serif text-2xl sm:text-3xl font-normal text-white">
                {isCancelled ? `Booking Cancelled, ${booking.guest_name}` : `We Await Your Arrival, ${booking.guest_name}`}
              </h1>
              <p className="text-xs text-[#EFE3D6]/75 mt-2 max-w-sm mx-auto font-light">
                {isCancelled
                  ? 'This reservation is cancelled. Any eligible refund will be credited per hotel policy.'
                  : 'Your reservation at Sri Tayi Grand is confirmed. A copy of details has been dispatched to your mobile.'}
              </p>

              {/* Reference Badge */}
              <div className="mt-6 inline-block bg-[#2A180E] border border-[#D8AD56]/40 rounded-full px-6 py-2">
                <span className="text-[9px] uppercase tracking-[0.2em] text-[#D8AD56] block font-medium">
                  Reference Code
                </span>
                <span className="font-mono text-sm sm:text-base font-semibold text-white tracking-widest">
                  {booking.booking_reference}
                </span>
              </div>
            </div>

            {/* Stay Details */}
            <div className="p-7 sm:p-9 space-y-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2 pb-5 border-b border-[#F8F1E9]">
                <div>
                  <h2 className="font-serif text-xl font-medium text-[#241912]">
                    {booking.category_name}
                  </h2>
                  <div className="flex items-center gap-1.5 text-xs text-[#786B61] mt-1 font-light">
                    <Building className="w-3.5 h-3.5 text-[#D8AD56]" />
                    <span>Sri Tayi Grand • Kadiri, Andhra Pradesh</span>
                  </div>
                </div>

                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider ${
                    isCancelled
                      ? 'text-red-800 bg-red-100'
                      : 'text-[#2E7D32] bg-[#E8F5E9]'
                  }`}
                >
                  {booking.status}
                </span>
              </div>

              {/* Check-in & Check-out */}
              <div className="grid grid-cols-2 gap-4 bg-[#FAF7F2] p-5 rounded-2xl border border-[#EFE3D6]/70">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8C7A6B] block">
                    Check-In
                  </span>
                  <span className="font-serif text-base text-[#241912] block mt-1">
                    {booking.check_in_date}
                  </span>
                  <span className="text-xs text-[#786B61] font-light">From 2:00 PM</span>
                </div>

                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8C7A6B] block">
                    Check-Out
                  </span>
                  <span className="font-serif text-base text-[#241912] block mt-1">
                    {booking.check_out_date}
                  </span>
                  <span className="text-xs text-[#786B61] font-light">Until 11:00 AM</span>
                </div>
              </div>

              {/* Guest & Payment Summary */}
              <div className="space-y-3 text-xs text-[#786B61] font-light">
                <div className="flex justify-between">
                  <span>Primary Guest</span>
                  <span className="text-[#241912] font-medium">{booking.guest_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Occupancy</span>
                  <span className="text-[#241912] font-medium">{booking.adults_count} Guests</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Method</span>
                  <span className="text-[#241912] font-medium">
                    {booking.payment_method === 'pay_at_hotel' ? 'Pay upon arrival' : 'Online Paid'}
                  </span>
                </div>
                <div className="pt-3 border-t border-[#F8F1E9] flex justify-between text-base font-medium text-[#241912]">
                  <span>Total Amount</span>
                  <span className="font-serif text-lg">₹{booking.total_amount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-6 border-t border-[#F8F1E9] flex flex-wrap items-center justify-between gap-3 print:hidden">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrint}
                    className="px-4 py-2 rounded-full border border-[#D8AD56]/60 text-[#241912] text-xs font-medium uppercase tracking-wider hover:bg-[#FAF7F2] transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#D8AD56]" />
                    <span>Print Receipt</span>
                  </button>

                  {isConfirmed && (
                    <>
                      <button
                        onClick={() => setShowRescheduleModal(true)}
                        className="px-4 py-2 rounded-full border border-[#B18A4A] text-[#43001F] text-xs font-semibold uppercase tracking-wider hover:bg-[#FAF7F2] transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5 text-[#B18A4A]" />
                        <span>Reschedule</span>
                      </button>

                      <button
                        onClick={() => setShowCancelModal(true)}
                        className="px-4 py-2 rounded-full border border-red-300 text-red-700 text-xs font-semibold uppercase tracking-wider hover:bg-red-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5 text-red-600" />
                        <span>Cancel</span>
                      </button>
                    </>
                  )}
                </div>

                <NextLink
                  href="/"
                  className="px-6 py-2.5 rounded-full bg-[#43001F] hover:bg-[#2E0015] text-white text-xs font-medium uppercase tracking-wider transition-all duration-300 shadow-sm hover:shadow-lg flex items-center gap-1.5"
                >
                  <span>Return Home</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </NextLink>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* RESCHEDULE MODAL */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#D8AD56]/40 p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE3D6] pb-3">
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#D8AD56]">RESERVATION MODIFICATION</span>
                <h3 className="font-serif text-lg font-bold text-[#241912]">Reschedule Stay Dates</h3>
              </div>
              <button onClick={() => setShowRescheduleModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {rescheduleError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{rescheduleError}</span>
              </div>
            )}

            <form onSubmit={handleRescheduleBooking} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#382216] mb-1">New Check-In Date *</label>
                <input
                  type="date"
                  required
                  value={newCheckIn}
                  onChange={(e) => setNewCheckIn(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#EFE3D6] bg-[#FAF7F2] text-[#241912] focus:border-[#D8AD56] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#382216] mb-1">New Check-Out Date *</label>
                <input
                  type="date"
                  required
                  value={newCheckOut}
                  onChange={(e) => setNewCheckOut(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#EFE3D6] bg-[#FAF7F2] text-[#241912] focus:border-[#D8AD56] focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  onClick={() => setShowRescheduleModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rescheduleLoading}
                  className="px-5 py-2 rounded-xl bg-[#382216] text-[#D8AD56] font-semibold hover:bg-[#25150F] flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${rescheduleLoading ? 'animate-spin' : ''}`} />
                  <span>{rescheduleLoading ? 'Checking Availability...' : 'Confirm Reschedule'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANCEL RESERVATION MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-red-300 p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE3D6] pb-3">
              <div>
                <span className="text-[10px] uppercase font-semibold text-red-600">CONFIRM CANCELLATION</span>
                <h3 className="font-serif text-lg font-bold text-[#241912]">Cancel Reservation?</h3>
              </div>
              <button onClick={() => setShowCancelModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {cancelError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{cancelError}</span>
              </div>
            )}

            <p className="text-xs text-[#786B61] leading-relaxed">
              Are you sure you want to cancel booking <strong>{booking.booking_reference}</strong>? 
              This action will immediately release your reserved room.
            </p>

            <form onSubmit={handleCancelBooking} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#382216] mb-1">Reason for Cancellation</label>
                <LuxurySelect
                  size="md"
                  variant="admin"
                  value={cancelReason}
                  onChange={(val) => setCancelReason(String(val))}
                  options={[
                    { value: 'Change of travel plans', label: 'Change of travel plans' },
                    { value: 'Emergency or personal reasons', label: 'Emergency or personal reasons' },
                    { value: 'Booking dates entered incorrectly', label: 'Booking dates entered incorrectly' },
                    { value: 'Alternative accommodation arranged', label: 'Alternative accommodation arranged' },
                    { value: 'Other', label: 'Other' },
                  ]}
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  Keep Reservation
                </button>
                <button
                  type="submit"
                  disabled={cancelLoading}
                  className="px-5 py-2 rounded-xl bg-red-700 text-white font-semibold hover:bg-red-800 flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <XCircle className={`w-3.5 h-3.5 ${cancelLoading ? 'animate-spin' : ''}`} />
                  <span>{cancelLoading ? 'Cancelling...' : 'Confirm Cancellation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
