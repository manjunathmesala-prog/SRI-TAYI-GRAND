import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { verifyStaffRole } from '@/lib/auth';
import { JournalLine } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, [
      'Super Admin',
      'Hotel Manager',
      'Accounts',
      'Front Desk',
      'Receptionist',
    ]);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    await repo.ensureJournalsLoaded();
    const glAccounts = repo.getChartOfAccounts();
    const journalEntries = repo.getJournalEntries();
    const pnl = repo.getPnL();
    const balanceSheet = repo.getBalanceSheet();

    return NextResponse.json({
      success: true,
      glAccounts,
      journalEntries,
      pnl,
      balanceSheet,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, ['Super Admin', 'Hotel Manager', 'Accounts']);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    const body = await req.json();
    const action = body.action || 'create_journal_entry';

    if (action === 'create_journal_entry' || body.lines) {
      const {
        date,
        reference,
        description,
        lines,
        is_posted = true,
      } = body;

      if (!lines || !Array.isArray(lines) || lines.length < 2) {
        return NextResponse.json(
          { success: false, error: 'A journal entry must contain at least two account lines.' },
          { status: 400 }
        );
      }

      if (!description || !description.trim()) {
        return NextResponse.json(
          { success: false, error: 'Journal narration/description is required.' },
          { status: 400 }
        );
      }

      // Validate lines
      const sanitizedLines: JournalLine[] = [];
      let totalDebit = 0;
      let totalCredit = 0;

      for (const line of lines) {
        if (!line || !repo.getChartOfAccounts().some(account => account.code === line.accountCode && account.is_active)) {
          return NextResponse.json(
            { success: false, error: 'Every journal line must specify a valid account code.' },
            { status: 400 }
          );
        }

        const debit = Number(line.debit ?? 0);
        const credit = Number(line.credit ?? 0);

        if (!Number.isFinite(debit) || !Number.isFinite(credit) || debit < 0 || credit < 0 || (debit > 0 && credit > 0)) {
          return NextResponse.json(
            { success: false, error: 'Debit and credit values must be non-negative.' },
            { status: 400 }
          );
        }

        if (debit === 0 && credit === 0) {
          return NextResponse.json(
            { success: false, error: `Account line ${line.accountCode} has 0 debit and 0 credit.` },
            { status: 400 }
          );
        }

        totalDebit += debit;
        totalCredit += credit;

        sanitizedLines.push({
          accountCode: line.accountCode,
          accountName: line.accountName || line.accountCode,
          debit,
          credit,
          description: line.description || '',
        });
      }

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        return NextResponse.json(
          {
            success: false,
            error: `Double-entry transaction out of balance: Total Debit (₹${totalDebit.toLocaleString(
              'en-IN'
            )}) must equal Total Credit (₹${totalCredit.toLocaleString('en-IN')}).`,
          },
          { status: 400 }
        );
      }

      const actor = body.actor || auth.session?.name || 'Accounts Auditor';
      const entry = await repo.createJournalEntry(
        {
          date: date || new Date().toISOString().split('T')[0],
          reference: reference || `MANUAL-${Date.now().toString().slice(-4)}`,
          description: description.trim(),
          lines: sanitizedLines,
          total_debit: totalDebit,
          total_credit: totalCredit,
          is_posted: Boolean(is_posted),
          created_by: actor,
        },
        actor
      );

      return NextResponse.json({
        success: true,
        entry,
        message: `Journal entry ${entry.entry_number} successfully posted and balanced.`,
      });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
