'use client';

import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { ScrollReveal } from '@/components/motion/ScrollReveal';

interface FaqItem {
  question: string;
  answer: string;
}

const faqs: FaqItem[] = [
  {
    question: 'What are the standard check in and check out timings?',
    answer:
      'Check in begins at 12:00 PM and check out is until 11:00 AM. Early check in and late check out can be arranged based on room availability through our 24 hour front desk.',
  },
  {
    question: 'Where is Sri Tayi Grand located in Kadiri?',
    answer:
      'We are situated on the Bypass Road opposite Girls High School in Revenue Colony, offering direct road access for travelers passing through the Tadipatri and Pulivendula route.',
  },
  {
    question: 'What is the starting price per night and what is included?',
    answer:
      'Rooms start from ₹1,800 per night for a Double Room. All bookings include full climate control, high speed Wi Fi, secure vehicle parking, and daily housekeeping with zero hidden fees.',
  },
  {
    question: 'How many guests can the grand convention hall accommodate?',
    answer:
      'Our air conditioned convention hall comfortably accommodates up to 800 guests, complete with royal chandelier lighting, stage setup, dedicated dining facilities, and ample parking.',
  },
  {
    question: 'Is there safe vehicle parking available on premises?',
    answer:
      'Yes. We provide complimentary, guarded parking for personal cars and tourist buses directly within our hotel premises with 24 hour surveillance.',
  },
  {
    question: 'Can extra guests or beds be accommodated in the room?',
    answer:
      'Yes. Extra guests can be accommodated for ₹300 per night up to the room capacity limit, with clean fresh bedding and amenities provided.',
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="py-20 sm:py-28 bg-[#FAF7F2] border-t border-[#D8AD56]/20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal preset="fade-up" className="text-center mb-12 sm:mb-16">
          <div className="caption-3 uppercase tracking-[0.25em] text-[#D8AD56] mb-2">
            Frequently Asked Questions
          </div>
          <h2 className="heading-3 sm:heading-2 text-[#241912] font-semibold tracking-tight text-wrap-balance">
            Everything you need to know before your stay
          </h2>
          <div className="w-16 h-0.5 bg-[#D8AD56] mx-auto mt-4" />
        </ScrollReveal>

        <div className="space-y-3.5">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="bg-white rounded-2xl border border-[#D8AD56]/25 overflow-hidden transition-all duration-300 shadow-sm hover:shadow-luxury"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D8AD56]"
                  aria-expanded={isOpen}
                >
                  <span className="title-3 text-[#241912] font-semibold text-wrap-balance">
                    {faq.question}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-[#FAF7F2] text-[#D8AD56] flex items-center justify-center shrink-0">
                    {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 pt-1 text-[#786B61] body-5 leading-relaxed text-wrap-pretty border-t border-[#FAF7F2]">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
