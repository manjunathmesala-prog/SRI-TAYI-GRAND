'use client';

import { useState } from 'react';
import { repo } from '@/lib/db/repository';
import { Globe, Save, CheckCircle2 } from 'lucide-react';

export default function ContentCMSPage() {
  const currentSettings = repo.getSettings();

  const [hotelName, setHotelName] = useState(currentSettings.hotel_name);
  const [tagline, setTagline] = useState(currentSettings.tagline);
  const [phone, setPhone] = useState(currentSettings.phone);
  const [whatsapp, setWhatsapp] = useState(currentSettings.whatsapp);
  const [email, setEmail] = useState(currentSettings.email);
  const [address, setAddress] = useState(currentSettings.address);
  const [road, setRoad] = useState(currentSettings.road);

  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    repo.updateSettings({
      hotel_name: hotelName,
      tagline,
      phone,
      whatsapp,
      email,
      address,
      road,
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
            LIVE CMS
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#241912] mt-0.5 flex items-center gap-2">
            <Globe className="w-6 h-6 text-[#D8AD56]" />
            <span>Website Content Management</span>
          </h1>
          <p className="text-xs text-[#786B61] mt-0.5">
            Modify public website copy, hero headlines, contact information, and address without redeploying code.
          </p>
        </div>
      </div>

      {saved && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          <span>Website content updated successfully! Live changes are now visible across all public pages.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-[#D8AD56]/30 p-6 sm:p-8 shadow-luxury space-y-5">
        <div>
          <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#786B61] mb-1">
            Official Hotel Brand Name
          </label>
          <input
            type="text"
            required
            value={hotelName}
            onChange={(e) => setHotelName(e.target.value)}
            className="w-full text-xs font-medium p-3 rounded-lg border border-[#EFE3D6] bg-[#FAF7F2] text-[#241912]"
          />
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#786B61] mb-1">
            Hero Tagline / Subtitle
          </label>
          <input
            type="text"
            required
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            className="w-full text-xs font-medium p-3 rounded-lg border border-[#EFE3D6] bg-[#FAF7F2] text-[#241912]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#786B61] mb-1">
              Official Contact Phone
            </label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full text-xs font-medium p-3 rounded-lg border border-[#EFE3D6] bg-[#FAF7F2] text-[#241912]"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#786B61] mb-1">
              Official WhatsApp Number
            </label>
            <input
              type="text"
              required
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="w-full text-xs font-medium p-3 rounded-lg border border-[#EFE3D6] bg-[#FAF7F2] text-[#241912]"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#786B61] mb-1">
            Official Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full text-xs font-medium p-3 rounded-lg border border-[#EFE3D6] bg-[#FAF7F2] text-[#241912]"
          />
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#786B61] mb-1">
            Hotel Full Postal Address
          </label>
          <textarea
            rows={2}
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full text-xs font-medium p-3 rounded-lg border border-[#EFE3D6] bg-[#FAF7F2] text-[#241912]"
          />
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider font-semibold text-[#786B61] mb-1">
            Corridor / Landmark Road
          </label>
          <input
            type="text"
            required
            value={road}
            onChange={(e) => setRoad(e.target.value)}
            className="w-full text-xs font-medium p-3 rounded-lg border border-[#EFE3D6] bg-[#FAF7F2] text-[#241912]"
          />
        </div>

        <div className="pt-4 border-t border-[#EFE3D6] flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-[#43001F] hover:bg-[#2E0015] text-white text-xs font-bold tracking-wide transition-colors flex items-center gap-2 shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>Save & Publish Live Changes</span>
          </button>
        </div>
      </form>
    </div>
  );
}
