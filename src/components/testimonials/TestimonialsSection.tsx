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

  // Fetch reviews from /api/reviews?featured=true, fall back to reviewsData
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

  // Update visible items based on screen width
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

  // Clamp currentIndex when itemsPerPage changes
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
      className="py-20 sm:py-28 bg-[#FAF7F2] border-y border-[#D8AD56]/20 relative overflow-hidden"
      aria-labelledby="testimonials-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] font-semibold text-[#D8AD56] mb-2">
              <span className="w-6 h-[1px] bg-[#D8AD56]" />
              <span>GUEST REVIEWS</span>
              <span className="w-6 h-[1px] bg-[#D8AD56]" />
            </div>
            <h2
              id="testimonials-heading"
              className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-[#241912]"
            >
              Guest Experiences
            </h2>
            <div className="w-16 h-0.5 bg-[#D8AD56] my-3.5" />
            <p className="text-sm text-[#786B61] font-light">
              Selected five-star reviews from Google.
            </p>
            <div className="mt-2.5">
              <a
                href={GOOGLE_REVIEWS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D8AD56] hover:text-[#C69940] transition-colors group"
              >
                <span>Read all reviews on Google</span>
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
                        ? 'w-6 bg-[#D8AD56]'
                        : 'w-2 bg-[#D8AD56]/30 hover:bg-[#D8AD56]/60'
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                aria-label="Previous testimonials"
                className="w-10 h-10 rounded-full border border-[#D8AD56]/40 bg-white text-[#241912] flex items-center justify-center hover:bg-[#FAF7F2] hover:border-[#D8AD56] disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D8AD56]"
              >
                <ChevronLeft className="w-5 h-5 text-[#382216]" />
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={currentIndex >= maxIndex}
                aria-label="Next testimonials"
                className="w-10 h-10 rounded-full border border-[#D8AD56]/40 bg-white text-[#241912] flex items-center justify-center hover:bg-[#FAF7F2] hover:border-[#D8AD56] disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#D8AD56]"
              >
                <ChevronRight className="w-5 h-5 text-[#382216]" />
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
          className="focus:outline-none focus:ring-2 focus:ring-[#D8AD56]/50 rounded-2xl"
        >
          <div className="overflow-hidden -mx-3">
            <div
              className="flex transition-transform duration-500 ease-out motion-reduce:transition-none"
              style={{
                transform: `translateX(-${currentIndex * (100 / itemsPerPage)}%)`,
              }}
            >
              {reviews.map((review, index) => {
                const initials = getInitials(review.reviewer_name);
                return (
                  <div
                    key={review.id}
                    role="group"
                    aria-roledescription="slide"
                    aria-label={`Review ${index + 1} of ${reviews.length}: ${review.reviewer_name}`}
                    style={{
                      flex: `0 0 ${100 / itemsPerPage}%`,
                      maxWidth: `${100 / itemsPerPage}%`,
                    }}
                    className="px-3 py-2 flex flex-col"
                  >
                    <div className="bg-white rounded-2xl border border-[#D8AD56]/25 p-6 sm:p-7 shadow-luxury hover:shadow-luxuryHover transition-all duration-300 flex flex-col justify-between h-full group">
                      <div>
                        {/* Reviewer Header: Initials Badge & Name */}
                        <div className="flex items-center gap-3.5 mb-4">
                          <div
                            className="w-11 h-11 rounded-full bg-[#382216] text-[#D8AD56] flex items-center justify-center font-serif font-bold text-sm tracking-wider border border-[#D8AD56]/30 shadow-sm shrink-0"
                            aria-hidden="true"
                          >
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-serif font-bold text-sm sm:text-base text-[#241912] truncate">
                              {review.reviewer_name}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {/* Five Gold Stars */}
                              <div
                                className="flex items-center gap-0.5"
                                aria-label="5 out of 5 stars"
                              >
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className="w-3.5 h-3.5 fill-[#D8AD56] text-[#D8AD56]"
                                    aria-hidden="true"
                                  />
                                ))}
                              </div>
                            </div>
                          </div>

                          <Quote
                            className="w-6 h-6 text-[#D8AD56]/30 shrink-0 hidden sm:block"
                            aria-hidden="true"
                          />
                        </div>

                        {/* Review Excerpt in Quotes */}
                        <p className="text-xs sm:text-sm text-[#382216]/90 font-light leading-relaxed italic my-3 line-clamp-4">
                          &ldquo;{review.excerpt}&rdquo;
                        </p>
                      </div>

                      {/* Card Footer: Metadata & Link */}
                      <div className="mt-5 pt-3.5 border-t border-[#FAF7F2]">
                        <div className="flex items-center justify-between text-xs text-[#786B61] mb-2.5">
                          <span className="font-light">{review.review_date_display}</span>
                          <span className="inline-flex items-center gap-1.5 font-medium text-[#382216]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#D8AD56]" />
                            Google review
                          </span>
                        </div>

                        <a
                          href={review.source_url || GOOGLE_REVIEWS_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#D8AD56] hover:text-[#C69940] transition-colors group/link"
                        >
                          <span>Read original review</span>
                          <ExternalLink className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Mobile Pagination Controls */}
        {reviews.length > itemsPerPage && (
          <div className="flex md:hidden items-center justify-center gap-4 mt-6">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              aria-label="Previous testimonials"
              className="w-9 h-9 rounded-full border border-[#D8AD56]/40 bg-white text-[#241912] flex items-center justify-center hover:bg-[#FAF7F2] disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <ChevronLeft className="w-4 h-4 text-[#382216]" />
            </button>

            <div className="flex items-center gap-1.5" aria-hidden="true">
              {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`Go to review slide ${idx + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentIndex
                      ? 'w-5 bg-[#D8AD56]'
                      : 'w-1.5 bg-[#D8AD56]/30 hover:bg-[#D8AD56]/60'
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleNext}
              disabled={currentIndex >= maxIndex}
              aria-label="Next testimonials"
              className="w-9 h-9 rounded-full border border-[#D8AD56]/40 bg-white text-[#241912] flex items-center justify-center hover:bg-[#FAF7F2] disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              <ChevronRight className="w-4 h-4 text-[#382216]" />
            </button>
          </div>
        )}

        {/* Action Buttons: View More Testimonials + Read all on Google */}
        <div className="mt-12 text-center flex flex-col sm:flex-row items-center justify-center gap-4">
          <NextLink
            href="/testimonials"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#D8AD56] text-[#25150F] text-xs sm:text-sm font-semibold hover:bg-[#C69940] transition-colors shadow-sm inline-flex items-center justify-center gap-2"
          >
            <span>View More Testimonials</span>
            <ArrowRight className="w-4 h-4" />
          </NextLink>

          <a
            href={GOOGLE_REVIEWS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-6 py-3 rounded-xl border border-[#D8AD56]/40 bg-white/60 text-[#382216] text-xs sm:text-sm font-medium hover:bg-white hover:border-[#D8AD56] transition-colors inline-flex items-center justify-center gap-2 shadow-xs"
          >
            <span>Read all reviews on Google</span>
            <ExternalLink className="w-4 h-4 text-[#D8AD56]" />
          </a>
        </div>
      </div>
    </section>
  );
}

export default TestimonialsSection;
