'use client';

import { Calendar, Bed, Sparkles } from 'lucide-react';
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/motion/ScrollReveal';

export function HowItWorksSection() {
  const steps = [
    {
      step: '01',
      title: 'Select dates and guests',
      description: 'Choose your check in and check out dates with transparent room rates and zero hidden charges.',
      icon: Calendar,
    },
    {
      step: '02',
      title: 'Choose your room or hall',
      description: 'Explore double rooms, four bed family spaces, luxury suites, or our 800 guest convention hall.',
      icon: Bed,
    },
    {
      step: '03',
      title: 'Arrive and relax in comfort',
      description: 'Experience attentive 24 hour reception assistance, guarded vehicle parking, and full climate control.',
      icon: Sparkles,
    },
  ];

  return (
    <section className="py-20 sm:py-24 bg-white border-y border-[#D8AD56]/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal preset="fade-up" className="text-center max-w-2xl mx-auto mb-14">
          <div className="caption-3 uppercase tracking-[0.25em] text-[#D8AD56] mb-2">
            Seamless Hospitality
          </div>
          <h2 className="heading-3 sm:heading-2 text-[#241912] font-semibold tracking-tight text-wrap-balance">
            How your stay unfolds
          </h2>
          <div className="w-16 h-0.5 bg-[#D8AD56] mx-auto mt-4" />
          <p className="body-5 text-[#786B61] mt-3 text-wrap-pretty">
            Booking your room or reserving the convention hall takes less than two minutes.
          </p>
        </ScrollReveal>

        <StaggerContainer stagger={0.12} className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {steps.map((item) => {
            const Icon = item.icon;
            return (
              <StaggerItem key={item.step}>
                <div className="bg-[#FAF7F2] rounded-2xl border border-[#D8AD56]/25 p-7 flex flex-col justify-between h-full hover:shadow-luxury hover:-translate-y-1.5 transition-all duration-300">
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <span className="font-mono text-2xl font-bold text-[#D8AD56]/70">
                        {item.step}
                      </span>
                      <div className="w-10 h-10 rounded-full bg-white border border-[#D8AD56]/30 flex items-center justify-center text-[#D8AD56]">
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>
                    <h3 className="title-2 font-semibold text-[#241912] text-wrap-balance">
                      {item.title}
                    </h3>
                    <p className="body-6 text-[#786B61] mt-2.5 leading-relaxed text-wrap-pretty">
                      {item.description}
                    </p>
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      </div>
    </section>
  );
}
