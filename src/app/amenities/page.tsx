import Image from 'next/image';
import NextLink from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { repo } from '@/lib/db/repository';
import {
  Snowflake,
  Car,
  Users,
  Wifi,
  Bell,
  ArrowUpDown,
  Tv,
  Coffee,
  Droplets,
  ArrowRight,
  Clock,
  ShieldCheck
} from 'lucide-react';

const iconMap: Record<string, any> = {
  Snowflake,
  Car,
  Users,
  Wifi,
  Bell,
  ArrowUpDown,
  ShieldCheck,
  Tv,
  Coffee,
  Droplets,
  Clock,
};

export default function AmenitiesPage() {
  const amenities = repo.getAmenities().filter((a) => a.is_active);

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F1E9]">
      <Header transparentInitially={false} />

      <main className="flex-grow pt-24 sm:pt-28 pb-24">
        {/* Page Header */}
        <section className="bg-[#20120B] text-white py-16 sm:py-20 mb-14 border-b border-[#D8AD56]/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <span className="text-[11px] uppercase tracking-[0.25em] font-semibold text-[#D8AD56] block mb-3">
              Services & Comforts
            </span>
            <h1 className="font-serif text-3xl sm:text-5xl font-normal tracking-tight">
              Hotel Amenities
            </h1>
            <p className="mt-4 text-sm sm:text-base text-[#EFE3D6]/80 max-w-lg mx-auto font-light leading-relaxed">
              Curated to ensure effortless comfort, modern convenience, and genuine warmth during your stay.
            </p>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Architectural Amenities Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {amenities.map((amenity) => {
              const IconComponent = iconMap[amenity.icon_name] || Snowflake;
              return (
                <div
                  key={amenity.id}
                  className="bg-white rounded-2xl border border-[#D8AD56]/20 p-7 shadow-luxury hover:shadow-luxuryHover hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="w-11 h-11 rounded-full bg-[#FAF7F2] text-[#D8AD56] border border-[#EFE3D6] flex items-center justify-center mb-5">
                      <IconComponent className="w-5 h-5" strokeWidth={1.75} />
                    </div>
                    <h2 className="font-serif text-lg font-medium text-[#241912]">
                      {amenity.name}
                    </h2>
                    <p className="text-xs text-[#786B61] mt-2.5 leading-relaxed font-light">
                      {amenity.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* In-Room Luxury Comfort Showcase */}
          <div className="mt-20">
            <div className="text-center max-w-xl mx-auto mb-10">
              <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-[#D8AD56] block mb-2">
                In-Room Elegance
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-medium text-[#241912]">
                Crafted for Restful Stays
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="relative aspect-[16/11] rounded-2xl overflow-hidden shadow-luxury border border-[#D8AD56]/20 group bg-[#20120B]">
                <Image
                  src="/images/hotel/room-suite-bed-photo-enhanced.png"
                  alt="Plush King Bedding"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-5">
                  <span className="text-xs font-serif text-white tracking-wide">Plush King Bedding & Climate Control</span>
                </div>
              </div>

              <div className="relative aspect-[16/11] rounded-2xl overflow-hidden shadow-luxury border border-[#D8AD56]/20 group bg-[#20120B]">
                <Image
                  src="/images/hotel/suite-seating-photo-enhanced.png"
                  alt="Private Living Armchairs"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-5">
                  <span className="text-xs font-serif text-white tracking-wide">Private Living Lounge & Seating</span>
                </div>
              </div>

              <div className="relative aspect-[16/11] rounded-2xl overflow-hidden shadow-luxury border border-[#D8AD56]/20 group bg-[#20120B]">
                <Image
                  src="/images/hotel/room-headboard-detail-photo-enhanced.png"
                  alt="Acoustic Wood Headboard"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-5">
                  <span className="text-xs font-serif text-white tracking-wide">Acoustic Wood Paneling & Reading Lamps</span>
                </div>
              </div>
            </div>
          </div>

          {/* Understated Closing Invitation */}
          <div className="mt-20 bg-[#20120B] text-white rounded-3xl p-10 sm:p-14 text-center max-w-2xl mx-auto shadow-luxury border border-[#D8AD56]/25">
            <h2 className="font-serif text-2xl sm:text-3xl font-normal">
              Experience Sri Tayi Grand
            </h2>
            <p className="text-xs sm:text-sm text-[#EFE3D6]/75 mt-3 font-light leading-relaxed max-w-md mx-auto">
              Sanctuaries designed for rest, celebrations of life, and attentive hospitality in Kadiri.
            </p>

            <div className="mt-8">
              <NextLink
                href="/rooms"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#D8AD56] hover:bg-[#C69940] text-[#20120B] text-xs font-medium uppercase tracking-wider transition-all duration-300 shadow-luxury hover:shadow-goldGlow"
              >
                <span>Reserve Your Stay</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </NextLink>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
