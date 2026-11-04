'use client';

import { useState } from 'react';
import { repo } from '@/lib/db/repository';
import { Settings, Save, CheckCircle2 } from 'lucide-react';

export default function SettingsAdminPage() {
  const currentSettings = repo.getSettings();

  const [checkInTime, setCheckInTime] = useState(currentSettings.check_in_time);
  const [checkOutTime, setCheckOutTime] = useState(currentSettings.check_out_time);
  const [taxPercentage, setTaxPercentage] = useState(currentSettings.tax_percentage);
  const [allowPayAtHotel, setAllowPayAtHotel] = useState(currentSettings.allow_pay_at_hotel);
  const [holdTimeoutMinutes, setHoldTimeoutMinutes] = useState(currentSettings.hold_timeout_minutes);

  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    repo.updateSettings({
      check_in_time: checkInTime,
      check_out_time: checkOutTime,
      tax_percentage: Number(taxPercentage),
      allow_pay_at_hotel: Boolean(allowPayAtHotel),
      hold_timeout_minutes: Number(holdTimeoutMinutes),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EFE3D6]">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-[#D8AD56]">
            GLOBAL CONFIGURATION
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#241912] mt-0.5 flex items-center gap-2">
            <Settings className="w-6 h-6 text-[#D8AD56]" />
            <span>Hotel Operational Settings</span>
          </h1>
          <p className="text-xs text-[#786B61] mt-0.5">
            Configure system check-in/out schedules, GST tax computation rates, checkout hold leases, and payment policies.
          </p>
        </div>
      </div>

      {saved && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          <span>Settings saved and updated successfully across all booking calculations!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-[#D8AD56]/30 p-6 sm:p-8 shadow-luxury space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#786B61] mb-1">
              Standard Check-In Time
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
              Standard Check-Out Time
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
              GST Tax Rate Applicable (%)
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
              Checkout Hold Lease Duration (Minutes)
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
            <span className="font-semibold text-xs text-[#241912] block">Enable &quot;Pay at Hotel&quot; Option for Guests</span>
            <span className="text-[11px] text-[#786B61]">Allow guests to confirm reservations online and settle payment upon arrival.</span>
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
            className="px-6 py-3 rounded-xl bg-[#D8AD56] hover:bg-[#C69940] text-[#25150F] text-xs font-bold tracking-wide transition-colors flex items-center gap-2 shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>Update Global Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
}
