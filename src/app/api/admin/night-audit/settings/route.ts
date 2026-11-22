import { NextRequest, NextResponse } from 'next/server';
import { repo } from '@/lib/db/repository';
import { verifyStaffRole } from '@/lib/auth';
import { NightAuditConfig } from '@/types';
import { NightAuditService } from '@/lib/services/night-audit-service';
import { syncNightAuditConfigToSupabase, loadNightAuditConfigFromSupabase } from '@/lib/db/supabase-sync';

export const dynamic = 'force-dynamic';

const auditService = new NightAuditService();

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
    
    // Always refresh latest config from Supabase PostgreSQL
    let config: NightAuditConfig | null = null;
    try {
      config = await loadNightAuditConfigFromSupabase();
    } catch {}

    if (!config) {
      const settings = repo.getSettings();
      config = settings.night_audit_config || {
        enabled: true,
        execution_time: '00:00',
        timezone: 'Asia/Kolkata',
        email_enabled: true,
        whatsapp_enabled: false,
        recipients: [],
      };
    } else {
      repo.updateSettings({ night_audit_config: config });
    }

    const channelHealth = auditService.getChannelHealth();
    const cronEngineStatus = config.enabled ? 'operational' : 'paused';

    return NextResponse.json({
      success: true,
      config,
      health: {
        cronEngine: cronEngineStatus,
        emailService: channelHealth.email,
        whatsappService: channelHealth.whatsapp,
        database: 'operational',
      },
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

    // Validate recipients if passed
    if (Array.isArray(body.recipients)) {
      for (const rec of body.recipients) {
        const dest = (rec.address || rec.recipient_address || '').trim();
        if (rec.channel === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(dest)) {
            return NextResponse.json(
              { success: false, error: `Invalid email address format for ${rec.name || 'recipient'}: ${dest}` },
              { status: 400 }
            );
          }
        } else if (rec.channel === 'whatsapp') {
          const phoneClean = dest.replace(/\D/g, '');
          if (phoneClean.length < 10) {
            return NextResponse.json(
              { success: false, error: `Invalid WhatsApp phone number for ${rec.name || 'recipient'}: ${dest}` },
              { status: 400 }
            );
          }
        }
      }
    }

    const updatedConfig: NightAuditConfig = {
      ...currentConfig,
      ...body,
      recipients: Array.isArray(body.recipients) ? body.recipients : currentConfig.recipients,
    };

    // Persist to memory and local storage
    const updatedSettings = repo.updateSettings({
      night_audit_config: updatedConfig,
    });

    // Persist directly to Supabase PostgreSQL
    try {
      await syncNightAuditConfigToSupabase(updatedConfig);
    } catch (dbErr: any) {
      console.warn('[SETTINGS POST: SUPABASE SYNC WARN]', dbErr.message);
    }

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

    const channelHealth = auditService.getChannelHealth();

    return NextResponse.json({
      success: true,
      message: 'Automated Night Audit settings and recipient list saved successfully.',
      config: updatedSettings.night_audit_config,
      health: {
        cronEngine: updatedConfig.enabled ? 'operational' : 'paused',
        emailService: channelHealth.email,
        whatsappService: channelHealth.whatsapp,
        database: 'operational',
      },
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
    const recipientId = url.searchParams.get('recipientId');

    if (!recipientId) {
      return NextResponse.json({ success: false, error: 'recipientId is required' }, { status: 400 });
    }

    await repo.ensureSettingsLoaded();
    const currentSettings = repo.getSettings();
    const currentConfig = currentSettings.night_audit_config;

    if (currentConfig && Array.isArray(currentConfig.recipients)) {
      currentConfig.recipients = currentConfig.recipients.filter((r) => r.id !== recipientId);
      repo.updateSettings({ night_audit_config: currentConfig });
    }

    const { deleteNightAuditRecipientFromSupabase } = await import('@/lib/db/supabase-sync');
    await deleteNightAuditRecipientFromSupabase(recipientId);

    repo.recordAuditLog({
      action: 'DELETE_NIGHT_AUDIT_RECIPIENT',
      entityType: 'system',
      entityId: recipientId,
      details: `Removed night audit recipient ${recipientId}`,
      userName: auth.session?.name || 'Authorized Staff',
      userRole: auth.session?.role || 'Staff',
      userId: auth.session?.userId || 'stf-sys',
    });

    return NextResponse.json({
      success: true,
      message: 'Recipient removed successfully',
      recipientId,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
