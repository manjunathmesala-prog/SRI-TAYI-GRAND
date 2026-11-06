'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import MobileStickyBookingBar from '@/components/anantha/MobileStickyBookingBar';
import FloatingActionBar from '@/components/anantha/FloatingActionBar';
import TayiBrandIcon from '@/components/anantha/TayiBrandIcon';
import { 
  Phone, 
  Mail, 
  MapPin, 
  MessageSquare, 
  ArrowRight,
  CheckCircle2, 
  Navigation,
  Clock,
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
    <main className="min-h-screen flex flex-col bg-[#F8F3E9] text-[#33271D]">
      <Header transparentInitially={false} />

      {/* Hero Header */}
      <section className="relative z-20 w-full py-16 sm:py-24 px-4 sm:px-6 lg:px-8 text-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/hotel/hotel-exterior-hero-clean.jpg"
            alt="Sri Tayi Grand Contact & Location"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-[#21180F]/75 backdrop-blur-[2px]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto space-y-3 pt-6 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] font-semibold text-[#B18A4A]">
            <TayiBrandIcon size={18} />
            <span>CONCIERGE &amp; RECEPTION</span>
            <TayiBrandIcon size={18} />
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif text-white font-normal tracking-tight">
            Contact &amp; Location
          </h1>
          <p className="text-sm sm:text-base text-[#F8F3E9]/85 font-serif italic max-w-lg mx-auto">
            Our front desk and concierge team in Kadiri are at your service 24 hours a day, 7 days a week.
          </p>
        </div>
      </section>

      {/* Contact Content Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Address & Direct Channels (5 cols) */}
          <div className="lg:col-span-5 space-y-6 reveal-on-scroll">
            <div className="bg-white rounded-3xl border border-[#E6D9C5] p-7 sm:p-8 shadow-luxury space-y-6">
              <div>
                <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-[#43001F] block mb-1">
                  HOTEL ADDRESS
                </span>
                <h2 className="font-serif text-2xl font-bold text-[#33271D]">
                  Sri Tayi Grand
                </h2>
                <p className="text-xs text-[#786A5B] mt-2 leading-relaxed font-light">
                  4585+F8J, Opp. Girls High School,<br />
                  Bypass Road, Tadipatri – Pulivendula – Kadiri Road,<br />
                  Revenue Colony, Kadiri – 515591, Andhra Pradesh.
                </p>
                <a
                  href="https://maps.google.com/?q=Sri+Tayi+Grand+Kadiri"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-[#43001F] hover:text-[#2E0015] mt-3 font-semibold transition-colors"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Open in Google Maps</span>
                </a>
              </div>

              <div className="pt-6 border-t border-[#E6D9C5]/60 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F8F3E9] text-[#43001F] border border-[#E6D9C5] flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-[#786A5B] uppercase tracking-wider block font-semibold">Front Desk (24/7)</span>
                    <a href="tel:08494223379" className="text-xs font-bold text-[#33271D] hover:text-[#43001F]">
                      084942 23379
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F8F3E9] text-emerald-600 border border-[#E6D9C5] flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-[#786A5B] uppercase tracking-wider block font-semibold">WhatsApp Concierge</span>
                    <a
                      href="https://wa.me/918494223379"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-[#33271D] hover:text-emerald-700"
                    >
                      +91 84942 23379
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F8F3E9] text-[#43001F] border border-[#E6D9C5] flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-[#786A5B] uppercase tracking-wider block font-semibold">Email Enquiries</span>
                    <a href="mailto:contact@sritayigrand.com" className="text-xs font-bold text-[#33271D] hover:text-[#43001F]">
                      contact@sritayigrand.com
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F8F3E9] text-[#43001F] border border-[#E6D9C5] flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-[#786A5B] uppercase tracking-wider block font-semibold">Check-In / Out</span>
                    <span className="text-xs text-[#33271D] font-medium">Check-In: 12:00 PM • Check-Out: 11:00 AM</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Google Maps Card */}
            <div className="relative aspect-[16/10] rounded-3xl overflow-hidden border border-[#E6D9C5] shadow-luxury bg-[#FAF6EE] flex items-center justify-center p-6 text-center">
              <div>
                <MapPin className="w-8 h-8 text-[#43001F] mx-auto mb-2" />
                <h4 className="font-serif font-bold text-base text-[#33271D]">Google Maps Navigation</h4>
                <p className="text-xs text-[#786A5B] mt-1 max-w-xs mx-auto">
                  Click below for turn-by-turn driving directions to Sri Tayi Grand.
                </p>
                <a
                  href="https://maps.google.com/?q=Sri+Tayi+Grand+Kadiri"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-[#43001F] hover:bg-[#2E0015] text-white text-xs font-semibold uppercase tracking-wider shadow-sm transition-all"
                >
                  <span>Start Navigation</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Contact Message Form (7 cols) */}
          <div className="lg:col-span-7 reveal-scale">
            <div className="bg-white rounded-3xl p-7 sm:p-9 border border-[#E6D9C5] shadow-luxury">
              <div className="border-b border-[#E6D9C5]/80 pb-4 mb-6">
                <span className="text-xs uppercase tracking-[0.25em] font-semibold text-[#43001F] block">
                  SEND A MESSAGE
                </span>
                <h3 className="font-serif text-2xl font-bold text-[#33271D]">
                  How May We Assist You?
                </h3>
                <p className="text-xs text-[#786A5B] mt-1 font-light">
                  Please fill out the form below and our team will get back to you promptly.
                </p>
              </div>

              {submitted ? (
                <div className="p-8 rounded-2xl bg-[#FAF5EB] border border-[#E6D9C5] text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="font-serif font-bold text-lg text-[#33271D]">Message Sent Successfully</h4>
                  <p className="text-xs text-[#786A5B]">
                    Thank you, <strong className="text-[#33271D]">{name}</strong>. Our front desk team has received your message and will contact you shortly.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-[#33271D] uppercase tracking-wider text-[11px] mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full px-4 py-2.5 rounded-xl border border-[#E6D9C5] bg-[#FAF6EE] text-[#33271D] focus:border-[#43001F] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-[#33271D] uppercase tracking-wider text-[11px] mb-1">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="10-digit mobile number"
                        className="w-full px-4 py-2.5 rounded-xl border border-[#E6D9C5] bg-[#FAF6EE] text-[#33271D] focus:border-[#43001F] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#33271D] uppercase tracking-wider text-[11px] mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="yourname@domain.com"
                        className="w-full px-4 py-2.5 rounded-xl border border-[#E6D9C5] bg-[#FAF6EE] text-[#33271D] focus:border-[#43001F] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-[#33271D] uppercase tracking-wider text-[11px] mb-1">
                      Subject
                    </label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-[#E6D9C5] bg-[#FAF6EE] text-[#33271D] focus:border-[#43001F] focus:outline-none"
                    >
                      <option value="Room Booking">Room Booking Enquiry</option>
                      <option value="Convention Hall">Convention Hall Enquiry</option>
                      <option value="Group Stay">Group Stay & Functions</option>
                      <option value="General Information">General Feedback / Inquiry</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-[#33271D] uppercase tracking-wider text-[11px] mb-1">
                      Message *
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Tell us about your dates, number of guests, or special requirements..."
                      className="w-full px-4 py-2.5 rounded-xl border border-[#E6D9C5] bg-[#FAF6EE] text-[#33271D] focus:border-[#43001F] focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 px-6 rounded-full bg-[#43001F] hover:bg-[#2E0015] active:scale-[0.98] text-white text-xs uppercase tracking-[0.16em] font-semibold shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 group"
                  >
                    <span>Send Message</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </form>
              )}
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
