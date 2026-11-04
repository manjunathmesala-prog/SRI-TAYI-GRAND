import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Clock, RefreshCw, ShieldCheck, FileText } from 'lucide-react';

export default function PoliciesPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#F8F1E9]">
      <Header transparentInitially={false} />

      <main className="flex-grow pt-24 sm:pt-28 pb-24">
        {/* Page Header */}
        <section className="bg-[#20120B] text-white py-16 sm:py-20 mb-14 border-b border-[#D8AD56]/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <span className="text-[11px] uppercase tracking-[0.25em] font-semibold text-[#D8AD56] block mb-3">
              Guidelines
            </span>
            <h1 className="font-serif text-3xl sm:text-5xl font-normal tracking-tight">
              Policies & Terms
            </h1>
            <p className="mt-4 text-sm sm:text-base text-[#EFE3D6]/80 max-w-lg mx-auto font-light leading-relaxed">
              Transparent terms governing your reservations, stay, cancellations, and privacy at Sri Tayi Grand.
            </p>
          </div>
        </section>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Check-In & Stay */}
          <div className="bg-white rounded-2xl border border-[#D8AD56]/25 p-7 sm:p-9 shadow-luxury">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-5 h-5 text-[#D8AD56]" />
              <h2 className="font-serif text-xl font-medium text-[#241912]">
                Check-In & Check-Out
              </h2>
            </div>
            <div className="space-y-3 text-xs text-[#786B61] font-light leading-relaxed">
              <p>
                <strong>Check-In:</strong> From 2:00 PM onwards. Early arrival is accommodated based on availability.
              </p>
              <p>
                <strong>Check-Out:</strong> Until 11:00 AM.
              </p>
              <p>
                <strong>Identification:</strong> A government-approved photo ID (Aadhaar, Passport, Driving Licence, or Voter ID) is requested upon arrival for all adult guests.
              </p>
              <p>
                <strong>Environment:</strong> All guest rooms and public indoor areas are non-smoking sanctuaries.
              </p>
            </div>
          </div>

          {/* Cancellation & Refund */}
          <div className="bg-white rounded-2xl border border-[#D8AD56]/25 p-7 sm:p-9 shadow-luxury">
            <div className="flex items-center gap-3 mb-4">
              <RefreshCw className="w-5 h-5 text-[#D8AD56]" />
              <h2 className="font-serif text-xl font-medium text-[#241912]">
                Cancellation & Refunds
              </h2>
            </div>
            <div className="space-y-3 text-xs text-[#786B61] font-light leading-relaxed">
              <p>
                <strong>Complimentary Cancellation:</strong> Reservations cancelled up to 48 hours prior to 2:00 PM on the arrival date receive a 100% refund.
              </p>
              <p>
                <strong>24 to 48 Hours:</strong> Cancellations made between 24 and 48 hours prior to check-in are eligible for a 50% refund.
              </p>
              <p>
                <strong>Under 24 Hours / No-Show:</strong> Cancellations within 24 hours of arrival or non-arrivals are non-refundable.
              </p>
              <p>
                <strong>Refund Processing:</strong> Refunds for electronic payments are credited to the original payment method within 5–7 banking days.
              </p>
            </div>
          </div>

          {/* Privacy & Guest Information */}
          <div className="bg-white rounded-2xl border border-[#D8AD56]/25 p-7 sm:p-9 shadow-luxury">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-5 h-5 text-[#D8AD56]" />
              <h2 className="font-serif text-xl font-medium text-[#241912]">
                Privacy & Data Security
              </h2>
            </div>
            <div className="space-y-3 text-xs text-[#786B61] font-light leading-relaxed">
              <p>
                Guest contact details and identity information are held in strict confidence, utilized solely for reservation fulfillment, legal compliance, and communication regarding your stay. We do not sell or distribute personal information to third parties.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
