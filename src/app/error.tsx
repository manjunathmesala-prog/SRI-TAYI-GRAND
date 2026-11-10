'use client';

import { useEffect } from 'react';
import NextLink from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AlertTriangle, RefreshCw, Home, PhoneCall } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected client error for diagnostics
    console.error('[Application Runtime Error]:', error);
  }, [error]);

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F1E9]">
      <Header transparentInitially={false} />
      <main className="flex-grow flex items-center justify-center py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg w-full text-center bg-white/80 backdrop-blur-md rounded-2xl p-8 sm:p-10 shadow-luxury border border-[#D8AD56]/30">
          <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-5 text-[#D8AD56]">
            <AlertTriangle className="w-8 h-8 text-[#931D24]" />
          </div>

          <div className="inline-block text-xs uppercase tracking-[0.25em] font-semibold text-[#D8AD56] mb-2">
            Sri Tayi Grand
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl font-normal text-[#241912] mb-3">
            Something Unexpected Occurred
          </h1>

          <p className="text-sm text-[#786B61] mb-6 leading-relaxed">
            We encountered an unexpected issue while loading this page. Our front desk and system engineers have been alerted. You can attempt to refresh the view or return to the main reception.
          </p>

          {error?.digest && (
            <p className="text-[11px] font-mono text-[#A3968A] bg-[#F8F1E9] px-3 py-1.5 rounded-lg inline-block mb-6">
              Incident ID: {error.digest}
            </p>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => reset()}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#43001F] hover:bg-[#2E0015] text-white text-xs font-semibold tracking-wider uppercase transition-colors shadow-luxury"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try Again
            </button>

            <NextLink
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-stone-50 border border-stone-300 text-[#241912] text-xs font-semibold tracking-wider uppercase transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              Return Home
            </NextLink>

            <a
              href="tel:08494223379"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-[#7A5B04] text-xs font-semibold tracking-wider uppercase transition-colors"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              Front Desk
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
