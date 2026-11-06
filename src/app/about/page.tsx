import Image from 'next/image';
import NextLink from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ArrowRight, Check } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#F8F1E9]">
      <Header transparentInitially={false} />

      <main className="flex-grow pt-24 sm:pt-28 pb-24">
        {/* Page Header */}
        <section className="bg-[#20120B] text-white py-16 sm:py-20 mb-14 border-b border-[#D8AD56]/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <span className="text-[11px] uppercase tracking-[0.25em] font-semibold text-[#D8AD56] block mb-3">
              Our Story
            </span>
            <h1 className="font-serif text-3xl sm:text-5xl font-normal tracking-tight">
              Hospitality & Heritage
            </h1>
            <p className="mt-4 text-sm sm:text-base text-[#EFE3D6]/80 max-w-lg mx-auto font-light leading-relaxed">
              Crafting an oasis of refined comfort and warm welcome in the heart of Kadiri, Andhra Pradesh.
            </p>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Narrative & Visual Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-16">
            {/* Visual (6 cols) */}
            <div className="lg:col-span-6 relative aspect-[4/3] rounded-3xl overflow-hidden shadow-luxury border border-[#D8AD56]/25 group">
              <Image
                src="/images/hotel/hotel-exterior-night-enhanced.png"
                alt="Sri Tayi Grand Illuminated Night Facade"
                fill
                priority
                className="object-cover group-hover:scale-105 transition-transform duration-700"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-6">
                <span className="text-xs font-serif text-[#D8AD56] tracking-wide">Grand Entrance & Night Architecture</span>
              </div>
            </div>

            {/* Story (6 cols) */}
            <div className="lg:col-span-6 space-y-6">
              <span className="text-[11px] uppercase tracking-[0.25em] font-semibold text-[#D8AD56] block">
                The Tayi Grand Philosophy
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-normal text-[#241912] leading-tight">
                A Landmark of Care & Serenity
              </h2>
              <p className="text-sm text-[#786B61] leading-relaxed font-light">
                Conveniently situated on Bypass Road in Kadiri, Sri Tayi Grand was born from a desire to elevate hospitality in the Rayalaseema region. We believe that true luxury lies in thoughtful simplicity, spotless hygiene, and heartfelt attention to every guest.
              </p>
              <p className="text-sm text-[#786B61] leading-relaxed font-light">
                Whether staying in our tranquil suites for religious pilgrimage or hosting hundreds of loved ones in our Grand Convention Hall, our team is committed to making your time with us seamless and memorable.
              </p>

              <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#241912]">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#D8AD56]" />
                  <span>Climate-controlled suites</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#D8AD56]" />
                  <span>Grand Hall for 800 guests</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#D8AD56]" />
                  <span>Secure on-site parking</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#D8AD56]" />
                  <span>24-hour concierge assistance</span>
                </div>
              </div>
            </div>
          </div>

          {/* Authentic Spaces Trio Gallery */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
            <div className="relative aspect-[16/10] rounded-2xl overflow-hidden shadow-luxury group border border-[#D8AD56]/20 bg-[#20120B]">
              <Image
                src="/images/hotel/reception-desk-photo-enhanced.png"
                alt="Reception & Concierge Desk"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-5">
                <span className="text-xs font-serif text-white tracking-wide">24/7 Front Desk Concierge</span>
              </div>
            </div>

            <div className="relative aspect-[16/10] rounded-2xl overflow-hidden shadow-luxury group border border-[#D8AD56]/20 bg-[#20120B]">
              <Image
                src="/images/hotel/room-suite-bed-photo-enhanced.png"
                alt="Executive Suite Bedding"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-5">
                <span className="text-xs font-serif text-white tracking-wide">Pristine Restful Suites</span>
              </div>
            </div>

            <div className="relative aspect-[16/10] rounded-2xl overflow-hidden shadow-luxury group border border-[#D8AD56]/20 bg-[#20120B]">
              <Image
                src="/images/hotel/suite-seating-photo-enhanced.png"
                alt="Private Suite Living"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-5">
                <span className="text-xs font-serif text-white tracking-wide">Refined Living Lounges</span>
              </div>
            </div>
          </div>

          {/* Pillars of Hospitality */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
            <div className="bg-white rounded-2xl border border-[#D8AD56]/20 p-8 shadow-luxury">
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#D8AD56] block mb-2">Pillar I</span>
              <h3 className="font-serif text-lg font-medium text-[#241912]">Pristine Living</h3>
              <p className="text-xs text-[#786B61] mt-2.5 leading-relaxed font-light">
                Meticulous hygiene, freshly laundered linens, and tranquil climate-controlled interiors for restorative sleep.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-[#D8AD56]/20 p-8 shadow-luxury">
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#D8AD56] block mb-2">Pillar II</span>
              <h3 className="font-serif text-lg font-medium text-[#241912]">Heartfelt Warmth</h3>
              <p className="text-xs text-[#786B61] mt-2.5 leading-relaxed font-light">
                Attentive care that treats every traveler and family member like an honored personal guest from arrival to departure.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-[#D8AD56]/20 p-8 shadow-luxury">
              <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#D8AD56] block mb-2">Pillar III</span>
              <h3 className="font-serif text-lg font-medium text-[#241912]">Grand Celebrations</h3>
              <p className="text-xs text-[#786B61] mt-2.5 leading-relaxed font-light">
                A ballroom designed for weddings, banquets, and executive assemblies with seamless dining and staging infrastructure.
              </p>
            </div>
          </div>

          {/* Closing Invitation */}
          <div className="bg-[#20120B] text-white rounded-3xl p-10 sm:p-14 text-center max-w-2xl mx-auto shadow-luxury border border-[#D8AD56]/25">
            <h2 className="font-serif text-2xl sm:text-3xl font-normal">
              We Look Forward to Welcoming You
            </h2>
            <p className="text-xs sm:text-sm text-[#EFE3D6]/75 mt-3 font-light leading-relaxed max-w-md mx-auto">
              Reserve your sanctuary in Kadiri today or speak directly with our concierge.
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
