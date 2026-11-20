import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { verifyStaffRole } from '@/lib/auth';
import { NightAuditConfig } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = verifyStaffRole(req, [
      'Super Admin',
      'Hotel Manager',
      'Front Desk',
      'Receptionist',
      'Accounts',
    ]);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 403 });
    }

    await repo.ensureSettingsLoaded();
    const settings = repo.getSettings();
    const config: NightAuditConfig = settings.night_audit_config || {
      enabled: true,
      execution_time: '00:00',
      timezone: 'Asia/Kolkata',
      email_enabled: true,
      whatsapp_enabled: false,
      recipients: [],
    };

    return NextResponse.json({
      success: true,
      config,
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

    const body = (await req.json()) as Partial<NightAuditConfig>;
    await repo.ensureSettingsLoaded();
    const currentSettings = repo.getSettings();
    const currentConfig: NightAuditConfig = currentSettings.night_audit_config || {
      enabled: true,
      execution_time: '00:00',
      timezone: 'Asia/Kolkata',
      email_enabled: true,
      whatsapp_enabled: false,
      recipients: [],
    };

    const updatedConfig: NightAuditConfig = {
      ...currentConfig,
      ...body,
      recipients: Array.isArray(body.recipients) ? body.recipients : currentConfig.recipients,
    };

    const updatedSettings = repo.updateSettings({
      night_audit_config: updatedConfig,
    });

    repo.recordAuditLog({
      action: 'UPDATE_NIGHT_AUDIT_SETTINGS',
      entityType: 'system',
      entityId: 'night-audit-config',
      details: `Updated automated night audit settings: enabled=${updatedConfig.enabled}, recipients=${updatedConfig.recipients.length}`,
      userName: auth.session?.name || 'Authorized Staff',
      userRole: auth.session?.role || 'Staff',
      userId: auth.session?.userId || 'stf-sys',
      newValue: updatedConfig,
      previousValue: currentConfig,
    });

    return NextResponse.json({
      success: true,
      message: 'Automated Night Audit settings saved successfully.',
      config: updatedSettings.night_audit_config,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
