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
            Modify public website copy, hero headlines, contact information, and address without redeploying code. Persisted directly to Supabase cloud.
          </p>
        </div>
      </div>

      {saved && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-xs flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          <span>Website content updated successfully! Live changes are now visible across all public pages and Supabase cloud.</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
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
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-[#43001F] hover:bg-[#2E0015] text-white text-xs font-bold tracking-wide transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving to Cloud...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save & Publish Live Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
