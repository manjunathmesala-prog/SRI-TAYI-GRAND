import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { verifyStaffRole } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const categories = repo.getCategories();
    return NextResponse.json({
      success: true,
      categories,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error || 'Access denied' }, { status: 403 });
    }

    const body = await req.json();
    const { categoryId, ...updates } = body;

    if (!categoryId) {
      return NextResponse.json({ success: false, error: 'categoryId is required' }, { status: 400 });
    }

    const updated = repo.updateCategory(categoryId, updates);
    if (!updated) {
      return NextResponse.json({ success: false, error: `Category ${categoryId} not found` }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Category ${updated.name} updated successfully.`,
      category: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update category' },
      { status: 500 }
    );
  }
}
