'use client';

import { useState, useEffect, useMemo } from 'react';
import NextLink from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
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
} from 'lucide-react';

type TabFilter = 'all' | 'written' | 'rating_only';

export default function TestimonialsPage() {
  const [reviews, setReviews] = useState<GoogleReview[]>(INITIAL_REVIEWS_DATA);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 9; // 9 cards per page for a balanced 3x3 desktop grid

  // Fetch reviews on mount (falls back to initial seed data)
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

  // Filter only published reviews
  const publishedReviews = useMemo(() => {
    return reviews.filter((r) => r.is_published);
  }, [reviews]);

  // Tab filtering
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

  // Counts for tabs
  const countAll = publishedReviews.length;
  const countWritten = publishedReviews.filter(
    (r) => !r.is_rating_only && r.excerpt?.trim().length > 0
  ).length;
  const countRatingOnly = publishedReviews.filter(
    (r) => r.is_rating_only || !r.excerpt?.trim()
  ).length;

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / pageSize));

  // Reset page when tab changes or if out of bounds
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const paginatedReviews = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReviews.slice(start, start + pageSize);
  }, [filteredReviews, currentPage, pageSize]);

  // Get reviewer initials
  const getInitials = (name: string): string => {
    if (!name) return 'TG';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#FDFBF7]">
      <Header transparentInitially={false} />

      <main className="flex-grow pt-24 sm:pt-28 pb-24">
        {/* =========================================================================
            HERO HEADER SECTION
            ========================================================================= */}
        <section className="bg-[#20120B] text-white py-16 sm:py-20 border-b border-[#D8AD56]/20 relative overflow-hidden">
          {/* Subtle Background Ornament */}
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#D8AD56_1px,transparent_1px)] [background-size:24px_24px]" />

          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-[#D8AD56]/40 text-xs text-[#EFE3D6] mb-4">
              <Sparkles className="w-3.5 h-3.5 text-[#D8AD56]" />
              <span className="uppercase tracking-[0.2em] font-semibold text-[#D8AD56] text-[10px]">
                SRI TAYI GRAND • KADIRI
              </span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-white tracking-wide">
              Guest Experiences
            </h1>

            <div className="w-20 h-0.5 bg-[#D8AD56] mx-auto my-4" />

            <p className="text-base sm:text-lg text-[#EFE3D6]/85 font-light max-w-xl mx-auto leading-relaxed">
              Selected five-star reviews from Google.
            </p>

            {/* Google Travel Review Main Link */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <a
                href={GOOGLE_REVIEWS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full bg-[#D8AD56] hover:bg-[#C69940] text-[#20120B] text-xs font-semibold uppercase tracking-wider transition-all duration-300 shadow-luxury hover:shadow-goldGlow hover:-translate-y-0.5"
              >
                <span>Read all reviews on Google</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              <div className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-xs text-[#EFE3D6]/90">
                <div className="flex text-[#D8AD56]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-[#D8AD56]" />
                  ))}
                </div>
                <span className="font-medium text-white ml-1">Individual 5 Stars</span>
                <span className="text-[#EFE3D6]/50">•</span>
                <span className="text-[#EFE3D6]/70">Google review</span>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            LIMITATION & TRANSPARENCY DISCLOSURE
            ========================================================================= */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
          <div className="bg-white rounded-2xl border border-[#D8AD56]/40 p-5 sm:p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#D8AD56]/30 flex items-center justify-center text-[#D8AD56] shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5 text-[#D8AD56]" />
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#241912]">
                  Transparency & Curated Showcase Disclosure
                </h3>
                <p className="text-xs text-[#786B61] mt-1 leading-relaxed max-w-3xl">
                  This collection represents selected individual 5-star ratings from our Google Travel listing. To view the complete and unfiltered range of customer feedback across all ratings, please visit our Google listing.
                </p>
              </div>
            </div>

            <a
              href={GOOGLE_REVIEWS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#D8AD56] hover:text-[#9A7328] font-semibold flex items-center gap-1 whitespace-nowrap transition-colors self-end md:self-center"
            >
              <span>Visit Google Listing</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </section>

        {/* =========================================================================
            TAB FILTERS SECTION
            ========================================================================= */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#EFE3D6] pb-4">
            <div className="flex items-center gap-2 p-1.5 rounded-xl bg-[#FAF7F2] border border-[#EFE3D6]">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-2 ${
                  activeTab === 'all'
                    ? 'bg-[#25150F] text-[#D8AD56] shadow-sm font-semibold'
                    : 'text-[#786B61] hover:text-[#241912]'
                }`}
              >
                <span>All Reviews</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                    activeTab === 'all'
                      ? 'bg-[#D8AD56]/20 text-[#D8AD56]'
                      : 'bg-white text-[#786B61] border border-[#EFE3D6]'
                  }`}
                >
                  {countAll}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('written')}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-2 ${
                  activeTab === 'written'
                    ? 'bg-[#25150F] text-[#D8AD56] shadow-sm font-semibold'
                    : 'text-[#786B61] hover:text-[#241912]'
                }`}
              >
                <span>Written Experiences</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                    activeTab === 'written'
                      ? 'bg-[#D8AD56]/20 text-[#D8AD56]'
                      : 'bg-white text-[#786B61] border border-[#EFE3D6]'
                  }`}
                >
                  {countWritten}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('rating_only')}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-2 ${
                  activeTab === 'rating_only'
                    ? 'bg-[#25150F] text-[#D8AD56] shadow-sm font-semibold'
                    : 'text-[#786B61] hover:text-[#241912]'
                }`}
              >
                <span>Rating Only</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                    activeTab === 'rating_only'
                      ? 'bg-[#D8AD56]/20 text-[#D8AD56]'
                      : 'bg-white text-[#786B61] border border-[#EFE3D6]'
                  }`}
                >
                  {countRatingOnly}
                </span>
              </button>
            </div>

            <div className="text-xs text-[#786B61]">
              Showing <strong className="text-[#241912]">{filteredReviews.length}</strong> genuine 5-star records
            </div>
          </div>
        </section>

        {/* =========================================================================
            REVIEWS CARDS GRID
            ========================================================================= */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {paginatedReviews.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#EFE3D6] p-12 text-center my-8">
              <MessageSquare className="w-10 h-10 text-[#D8AD56]/60 mx-auto mb-3" />
              <h3 className="font-serif text-lg font-bold text-[#241912]">No reviews found in this category</h3>
              <p className="text-xs text-[#786B61] mt-1">Please select another filter tab above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedReviews.map((review) => {
                const isRatingOnly = review.is_rating_only || !review.excerpt?.trim();

                return (
                  <div
                    key={review.id}
                    className="bg-white rounded-2xl border border-[#D8AD56]/25 hover:border-[#D8AD56]/70 p-6 shadow-sm hover:shadow-luxury transition-all duration-300 flex flex-col justify-between hover:-translate-y-1 relative group"
                  >
                    <div>
                      {/* Top Header: 5 Gold Stars & Attribution */}
                      <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-[#FAF7F2]">
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className="w-4 h-4 fill-[#D8AD56] text-[#D8AD56]"
                            />
                          ))}
                        </div>

                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#FAF7F2] border border-[#EFE3D6] text-[10px] text-[#786B61] font-medium">
                          <svg className="w-3 h-3 text-[#4285F4]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                          </svg>
                          <span>Google review</span>
                        </div>
                      </div>

                      {/* Content Area */}
                      {isRatingOnly ? (
                        <div className="py-4 my-2 text-center bg-[#FDFBF7] rounded-xl border border-dashed border-[#EFE3D6] px-4">
                          <span className="inline-block px-3 py-1 rounded-full bg-[#D8AD56]/15 text-[#9A7328] font-semibold text-xs mb-1.5">
                            Individual 5-Star Rating
                          </span>
                          <p className="text-xs text-[#786B61] italic">
                            Google review 5-star rating without written commentary.
                          </p>
                        </div>
                      ) : (
                        <div className="relative mb-5 pt-1">
                          <Quote className="w-6 h-6 text-[#D8AD56]/25 absolute -top-1 -left-1 transform -scale-x-100 pointer-events-none" />
                          <p className="text-xs sm:text-sm text-[#38281F] leading-relaxed italic pl-3 relative z-10 font-normal">
                            &ldquo;{review.excerpt || review.full_text}&rdquo;
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Card Footer: Reviewer & Meta */}
                    <div className="pt-4 border-t border-[#EFE3D6]/70 mt-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-[#25150F] text-[#D8AD56] font-semibold text-xs flex items-center justify-center shrink-0 border border-[#D8AD56]/40 shadow-sm">
                            {getInitials(review.reviewer_name)}
                          </div>
                          <div className="min-w-0">
                            <span className="font-serif font-bold text-xs sm:text-sm text-[#241912] block truncate leading-tight">
                              {review.reviewer_name}
                            </span>
                            <span className="text-[10px] text-[#8C7A6B] block leading-tight mt-0.5">
                              {review.review_date_display}
                            </span>
                          </div>
                        </div>

                        <a
                          href={review.source_url || GOOGLE_REVIEWS_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#D8AD56] hover:text-[#9A7328] transition-colors shrink-0 group-hover:underline"
                          title="Read original review on Google"
                        >
                          <span>Read original</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* =========================================================================
            PAGINATION CONTROLS
            ========================================================================= */}
        {totalPages > 1 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-2xl border border-[#EFE3D6] p-4 shadow-sm">
              <span className="text-xs text-[#786B61]">
                Page <strong className="text-[#241912]">{currentPage}</strong> of{' '}
                <strong className="text-[#241912]">{totalPages}</strong> ({filteredReviews.length} total reviews)
              </span>

              <div className="flex items-center gap-1.5">
                {/* Previous Button */}
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    currentPage === 1
                      ? 'border-[#EFE3D6] text-gray-300 cursor-not-allowed bg-gray-50'
                      : 'border-[#D8AD56]/40 text-[#241912] hover:bg-[#FAF7F2] hover:border-[#D8AD56]'
                  }`}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                {/* Numbered Page Buttons */}
                <div className="flex items-center gap-1">
                  {[...Array(totalPages)].map((_, idx) => {
                    const pageNum = idx + 1;
                    const isCurrent = pageNum === currentPage;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-all ${
                          isCurrent
                            ? 'bg-[#25150F] text-[#D8AD56] shadow-sm'
                            : 'text-[#786B61] hover:bg-[#FAF7F2] hover:text-[#241912]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                {/* Next Button */}
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    currentPage === totalPages
                      ? 'border-[#EFE3D6] text-gray-300 cursor-not-allowed bg-gray-50'
                      : 'border-[#D8AD56]/40 text-[#241912] hover:bg-[#FAF7F2] hover:border-[#D8AD56]'
                  }`}
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* =========================================================================
            BOTTOM CALL TO ACTION: SHARE EXPERIENCE
            ========================================================================= */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 text-center">
          <div className="bg-[#25150F] text-white rounded-3xl p-8 sm:p-10 border border-[#D8AD56]/30 shadow-luxury">
            <span className="text-[10px] uppercase tracking-[0.25em] font-semibold text-[#D8AD56] block mb-2">
              YOUR STORY MATTERS
            </span>
            <h3 className="font-serif text-2xl sm:text-3xl font-normal text-white">
              Have You Stayed With Sri Tayi Grand?
            </h3>
            <p className="text-xs sm:text-sm text-[#EFE3D6]/70 mt-2 max-w-lg mx-auto font-light leading-relaxed">
              We warmly invite our guests to share their authentic thoughts and feedback on Google. Your reviews inspire our continuous pursuit of hospitality excellence in Kadiri.
            </p>
            <div className="mt-6">
              <a
                href={GOOGLE_REVIEWS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#D8AD56] hover:bg-[#C69940] text-[#20120B] text-xs font-bold tracking-wider uppercase transition-all duration-300 shadow-md hover:shadow-goldGlow"
              >
                <span>Write a Google Review</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
