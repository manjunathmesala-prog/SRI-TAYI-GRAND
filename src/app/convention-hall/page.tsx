'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { 
  Users, 
  Car, 
  Utensils, 
  Snowflake, 
  CheckCircle2, 
  Phone, 
  ArrowRight,
  Check
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
    <div className="flex flex-col min-h-screen bg-[#F8F1E9]">
      <Header transparentInitially={true} />

      <main className="flex-grow">
        {/* Cinematic Hero */}
        <section className="relative min-h-[70vh] flex flex-col justify-end pb-16 pt-36 overflow-hidden bg-[#20120B]">
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/hotel/convention-hall-wide.jpg"
              alt="Sri Tayi Grand Convention Hall"
              fill
              priority
              className="object-cover opacity-45 object-center"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#20120B] via-[#20120B]/60 to-black/30" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-white w-full">
            <div className="max-w-2xl">
              <span className="text-[11px] uppercase tracking-[0.25em] font-semibold text-[#D8AD56] block mb-3">
                Celebrations & Banquets
              </span>
              <h1 className="font-serif text-4xl sm:text-6xl font-normal leading-tight">
                Grandeur in Every <br />
                <span className="italic font-light text-[#EFE3D6]">Celebration.</span>
              </h1>
              <p className="mt-4 text-sm sm:text-base text-[#EFE3D6]/80 font-light leading-relaxed">
                An opulent venue for weddings, executive conferences, and memorable family milestones in Kadiri.
              </p>
            </div>
          </div>
        </section>

        {/* Minimalist Metrics Strip */}
        <section className="py-10 bg-white border-b border-[#D8AD56]/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x-0 md:divide-x divide-[#EFE3D6]">
              <div>
                <div className="font-serif text-3xl font-light text-[#241912]">800</div>
                <div className="text-[11px] uppercase tracking-wider text-[#8C7A6B] mt-1 font-medium">Guest Capacity</div>
              </div>
              <div>
                <div className="font-serif text-3xl font-light text-[#241912]">Central AC</div>
                <div className="text-[11px] uppercase tracking-wider text-[#8C7A6B] mt-1 font-medium">Climate Controlled</div>
              </div>
              <div>
                <div className="font-serif text-3xl font-light text-[#241912]">Banquet</div>
                <div className="text-[11px] uppercase tracking-wider text-[#8C7A6B] mt-1 font-medium">Dedicated Dining Hall</div>
              </div>
              <div>
                <div className="font-serif text-3xl font-light text-[#241912]">Secure</div>
                <div className="text-[11px] uppercase tracking-wider text-[#8C7A6B] mt-1 font-medium">On-Site Parking</div>
              </div>
            </div>
          </div>
        </section>

        {/* Venue Experience & Proposal Form */}
        <section className="py-20 sm:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
              {/* Venue Inclusions (7 cols) */}
              <div className="lg:col-span-7 space-y-8">
                <div>
                  <span className="text-[11px] uppercase tracking-[0.25em] font-semibold text-[#D8AD56] block mb-2">
                    The Venue
                  </span>
                  <h2 className="font-serif text-3xl font-normal text-[#241912]">
                    An Exquisite Setting
                  </h2>
                  <p className="mt-3 text-sm text-[#786B61] leading-relaxed font-light">
                    Designed to transform weddings, receptions, and distinguished gatherings into timeless memories. Featuring high ceilings, chandelier illumination, an expansive elevated stage, and dedicated dining halls.
                  </p>
                </div>

                {/* Refined Features */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs text-[#241912]">
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
                    <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-white border border-[#D8AD56]/20">
                      <Check className="w-4 h-4 text-[#D8AD56] shrink-0 mt-0.5" />
                      <span className="font-light">{item}</span>
                    </div>
                  ))}
                </div>

                {/* Direct Concierge Contact Strip */}
                <div className="p-6 rounded-2xl bg-[#20120B] text-white flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="font-serif text-base font-medium text-white">Event Concierge</h3>
                    <p className="text-xs text-[#EFE3D6]/70 mt-0.5 font-light">Speak directly with our hall manager for date holds and visits.</p>
                  </div>
                  <a
                    href="tel:08494223379"
                    className="px-5 py-2.5 rounded-full bg-[#D8AD56] hover:bg-[#C69940] text-[#20120B] text-xs font-medium uppercase tracking-wider transition-colors inline-flex items-center gap-2 shrink-0"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>084942 23379</span>
                  </a>
                </div>
              </div>

              {/* Proposal Form (5 cols) */}
              <div className="lg:col-span-5">
                <div className="bg-white rounded-2xl border border-[#D8AD56]/25 p-7 sm:p-9 shadow-luxury">
                  {submittedRef ? (
                    <div className="text-center py-8 space-y-4">
                      <div className="w-12 h-12 rounded-full bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <h3 className="font-serif text-2xl font-normal text-[#241912]">
                        Enquiry Received
                      </h3>
                      <p className="text-xs text-[#786B61] font-light max-w-sm mx-auto leading-relaxed">
                        Thank you for your enquiry. Our events coordinator will verify dates and contact you promptly.
                      </p>
                      <div className="p-3 bg-[#FAF7F2] rounded-xl border border-[#EFE3D6]">
                        <span className="text-[10px] text-[#8C7A6B] block uppercase tracking-wider">
                          Reference Code
                        </span>
                        <span className="font-mono font-semibold text-sm text-[#241912]">
                          {submittedRef}
                        </span>
                      </div>
                      <button
                        onClick={() => setSubmittedRef(null)}
                        className="text-xs text-[#D8AD56] hover:underline"
                      >
                        Submit another enquiry
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="mb-6">
                        <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8C7A6B]">
                          Availability & Quote
                        </span>
                        <h3 className="font-serif text-2xl font-medium text-[#241912] mt-1">
                          Request a Proposal
                        </h3>
                      </div>

                      {errorMsg && (
                        <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-xs">
                          {errorMsg}
                        </div>
                      )}

                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <label className="block text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8C7A6B] mb-1.5">
                            Full Name
                          </label>
                          <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your full name"
                            className="w-full text-xs font-medium p-3 rounded-xl border border-[#EFE3D6] bg-[#FAF7F2] text-[#241912] focus:outline-none focus:border-[#D8AD56]"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8C7A6B] mb-1.5">
                              Phone Number
                            </label>
                            <input
                              type="tel"
                              required
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              placeholder="Mobile number"
                              className="w-full text-xs font-medium p-3 rounded-xl border border-[#EFE3D6] bg-[#FAF7F2] text-[#241912] focus:outline-none focus:border-[#D8AD56]"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8C7A6B] mb-1.5">
                              Email (Optional)
                            </label>
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="Email address"
                              className="w-full text-xs font-medium p-3 rounded-xl border border-[#EFE3D6] bg-[#FAF7F2] text-[#241912] focus:outline-none focus:border-[#D8AD56]"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8C7A6B] mb-1.5">
                              Occasion
                            </label>
                            <select
                              value={eventType}
                              onChange={(e) => setEventType(e.target.value)}
                              className="w-full text-xs font-medium p-3 rounded-xl border border-[#EFE3D6] bg-[#FAF7F2] text-[#241912] focus:outline-none focus:border-[#D8AD56]"
                            >
                              <option value="Wedding Reception">Wedding Reception</option>
                              <option value="Marriage Ceremony">Marriage Ceremony</option>
                              <option value="Engagement">Engagement</option>
                              <option value="Birthday Celebration">Birthday Celebration</option>
                              <option value="Corporate Conference">Corporate Conference</option>
                              <option value="Other Gathering">Other Celebration</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8C7A6B] mb-1.5">
                              Event Date
                            </label>
                            <input
                              type="date"
                              required
                              value={eventDate}
                              onChange={(e) => setEventDate(e.target.value)}
                              className="w-full text-xs font-medium p-3 rounded-xl border border-[#EFE3D6] bg-[#FAF7F2] text-[#241912] focus:outline-none focus:border-[#D8AD56]"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8C7A6B] mb-1.5">
                            Estimated Guests
                          </label>
                          <input
                            type="number"
                            min="50"
                            max="800"
                            value={expectedGuests}
                            onChange={(e) => setExpectedGuests(e.target.value)}
                            placeholder="e.g. 350"
                            className="w-full text-xs font-medium p-3 rounded-xl border border-[#EFE3D6] bg-[#FAF7F2] text-[#241912] focus:outline-none focus:border-[#D8AD56]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8C7A6B] mb-1.5">
                            Additional Notes (Optional)
                          </label>
                          <textarea
                            rows={3}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Specific seating, catering, or room requirements..."
                            className="w-full text-xs font-medium p-3 rounded-xl border border-[#EFE3D6] bg-[#FAF7F2] text-[#241912] focus:outline-none focus:border-[#D8AD56]"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full py-3.5 px-4 rounded-full bg-[#D8AD56] hover:bg-[#C69940] disabled:opacity-50 text-[#20120B] text-xs font-medium uppercase tracking-wider transition-all duration-300 shadow-md hover:shadow-goldGlow flex items-center justify-center gap-2 mt-2"
                        >
                          <span>{isSubmitting ? 'Submitting...' : 'Request Proposal'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
