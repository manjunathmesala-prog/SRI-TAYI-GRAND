'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { 
  Phone, 
  Mail, 
  MapPin, 
  MessageSquare, 
  ArrowRight,
  CheckCircle2, 
  Navigation 
} from 'lucide-react';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('Room Booking');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F1E9]">
      <Header transparentInitially={false} />

      <main className="flex-grow pt-24 sm:pt-28 pb-24">
        {/* Page Header */}
        <section className="bg-[#20120B] text-white py-16 sm:py-20 mb-14 border-b border-[#D8AD56]/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <span className="text-[11px] uppercase tracking-[0.25em] font-semibold text-[#D8AD56] block mb-3">
              Concierge
            </span>
            <h1 className="font-serif text-3xl sm:text-5xl font-normal tracking-tight">
              Contact & Location
            </h1>
            <p className="mt-4 text-sm sm:text-base text-[#EFE3D6]/80 max-w-lg mx-auto font-light leading-relaxed">
              Our front desk and concierge team in Kadiri are at your service 24 hours a day.
            </p>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Concierge & Address (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white rounded-2xl border border-[#D8AD56]/25 p-7 sm:p-8 shadow-luxury space-y-6">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8C7A6B] block mb-1">
                    Sanctuary Address
                  </span>
                  <h2 className="font-serif text-xl font-medium text-[#241912]">
                    Sri Tayi Grand
                  </h2>
                  <p className="text-xs text-[#786B61] mt-2 leading-relaxed font-light">
                    Bypass Road, Opp. Girls High School,<br />
                    Tadipatri – Pulivendula – Kadiri Road,<br />
                    Kadiri – 515591, Andhra Pradesh, India.
                  </p>
                  <a
                    href="https://maps.google.com/?q=Sri+Tayi+Grand+Kadiri"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#D8AD56] hover:text-[#C69940] mt-3 font-medium transition-colors"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>View on Google Maps</span>
                  </a>
                </div>

                <div className="pt-6 border-t border-[#F8F1E9] space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#FAF7F2] text-[#D8AD56] border border-[#EFE3D6] flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8C7A6B] uppercase tracking-wider block font-medium">Front Desk (24/7)</span>
                      <a href="tel:08494223379" className="text-xs font-medium text-[#241912] hover:text-[#D8AD56]">
                        084942 23379
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#FAF7F2] text-[#25D366] border border-[#EFE3D6] flex items-center justify-center shrink-0">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8C7A6B] uppercase tracking-wider block font-medium">WhatsApp Concierge</span>
                      <a
                        href="https://wa.me/918494223379"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-[#241912] hover:text-[#D8AD56]"
                      >
                        +91 84942 23379
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#FAF7F2] text-[#D8AD56] border border-[#EFE3D6] flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8C7A6B] uppercase tracking-wider block font-medium">Email Inquiries</span>
                      <a href="mailto:contact@sritayigrand.com" className="text-xs font-medium text-[#241912] hover:text-[#D8AD56]">
                        contact@sritayigrand.com
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Physical Reception Desk Photo */}
              <div className="relative aspect-[16/10] rounded-2xl overflow-hidden shadow-luxury border border-[#D8AD56]/25 group bg-[#20120B]">
                <Image
                  src="/images/hotel/reception-desk-photo-enhanced.png"
                  alt="Front Desk Concierge at Sri Tayi Grand"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  sizes="(max-width: 1024px) 100vw, 40vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-5">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#D8AD56] font-semibold block mb-0.5">Concierge Desk</span>
                    <span className="text-sm font-serif font-medium text-white tracking-wide">24/7 Reception & Guest Welcome</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Inquiries Form (7 cols) */}
            <div className="lg:col-span-7">
              <div className="bg-white rounded-2xl border border-[#D8AD56]/25 p-7 sm:p-9 shadow-luxury">
                {submitted ? (
                  <div className="py-12 text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h2 className="font-serif text-2xl font-normal text-[#241912]">
                      Message Received
                    </h2>
                    <p className="text-xs text-[#786B61] font-light max-w-sm mx-auto leading-relaxed">
                      Thank you for contacting Sri Tayi Grand. Our team will attend to your inquiry shortly.
                    </p>
                    <button
                      onClick={() => setSubmitted(false)}
                      className="text-xs text-[#D8AD56] hover:underline"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mb-6">
                      <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8C7A6B]">
                        Connect With Us
                      </span>
                      <h2 className="font-serif text-2xl font-medium text-[#241912] mt-1">
                        Send an Inquiry
                      </h2>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8C7A6B] mb-1.5">
                            Your Name
                          </label>
                          <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Full name"
                            className="w-full text-xs font-medium p-3 rounded-xl border border-[#EFE3D6] bg-[#FAF7F2] text-[#241912] focus:outline-none focus:border-[#D8AD56]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8C7A6B] mb-1.5">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="Phone number"
                            className="w-full text-xs font-medium p-3 rounded-xl border border-[#EFE3D6] bg-[#FAF7F2] text-[#241912] focus:outline-none focus:border-[#D8AD56]"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8C7A6B] mb-1.5">
                            Email
                          </label>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email address"
                            className="w-full text-xs font-medium p-3 rounded-xl border border-[#EFE3D6] bg-[#FAF7F2] text-[#241912] focus:outline-none focus:border-[#D8AD56]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8C7A6B] mb-1.5">
                            Topic
                          </label>
                          <select
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full text-xs font-medium p-3 rounded-xl border border-[#EFE3D6] bg-[#FAF7F2] text-[#241912] focus:outline-none focus:border-[#D8AD56]"
                          >
                            <option value="Room Booking">Room Reservation</option>
                            <option value="Convention Hall">Convention Hall</option>
                            <option value="Directions">Travel & Directions</option>
                            <option value="General Query">General Inquiry</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase tracking-[0.2em] font-semibold text-[#8C7A6B] mb-1.5">
                          Message
                        </label>
                        <textarea
                          rows={4}
                          required
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="How may our concierge assist you?"
                          className="w-full text-xs font-medium p-3 rounded-xl border border-[#EFE3D6] bg-[#FAF7F2] text-[#241912] focus:outline-none focus:border-[#D8AD56]"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3.5 px-4 rounded-full bg-[#D8AD56] hover:bg-[#C69940] text-[#20120B] text-xs font-medium uppercase tracking-wider transition-all duration-300 shadow-md hover:shadow-goldGlow flex items-center justify-center gap-2 mt-2"
                      >
                        <span>Send Message</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
