import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { verifyStaffRole } from '@/lib/auth';
import { PricingRule, PricingRuleType } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Front Desk', 'Accounts']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId');
    const dateStr = searchParams.get('date');

    const rules = repo.getPricingRules();
    const categories = repo.getCategories();

    // Stats calculations
    const activeRules = rules.filter((r) => r.is_active);
    const weekendSurgeRules = activeRules.filter((r) => r.rule_type === 'weekend_surge');
    const avgWeekendUplift =
      weekendSurgeRules.length > 0
        ? Math.round(
            weekendSurgeRules.reduce((sum, r) => sum + r.adjustment_value, 0) / weekendSurgeRules.length
          )
        : 15;

    const festivalSurgeRules = activeRules.filter((r) => r.rule_type === 'festival_surge');
    const peakFestivalUplift =
      festivalSurgeRules.length > 0
        ? Math.max(...festivalSurgeRules.map((r) => r.adjustment_value))
        : 30;

    let effectiveRateResult = null;
    if (categoryId) {
      effectiveRateResult = repo.calculateEffectiveRate(categoryId, dateStr || undefined);
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalRules: rules.length,
        activeRulesCount: activeRules.length,
        avgWeekendUplift,
        peakFestivalUplift,
      },
      rules,
      categories: categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        base_price_per_night: cat.base_price_per_night,
        extra_person_tariff_rupees: cat.extra_person_tariff_rupees || 500,
        max_occupancy: cat.max_occupancy,
      })),
      effectiveRate: effectiveRateResult,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      description = '',
      rule_type,
      adjustment_type = 'percentage',
      adjustment_value,
      applies_to_categories = ['all'],
      start_date,
      end_date,
      days_of_week,
      is_active = true,
    } = body;

    if (!name || !rule_type || adjustment_value === undefined) {
      return NextResponse.json(
        { success: false, error: 'name, rule_type, and adjustment_value are required' },
        { status: 400 }
      );
    }

    const staffName = auth.session?.name || 'Revenue Manager';

    const newRule = repo.createPricingRule(
      {
        name: String(name).trim(),
        description: String(description).trim(),
        rule_type: rule_type as PricingRuleType,
        adjustment_type: adjustment_type as 'percentage' | 'fixed_amount',
        adjustment_value: Number(adjustment_value),
        applies_to_categories: Array.isArray(applies_to_categories) ? applies_to_categories : ['all'],
        start_date: start_date || undefined,
        end_date: end_date || undefined,
        days_of_week: Array.isArray(days_of_week) ? days_of_week.map(Number) : undefined,
        is_active: Boolean(is_active),
      },
      staffName
    );

    return NextResponse.json({
      success: true,
      message: `Pricing rule "${newRule.name}" created successfully.`,
      rule: newRule,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const body = await req.json();
    const { id, updates } = body;

    if (!id || !updates) {
      return NextResponse.json(
        { success: false, error: 'id and updates are required' },
        { status: 400 }
      );
    }

    const staffName = auth.session?.name || 'Revenue Manager';
    const updated = repo.updatePricingRule(id, updates, staffName);

    return NextResponse.json({
      success: true,
      message: `Pricing rule "${updated.name}" updated successfully.`,
      rule: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    let id: string | null = null;
    const { searchParams } = new URL(req.url);
    id = searchParams.get('id');

    if (!id) {
      try {
        const body = await req.json();
        id = body.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Pricing rule id is required' }, { status: 400 });
    }

    const staffName = auth.session?.name || 'Revenue Manager';
    const deleted = repo.deletePricingRule(id, staffName);

    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Pricing rule not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Pricing rule deleted successfully.',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
