'use client';

import React, { useState } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Search, Calendar, BedDouble, ShieldCheck, ArrowRight, HelpCircle } from 'lucide-react';

export default function BookingPortalPage() {
  const router = useRouter();
  const [bookingRef, setBookingRef] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanRef = bookingRef.trim().toUpperCase();
    if (!cleanRef) {
      setErrorMsg('Please enter your Booking Reference number (e.g. STG-20261109-1234)');
      return;
    }
    setErrorMsg('');
    router.push(`/booking/confirmation/${encodeURIComponent(cleanRef)}`);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col justify-between">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12 sm:py-16">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="text-xs uppercase tracking-[0.25em] font-semibold text-[#D8AD56]">
            GUEST SERVICES & RESERVATIONS
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#241912] mt-2 mb-3">
            Manage Your Reservation
          </h1>
          <p className="text-sm text-[#786B61] leading-relaxed">
            Look up your booking to review confirmation details, reschedule dates, cancel your stay, or download your digital keycard pass.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Box 1: Find Existing Reservation */}
          <div className="p-6 sm:p-8 rounded-2xl bg-white border border-[#EFE3D6] shadow-md hover:shadow-lg transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-[#D8AD56]/40 flex items-center justify-center text-[#D8AD56] mb-4">
              <Search className="w-5 h-5" />
            </div>
            <h2 className="font-serif text-xl font-bold text-[#241912] mb-1">
              Find Existing Booking
            </h2>
            <p className="text-xs text-[#786B61] mb-6">
              Enter the unique booking reference sent to your mobile or email.
            </p>

            <form onSubmit={handleLookup} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#241912] block mb-1.5 uppercase tracking-wider">
                  Booking Reference Number
                </label>
                <input
                  type="text"
                  value={bookingRef}
                  onChange={(e) => {
                    setBookingRef(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="e.g. STG-20261109-5431"
                  className="w-full text-sm font-mono uppercase px-4 py-3 rounded-xl border border-stone-300 focus:outline-none focus:border-[#D8AD56] focus:ring-2 focus:ring-[#D8AD56]/20 transition-all text-[#241912] placeholder:text-stone-400"
                />
                {errorMsg && (
                  <p className="text-xs text-rose-600 mt-1.5 font-medium">{errorMsg}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 px-6 rounded-xl bg-[#241912] hover:bg-[#382216] text-[#D8AD56] font-semibold text-xs tracking-wider uppercase transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                <span>Find Reservation</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-stone-100 flex items-start gap-2.5 text-xs text-[#786B61]">
              <HelpCircle className="w-4 h-4 text-[#D8AD56] shrink-0 mt-0.5" />
              <span>
                Can&apos;t find your booking reference? Call front desk at{' '}
                <a href="tel:08494223379" className="font-bold text-[#241912] hover:underline">
                  084942 23379
                </a>
              </span>
            </div>
          </div>

          {/* Box 2: Plan a New Stay */}
          <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-[#FAF7F2] to-amber-50/50 border border-[#D8AD56]/30 shadow-md hover:shadow-lg transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-[#241912] flex items-center justify-center text-[#D8AD56] mb-4 shadow-xs">
              <BedDouble className="w-5 h-5" />
            </div>
            <h2 className="font-serif text-xl font-bold text-[#241912] mb-1">
              Reserve a New Stay
            </h2>
            <p className="text-xs text-[#786B61] mb-6">
              Experience the best hospitality in Kadiri. Direct bookings include guaranteed lowest rates and flexible check-in.
            </p>

            <div className="space-y-3 mb-6 text-xs text-[#241912]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Zero Booking Fees & Transparent 12% GST</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Double, Four-Bed & Executive Suite Options</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>24/7 Power Backup, Lift & Temple Proximity</span>
              </div>
            </div>

            <NextLink
              href="/rooms"
              className="w-full py-3 px-6 rounded-xl bg-[#D8AD56] hover:bg-[#C49B45] text-[#241912] font-semibold text-xs tracking-wider uppercase transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <span>Explore Rooms & Check Rates</span>
              <ArrowRight className="w-4 h-4" />
            </NextLink>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
