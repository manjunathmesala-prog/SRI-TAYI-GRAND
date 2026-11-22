'use client';

import { useState, useEffect } from 'react';
import { Globe, Save, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { authStorage } from '@/lib/auth-storage';

export default function ContentCMSPage() {
  const [hotelName, setHotelName] = useState('SRI TAYI GRAND');
  const [tagline, setTagline] = useState('Stay · Host · Celebrate');
  const [phone, setPhone] = useState('084942 23379');
  const [whatsapp, setWhatsapp] = useState('+918494223379');
  const [email, setEmail] = useState('contact@sritayigrand.com');
  const [address, setAddress] = useState('');
  const [road, setRoad] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadContent() {
      try {
        const token = authStorage.getToken();
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/admin/settings', { headers });
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            setHotelName(data.settings.hotel_name || 'SRI TAYI GRAND');
            setTagline(data.settings.tagline || 'Stay · Host · Celebrate');
            setPhone(data.settings.phone || '084942 23379');
            setWhatsapp(data.settings.whatsapp || '+918494223379');
            setEmail(data.settings.email || 'contact@sritayigrand.com');
            setAddress(data.settings.address || '');
            setRoad(data.settings.road || '');
          }
        }
      } catch (err: any) {
        console.warn('Failed to load CMS content from server', err);
      } finally {
        setLoading(false);
      }
    }
    loadContent();
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
          hotel_name: hotelName,
          tagline,
          phone,
          whatsapp,
          email,
          address,
          road,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update website content');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to update website content');
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
            Website Content
          </h1>
          <p className="text-xs text-[#786A5B] mt-0.5">
            Public website copy, contact information, and address
          </p>
        </div>
      </div>

      {saved && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Website content updated successfully. Live changes are now visible.</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-[#E6D9C5]/80 p-6 sm:p-8 shadow-[0_4px_20px_rgba(33,24,15,0.03)] space-y-4">
        <div>
          <label className="block text-[11px] uppercase tracking-wider font-medium text-[#786A5B] mb-1">
            Official Hotel Brand Name
          </label>
          <input
            type="text"
            required
            value={hotelName}
            onChange={(e) => setHotelName(e.target.value)}
            className="w-full text-xs font-medium p-2.5 rounded-xl border border-[#E6D9C5] bg-[#FAF8F5] text-[#2A1D13] focus:border-[#8D672F] focus:bg-white focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider font-medium text-[#786A5B] mb-1">
            Hero Tagline / Subtitle
          </label>
          <input
            type="text"
            required
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            className="w-full text-xs font-medium p-2.5 rounded-xl border border-[#E6D9C5] bg-[#FAF8F5] text-[#2A1D13] focus:border-[#8D672F] focus:bg-white focus:outline-none transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider font-medium text-[#786A5B] mb-1">
              Official Contact Phone
            </label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full text-xs font-medium p-2.5 rounded-xl border border-[#E6D9C5] bg-[#FAF8F5] text-[#2A1D13] focus:border-[#8D672F] focus:bg-white focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider font-medium text-[#786A5B] mb-1">
              Official WhatsApp Number
            </label>
            <input
              type="text"
              required
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="w-full text-xs font-medium p-2.5 rounded-xl border border-[#E6D9C5] bg-[#FAF8F5] text-[#2A1D13] focus:border-[#8D672F] focus:bg-white focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider font-medium text-[#786A5B] mb-1">
            Official Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full text-xs font-medium p-2.5 rounded-xl border border-[#E6D9C5] bg-[#FAF8F5] text-[#2A1D13] focus:border-[#8D672F] focus:bg-white focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider font-medium text-[#786A5B] mb-1">
            Hotel Full Postal Address
          </label>
          <textarea
            rows={2}
            required
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full text-xs font-medium p-2.5 rounded-xl border border-[#E6D9C5] bg-[#FAF8F5] text-[#2A1D13] focus:border-[#8D672F] focus:bg-white focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-wider font-medium text-[#786A5B] mb-1">
            Corridor / Landmark Road
          </label>
          <input
            type="text"
            required
            value={road}
            onChange={(e) => setRoad(e.target.value)}
            className="w-full text-xs font-medium p-2.5 rounded-xl border border-[#E6D9C5] bg-[#FAF8F5] text-[#2A1D13] focus:border-[#8D672F] focus:bg-white focus:outline-none transition-colors"
          />
        </div>

        <div className="pt-4 border-t border-[#E6D9C5]/60 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-[#2A1D13] hover:bg-[#3D2B1D] text-[#EAD8B8] text-xs font-medium tracking-wide transition-all flex items-center gap-2 shadow-xs disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
