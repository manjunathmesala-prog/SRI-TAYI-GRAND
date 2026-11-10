'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { RoomCategory } from '@/types';
import { Layers, Plus, Edit, Check, X, ShieldCheck, RefreshCw, CheckCircle2 } from 'lucide-react';
import { LuxurySelect } from '@/components/ui/LuxurySelect';
import { authStorage } from '@/lib/auth-storage';
import { useAdminLanguage } from '@/i18n/admin/AdminLanguageContext';

export default function RoomCategoriesAdminPage() {
  const { t, formatCurrency, isTelugu } = useAdminLanguage();

  const [categories, setCategories] = useState<RoomCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<RoomCategory | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [price, setPrice] = useState(1800);
  const [bedType, setBedType] = useState('King Bed');
  const [maxOccupancy, setMaxOccupancy] = useState(3);
  const [isActive, setIsActive] = useState(true);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/rooms/categories');
      if (res.ok) {
        const data = await res.json();
        if (data.categories) {
          setCategories(data.categories);
        }
      }
    } catch (err) {
      console.warn('Failed to load categories', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleOpenEdit = (cat: RoomCategory) => {
    setEditingCategory(cat);
    setName(cat.name);
    setShortDesc(cat.short_description);
    setPrice(cat.base_price_per_night);
    setBedType(cat.bed_type);
    setMaxOccupancy(cat.max_occupancy);
    setIsActive(cat.is_active);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    setIsSubmitting(true);
    try {
      const token = authStorage.getToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/admin/rooms/categories', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          categoryId: editingCategory.id,
          name,
          short_description: shortDesc,
          base_price_per_night: Number(price),
          base_tariff_paise: Number(price) * 100,
          bed_type: bedType,
          max_occupancy: Number(maxOccupancy),
          is_active: isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update category');
      }

      setToast(
        isTelugu
          ? `గది రకం "${name}" విజయవంతంగా నవీకరించబడింది!`
          : `Category "${name}" updated successfully!`
      );
      setTimeout(() => setToast(null), 4000);
      setEditingCategory(null);
      await fetchCategories();
    } catch (err: any) {
      alert(err.message || 'Failed to update category');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EFE3D6]">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-[#D8AD56]">
            {isTelugu ? 'కేటలాగ్ కాన్ఫిగరేషన్' : 'CATALOG CONFIGURATION'}
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#241912] mt-0.5 flex items-center gap-2">
            <Layers className="w-6 h-6 text-[#D8AD56]" />
            <span>{t('nav.roomCategories', 'Room Category Management')}</span>
          </h1>
          <p className="text-xs text-[#786B61] mt-0.5">
            {isTelugu
              ? 'రాత్రికి ధరలు, పడకల రకాలు, గరిష్ట అతిథుల పరిమితి, వివరణలు మరియు స్థితిని నిర్వహించండి.'
              : 'Configure rates per night, bed types, guest limits, descriptions, and active status.'}
          </p>
        </div>

        <button
          onClick={() => fetchCategories()}
          className="px-3.5 py-2 rounded-xl border border-[#D8AD56]/40 hover:bg-[#FAF7F2] text-xs font-semibold text-[#382216] transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{t('common.refresh', 'Refresh')}</span>
        </button>
      </div>

      {toast && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="bg-white rounded-2xl border border-[#D8AD56]/30 overflow-hidden shadow-luxury flex flex-col justify-between"
          >
            <div className="relative aspect-[16/9] w-full">
              <Image
                src={cat.cover_image_url}
                alt={cat.name}
                fill
                className="object-cover"
              />
              <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-[#25150F]/80 backdrop-blur-sm text-[#D8AD56] text-xs font-bold">
                {formatCurrency(cat.base_price_per_night)} / {isTelugu ? 'రాత్రికి' : 'night'}
              </div>
            </div>

            <div className="p-6 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-xl font-bold text-[#241912]">{cat.name}</h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      cat.is_active
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {cat.is_active ? t('common.active', 'Active') : t('common.inactive', 'Inactive')}
                  </span>
                </div>

                <p className="text-xs text-[#786B61] mt-2 line-clamp-2">
                  {cat.short_description}
                </p>

                <div className="mt-4 pt-4 border-t border-[#EFE3D6] grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#786B61] block">
                      {isTelugu ? 'పడక రకం' : 'Bed Configuration'}
                    </span>
                    <span className="font-semibold text-[#241912]">{cat.bed_type}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#786B61] block">
                      {isTelugu ? 'గరిష్ట అతిథులు' : 'Max Guests'}
                    </span>
                    <span className="font-semibold text-[#241912]">
                      {cat.max_occupancy} {isTelugu ? 'మంది' : 'Guests'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#EFE3D6] flex justify-end">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(cat)}
                  className="px-4 py-2 rounded-xl bg-[#43001F] hover:bg-[#2E0015] text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>{t('rooms.editRoom', 'Edit Category')}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#D8AD56]/40 p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE3D6] pb-3">
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#D8AD56]">
                  {isTelugu ? 'వర్గం సవరణ' : 'CATEGORY OVERRIDE'}
                </span>
                <h3 className="font-serif text-lg font-bold text-[#241912]">
                  {isTelugu ? `సవరించండి: ${editingCategory.name}` : `Edit ${editingCategory.name}`}
                </h3>
              </div>
              <button onClick={() => setEditingCategory(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase font-semibold text-[#786B61] mb-1">
                  {t('rooms.category', 'Category Name')}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912]"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase font-semibold text-[#786B61] mb-1">
                  {isTelugu ? 'వివరణ' : 'Short Description'}
                </label>
                <textarea
                  rows={2}
                  value={shortDesc}
                  onChange={(e) => setShortDesc(e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase font-semibold text-[#786B61] mb-1">
                    {t('rooms.pricePerNight', 'Base Rate (₹) / Night')}
                  </label>
                  <input
                    type="number"
                    min="500"
                    step="50"
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full text-xs font-medium p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-semibold text-[#786B61] mb-1">
                    {isTelugu ? 'గరిష్ట అతిథులు' : 'Max Occupancy'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={maxOccupancy}
                    onChange={(e) => setMaxOccupancy(Number(e.target.value))}
                    className="w-full text-xs font-medium p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase font-semibold text-[#786B61] mb-1">
                  {isTelugu ? 'పడక రకం' : 'Bed Type'}
                </label>
                <input
                  type="text"
                  required
                  value={bedType}
                  onChange={(e) => setBedType(e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="cat-active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-[#43001F] focus:ring-[#D8AD56]"
                />
                <label htmlFor="cat-active" className="text-xs text-[#241912] font-semibold cursor-pointer">
                  {isTelugu ? 'వెబ్‌సైట్ మరియు బుకింగ్స్‌లో సక్రియం' : 'Active for Online & Walk-In Reservations'}
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-[#43001F] text-white text-xs font-bold hover:bg-[#2E0015] disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  {isSubmitting && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>{isSubmitting ? (isTelugu ? 'భద్రపరుస్తోంది...' : 'Saving...') : (isTelugu ? 'మార్పులను భద్రపరచండి' : 'Save Changes')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
