import NextLink from 'next/link';
import { Phone, Mail, MapPin, MessageSquare } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-[#1C1009] text-[#EFE3D6] border-t border-[#D8AD56]/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-12">
          {/* Brand Identity (4 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full border border-[#D8AD56]/80 flex items-center justify-center bg-black/40">
                <span className="font-serif font-semibold text-sm text-[#D8AD56] tracking-widest">
                  TG
                </span>
              </div>
              <div>
                <span className="font-serif text-xl tracking-[0.08em] text-white block">
                  SRI TAYI GRAND
                </span>
                <span className="text-[9px] uppercase tracking-[0.3em] text-[#D8AD56]/90 block">
                  HOTEL & CONVENTIONS â€¢ KADIRI
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#EFE3D6]/70 leading-relaxed max-w-sm font-light">
              A refined haven of comfort and celebration in Kadiri, Andhra Pradesh. Offering serene suites, thoughtful hospitality, and a magnificent convention hall.
            </p>

            <div className="pt-2 flex items-center gap-3">
              <a
                href="https://wa.me/918494223379"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-[#D8AD56]/30 text-xs text-[#EFE3D6] transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#25D366]" />
                <span>Concierge via WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Curated Navigation (2 cols) */}
          <div className="lg:col-span-2">
            <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-[#D8AD56] block mb-4">
              Explore
            </span>
            <ul className="space-y-3 text-xs text-[#EFE3D6]/75">
              <li>
                <NextLink href="/rooms" className="hover:text-[#D8AD56] transition-colors">
                  Rooms & Suites
                </NextLink>
              </li>
              <li>
                <NextLink href="/convention-hall" className="hover:text-[#D8AD56] transition-colors">
                  Convention Hall
                </NextLink>
              </li>
              <li>
                <NextLink href="/amenities" className="hover:text-[#D8AD56] transition-colors">
                  Amenities
                </NextLink>
              </li>
              <li>
                <NextLink href="/gallery" className="hover:text-[#D8AD56] transition-colors">
                  Photo Gallery
                </NextLink>
              </li>
              <li>
                <NextLink href="/testimonials" className="hover:text-[#D8AD56] transition-colors">
                  Guest Reviews
                </NextLink>
              </li>
              <li>
                <NextLink href="/about" className="hover:text-[#D8AD56] transition-colors">
                  Our Story
                </NextLink>
              </li>
            </ul>
          </div>

          {/* Accommodations (2 cols) */}
          <div className="lg:col-span-2">
            <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-[#D8AD56] block mb-4">
              Suites
            </span>
            <ul className="space-y-3 text-xs text-[#EFE3D6]/75">
              <li>
                <NextLink href="/rooms/double-room" className="hover:text-[#D8AD56] transition-colors">
                  Double Room (₹1,800)
                </NextLink>
              </li>
              <li>
                <NextLink href="/rooms/four-bed-room" className="hover:text-[#D8AD56] transition-colors">
                  Four Bed Room (₹2,800)
                </NextLink>
              </li>
              <li>
                <NextLink href="/rooms/suite-room" className="hover:text-[#D8AD56] transition-colors">
                  Suite Room (₹3,300)
                </NextLink>
              </li>
            </ul>
          </div>

          {/* Concierge & Location (3 cols) */}
          <div className="lg:col-span-3">
            <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-[#D8AD56] block mb-4">
              Sanctuary
            </span>
            <div className="space-y-3 text-xs text-[#EFE3D6]/75">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#D8AD56] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Bypass Road, Opp. Girls High School, Kadiri â€“ 515591, Andhra Pradesh
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#D8AD56] shrink-0" />
                <a href="tel:08494223379" className="hover:text-[#D8AD56] transition-colors">
                  084942 23379
                </a>
              </div>

              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#D8AD56] shrink-0" />
                <a href="mailto:contact@sritayigrand.com" className="hover:text-[#D8AD56] transition-colors">
                  contact@sritayigrand.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Quiet Elegance Bottom Bar */}
        <div className="mt-14 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#EFE3D6]/50">
          <p>Â© {new Date().getFullYear()} Sri Tayi Grand. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <NextLink href="/policies" className="hover:text-[#D8AD56] transition-colors">
              Policies & Terms
            </NextLink>
            <NextLink href="/contact" className="hover:text-[#D8AD56] transition-colors">
              Directions
            </NextLink>
            <NextLink href="/admin/login" className="text-[#D8AD56]/70 hover:text-[#D8AD56] transition-colors">
              Staff
            </NextLink>
          </div>
        </div>
      </div>
    </footer>
  );
}
