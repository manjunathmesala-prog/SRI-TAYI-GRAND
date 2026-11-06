import Image from 'next/image';
import NextLink from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BookingWidget } from '@/components/booking/BookingWidget';
import { repo } from '@/lib/db/repository';
import { Bed, Users, Maximize2, ArrowRight } from 'lucide-react';

export default function RoomsPage() {
  const categories = repo.getCategories();

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F1E9]">
      <Header transparentInitially={false} />

      <main className="flex-grow pt-24 sm:pt-28 pb-24">
        {/* Editorial Page Header */}
        <section className="bg-[#20120B] text-white py-16 sm:py-20 mb-12 border-b border-[#D8AD56]/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <span className="text-[11px] uppercase tracking-[0.25em] font-semibold text-[#D8AD56] block mb-3">
              Accommodations
            </span>
            <h1 className="font-serif text-3xl sm:text-5xl font-normal tracking-tight">
              Rooms & Suites
            </h1>
            <p className="mt-4 text-sm sm:text-base text-[#EFE3D6]/80 max-w-lg mx-auto font-light leading-relaxed">
              Quiet sanctuaries crafted with plush bedding, individual climate control, and refined hospitality in Kadiri. Rooms from ₹1,800 (subject to availability).
            </p>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Availability Bar without redundant titles */}
          <div className="mb-14 max-w-4xl mx-auto">
            <BookingWidget />
          </div>

          {/* Luxury Room Listings */}
          <div className="space-y-12">
            {categories.map((room) => (
              <div
                key={room.id}
                className="bg-white rounded-2xl border border-[#D8AD56]/20 overflow-hidden shadow-luxury hover:shadow-luxuryHover transition-all duration-300 grid grid-cols-1 lg:grid-cols-12 gap-0 group"
              >
                {/* Room Image */}
                <div className="lg:col-span-5 relative aspect-[16/11] lg:aspect-auto min-h-[300px] overflow-hidden bg-[#20120B]/10">
                  <Image
                    src={room.cover_image_url}
                    alt={room.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                    sizes="(max-width: 1024px) 100vw, 40vw"
                  />
                </div>

                {/* Room Details */}
                <div className="lg:col-span-7 p-7 sm:p-9 flex flex-col justify-between">
                  <div>
                    {/* Header: Name & Rate */}
                    <div className="flex flex-wrap items-baseline justify-between gap-4 mb-3">
                      <h2 className="font-serif text-2xl sm:text-3xl font-medium text-[#241912] group-hover:text-[#D8AD56] transition-colors">
                        {room.name}
                      </h2>
                      <div className="text-right">
                        <span className="text-2xl font-serif text-[#241912]">
                          ₹{room.base_price_per_night.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs text-[#786B61] ml-1.5 font-light">/ night</span>
                      </div>
                    </div>

                    {/* Room Description */}
                    <p className="text-xs sm:text-sm text-[#786B61] leading-relaxed mb-6 font-light">
                      {room.full_description}
                    </p>

                    {/* Key Specifications Strip */}
                    <div className="flex flex-wrap items-center gap-6 py-3.5 border-y border-[#F8F1E9] text-xs text-[#241912] mb-6">
                      <div className="flex items-center gap-2">
                        <Bed className="w-4 h-4 text-[#D8AD56]" />
                        <span>{room.bed_type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#D8AD56]" />
                        <span>Included: {room.included_occupancy || 2} Persons</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[#D8AD56] font-bold">Extra Person:</span>
                        <span>₹300 (Max {room.max_occupancy} guests)</span>
                      </div>
                      {room.room_size_sqft && (
                        <div className="flex items-center gap-2">
                          <Maximize2 className="w-3.5 h-3.5 text-[#D8AD56]" />
                          <span>{room.room_size_sqft} sq.ft</span>
                        </div>
                      )}
                    </div>

                    {/* Curated Highlights */}
                    {room.amenities && (
                      <div className="flex flex-wrap gap-2 mb-6">
                        {room.amenities.slice(0, 4).map((amenity, i) => (
                          <span
                            key={i}
                            className="text-[11px] px-3 py-1 rounded-full bg-[#FAF7F2] text-[#6E5D50] border border-[#EFE3D6]/60 font-light"
                          >
                            {amenity}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Clean Single CTA */}
                  <div className="pt-4 border-t border-[#F8F1E9] flex items-center justify-between">
                    <span className="text-xs text-[#8C7A6B] font-light">
                      Direct reservation with instant confirmation
                    </span>

                    <NextLink
                      href={`/rooms/${room.slug}`}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#D8AD56] hover:bg-[#C69940] text-[#20120B] text-xs font-medium uppercase tracking-wider transition-all duration-300 shadow-sm hover:shadow-goldGlow hover:-translate-y-0.5"
                    >
                      <span>Reserve Room</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </NextLink>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
