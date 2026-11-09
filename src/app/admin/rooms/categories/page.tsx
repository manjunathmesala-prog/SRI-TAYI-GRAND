'use client';

import { useState } from 'react';
import Image from 'next/image';
import { repo } from '@/lib/db/repository';
import { RoomCategory } from '@/types';
import { Layers, Plus, Edit, Check, X, ShieldCheck } from 'lucide-react';
import { LuxurySelect } from '@/components/ui/LuxurySelect';

export default function RoomCategoriesAdminPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingCategory, setEditingCategory] = useState<RoomCategory | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [price, setPrice] = useState(1800);
  const [bedType, setBedType] = useState('King Bed');
  const [maxOccupancy, setMaxOccupancy] = useState(3);
  const [isActive, setIsActive] = useState(true);

  const categories = repo.getCategories();

  const handleOpenEdit = (cat: RoomCategory) => {
    setEditingCategory(cat);
    setName(cat.name);
    setShortDesc(cat.short_description);
    setPrice(cat.base_price_per_night);
    setBedType(cat.bed_type);
    setMaxOccupancy(cat.max_occupancy);
    setIsActive(cat.is_active);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    repo.updateCategory(editingCategory.id, {
      name,
      short_description: shortDesc,
      base_price_per_night: Number(price),
      base_tariff_paise: Number(price) * 100,
      bed_type: bedType,
      max_occupancy: Number(maxOccupancy),
      is_active: isActive,
    });

    setEditingCategory(null);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto" key={refreshKey}>
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EFE3D6]">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-[#D8AD56]">
            CATALOG CONFIGURATION
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#241912] mt-0.5 flex items-center gap-2">
            <Layers className="w-6 h-6 text-[#D8AD56]" />
            <span>Room Category Management</span>
          </h1>
          <p className="text-xs text-[#786B61] mt-0.5">
            Configure rates per night, bed types, guest limits, descriptions, and active status.
          </p>
        </div>
      </div>

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
                ₹ {cat.base_price_per_night.toLocaleString('en-IN')} / night
              </div>
            </div>

            <div className="p-6 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-xl font-bold text-[#241912]">
                    {cat.name}
                  </h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    cat.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {cat.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>

                <p className="text-xs text-[#786B61] mt-2 leading-relaxed">
                  {cat.short_description}
                </p>

                <div className="mt-4 pt-3 border-t border-[#EFE3D6] grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-[#241912]">
                  <div>Bed: <strong className="block truncate">{cat.bed_type}</strong></div>
                  <div>Included: <strong className="block">{cat.included_occupancy || 2} Persons</strong></div>
                  <div>Extra Person: <strong className="block">₹300 (Max {cat.max_occupancy})</strong></div>
                  <div>Inventory: <strong className="block">{cat.total_physical_rooms} Rooms</strong></div>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-[#EFE3D6] flex justify-end">
                <button
                  onClick={() => handleOpenEdit(cat)}
                  className="px-4 py-2 rounded-lg bg-[#382216] hover:bg-[#25150F] text-[#EFE3D6] text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <Edit className="w-3.5 h-3.5 text-[#D8AD56]" />
                  <span>Edit Category & Pricing</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* EDIT MODAL */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#D8AD56]/40 p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#EFE3D6] pb-3">
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#D8AD56]">CATEGORY EDITOR</span>
                <h3 className="font-serif text-lg font-bold text-[#241912]">Edit {editingCategory.name}</h3>
              </div>
              <button onClick={() => setEditingCategory(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase font-semibold text-[#786B61] mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-lg border border-[#EFE3D6]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase font-semibold text-[#786B61] mb-1">
                    Base Price / Night (â‚¹)
                  </label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full text-xs font-medium p-2.5 rounded-lg border border-[#EFE3D6]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase font-semibold text-[#786B61] mb-1">
                    Bed Configuration
                  </label>
                  <input
                    type="text"
                    required
                    value={bedType}
                    onChange={(e) => setBedType(e.target.value)}
                    className="w-full text-xs font-medium p-2.5 rounded-lg border border-[#EFE3D6]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase font-semibold text-[#786B61] mb-1">
                    Max Occupancy (Guests)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    required
                    value={maxOccupancy}
                    onChange={(e) => setMaxOccupancy(Number(e.target.value))}
                    className="w-full text-xs font-medium p-2.5 rounded-lg border border-[#EFE3D6]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase font-semibold text-[#786B61] mb-1">
                    Status
                  </label>
                  <LuxurySelect
                    size="md"
                    variant="admin"
                    value={isActive ? 'true' : 'false'}
                    onChange={(val) => setIsActive(val === 'true')}
                    options={[
                      { value: 'true', label: 'Active (Bookable)' },
                      { value: 'false', label: 'Inactive (Hidden)' },
                    ]}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase font-semibold text-[#786B61] mb-1">
                  Short Description
                </label>
                <textarea
                  rows={2}
                  required
                  value={shortDesc}
                  onChange={(e) => setShortDesc(e.target.value)}
                  className="w-full text-xs font-medium p-2.5 rounded-lg border border-[#EFE3D6]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-xs text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#43001F] text-white text-xs font-bold hover:bg-[#2E0015]"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
