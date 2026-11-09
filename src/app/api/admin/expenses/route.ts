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

    const body = await req.json();
    const { category, title, description, amount, payment_method, expense_date, receipt_ref } = body;

    if (!category || !title || !amount || Number(amount) <= 0) {
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
