'use client';

import { use } from 'react';
import NextLink from 'next/link';
import { notFound } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { repo } from '@/lib/db/repository';
import {
  CheckCircle2,
  Printer,
  ArrowRight,
  Building,
} from 'lucide-react';

interface ConfirmationPageProps {
  params: Promise<{ reference: string }>;
}

export default function ConfirmationPage({ params }: ConfirmationPageProps) {
  const resolvedParams = use(params);
  const reference = resolvedParams.reference;

  const booking = repo.getBookingByReference(reference);
  if (!booking) {
    notFound();
  }

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F1E9]">
      <Header transparentInitially={false} />

      <main className="flex-grow pt-28 sm:pt-32 pb-24 print:pt-4 print:pb-4">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Confirmation Card */}
          <div className="bg-white rounded-3xl border border-[#D8AD56]/30 shadow-luxury overflow-hidden">
            {/* Header Success Banner */}
            <div className="bg-[#20120B] text-white p-8 sm:p-10 text-center relative overflow-hidden">
              <div className="w-14 h-14 rounded-full bg-[#D8AD56]/20 border border-[#D8AD56] flex items-center justify-center mx-auto mb-4 text-[#D8AD56]">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <span className="text-[11px] uppercase tracking-[0.25em] font-semibold text-[#D8AD56] block mb-1">
                Reservation Confirmed
              </span>
              <h1 className="font-serif text-2xl sm:text-3xl font-normal text-white">
                We Await Your Arrival, {booking.guest_name}
              </h1>
              <p className="text-xs text-[#EFE3D6]/75 mt-2 max-w-sm mx-auto font-light">
                Your reservation at Sri Tayi Grand is confirmed. A copy of details has been dispatched to your mobile.
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

                <span className="text-xs font-medium text-[#2E7D32] bg-[#E8F5E9] px-3 py-1 rounded-full uppercase tracking-wider">
                  Confirmed
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
              <div className="pt-6 border-t border-[#F8F1E9] flex items-center justify-between gap-4 print:hidden">
                <button
                  onClick={handlePrint}
                  className="px-5 py-2.5 rounded-full border border-[#D8AD56]/60 text-[#241912] text-xs font-medium uppercase tracking-wider hover:bg-[#FAF7F2] transition-colors flex items-center gap-2"
                >
                  <Printer className="w-3.5 h-3.5 text-[#D8AD56]" />
                  <span>Print Receipt</span>
                </button>

                <NextLink
                  href="/"
                  className="px-6 py-2.5 rounded-full bg-[#D8AD56] hover:bg-[#C69940] text-[#20120B] text-xs font-medium uppercase tracking-wider transition-all duration-300 shadow-sm hover:shadow-goldGlow flex items-center gap-1.5"
                >
                  <span>Return Home</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </NextLink>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
