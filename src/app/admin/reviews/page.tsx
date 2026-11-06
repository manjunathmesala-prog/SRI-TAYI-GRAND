'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { GoogleReview } from '@/types';
import { INITIAL_REVIEWS_DATA, GOOGLE_REVIEWS_URL } from '@/lib/reviews-data';
import { useRealtimeSync } from '@/lib/realtime-client';
import {
  MessageSquareQuote,
  Star,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Search,
  RefreshCw,
  X,
  HelpCircle,
  SlidersHorizontal,
} from 'lucide-react';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<GoogleReview[]>(INITIAL_REVIEWS_DATA);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'featured' | 'published' | 'unpublished' | 'rating_only'>('all');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [reviewerName, setReviewerName] = useState<string>('');
  const [reviewText, setReviewText] = useState<string>('');
  const [reviewDate, setReviewDate] = useState<string>('a month ago');
  const [sourceUrl, setSourceUrl] = useState<string>(GOOGLE_REVIEWS_URL);
  const [isRatingOnly, setIsRatingOnly] = useState<boolean>(false);
  const [ratingValue] = useState<number>(5); // Strictly 5 stars
  const [importSubmitting, setImportSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Auto-dismiss notification after 4s
  const showNotification = useCallback((type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  }, []);

  // Fetch reviews from API
  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/reviews?all=true');
      if (res.ok) {
        const data = await res.json();
        if (data.reviews && Array.isArray(data.reviews)) {
          setReviews(data.reviews);
        }
      } else {
        showNotification('error', 'Failed to refresh reviews from server.');
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
      showNotification('error', 'Network error while loading reviews.');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Real-time synchronization stream listener
  useRealtimeSync({
    onRefresh: () => {
      fetchReviews();
    },
  });

  // Action: Toggle Feature on Homepage
  const handleToggleFeatured = async (review: GoogleReview) => {
    const nextVal = !review.is_featured;
    setActionLoadingId(review.id);
    try {
      const res = await fetch('/api/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: review.id, is_featured: nextVal }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setReviews((prev) =>
          prev.map((r) => (r.id === review.id ? { ...r, is_featured: nextVal } : r))
        );
        showNotification(
          'success',
          `Review by "${review.reviewer_name}" is now ${nextVal ? 'Featured on Homepage' : 'unfeatured'}.`
        );
      } else {
        showNotification('error', data.error || 'Could not update featured status.');
      }
    } catch {
      showNotification('error', 'Network error updating featured status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Action: Toggle Publish / Unpublish
  const handleTogglePublished = async (review: GoogleReview) => {
    const nextVal = !review.is_published;
    setActionLoadingId(review.id);
    try {
      const res = await fetch('/api/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: review.id, is_published: nextVal }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setReviews((prev) =>
          prev.map((r) => (r.id === review.id ? { ...r, is_published: nextVal } : r))
        );
        showNotification(
          'success',
          `Review by "${review.reviewer_name}" is now ${nextVal ? 'Published publicly' : 'Unpublished (hidden)'}.`
        );
      } else {
        showNotification('error', data.error || 'Could not update publication status.');
      }
    } catch {
      showNotification('error', 'Network error updating publication status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Action: Delete Review
  const handleDeleteReview = async (review: GoogleReview) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the review by "${review.reviewer_name}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    setActionLoadingId(review.id);
    try {
      const res = await fetch(`/api/reviews?id=${encodeURIComponent(review.id)}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setReviews((prev) => prev.filter((r) => r.id !== review.id));
        showNotification('success', `Review by "${review.reviewer_name}" was successfully deleted.`);
      } else {
        showNotification('error', data.error || 'Failed to delete review.');
      }
    } catch {
      showNotification('error', 'Network error while attempting to delete.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Action: Import Pasted Review Submit
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!reviewerName.trim()) {
      setModalError('Reviewer name is required.');
      return;
    }

    if (!isRatingOnly && !reviewText.trim()) {
      setModalError('Review text is required for written reviews. Or select "Rating Only".');
      return;
    }

    setImportSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewer_name: reviewerName.trim(),
          excerpt: isRatingOnly ? '' : reviewText.trim(),
          full_text: isRatingOnly ? '' : reviewText.trim(),
          rating: 5, // Strictly 5 stars
          review_date_display: reviewDate.trim() || 'Recently added',
          source_url: sourceUrl.trim() || GOOGLE_REVIEWS_URL,
          is_rating_only: isRatingOnly,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setReviews((prev) => [data.review, ...prev]);
        showNotification('success', `Review by "${reviewerName}" imported successfully!`);
        // Reset modal form
        setReviewerName('');
        setReviewText('');
        setReviewDate('a month ago');
        setSourceUrl(GOOGLE_REVIEWS_URL);
        setIsRatingOnly(false);
        setIsImportModalOpen(false);
      } else {
        setModalError(data.error || 'Failed to import review.');
      }
    } catch {
      setModalError('Network error while importing review.');
    } finally {
      setImportSubmitting(false);
    }
  };

  // Filtered reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      // Search match
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        r.reviewer_name.toLowerCase().includes(query) ||
        r.excerpt?.toLowerCase().includes(query) ||
        r.id.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      // Filter tab
      if (filterType === 'featured') return r.is_featured;
      if (filterType === 'published') return r.is_published;
      if (filterType === 'unpublished') return !r.is_published;
      if (filterType === 'rating_only') return r.is_rating_only || !r.excerpt?.trim();
      return true;
    });
  }, [reviews, searchQuery, filterType]);

  // Metric stats
  const totalCount = reviews.length;
  const featuredCount = reviews.filter((r) => r.is_featured).length;
  const publishedCount = reviews.filter((r) => r.is_published).length;
  const ratingOnlyCount = reviews.filter((r) => r.is_rating_only || !r.excerpt?.trim()).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* =========================================================================
          TOP BANNER & ACTIONS
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EFE3D6]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#D8AD56]">
              CONTENT & SOCIAL PROOF
            </span>
            <span className="text-gray-300">•</span>
            <span className="text-[10px] text-[#786B61] font-medium">Sri Tayi Grand, Kadiri</span>
          </div>

          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#241912] mt-0.5 flex items-center gap-2.5">
            <MessageSquareQuote className="w-7 h-7 text-[#D8AD56]" />
            <span>Guest Reviews & Experiences</span>
          </h1>

          <p className="text-xs text-[#786B61] mt-0.5">
            Curate, feature, and manage authentic 5-star Google Travel guest reviews shown on the public directory.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchReviews}
            disabled={loading}
            className="p-2.5 rounded-xl border border-[#D8AD56]/30 text-[#786B61] hover:text-[#241912] hover:bg-[#FAF7F2] transition-colors"
            title="Refresh reviews"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#D8AD56]' : ''}`} />
          </button>

          <a
            href="/testimonials"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#D8AD56]/40 text-xs font-semibold text-[#241912] hover:bg-[#FAF7F2] transition-colors"
          >
            <span>View Public Page</span>
            <ExternalLink className="w-3.5 h-3.5 text-[#D8AD56]" />
          </a>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25150F] hover:bg-[#382216] text-[#D8AD56] text-xs font-semibold tracking-wider transition-all duration-200 shadow-sm border border-[#D8AD56]/40"
          >
            <Plus className="w-4 h-4" />
            <span>Import Pasted Review</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          NOTIFICATION FEEDBACK BANNER
          ========================================================================= */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between gap-3 shadow-sm transition-all animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-900'
              : 'bg-red-50 border border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* =========================================================================
          KEY METRICS / STATS CARDS
          ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-[#EFE3D6] p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-[#786B61] font-semibold">
              Total Reviews
            </span>
            <span className="w-2 h-2 rounded-full bg-[#D8AD56]" />
          </div>
          <div className="mt-2 text-2xl font-serif font-bold text-[#241912]">{totalCount}</div>
          <div className="text-[10px] text-[#8C7A6B] mt-0.5">Strictly 5-Star Authenticated</div>
        </div>

        <div className="bg-white rounded-2xl border border-[#EFE3D6] p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-[#786B61] font-semibold">
              Featured on Home
            </span>
            <Sparkles className="w-3.5 h-3.5 text-[#D8AD56]" />
          </div>
          <div className="mt-2 text-2xl font-serif font-bold text-[#241912]">{featuredCount}</div>
          <div className="text-[10px] text-green-700 mt-0.5 font-medium">Highlighted Showcase</div>
        </div>

        <div className="bg-white rounded-2xl border border-[#EFE3D6] p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-[#786B61] font-semibold">
              Publicly Active
            </span>
            <Eye className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-serif font-bold text-[#241912]">{publishedCount}</div>
          <div className="text-[10px] text-[#8C7A6B] mt-0.5">Visible on /testimonials</div>
        </div>

        <div className="bg-white rounded-2xl border border-[#EFE3D6] p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-[#786B61] font-semibold">
              Rating Only
            </span>
            <Star className="w-3.5 h-3.5 text-[#D8AD56]" />
          </div>
          <div className="mt-2 text-2xl font-serif font-bold text-[#241912]">{ratingOnlyCount}</div>
          <div className="text-[10px] text-[#8C7A6B] mt-0.5">5-star rating without text</div>
        </div>
      </div>

      {/* =========================================================================
          FILTERS & SEARCH BAR
          ========================================================================= */}
      <div className="bg-white rounded-2xl border border-[#EFE3D6] p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by reviewer name, excerpt text, or ID..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-[#EFE3D6] focus:border-[#D8AD56] focus:outline-none bg-[#FAF7F2]/50 text-[#241912]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                filterType === 'all'
                  ? 'bg-[#25150F] text-[#D8AD56] font-semibold'
                  : 'bg-[#FAF7F2] text-[#786B61] hover:text-[#241912]'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => setFilterType('featured')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                filterType === 'featured'
                  ? 'bg-[#25150F] text-[#D8AD56] font-semibold'
                  : 'bg-[#FAF7F2] text-[#786B61] hover:text-[#241912]'
              }`}
            >
              Featured ({featuredCount})
            </button>
            <button
              onClick={() => setFilterType('published')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                filterType === 'published'
                  ? 'bg-[#25150F] text-[#D8AD56] font-semibold'
                  : 'bg-[#FAF7F2] text-[#786B61] hover:text-[#241912]'
              }`}
            >
              Published ({publishedCount})
            </button>
            <button
              onClick={() => setFilterType('unpublished')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                filterType === 'unpublished'
                  ? 'bg-[#25150F] text-[#D8AD56] font-semibold'
                  : 'bg-[#FAF7F2] text-[#786B61] hover:text-[#241912]'
              }`}
            >
              Hidden ({totalCount - publishedCount})
            </button>
            <button
              onClick={() => setFilterType('rating_only')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                filterType === 'rating_only'
                  ? 'bg-[#25150F] text-[#D8AD56] font-semibold'
                  : 'bg-[#FAF7F2] text-[#786B61] hover:text-[#241912]'
              }`}
            >
              Rating Only ({ratingOnlyCount})
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          REVIEWS TABLE / LIST
          ========================================================================= */}
      <div className="bg-white rounded-2xl border border-[#D8AD56]/20 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#25150F] text-[#EFE3D6] text-[11px] uppercase tracking-wider font-semibold border-b border-[#D8AD56]/20">
                <th className="py-3.5 px-4">Reviewer</th>
                <th className="py-3.5 px-3">Rating</th>
                <th className="py-3.5 px-4 min-w-[280px]">Review Excerpt / Text</th>
                <th className="py-3.5 px-3">Date (Google)</th>
                <th className="py-3.5 px-3 text-center">Featured</th>
                <th className="py-3.5 px-3 text-center">Published</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE3D6] text-xs">
              {filteredReviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#786B61]">
                    <MessageSquareQuote className="w-8 h-8 text-[#D8AD56]/40 mx-auto mb-2" />
                    <p className="font-semibold text-sm text-[#241912]">No reviews matched your filters</p>
                    <p className="text-xs text-[#8C7A6B] mt-0.5">Try clearing the search or switching filter tabs.</p>
                  </td>
                </tr>
              ) : (
                filteredReviews.map((review) => {
                  const isActionLoading = actionLoadingId === review.id;
                  const isRatingOnly = review.is_rating_only || !review.excerpt?.trim();

                  return (
                    <tr
                      key={review.id}
                      className="hover:bg-[#FAF7F2]/60 transition-colors group"
                    >
                      {/* Reviewer Details */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#25150F] text-[#D8AD56] font-semibold text-xs flex items-center justify-center shrink-0 border border-[#D8AD56]/30">
                            {review.reviewer_name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-[#241912] block">
                              {review.reviewer_name}
                            </span>
                            <span className="text-[10px] text-[#8C7A6B] block font-mono">
                              {review.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Rating (Strictly 5 Stars) */}
                      <td className="py-3.5 px-3">
                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#FAF7F2] border border-[#D8AD56]/30">
                          <div className="flex text-[#D8AD56]">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className="w-3 h-3 fill-[#D8AD56]" />
                            ))}
                          </div>
                          <span className="font-bold text-[11px] text-[#241912] ml-0.5">5.0</span>
                        </div>
                      </td>

                      {/* Excerpt */}
                      <td className="py-3.5 px-4">
                        {isRatingOnly ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-[#786B61] border border-gray-200">
                            ★ Rating Only (No written comments)
                          </span>
                        ) : (
                          <p className="text-[#38281F] line-clamp-2 leading-relaxed italic text-xs">
                            &ldquo;{review.excerpt || review.full_text}&rdquo;
                          </p>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-3 whitespace-nowrap text-[#786B61]">
                        <span>{review.review_date_display}</span>
                      </td>

                      {/* Toggle Featured on Homepage */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() => handleToggleFeatured(review)}
                          disabled={isActionLoading}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${
                            review.is_featured
                              ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                              : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'
                          }`}
                          title={review.is_featured ? 'Click to unfeature' : 'Click to feature on homepage'}
                        >
                          <Sparkles className={`w-3 h-3 ${review.is_featured ? 'text-amber-600' : 'text-gray-400'}`} />
                          <span>{review.is_featured ? 'Featured' : 'Standard'}</span>
                        </button>
                      </td>

                      {/* Toggle Published / Unpublished */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          onClick={() => handleTogglePublished(review)}
                          disabled={isActionLoading}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${
                            review.is_published
                              ? 'bg-green-100 text-green-900 border border-green-300 hover:bg-green-200'
                              : 'bg-red-100 text-red-900 border border-red-300 hover:bg-red-200'
                          }`}
                          title={review.is_published ? 'Click to unpublish' : 'Click to publish publicly'}
                        >
                          {review.is_published ? (
                            <>
                              <Eye className="w-3 h-3 text-green-700" />
                              <span>Live</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3 text-red-600" />
                              <span>Hidden</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={review.source_url || GOOGLE_REVIEWS_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-[#D8AD56] hover:bg-white transition-colors"
                            title="Verify original review on Google"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>

                          <button
                            onClick={() => handleDeleteReview(review)}
                            disabled={isActionLoading}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete review"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-3.5 bg-[#FAF7F2] border-t border-[#EFE3D6] flex items-center justify-between text-xs text-[#786B61]">
          <span>
            Showing <strong className="text-[#241912]">{filteredReviews.length}</strong> of{' '}
            <strong className="text-[#241912]">{totalCount}</strong> reviews
          </span>

          <span className="text-[11px] text-[#8C7A6B]">
            All reviews strictly adhere to Sri Tayi Grand 5-star Google Travel certification.
          </span>
        </div>
      </div>

      {/* =========================================================================
          IMPORT PASTED REVIEW MODAL
          ========================================================================= */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-[#D8AD56]/40 w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-[#25150F] text-white p-5 border-b border-[#D8AD56]/20 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[#D8AD56] block">
                  MANUAL REVIEW ENTRY
                </span>
                <h3 className="font-serif text-lg font-bold text-white mt-0.5">
                  Import Pasted Google Review
                </h3>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleImportSubmit} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Reviewer Name */}
              <div>
                <label className="block text-xs font-semibold text-[#241912] mb-1">
                  Reviewer Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder="e.g. Ramesh Naidu"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#EFE3D6] focus:border-[#D8AD56] focus:outline-none text-[#241912]"
                />
              </div>

              {/* Rating Type Toggle */}
              <div className="pt-1">
                <label className="block text-xs font-semibold text-[#241912] mb-1.5">
                  Review Format
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsRatingOnly(false)}
                    className={`p-3 rounded-xl border text-xs font-medium text-left transition-all ${
                      !isRatingOnly
                        ? 'bg-[#FAF7F2] border-[#D8AD56] text-[#241912] font-semibold'
                        : 'border-[#EFE3D6] text-[#786B61]'
                    }`}
                  >
                    <span className="block font-bold">Written Experience</span>
                    <span className="text-[10px] text-[#8C7A6B] block mt-0.5">Guest left written comments</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsRatingOnly(true)}
                    className={`p-3 rounded-xl border text-xs font-medium text-left transition-all ${
                      isRatingOnly
                        ? 'bg-[#FAF7F2] border-[#D8AD56] text-[#241912] font-semibold'
                        : 'border-[#EFE3D6] text-[#786B61]'
                    }`}
                  >
                    <span className="block font-bold">Rating Only (5★)</span>
                    <span className="text-[10px] text-[#8C7A6B] block mt-0.5">Rating without text remarks</span>
                  </button>
                </div>
              </div>

              {/* Rating Policy Notice: Strictly 5 Stars */}
              <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#D8AD56]/30 flex items-center justify-between text-xs">
                <span className="text-[#241912] font-semibold">Certified Rating:</span>
                <div className="flex items-center gap-1">
                  {[...Array(ratingValue)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-[#D8AD56] text-[#D8AD56]" />
                  ))}
                  <span className="ml-1 text-[11px] font-bold text-[#D8AD56]">5 Stars (Strict)</span>
                </div>
              </div>

              {/* Review Text */}
              {!isRatingOnly && (
                <div>
                  <label className="block text-xs font-semibold text-[#241912] mb-1">
                    Verbatim Review Text <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required={!isRatingOnly}
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Paste exact review as written on Google..."
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#EFE3D6] focus:border-[#D8AD56] focus:outline-none text-[#241912]"
                  />
                  <p className="text-[10px] text-[#8C7A6B] mt-1">
                    Text will be attributed verbatim on the public guest directory.
                  </p>
                </div>
              )}

              {/* Original Review Date Display */}
              <div>
                <label className="block text-xs font-semibold text-[#241912] mb-1">
                  Original Date as Shown on Google
                </label>
                <input
                  type="text"
                  value={reviewDate}
                  onChange={(e) => setReviewDate(e.target.value)}
                  placeholder="e.g. a month ago, 3 weeks ago, 2 months ago"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#EFE3D6] focus:border-[#D8AD56] focus:outline-none text-[#241912]"
                />
              </div>

              {/* Source Link */}
              <div>
                <label className="block text-xs font-semibold text-[#241912] mb-1">
                  Google Source URL
                </label>
                <input
                  type="url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://www.google.com/travel/..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#EFE3D6] focus:border-[#D8AD56] focus:outline-none text-[#241912]"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-[#EFE3D6] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#EFE3D6] text-xs font-medium text-[#786B61] hover:text-[#241912] hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#25150F] hover:bg-[#382216] text-[#D8AD56] text-xs font-bold transition-all shadow-sm border border-[#D8AD56]/40 disabled:opacity-60"
                >
                  {importSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Importing...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Save & Publish</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
