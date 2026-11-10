'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Global System Error]:', error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-[#F8F1E9] text-[#241912] min-h-screen flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full text-center bg-white rounded-2xl p-8 sm:p-10 shadow-2xl border border-[#D8AD56]/40">
          <div className="w-16 h-16 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-4 text-[#931D24]">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div className="text-xs uppercase tracking-[0.25em] font-semibold text-[#D8AD56] mb-2">
            Sri Tayi Grand
          </div>

          <h1 className="text-2xl font-serif font-semibold text-[#241912] mb-3">
            System Level Interruption
          </h1>

          <p className="text-sm text-stone-600 mb-6 leading-relaxed">
            A critical application error occurred. Please refresh the portal or reconnect to the network.
          </p>

          <button
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#43001F] hover:bg-[#2E0015] text-white text-xs font-semibold tracking-wider uppercase transition-colors shadow-lg"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
