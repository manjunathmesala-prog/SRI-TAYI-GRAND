import { supabase } from '@/lib/supabase/client';
import { RFIDCard, RFIDAccessEvent } from '@/types';

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return Boolean(
    url &&
    !url.includes('placeholder') &&
    !url.includes('your-supabase-project')
  );
};

/**
 * Production Supabase Sync for RFID Cards
 */
export async function syncCardToSupabase(card: RFIDCard): Promise<void> {
  if (!isSupabaseConfigured()) return;

  try {
    const { error } = await supabase.from('rfid_cards').upsert(
      {
        card_uid: card.card_uid,
        card_label: card.card_label,
        card_type: card.card_type || 'guest',
        is_lifetime: Boolean(card.is_lifetime),
        holder_name: card.holder_name || card.guest_name || null,
        holder_role: card.holder_role || (card.card_type === 'super_admin' ? 'Super Admin' : card.card_type === 'cleaner' ? 'Housekeeping' : 'Guest'),
        status: card.status,
        activated_at: card.activated_at || null,
        expires_at: card.expires_at || null,
        deactivated_at: card.deactivated_at || null,
        last_tap_room: card.last_tap_room || null,
        last_tap_at: card.last_tap_at || null,
        notes: card.notes || null,
      },
      { onConflict: 'card_uid' }
    );

    if (error) {
      console.warn('[SUPABASE RFID SYNC WARN] Failed to sync card:', error.message);
    }
  } catch (err: any) {
    console.warn('[SUPABASE RFID SYNC ERROR]', err.message);
  }
}

/**
 * Production Supabase Sync for RFID Access Tap Events
 */
export async function syncEventToSupabase(event: RFIDAccessEvent): Promise<void> {
  if (!isSupabaseConfigured()) return;

  try {
    const { error } = await supabase.from('rfid_access_events').insert({
      room_number: event.room_number,
      device_name: event.device_name,
      event_type: event.event_type,
      action_type: event.action_type || 'door_unlock',
      card_type: event.card_type || 'guest',
      holder_name: event.holder_name || null,
      booking_reference: event.booking_reference || null,
      reason: event.reason || null,
      source: event.source || 'lock_reader',
      occurred_at: event.occurred_at,
    });

    if (error) {
      console.warn('[SUPABASE RFID EVENT SYNC WARN] Failed to sync tap event:', error.message);
    }
  } catch (err: any) {
    console.warn('[SUPABASE RFID EVENT SYNC ERROR]', err.message);
  }
}

/**
 * Production Supabase Sync for Deleting Cards
 */
export async function deleteCardFromSupabase(cardUid: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  try {
    await supabase.from('rfid_cards').delete().eq('card_uid', cardUid);
  } catch (err: any) {
    console.warn('[SUPABASE RFID DELETE ERROR]', err.message);
  }
}
