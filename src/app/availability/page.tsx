'use client';

import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import NextLink from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AvailabilityResult } from '@/lib/booking-engine';
import { Bed, User, ArrowRight, RefreshCw, XCircle } from 'lucide-react';
import { LuxuryDatePicker } from '@/components/ui/LuxuryDatePicker';
import { LuxurySelect } from '@/components/ui/LuxurySelect';

function AvailabilityContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  const initialCheckIn = searchParams.get('checkIn') || formatDate(today);
  const initialCheckOut = searchParams.get('checkOut') || formatDate(tomorrow);
  const initialAdults = Number(searchParams.get('adults')) || 2;
  const initialChildren = Number(searchParams.get('children')) || 0;
  const initialRooms = Number(searchParams.get('rooms')) || 1;

  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [adults, setAdults] = useState(initialAdults);
  const [children, setChildren] = useState(initialChildren);
  const [roomsCount, setRoomsCount] = useState(initialRooms);

  const [results, setResults] = useState<AvailabilityResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailability = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/availability/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkIn,
          checkOut,
          adults,
          children,
          roomsCount,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to check availability');
      }

      setResults(data.results || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkIn, checkOut, adults, children, roomsCount]);

  const handleProceed = (result: AvailabilityResult) => {
    const query = new URLSearchParams({
      categoryId: result.category.id,
      slug: result.category.slug,
      checkIn,
      checkOut,
      adults: adults.toString(),
      children: children.toString(),
      roomsCount: roomsCount.toString(),
    });

    router.push(`/booking/checkout?${query.toString()}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Sleek Search Criteria Filter */}
      <div className="bg-white rounded-2xl border border-[#D8AD56]/25 p-5 sm:p-6 shadow-luxury mb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <LuxuryDatePicker
            label="Check-in"
            value={checkIn}
            minDate={formatDate(today)}
            onChange={(val) => {
              setCheckIn(val);
              if (val && checkOut && new Date(val) >= new Date(checkOut)) {
                const nextDay = new Date(val);
                nextDay.setDate(nextDay.getDate() + 1);
                setCheckOut(formatDate(nextDay));
              }
            }}
          />

          <LuxuryDatePicker
            label="Check-out"
            value={checkOut}
            minDate={checkIn || formatDate(today)}
            rangeStart={checkIn}
            onChange={(val) => setCheckOut(val)}
          />

          <LuxurySelect
            label="Adults"
            value={adults}
            onChange={(val) => setAdults(Number(val))}
            options={[1, 2, 3, 4, 5, 6].map((num) => ({
              value: num,
              label: `${num} ${num === 1 ? 'Adult' : 'Adults'}`,
            }))}
          />

          <LuxurySelect
            label="Children"
            value={children}
            onChange={(val) => setChildren(Number(val))}
            options={[0, 1, 2, 3].map((num) => ({
              value: num,
              label: `${num} ${num === 1 ? 'Child' : 'Children'}`,
            }))}
          />

          <div>
            <button
              onClick={fetchAvailability}
              className="w-full py-3 px-4 rounded-xl bg-[#43001F] hover:bg-[#2E0015] text-white text-xs font-semibold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Update Search</span>
            </button>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-normal text-[#241912]">
          Available Sanctuaries
        </h1>
        <p className="text-xs text-[#786B61] mt-1 font-light">
          {checkIn} to {checkOut} • {results[0]?.nights || 1} {results[0]?.nights === 1 ? 'night' : 'nights'}
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-xs mb-8">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse flex gap-6">
              <div className="w-1/3 aspect-[4/3] bg-gray-100 rounded-xl" />
              <div className="w-2/3 space-y-4 py-2">
                <div className="h-6 bg-gray-100 rounded w-1/3" />
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-4 bg-gray-100 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#D8AD56]/30 p-12 text-center max-w-xl mx-auto shadow-luxury space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-50 border border-[#D8AD56]/40 flex items-center justify-center text-[#D8AD56] mx-auto">
            <Bed className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-2xl font-bold text-[#241912]">No Sanctuaries Available</h2>
          <p className="text-xs text-[#786B61] leading-relaxed">
            All rooms are reserved for the selected stay dates ({checkIn} to {checkOut}). Please select alternative dates or call the front desk for priority assistance.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => {
                const today = new Date();
                const nextDay = new Date(today);
                nextDay.setDate(nextDay.getDate() + 2);
                const thirdDay = new Date(nextDay);
                thirdDay.setDate(thirdDay.getDate() + 1);
                setCheckIn(nextDay.toISOString().split('T')[0]);
                setCheckOut(thirdDay.toISOString().split('T')[0]);
              }}
              className="px-5 py-2.5 rounded-xl bg-[#43001F] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#2E0015] transition-all cursor-pointer shadow-xs"
            >
              Try Flexible Dates
            </button>
            <a
              href="tel:08494223379"
              className="px-5 py-2.5 rounded-xl bg-amber-50 border border-[#D8AD56]/50 text-[#241912] text-xs font-semibold uppercase tracking-wider hover:bg-amber-100 transition-all cursor-pointer"
            >
              Call 084942 23379
            </a>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {results.map((result) => {
            const cat = result.category;
            return (
              <div
                key={cat.id}
                className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden shadow-luxury grid grid-cols-1 lg:grid-cols-12 gap-0 ${
                  result.isAvailable
                    ? 'border-[#D8AD56]/25 hover:border-[#D8AD56]/60'
                    : 'border-gray-200 opacity-60'
                }`}
              >
                {/* Image */}
                <div className="lg:col-span-4 relative aspect-[16/10] lg:aspect-auto min-h-[220px] bg-[#20120B]/10">
                  <Image
                    src={cat.cover_image_url}
                    alt={cat.name}
                    fill
                    className="object-cover"
                  />
                  {!result.isAvailable && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                      <span className="px-3.5 py-1.5 rounded-full bg-red-600/90 text-white text-xs font-medium flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Sold Out for Selected Dates</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="lg:col-span-5 p-6 sm:p-7 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#F8F1E9]">
                  <div>
                    <h3 className="font-serif text-2xl font-medium text-[#241912]">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-[#786B61] mt-2 font-light leading-relaxed line-clamp-2">
                      {cat.short_description}
                    </p>

                    <div className="mt-4 flex items-center gap-4 text-xs text-[#241912]">
                      <div className="flex items-center gap-1.5">
                        <Bed className="w-4 h-4 text-[#D8AD56]" />
                        <span>{cat.bed_type}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <User className="w-4 h-4 text-[#D8AD56]" />
                        <span>Up to {cat.max_occupancy} Guests</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#F8F1E9]">
                    <NextLink
                      href={`/rooms/${cat.slug}`}
                      className="text-xs text-[#D8AD56] hover:text-[#C69940] transition-colors font-medium inline-flex items-center gap-1"
                    >
                      <span>Explore details</span>
                      <ArrowRight className="w-3 h-3" />
                    </NextLink>
                  </div>
                </div>

                {/* Rate & Reserve */}
                <div className="lg:col-span-3 p-6 sm:p-7 flex flex-col justify-between bg-[#FAF7F2]">
                  <div>
                    <span className="text-[10px] text-[#8C7A6B] uppercase tracking-[0.2em] font-semibold block">
                      {result.nights} {result.nights === 1 ? 'Night' : 'Nights'}
                    </span>
                    <div className="font-serif text-3xl font-medium text-[#241912] mt-1">
                      ₹{result.totalAmount.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[11px] text-[#786B61] font-light mt-0.5">
                      Includes 5% GST
                    </div>
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={() => handleProceed(result)}
                      disabled={!result.isAvailable}
                      className="w-full py-3.5 px-4 rounded-full bg-[#43001F] hover:bg-[#2E0015] disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-medium uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 shadow-sm hover:shadow-lg hover:-translate-y-0.5 border border-[#D8AD56]/40"
                    >
                      <span>{result.isAvailable ? 'Reserve Suite' : 'Unavailable'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AvailabilityPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#F8F1E9]">
      <Header transparentInitially={false} />
      <main className="flex-grow pt-28 sm:pt-32 pb-24">
        <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-16 text-center text-sm font-light">Loading sanctuaries...</div>}>
          <AvailabilityContent />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
