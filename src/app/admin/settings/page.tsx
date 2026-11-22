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
  const [taxPercentage, setTaxPercentage] = useState(5);
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
            setTaxPercentage(data.settings.tax_percentage ?? 5);
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
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E6D9C5]">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#2A1D13] tracking-tight">
            {t('settings.title', 'Hotel Settings')}
          </h1>
          <p className="text-xs text-[#786A5B] mt-0.5">
            {t(
              'settings.subtitle',
              'Schedules, tax rates, checkout hold, and payment policies'
            )}
          </p>
        </div>
      </div>

      {saved && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{t('settings.savedSuccess', 'Settings saved and updated successfully.')}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Language Preference Card */}
      <div className="bg-white rounded-2xl border border-[#E6D9C5]/80 p-5 shadow-[0_4px_20px_rgba(33,24,15,0.03)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] text-[#8D672F] flex items-center justify-center border border-[#E6D9C5]">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-sm text-[#2A1D13]">
                {t('settings.languagePreference', 'Administrator Language Preference')}
              </h3>
              <p className="text-xs text-[#786A5B]">
                {isTelugu
                  ? 'కన్సోల్ అంతటా ఇంగ్లీష్ లేదా తెలుగు భాషను ఎంచుకోండి.'
                  : 'Choose between English or Telugu across your PMS console.'}
              </p>
            </div>
          </div>
          <AdminLanguageSwitcher />
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-[#E6D9C5]/80 p-6 sm:p-8 shadow-[0_4px_20px_rgba(33,24,15,0.03)] space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-medium text-[#786A5B] mb-1">
              {t('settings.checkInTime', 'Standard Check-In Time')}
            </label>
            <input
              type="time"
              required
              value={checkInTime}
              onChange={(e) => setCheckInTime(e.target.value)}
              className="w-full text-xs font-medium p-2.5 rounded-xl border border-[#E6D9C5] bg-[#FAF8F5] text-[#2A1D13] focus:border-[#8D672F] focus:bg-white focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-medium text-[#786A5B] mb-1">
              {t('settings.checkOutTime', 'Standard Check-Out Time')}
            </label>
            <input
              type="time"
              required
              value={checkOutTime}
              onChange={(e) => setCheckOutTime(e.target.value)}
              className="w-full text-xs font-medium p-2.5 rounded-xl border border-[#E6D9C5] bg-[#FAF8F5] text-[#2A1D13] focus:border-[#8D672F] focus:bg-white focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-medium text-[#786A5B] mb-1">
              {t('settings.taxPercentage', 'GST Tax Rate Applicable (%)')}
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={taxPercentage}
              onChange={(e) => setTaxPercentage(Number(e.target.value))}
              className="w-full text-xs font-medium p-2.5 rounded-xl border border-[#E6D9C5] bg-[#FAF8F5] text-[#2A1D13] focus:border-[#8D672F] focus:bg-white focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-medium text-[#786A5B] mb-1">
              {isTelugu ? 'చెక్-అవుట్ హోల్డ్ వ్యవధి (నిమిషాలు)' : 'Checkout Hold Lease Duration (Minutes)'}
            </label>
            <input
              type="number"
              min="5"
              max="60"
              required
              value={holdTimeoutMinutes}
              onChange={(e) => setHoldTimeoutMinutes(Number(e.target.value))}
              className="w-full text-xs font-medium p-2.5 rounded-xl border border-[#E6D9C5] bg-[#FAF8F5] text-[#2A1D13] focus:border-[#8D672F] focus:bg-white focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-[#E6D9C5] bg-[#FAF8F5] flex items-center justify-between">
          <div>
            <span className="font-medium text-xs text-[#2A1D13] block">
              {t('settings.allowPayAtHotel', 'Enable "Pay at Hotel" Option for Guests')}
            </span>
            <span className="text-[11px] text-[#786A5B]">
              {isTelugu
                ? 'అతిథులు హోటల్ వద్ద నేరుగా చెల్లించడానికి అనుమతించండి.'
                : 'Allow guests to confirm reservations online and settle payment upon arrival.'}
            </span>
          </div>
          <input
            type="checkbox"
            checked={allowPayAtHotel}
            onChange={(e) => setAllowPayAtHotel(e.target.checked)}
            className="w-4 h-4 text-[#8D672F] rounded border-[#E6D9C5] focus:ring-[#8D672F]"
          />
        </div>

        <div className="pt-4 border-t border-[#E6D9C5]/60 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-[#2A1D13] hover:bg-[#3D2B1D] text-[#EAD8B8] text-xs font-medium tracking-wide transition-all flex items-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>{isTelugu ? 'భద్రపరుస్తోంది...' : 'Saving...'}</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>{t('settings.saveSettings', 'Save Settings')}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
