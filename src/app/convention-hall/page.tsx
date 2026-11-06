'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import MobileStickyBookingBar from '@/components/anantha/MobileStickyBookingBar';
import FloatingActionBar from '@/components/anantha/FloatingActionBar';
import TayiBrandIcon from '@/components/anantha/TayiBrandIcon';
import { LuxuryDatePicker } from '@/components/ui/LuxuryDatePicker';
import { LuxurySelect } from '@/components/ui/LuxurySelect';
import { 
  Users, 
  Car, 
  Utensils, 
  Snowflake, 
  CheckCircle2, 
  Phone, 
  ArrowRight,
  Check,
  Calendar,
  Sparkles,
} from 'lucide-react';

export default function ConventionHallPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [eventType, setEventType] = useState('Wedding Reception');
  const [eventDate, setEventDate] = useState('');
  const [expectedGuests, setExpectedGuests] = useState('300');
  const [message, setMessage] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/convention-hall/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          email,
          eventType,
          eventDate,
          expectedGuests,
          message,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit enquiry');
      }

      setSubmittedRef(data.enquiryReference);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error submitting enquiry');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col bg-[#F8F3E9] text-[#33271D]">
      <Header transparentInitially={false} />

      {/* Cinematic Hero */}
      <section className="relative min-h-[60vh] flex flex-col justify-end pb-16 pt-32 overflow-hidden bg-[#21180F]">
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/hotel/convention-hall-wide.jpg"
            alt="Sri Tayi Grand Convention Hall Kadiri"
            fill
            priority
            className="object-cover opacity-45 object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#21180F] via-[#21180F]/60 to-black/30" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-white w-full">
          <div className="max-w-2xl animate-fade-in-up">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] font-semibold text-[#B18A4A] mb-3">
              <TayiBrandIcon size={18} />
              <span>CELEBRATIONS &amp; GRAND EVENTS</span>
            </div>
            <h1 className="font-serif text-4xl sm:text-6xl font-normal leading-tight">
              Grandeur in Every <br />
              <span className="italic font-light text-[#EFE3D6]">Celebration.</span>
            </h1>
            <p className="mt-4 text-sm sm:text-base text-[#EFE3D6]/85 font-light leading-relaxed">
              An opulent 800-capacity venue for weddings, executive conferences, and memorable family milestones on Bypass Road, Kadiri.
            </p>
          </div>
        </div>
      </section>

      {/* Minimalist Metrics Strip */}
      <section className="py-10 bg-[#FAF5EB] border-b border-[#E6D9C5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x-0 md:divide-x divide-[#E6D9C5]">
            <div>
              <div className="font-serif text-3xl font-bold text-[#33271D]">800</div>
              <div className="text-[11px] uppercase tracking-wider text-[#786A5B] mt-1 font-semibold">Guest Capacity</div>
            </div>
            <div>
              <div className="font-serif text-3xl font-bold text-[#33271D]">Central AC</div>
              <div className="text-[11px] uppercase tracking-wider text-[#786A5B] mt-1 font-semibold">Climate Controlled</div>
            </div>
            <div>
              <div className="font-serif text-3xl font-bold text-[#33271D]">Banquet</div>
              <div className="text-[11px] uppercase tracking-wider text-[#786A5B] mt-1 font-semibold">Dedicated Dining Hall</div>
            </div>
            <div>
              <div className="font-serif text-3xl font-bold text-[#33271D]">Secure</div>
              <div className="text-[11px] uppercase tracking-wider text-[#786A5B] mt-1 font-semibold">On-Site Parking</div>
            </div>
          </div>
        </div>
      </section>

      {/* Venue Experience & Proposal Form */}
      <section className="py-20 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Venue Inclusions (7 cols) */}
            <div className="lg:col-span-7 space-y-8 reveal-on-scroll">
              <div>
                <span className="text-xs uppercase tracking-[0.25em] font-semibold text-[#43001F] block mb-2">
                  THE VENUE
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl font-normal text-[#33271D]">
                  An Exquisite Setting
                </h2>
                <p className="mt-3 text-sm text-[#786A5B] leading-relaxed font-light">
                  Designed to transform weddings, receptions, and distinguished gatherings into timeless memories. Featuring high ceilings, chandelier illumination, an expansive elevated stage, and dedicated dining halls.
                </p>
              </div>

              {/* Refined Features */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs text-[#33271D]">
                {[
                  'Elevated performance stage with floral backdrop support',
                  'High-capacity central air conditioning',
                  'Plush banquet seating arrangements',
                  'Dedicated dining hall with modern catering facilities',
                  'Private green rooms and dressing suites for hosts',
                  'Professional acoustic sound and multi-mic configuration',
                  'Uninterrupted generator power backup',
                  'Ample secure vehicle parking with surveillance',
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 p-3.5 rounded-xl bg-white border border-[#E6D9C5] shadow-xs">
                    <Check className="w-4 h-4 text-[#43001F] shrink-0 mt-0.5" />
                    <span className="font-medium">{item}</span>
                  </div>
                ))}
              </div>

              {/* Direct Concierge Contact Strip */}
              <div className="p-6 rounded-2xl bg-white border border-[#E6D9C5] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-serif font-bold text-base text-[#33271D]">Need Personalized Assistance?</h4>
                  <p className="text-xs text-[#786A5B] mt-0.5 font-light">
                    Speak directly with our dedicated banquet coordination manager.
                  </p>
                </div>
                <a
                  href="tel:08494223379"
                  className="px-5 py-2.5 rounded-full bg-[#43001F] hover:bg-[#2E0015] text-white text-xs font-semibold uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>084942 23379</span>
                </a>
              </div>
            </div>

            {/* Proposal Request Form (5 cols) */}
            <div className="lg:col-span-5 reveal-scale">
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E6D9C5] shadow-luxury">
                <div className="border-b border-[#E6D9C5]/80 pb-4 mb-6">
                  <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-[#43001F] block">
                    RESERVATIONS
                  </span>
                  <h3 className="font-serif text-2xl font-bold text-[#33271D]">
                    Enquire for Your Event
                  </h3>
                  <p className="text-xs text-[#786A5B] mt-1 font-light">
                    Share your requirements and we will revert with availability and a comprehensive quote.
                  </p>
                </div>

                {submittedRef ? (
                  <div className="p-6 rounded-2xl bg-[#FAF5EB] border border-[#E6D9C5] text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h4 className="font-serif font-bold text-lg text-[#33271D]">Enquiry Received</h4>
                    <p className="text-xs text-[#786A5B]">
                      Thank you, <strong className="text-[#33271D]">{name}</strong>. Your enquiry reference is:
                    </p>
                    <div className="text-sm font-mono font-bold text-[#43001F] bg-white px-3 py-1.5 rounded-lg border border-[#E6D9C5] inline-block">
                      {submittedRef}
                    </div>
                    <p className="text-[11px] text-[#786A5B]/80 pt-2">
                      Our management team will call you within 24 hours to finalize details.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                    {errorMsg && (
                      <div className="p-3 rounded-xl bg-red-50 text-red-700 border border-red-200">
                        {errorMsg}
                      </div>
                    )}

                    <div>
                      <label className="block font-semibold text-[#33271D] uppercase tracking-wider text-[11px] mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full px-4 py-2.5 rounded-xl border border-[#E6D9C5] bg-[#FAF6EE] text-[#33271D] focus:border-[#43001F] focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-[#33271D] uppercase tracking-wider text-[11px] mb-1">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="10-digit Mobile"
                          className="w-full px-4 py-2.5 rounded-xl border border-[#E6D9C5] bg-[#FAF6EE] text-[#33271D] focus:border-[#43001F] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-[#33271D] uppercase tracking-wider text-[11px] mb-1">
                          Email (Optional)
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@email.com"
                          className="w-full px-4 py-2.5 rounded-xl border border-[#E6D9C5] bg-[#FAF6EE] text-[#33271D] focus:border-[#43001F] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <LuxurySelect
                          label="Event Type"
                          value={eventType}
                          onChange={(val) => setEventType(String(val))}
                          options={[
                            { value: 'Wedding Reception', label: 'Wedding Reception' },
                            { value: 'Engagement Ceremony', label: 'Engagement Ceremony' },
                            { value: 'Birthday Celebration', label: 'Birthday Celebration' },
                            { value: 'Corporate Meeting', label: 'Corporate Meeting' },
                            { value: 'Cultural / Community Event', label: 'Cultural Event' },
                          ]}
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-[#33271D] uppercase tracking-wider text-[11px] mb-1.5">
                          Expected Guests
                        </label>
                        <input
                          type="number"
                          value={expectedGuests}
                          onChange={(e) => setExpectedGuests(e.target.value)}
                          placeholder="e.g. 400"
                          className="w-full text-xs font-semibold p-3 rounded-xl border border-[#E6D9C5] bg-[#FAF6EE] text-[#33271D] focus:border-[#43001F] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <LuxuryDatePicker
                        label="Preferred Date *"
                        value={eventDate}
                        minDate={new Date().toISOString().split('T')[0]}
                        onChange={(val) => setEventDate(val)}
                        placeholder="Select event date"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-[#33271D] uppercase tracking-wider text-[11px] mb-1">
                        Special Requests or Notes
                      </label>
                      <textarea
                        rows={3}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Stage decoration, dining requirements, catering preferences..."
                        className="w-full px-4 py-2.5 rounded-xl border border-[#E6D9C5] bg-[#FAF6EE] text-[#33271D] focus:border-[#43001F] focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 px-6 rounded-full bg-[#43001F] hover:bg-[#2E0015] active:scale-[0.98] text-white text-xs uppercase tracking-[0.16em] font-semibold shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-50"
                    >
                      <span>{isSubmitting ? 'Submitting...' : 'Submit Proposal Request'}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <MobileStickyBookingBar />
      <FloatingActionBar />
      <Footer />
    </main>
  );
}
