import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { verifyStaffRole } from '@/lib/auth';
import { GoogleReview } from '@/types';

export const dynamic = 'force-dynamic';

const LIMITATION_NOTE =
  'Curated collection of 44 individual 5-star reviews from Google Travel listing.';

// GET /api/reviews (Public guest-facing endpoint)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const featured = searchParams.get('featured') === 'true';
    const all = searchParams.get('all') === 'true';
    const filterType = searchParams.get('type');
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');

    if (featured) {
      const limit = limitParam ? parseInt(limitParam, 10) : 6;
      const reviews = repo.getFeaturedReviews(limit);
      return NextResponse.json(
        {
          success: true,
          reviews,
          total: reviews.length,
          page: 1,
          totalPages: 1,
          limitationNote: LIMITATION_NOTE,
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
          },
        }
      );
    }

    // Retrieve either all (admin) or published only (public)
    let reviews: GoogleReview[] = repo.getReviews(!all);

    // Optional category filtering
    if (filterType === 'written') {
      reviews = reviews.filter(
        (r) => !r.is_rating_only && r.excerpt && r.excerpt.trim().length > 0
      );
    } else if (filterType === 'rating_only') {
      reviews = reviews.filter(
        (r) => r.is_rating_only || !r.excerpt || r.excerpt.trim().length === 0
      );
    }

    const total = reviews.length;
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : 1;
    const limit = limitParam ? Math.max(1, parseInt(limitParam, 10)) : total;
    const totalPages = Math.max(1, Math.ceil(total / (limit || 1)));

    const offset = (page - 1) * limit;
    const paginatedReviews = limitParam ? reviews.slice(offset, offset + limit) : reviews;

    return NextResponse.json(
      {
        success: true,
        reviews: paginatedReviews,
        total,
        page,
        totalPages,
        limitationNote: LIMITATION_NOTE,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    console.error('Error in GET /api/reviews:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve reviews' },
      { status: 500 }
    );
  }
}

// POST /api/reviews - Admin import
export async function POST(request: NextRequest) {
  try {
    const auth = verifyStaffRole(request, ['Super Admin', 'Hotel Manager']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();

    // Validation
    if (
      !body.reviewer_name ||
      typeof body.reviewer_name !== 'string' ||
      body.reviewer_name.trim().length === 0
    ) {
      return NextResponse.json(
        { success: false, error: 'Reviewer name is required and cannot be empty.' },
        { status: 400 }
      );
    }

    const rating = Number(body.rating);
    if (rating !== 5) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Only genuine 5-star reviews (rating === 5) are accepted in this curated collection.',
        },
        { status: 400 }
      );
    }

    const excerpt = typeof body.excerpt === 'string' ? body.excerpt.trim() : '';
    const isRatingOnly = Boolean(body.is_rating_only || excerpt.length === 0);

    const newReview = repo.importReview({
      hotel_name: 'SRI TAYI GRAND',
      reviewer_name: body.reviewer_name.trim(),
      rating: 5,
      rating_label: isRatingOnly ? '5-star rating' : '5 stars',
      review_date_display: body.review_date_display?.trim() || 'Recently added',
      excerpt: isRatingOnly ? '' : excerpt,
      full_text: body.full_text?.trim() || excerpt || undefined,
      is_rating_only: isRatingOnly,
      is_translated: Boolean(body.is_translated),
      source_platform: body.source_platform || 'Google',
      source_url:
        body.source_url?.trim() ||
        'https://www.google.com/travel/search?q=sri%20tayi%20grand%20kadiri&ap=ugEHcmV2aWV3cw',
      is_featured: Boolean(body.is_featured),
      is_published: body.is_published !== undefined ? Boolean(body.is_published) : true,
      display_order: typeof body.display_order === 'number' ? body.display_order : 99,
    });

    return NextResponse.json(
      { success: true, review: newReview },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/reviews:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to import review' },
      { status: 500 }
    );
  }
}

// PATCH /api/reviews - Toggle featured or published status
export async function PATCH(request: NextRequest) {
  try {
    const auth = verifyStaffRole(request, ['Super Admin', 'Hotel Manager']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { id, is_featured, is_published } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Review ID is required.' },
        { status: 400 }
      );
    }

    let review = repo.getReviewById(id);
    if (!review) {
      return NextResponse.json(
        { success: false, error: `Review with ID "${id}" not found.` },
        { status: 404 }
      );
    }

    if (is_featured !== undefined) {
      review = repo.toggleReviewFeaturedStatus(id, Boolean(is_featured)) || review;
    }

    if (is_published !== undefined) {
      review = repo.toggleReviewPublishStatus(id, Boolean(is_published)) || review;
    }

    return NextResponse.json({ success: true, review });
  } catch (error) {
    console.error('Error in PATCH /api/reviews:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update review status' },
      { status: 500 }
    );
  }
}

// DELETE /api/reviews - Delete review by ID
export async function DELETE(request: NextRequest) {
  try {
    const auth = verifyStaffRole(request, ['Super Admin', 'Hotel Manager']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await request.json();
        id = body.id;
      } catch {
        // body may be empty
      }
    }

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Review ID is required.' },
        { status: 400 }
      );
    }

    const success = repo.deleteReview(id);
    if (!success) {
      return NextResponse.json(
        { success: false, error: `Review with ID "${id}" not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Review ${id} successfully removed.`,
    });
  } catch (error) {
    console.error('Error in DELETE /api/reviews:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete review' },
      { status: 500 }
    );
  }
}
