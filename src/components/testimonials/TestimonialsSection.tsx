'use client';

import React, { useState, useEffect, useCallback } from 'react';
import NextLink from 'next/link';
import {
  Star,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ArrowRight,
  Quote,
} from 'lucide-react';
import { GoogleReview } from '@/types';
import { featuredReviews, GOOGLE_REVIEWS_URL } from '@/lib/reviews-data';
import TayiBrandIcon from '@/components/anantha/TayiBrandIcon';

function getInitials(name: string): string {
  if (!name) return 'G';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function TestimonialsSection() {
  const [reviews, setReviews] = useState<GoogleReview[]>(() =>
    featuredReviews.slice(0, 6)
  );
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [itemsPerPage, setItemsPerPage] = useState<number>(3);

  useEffect(() => {
    let isMounted = true;
    async function fetchReviews() {
      try {
        const res = await fetch('/api/reviews?featured=true');
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.reviews;
        if (isMounted && Array.isArray(list) && list.length > 0) {
          setReviews(list.slice(0, 6));
        }
      } catch {
        // Fallback data already loaded
      }
    }
    fetchReviews();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 768) {
        setItemsPerPage(1);
      } else if (window.innerWidth < 1024) {
        setItemsPerPage(2);
      } else {
        setItemsPerPage(3);
      }
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const maxIndex = Math.max(0, reviews.length - itemsPerPage);

  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(maxIndex);
    }
  }, [currentIndex, maxIndex]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(maxIndex, prev + 1));
  }, [maxIndex]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    },
    [handlePrev, handleNext]
  );

  return (
    <section
      className="py-20 sm:py-28 bg-[#FAF5EB] border-y border-[#E6D9C5] relative overflow-hidden"
      aria-labelledby="testimonials-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6 reveal-on-scroll">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] font-semibold text-[#43001F] mb-2">
              <TayiBrandIcon size={16} />
              <span>GUEST REVIEWS &amp; EXPERIENCES</span>
            </div>
            <h2
              id="testimonials-heading"
              className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-[#33271D]"
            >
              The Trust of Our Guests
            </h2>
            <div className="w-16 h-0.5 bg-[#43001F] my-3.5" />
            <p className="text-sm text-[#786A5B] font-light">
              Authentic verified five-star ratings and experiences from Google Reviews.
            </p>
            <div className="mt-2.5">
              <a
                href={GOOGLE_REVIEWS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#43001F] hover:text-[#2E0015] transition-colors group"
              >
                <span>Read all verified reviews on Google</span>
                <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>
          </div>

          {/* Navigation Controls (Desktop / Tablet) */}
          {reviews.length > itemsPerPage && (
            <div className="flex items-center gap-3 self-end md:self-auto">
              <div className="flex items-center gap-1.5 mr-2" aria-hidden="true">
                {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    aria-label={`Go to review slide ${idx + 1}`}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      idx === currentIndex
                        ? 'w-6 bg-[#43001F]'
                        : 'w-2 bg-[#43001F]/30 hover:bg-[#43001F]/60'
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                aria-label="Previous testimonials"
                className="w-10 h-10 rounded-full border border-[#E6D9C5] bg-white text-[#33271D] flex items-center justify-center hover:bg-[#FAF6EE] hover:border-[#43001F] disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <ChevronLeft className="w-5 h-5 text-[#43001F]" />
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={currentIndex >= maxIndex}
                aria-label="Next testimonials"
                className="w-10 h-10 rounded-full border border-[#E6D9C5] bg-white text-[#33271D] flex items-center justify-center hover:bg-[#FAF6EE] hover:border-[#43001F] disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <ChevronRight className="w-5 h-5 text-[#43001F]" />
              </button>
            </div>
          )}
        </div>

        {/* Carousel Slider */}
        <div
          role="region"
          aria-roledescription="carousel"
          aria-label="Guest Experiences carousel"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          className="focus:outline-none rounded-2xl"
        >
          <div className="overflow-hidden -mx-3">
            <div
              className="flex transition-transform duration-500 ease-out motion-reduce:transition-none"
              style={{
                transform: `translateX(-${currentIndex * (100 / itemsPerPage)}%)`,
              }}
            >
              {reviews.map((review) => {
                const initials = getInitials(review.reviewer_name);
                return (
                  <div
                    key={review.id}
                    role="group"
                    aria-roledescription="slide"
                    aria-label={`${review.reviewer_name}'s review`}
                    className="flex-shrink-0 px-3 transition-opacity duration-300"
                    style={{ width: `${100 / itemsPerPage}%` }}
                  >
                    <div className="bg-white rounded-2xl border border-[#E6D9C5] p-6 sm:p-7 h-full flex flex-col justify-between shadow-luxury luxury-card-hover group">
                      <div>
                        {/* Rating & Quote Icon */}
                        <div className="flex items-center justify-between mb-4">
                          <div
                            className="flex items-center gap-1 text-amber-500"
                            aria-label={`${review.rating} out of 5 stars`}
                          >
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < review.rating
                                    ? 'fill-amber-500 text-amber-500'
                                    : 'text-stone-300'
                                }`}
                              />
                            ))}
                          </div>
                          <Quote className="w-6 h-6 text-[#43001F]/30 group-hover:text-[#43001F] transition-colors" />
                        </div>

                        {/* Review Text */}
                        <p className="text-xs sm:text-sm text-[#786A5B] font-light leading-relaxed line-clamp-4 italic">
                          &ldquo;{review.full_text || review.excerpt || 'Excellent stay and hospitality at Sri Tayi Grand.'}&rdquo;
                        </p>
                      </div>

                      {/* Reviewer Meta */}
                      <div className="flex items-center gap-3 pt-5 mt-5 border-t border-[#E6D9C5]/60">
                        <div className="w-10 h-10 rounded-full bg-[#FAF6EE] text-[#43001F] border border-[#E6D9C5] flex items-center justify-center font-serif font-bold text-xs shrink-0 shadow-xs">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-semibold text-[#33271D] truncate">
                            {review.reviewer_name}
                          </div>
                          <div className="text-[11px] text-[#786A5B]/80 flex items-center gap-1.5">
                            <span className="text-emerald-700 font-medium">Verified Guest</span>
                            <span>•</span>
                            <span>{review.review_date_display}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* View All Reviews CTA */}
        <div className="text-center mt-12">
          <NextLink
            href="/testimonials"
            className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-white hover:bg-[#FAF6EE] text-[#33271D] border border-[#E6D9C5] text-xs uppercase tracking-[0.16em] font-semibold shadow-sm transition-all hover:-translate-y-0.5"
          >
            <span>View All Guest Reviews</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#43001F]" />
          </NextLink>
        </div>
      </div>
    </section>
  );
}
