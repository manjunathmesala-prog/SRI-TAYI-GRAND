'use client';

import React, { useState, useEffect, useMemo } from 'react';
import NextLink from 'next/link';
import Image from 'next/image';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import MobileStickyBookingBar from '@/components/anantha/MobileStickyBookingBar';
import FloatingActionBar from '@/components/anantha/FloatingActionBar';
import TayiBrandIcon from '@/components/anantha/TayiBrandIcon';
import { GoogleReview } from '@/types';
import { INITIAL_REVIEWS_DATA, GOOGLE_REVIEWS_URL } from '@/lib/reviews-data';
import {
  Star,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Quote,
  ShieldCheck,
  MessageSquare,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

type TabFilter = 'all' | 'written' | 'rating_only';

export default function TestimonialsPage() {
  const [reviews, setReviews] = useState<GoogleReview[]>(INITIAL_REVIEWS_DATA);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 9;

  useEffect(() => {
    async function fetchReviews() {
      try {
        const res = await fetch('/api/reviews');
        if (res.ok) {
          const data = await res.json();
          if (data.reviews && Array.isArray(data.reviews)) {
            setReviews(data.reviews);
          }
        }
      } catch (err) {
        console.warn('Could not load live reviews, using seed dataset:', err);
      }
    }
    fetchReviews();
  }, []);

  const publishedReviews = useMemo(() => {
    return reviews.filter((r) => r.is_published);
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    switch (activeTab) {
      case 'written':
        return publishedReviews.filter((r) => !r.is_rating_only && r.excerpt?.trim().length > 0);
      case 'rating_only':
        return publishedReviews.filter((r) => r.is_rating_only || !r.excerpt?.trim());
      case 'all':
      default:
        return publishedReviews;
    }
  }, [publishedReviews, activeTab]);

  const countAll = publishedReviews.length;
  const countWritten = publishedReviews.filter(
    (r) => !r.is_rating_only && r.excerpt?.trim().length > 0
  ).length;
  const countRatingOnly = publishedReviews.filter(
    (r) => r.is_rating_only || !r.excerpt?.trim()
  ).length;

  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / pageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const paginatedReviews = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReviews.slice(start, start + pageSize);
  }, [filteredReviews, currentPage, pageSize]);

  const getInitials = (name: string): string => {
    if (!name) return 'TG';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <main className="min-h-screen flex flex-col bg-[#F8F3E9] text-[#33271D]">
      <Header transparentInitially={false} />

      {/* Hero Header */}
      <section className="relative z-20 w-full py-16 sm:py-24 px-4 sm:px-6 lg:px-8 text-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/hotel/reception-desk-photo-enhanced.png"
            alt="Sri Tayi Grand Guest Reviews"
            fill
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-[#21180F]/75 backdrop-blur-[2px]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto space-y-3 pt-6 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] font-semibold text-[#B18A4A]">
            <TayiBrandIcon size={18} />
            <span>AUTHENTIC EXPERIENCES</span>
            <TayiBrandIcon size={18} />
          </div>
          <h1 className="text-3xl sm:text-5xl font-serif text-white font-normal tracking-tight">
            Guest Testimonials
          </h1>
          <p className="text-sm sm:text-base text-[#F8F3E9]/85 font-serif italic max-w-lg mx-auto">
            Honest reflections, five-star experiences, and warm memories shared by our valued visitors in Kadiri.
          </p>

          <div className="pt-2">
            <a
              href={GOOGLE_REVIEWS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/15 hover:bg-white/25 border border-white/30 text-white text-xs uppercase tracking-wider font-semibold transition-all backdrop-blur-sm"
            >
              <span>View On Google Reviews</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </section>

      {/* Review Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 mb-12">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-5 py-2.5 rounded-full text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-[#8D672F] text-white shadow-md'
                : 'bg-white text-[#786A5B] border border-[#E6D9C5] hover:bg-[#FAF6EE]'
            }`}
          >
            All Reviews ({countAll})
          </button>
          <button
            onClick={() => setActiveTab('written')}
            className={`px-5 py-2.5 rounded-full text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
              activeTab === 'written'
                ? 'bg-[#8D672F] text-white shadow-md'
                : 'bg-white text-[#786A5B] border border-[#E6D9C5] hover:bg-[#FAF6EE]'
            }`}
          >
            Detailed Reviews ({countWritten})
          </button>
          <button
            onClick={() => setActiveTab('rating_only')}
            className={`px-5 py-2.5 rounded-full text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
              activeTab === 'rating_only'
                ? 'bg-[#8D672F] text-white shadow-md'
                : 'bg-white text-[#786A5B] border border-[#E6D9C5] hover:bg-[#FAF6EE]'
            }`}
          >
            Star Ratings ({countRatingOnly})
          </button>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 reveal-stagger">
          {paginatedReviews.map((review) => {
            const initials = getInitials(review.reviewer_name);
            return (
              <div
                key={review.id}
                className="bg-white rounded-3xl border border-[#E6D9C5] p-6 sm:p-7 shadow-luxury luxury-card-hover flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1 text-amber-500">
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
                    <Quote className="w-6 h-6 text-[#8D672F]/30 group-hover:text-[#8D672F] transition-colors" />
                  </div>

                  <p className="text-xs sm:text-sm text-[#786A5B] font-light leading-relaxed line-clamp-4 italic">
                    &ldquo;{review.full_text || review.excerpt || 'Excellent stay and great hospitality at Sri Tayi Grand.'}&rdquo;
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-5 mt-5 border-t border-[#E6D9C5]/60">
                  <div className="w-10 h-10 rounded-full bg-[#FAF6EE] text-[#8D672F] border border-[#E6D9C5] flex items-center justify-center font-serif font-bold text-xs shrink-0 shadow-xs">
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
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-12">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2.5 rounded-full border border-[#E6D9C5] bg-white text-[#33271D] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#FAF6EE]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs text-[#786A5B] font-medium px-4">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2.5 rounded-full border border-[#E6D9C5] bg-white text-[#33271D] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#FAF6EE]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </section>

      <MobileStickyBookingBar />
      <FloatingActionBar />
      <Footer />
    </main>
  );
}
