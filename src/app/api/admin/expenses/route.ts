import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { verifyStaffRole } from '@/lib/auth';
import { ExpenseCategory, PaymentMethod } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Accounts', 'Front Desk', 'Housekeeping']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error || 'Unauthorized' }, { status: 403 });
    }

    const expenses = repo.getExpenses();
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
    const byCategory = expenses.reduce((acc: Record<string, number>, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      count: expenses.length,
      totalAmount,
      byCategory,
      expenses,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Accounts', 'Front Desk', 'Housekeeping']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'A JSON expense object is required.' }, { status: 400 });
    }
    const { category, title, description, amount, payment_method, expense_date, receipt_ref } = body;

    const categories = ['laundry', 'maintenance', 'fnb_supplies', 'utilities', 'staff_welfare', 'repairs', 'marketing', 'other'];
    const methods = ['cash', 'upi', 'card', 'online', 'pay_at_hotel'];
    if (!categories.includes(category) || typeof title !== 'string' || !title.trim() ||
        !['number', 'string'].includes(typeof amount) || !Number.isFinite(Number(amount)) || Number(amount) <= 0 ||
        (payment_method !== undefined && !methods.includes(payment_method)) ||
        (expense_date && (!/^\d{4}-\d{2}-\d{2}$/.test(expense_date) ||
          !Number.isFinite(Date.parse(expense_date)) || new Date(expense_date).toISOString().slice(0, 10) !== expense_date))) {
      return NextResponse.json(
        { success: false, error: 'category, title, and valid positive amount are required.' },
        { status: 400 }
      );
    }

    const recordedBy = auth.session?.name || 'Staff Member';

    const newExpense = repo.createExpense(
      {
        category: category as ExpenseCategory,
        title: String(title).trim(),
        description: description ? String(description).trim() : undefined,
        amount: Number(amount),
        payment_method: (payment_method as PaymentMethod) || 'cash',
        recorded_by: recordedBy,
        expense_date: expense_date || new Date().toISOString().split('T')[0],
        receipt_ref: receipt_ref ? String(receipt_ref).trim() : undefined,
        status: 'approved',
      },
      recordedBy
    );

    return NextResponse.json({
      success: true,
      message: `Expense '${newExpense.title}' for ₹${newExpense.amount} recorded.`,
      expense: newExpense,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Accounts']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing expense id' }, { status: 400 });
    }

    const deleted = repo.deleteExpense(id, auth.session?.name || 'Accounts Staff');
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Expense record not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Expense record successfully removed from financial ledger.',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
