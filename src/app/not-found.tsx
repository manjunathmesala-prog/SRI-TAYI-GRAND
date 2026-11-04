import NextLink from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function NotFound() {
  return (
    <div className="flex flex-col min-h-screen bg-[#F8F1E9]">
      <Header transparentInitially={false} />
      <main className="flex-grow flex items-center justify-center py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full text-center">
          <div className="inline-block text-xs uppercase tracking-[0.25em] font-semibold text-[#D8AD56] mb-3">
            404 Error
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl font-normal text-[#241912] mb-4">
            Page Not Found
          </h1>
          <p className="text-sm text-[#786B61] mb-8 leading-relaxed">
            The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
          </p>
          <NextLink
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-[#D8AD56] hover:bg-[#C69940] text-[#25150F] text-xs font-semibold tracking-wider uppercase transition-colors shadow-luxury"
          >
            Return to Home
          </NextLink>
        </div>
      </main>
      <Footer />
    </div>
  );
}
