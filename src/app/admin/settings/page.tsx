'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle2, AlertCircle, RefreshCw, Globe } from 'lucide-react';
import { authStorage } from '@/lib/auth-storage';
import { useAdminLanguage } from '@/i18n/admin/AdminLanguageContext';
import { AdminLanguageSwitcher } from '@/components/admin/AdminLanguageSwitcher';

export default function SettingsAdminPage() {
  const { t, isTelugu } = useAdminLanguage();

  const [checkInTime, setCheckInTime] = useState('14:00');
  const [checkOutTime, setCheckOutTime] = useState('11:00');
  const [taxPercentage, setTaxPercentage] = useState(12);
  const [allowPayAtHotel, setAllowPayAtHotel] = useState(true);
  const [holdTimeoutMinutes, setHoldTimeoutMinutes] = useState(15);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const token = authStorage.getToken();
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/admin/settings', { headers });
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            setCheckInTime(data.settings.check_in_time || '14:00');
            setCheckOutTime(data.settings.check_out_time || '11:00');
            setTaxPercentage(data.settings.tax_percentage ?? 12);
            setAllowPayAtHotel(Boolean(data.settings.allow_pay_at_hotel));
            setHoldTimeoutMinutes(data.settings.hold_timeout_minutes ?? 15);
          }
        }
      } catch (err: any) {
        console.warn('Failed to load settings from server', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const token = authStorage.getToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          check_in_time: checkInTime,
          check_out_time: checkOutTime,
          tax_percentage: Number(taxPercentage),
          allow_pay_at_hotel: Boolean(allowPayAtHotel),
          hold_timeout_minutes: Number(holdTimeoutMinutes),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save settings');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="w-6 h-6 animate-spin text-[#D8AD56]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EFE3D6]">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-[#D8AD56]">
            {isTelugu ? 'గ్లోబల్ కాన్ఫిగరేషన్' : 'GLOBAL CONFIGURATION'}
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#241912] mt-0.5 flex items-center gap-2">
            <Settings className="w-6 h-6 text-[#D8AD56]" />
            <span>{t('settings.title', 'Hotel Operational Settings')}</span>
          </h1>
          <p className="text-xs text-[#786B61] mt-0.5">
            {t(
              'settings.subtitle',
              'Configure system check-in/out schedules, GST tax computation rates, checkout hold leases, and payment policies.'
            )}
          </p>
        </div>
      </div>

      {saved && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-xs flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          <span>{t('settings.savedSuccess', 'Settings saved and updated successfully across Supabase cloud!')}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Language Preference Card */}
      <div className="bg-white rounded-2xl border border-[#D8AD56]/30 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FAF7F2] text-[#B18A4A] flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-[#241912]">
                {t('settings.languagePreference', 'Administrator Language Preference')}
              </h3>
              <p className="text-xs text-[#786B61]">
                {isTelugu
                  ? 'కన్సోల్ అంతటా ఇంగ్లీష్ లేదా తెలుగు భాషను ఎంచుకోండి. ఇది మీ ఖాతాకు క్లౌడ్‌లో సేవ్ చేయబడుతుంది.'
                  : 'Choose between English or Telugu across your PMS console. Saved to your profile in Supabase.'}
              </p>
            </div>
          </div>
          <AdminLanguageSwitcher />
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-[#D8AD56]/30 p-6 sm:p-8 shadow-luxury space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#786B61] mb-1">
              {t('settings.checkInTime', 'Standard Check-In Time')}
            </label>
            <input
              type="time"
              required
              value={checkInTime}
              onChange={(e) => setCheckInTime(e.target.value)}
              className="w-full text-xs font-medium p-3 rounded-lg border border-[#EFE3D6] bg-[#FAF7F2] text-[#241912]"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#786B61] mb-1">
              {t('settings.checkOutTime', 'Standard Check-Out Time')}
            </label>
            <input
              type="time"
              required
              value={checkOutTime}
              onChange={(e) => setCheckOutTime(e.target.value)}
              className="w-full text-xs font-medium p-3 rounded-lg border border-[#EFE3D6] bg-[#FAF7F2] text-[#241912]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#786B61] mb-1">
              {t('settings.taxPercentage', 'GST Tax Rate Applicable (%)')}
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={taxPercentage}
              onChange={(e) => setTaxPercentage(Number(e.target.value))}
              className="w-full text-xs font-medium p-3 rounded-lg border border-[#EFE3D6] bg-[#FAF7F2] text-[#241912]"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#786B61] mb-1">
              {isTelugu ? 'చెక్-అవుట్ హోల్డ్ వ్యవధి (నిమిషాలు)' : 'Checkout Hold Lease Duration (Minutes)'}
            </label>
            <input
              type="number"
              min="5"
              max="60"
              required
              value={holdTimeoutMinutes}
              onChange={(e) => setHoldTimeoutMinutes(Number(e.target.value))}
              className="w-full text-xs font-medium p-3 rounded-lg border border-[#EFE3D6] bg-[#FAF7F2] text-[#241912]"
            />
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[#EFE3D6] bg-[#FAF7F2] flex items-center justify-between">
          <div>
            <span className="font-semibold text-xs text-[#241912] block">
              {t('settings.allowPayAtHotel', 'Enable "Pay at Hotel" Option for Guests')}
            </span>
            <span className="text-[11px] text-[#786B61]">
              {isTelugu
                ? 'అతిథులు ఆన్‌లైన్‌లో బుకింగ్ పూర్తి చేసి, హోటల్ వద్ద నేరుగా నగదు లేదా UPI ద్వారా చెల్లించడానికి అనుమతించండి.'
                : 'Allow guests to confirm reservations online and settle payment upon arrival.'}
            </span>
          </div>
          <input
            type="checkbox"
            checked={allowPayAtHotel}
            onChange={(e) => setAllowPayAtHotel(e.target.checked)}
            className="w-5 h-5 text-[#D8AD56] rounded focus:ring-[#D8AD56]"
          />
        </div>

        <div className="pt-4 border-t border-[#EFE3D6] flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-[#43001F] hover:bg-[#2E0015] text-white text-xs font-bold tracking-wide transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{isTelugu ? 'క్లౌడ్‌కు భద్రపరుస్తోంది...' : 'Saving to Cloud...'}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{t('settings.saveSettings', 'Update Global Settings')}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
