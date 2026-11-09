'use client';

import { useState, useEffect, useCallback } from 'react';
import { Guest, GuestVIPTier } from '@/types';
import {
  Users,
  Search,
  Phone,
  Mail,
  MapPin,
  Award,
  Calendar,
  ShieldAlert,
  ShieldCheck,
  Edit3,
  MessageSquare,
  AlertTriangle,
  X,
  Plus,
  Tag,
  DollarSign,
  Crown,
  CheckCircle2,
  Download,
} from 'lucide-react';
import { useRealtimeSync } from '@/lib/realtime-client';

const COMMON_PREFERENCES = [
  'Ground Floor Room',
  'Extra Pillows',
  'Late Checkout',
  'Early Check-in',
  'Quiet Room',
  'Pure Veg / Jain Food',
  'Upper Floor / Temple View',
  'Non-Smoking Only',
  'Extra Towels',
];

export default function GuestsAdminPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | GuestVIPTier | 'blacklisted'>('all');
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);

  // Blacklist Modal State
  const [blacklistModalGuest, setBlacklistModalGuest] = useState<Guest | null>(null);
  const [blacklistReason, setBlacklistReason] = useState('');
  const [isSubmittingBlacklist, setIsSubmittingBlacklist] = useState(false);

  // Edit Profile Modal State
  const [editModalGuest, setEditModalGuest] = useState<Guest | null>(null);
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editVIPTier, setEditVIPTier] = useState<GuestVIPTier>('regular');
  const [editPreferences, setEditPreferences] = useState<string[]>([]);
  const [newPreferenceTag, setNewPreferenceTag] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchGuests = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/guests', {
        headers: { 'x-staff-role': 'Super Admin' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.guests) setGuests(data.guests);
      }
    } catch {
      // Handle error gracefully
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGuests();
  }, [fetchGuests]);

  useRealtimeSync({
    onRefresh: fetchGuests,
  });

  // Open Blacklist Modal
  const handleOpenBlacklistModal = (guest: Guest) => {
    setBlacklistModalGuest(guest);
    setBlacklistReason(guest.blacklist_reason || '');
  };

  // Submit Blacklist Toggle
  const handleToggleBlacklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blacklistModalGuest) return;

    setIsSubmittingBlacklist(true);
    try {
      const res = await fetch('/api/admin/guests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-role': 'Super Admin',
        },
        body: JSON.stringify({
          action: 'toggle_blacklist',
          id: blacklistModalGuest.id,
          reason: blacklistReason,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to toggle guest blacklist status');
      }

      setBlacklistModalGuest(null);
      showToast('success', 'Guest blacklist status updated successfully');
      await fetchGuests();
    } catch (err: any) {
      showToast('error', err.message || 'Error updating blacklist');
    } finally {
      setIsSubmittingBlacklist(false);
    }
  };

  // Open Edit Profile Modal
  const handleOpenEditModal = (guest: Guest) => {
    setEditModalGuest(guest);
    setEditPhone(guest.phone || '');
    setEditEmail(guest.email || '');
    setEditCity(guest.city || '');
    setEditState(guest.state || '');
    setEditVIPTier(guest.vip_tier || 'regular');
    setEditPreferences(guest.preferences ? [...guest.preferences] : []);
    setEditNotes(guest.notes || '');
    setNewPreferenceTag('');
  };

  // Add preference tag
  const handleAddPreference = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || editPreferences.includes(trimmed)) return;
    setEditPreferences([...editPreferences, trimmed]);
    setNewPreferenceTag('');
  };

  // Remove preference tag
  const handleRemovePreference = (tag: string) => {
    setEditPreferences(editPreferences.filter((p) => p !== tag));
  };

  // Submit Edit Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalGuest) return;

    setIsSubmittingEdit(true);
    try {
      const res = await fetch('/api/admin/guests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-role': 'Super Admin',
        },
        body: JSON.stringify({
          action: 'update_profile',
          id: editModalGuest.id,
          updates: {
            phone: editPhone,
            email: editEmail,
            city: editCity,
            state: editState,
            vip_tier: editVIPTier,
            preferences: editPreferences,
            notes: editNotes,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update guest profile');
      }

      setEditModalGuest(null);
      showToast('success', `Guest profile for ${editModalGuest.full_name} updated successfully`);
      await fetchGuests();
    } catch (err: any) {
      showToast('error', err.message || 'Error updating guest profile');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // VIP Classification Badge helper
  const renderVIPBadge = (tier?: GuestVIPTier) => {
    switch (tier) {
      case 'vip_platinum':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-purple-100 to-amber-100 text-purple-900 border border-purple-300 shadow-xs inline-flex items-center gap-1">
            <Crown className="w-3 h-3 text-purple-700" />
            <span>PLATINUM VIP</span>
          </span>
        );
      case 'gold':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1">
            <Award className="w-3 h-3 text-amber-600" />
            <span>GOLD</span>
          </span>
        );
      case 'silver':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800 border border-slate-300 inline-flex items-center gap-1">
            <span>SILVER</span>
          </span>
        );
      case 'regular':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-stone-100 text-stone-700 border border-stone-200 inline-flex items-center gap-1">
            <span>REGULAR</span>
          </span>
        );
    }
  };

  // Filtered Guests
  const filteredGuests = guests.filter((g) => {
    const matchesSearch =
      g.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.phone.includes(searchQuery) ||
      (g.email && g.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (g.city && g.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (g.preferences && g.preferences.some((p) => p.toLowerCase().includes(searchQuery.toLowerCase())));

    if (!matchesSearch) return false;

    if (tierFilter === 'all') return true;
    if (tierFilter === 'blacklisted') return g.is_blacklisted;
    return g.vip_tier === tierFilter;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border flex items-center gap-3 transition-all animate-in slide-in-from-top-2 ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-xs opacity-70 hover:opacity-100 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EFE3D6]">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-semibold text-[#D8AD56]">
            GUEST CRM & VIP REGISTRY
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#241912] mt-0.5 flex items-center gap-2">
            <Users className="w-6 h-6 text-[#D8AD56]" />
            <span>Guest Profiles & Lifetime Stays</span>
          </h1>
          <p className="text-xs text-[#786B61] mt-0.5">
            VIP tiers, stay frequency, cumulative spend, stay preferences, and security blacklisting.
          </p>
        </div>

        {/* Search & Export */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#786B61] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guest name, phone, preference..."
              className="w-full text-xs font-medium pl-9 pr-3 py-2.5 rounded-xl border border-[#EFE3D6] bg-white text-[#241912] focus:border-[#D8AD56] focus:outline-none shadow-sm"
            />
          </div>
          <button
            onClick={() => { window.location.href = '/api/admin/guests?export=csv'; }}
            className="px-3.5 py-2.5 rounded-xl bg-white border border-[#EFE3D6] hover:bg-[#FAF7F2] text-[#382216] text-xs font-semibold flex items-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
            title="Export Guest Directory to CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#D8AD56]" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Tier Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#EFE3D6] pb-2">
        <button
          onClick={() => setTierFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            tierFilter === 'all'
              ? 'bg-[#382216] text-[#D8AD56] shadow-sm'
              : 'bg-white text-[#786B61] hover:bg-[#FAF7F2]'
          }`}
        >
          All Guests ({guests.length})
        </button>
        <button
          onClick={() => setTierFilter('vip_platinum')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            tierFilter === 'vip_platinum'
              ? 'bg-purple-900 text-purple-100 shadow-sm'
              : 'bg-white text-purple-800 hover:bg-purple-50'
          }`}
        >
          Platinum VIP ({guests.filter((g) => g.vip_tier === 'vip_platinum').length})
        </button>
        <button
          onClick={() => setTierFilter('gold')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            tierFilter === 'gold'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white text-amber-700 hover:bg-amber-50'
          }`}
        >
          Gold ({guests.filter((g) => g.vip_tier === 'gold').length})
        </button>
        <button
          onClick={() => setTierFilter('silver')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            tierFilter === 'silver'
              ? 'bg-slate-700 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100'
          }`}
        >
          Silver ({guests.filter((g) => g.vip_tier === 'silver').length})
        </button>
        <button
          onClick={() => setTierFilter('regular')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            tierFilter === 'regular'
              ? 'bg-stone-700 text-white shadow-sm'
              : 'bg-white text-stone-700 hover:bg-stone-100'
          }`}
        >
          Regular ({guests.filter((g) => !g.vip_tier || g.vip_tier === 'regular').length})
        </button>
        <button
          onClick={() => setTierFilter('blacklisted')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            tierFilter === 'blacklisted'
              ? 'bg-rose-800 text-white shadow-sm'
              : 'bg-white text-rose-700 hover:bg-rose-50'
          }`}
        >
          Blacklisted ({guests.filter((g) => g.is_blacklisted).length})
        </button>
      </div>

      {/* Guest Directory Table */}
      <div className="bg-white rounded-2xl border border-[#D8AD56]/30 shadow-luxury overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F2] text-[#786B61] uppercase tracking-wider text-[10px] border-b border-[#EFE3D6]">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Guest & Tier</th>
                <th className="py-3.5 px-4 font-semibold">Contact (Call / WhatsApp)</th>
                <th className="py-3.5 px-4 font-semibold">Location</th>
                <th className="py-3.5 px-4 font-semibold">Stays & Cumulative Spend</th>
                <th className="py-3.5 px-4 font-semibold">Preferences</th>
                <th className="py-3.5 px-4 font-semibold">Security Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE3D6] text-[#241912]">
              {filteredGuests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#786B61]">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Users className="w-8 h-8 text-stone-300" />
                      <span className="font-semibold text-sm text-[#241912]">No Guest Profiles Found</span>
                      <p className="text-xs text-[#786B61] max-w-sm">
                        {searchQuery || tierFilter !== 'all'
                          ? 'No guest profiles match your current search query or tier filter.'
                          : 'No guest profiles currently registered.'}
                      </p>
                      {(searchQuery || tierFilter !== 'all') && (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setTierFilter('all');
                          }}
                          className="mt-2 px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold cursor-pointer transition-colors"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredGuests.map((g) => {
                  const cleanPhone = g.phone.replace(/[^0-9]/g, '');
                  const waMessage = `Namaste ${g.full_name}, greetings from Sri Tayi Grand, Kadiri! How may we assist your upcoming visit?`;

                  return (
                    <tr
                      key={g.id}
                      className={`transition-colors ${
                        g.is_blacklisted
                          ? 'bg-rose-50/40 hover:bg-rose-50/70'
                          : 'hover:bg-[#FAF7F2]/60'
                      }`}
                    >
                      {/* Guest & Tier */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                              g.vip_tier === 'vip_platinum'
                                ? 'bg-gradient-to-tr from-purple-700 to-amber-500 text-white'
                                : g.vip_tier === 'gold'
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-[#FAF7F2] border border-[#EFE3D6] text-[#D8AD56]'
                            }`}
                          >
                            {g.full_name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-[#382216] flex items-center gap-1.5">
                              <span>{g.full_name}</span>
                              {g.is_blacklisted && (
                                <span className="text-[9px] px-1.5 py-0.2 bg-red-600 text-white rounded font-bold uppercase">
                                  Blacklisted
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5">{renderVIPBadge(g.vip_tier)}</div>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium">{g.phone}</span>
                          <div className="flex items-center gap-1">
                            {/* Direct Phone Call Trigger */}
                            <a
                              href={`tel:${cleanPhone}`}
                              className="p-1 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
                              title="Direct Phone Call"
                            >
                              <Phone className="w-3 h-3 text-[#382216]" />
                            </a>

                            {/* One-click WhatsApp link */}
                            <a
                              href={`https://wa.me/91${cleanPhone}?text=${encodeURIComponent(waMessage)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-800 transition-colors"
                              title="Chat on WhatsApp"
                            >
                              <MessageSquare className="w-3 h-3 text-emerald-700" />
                            </a>
                          </div>
                        </div>
                        {g.email && <div className="text-[11px] text-[#786B61] mt-0.5">{g.email}</div>}
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4">
                        <div className="text-[#382216]">
                          {g.city ? `${g.city}, ${g.state || ''}` : 'India'}
                        </div>
                        <div className="text-[10px] text-[#786B61]">{g.country}</div>
                      </td>

                      {/* Stays & Cumulative Spend */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-sm text-[#241912] flex items-center gap-1">
                          <span>₹ {(g.total_spend || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F5E9] text-[#2E7D32] inline-flex items-center gap-0.5">
                            <Award className="w-2.5 h-2.5" />
                            <span>{g.total_stays} {g.total_stays === 1 ? 'Stay' : 'Stays'}</span>
                          </span>
                          {g.last_stay_date && (
                            <span className="text-[10px] text-[#786B61]">
                              Last: {g.last_stay_date}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Preferences Pill Tags */}
                      <td className="py-3.5 px-4 max-w-xs">
                        {g.preferences && g.preferences.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {g.preferences.map((p, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#FAF7F2] border border-[#EFE3D6] text-[#786B61] inline-flex items-center gap-1"
                              >
                                <Tag className="w-2.5 h-2.5 text-[#D8AD56]" />
                                <span>{p}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[#A89F91] text-[11px] italic">No preferences noted</span>
                        )}
                      </td>

                      {/* Security Status */}
                      <td className="py-3.5 px-4">
                        {g.is_blacklisted ? (
                          <div className="space-y-0.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3 text-rose-600" />
                              <span>Blacklisted</span>
                            </span>
                            {g.blacklist_reason && (
                              <div className="text-[10px] text-rose-700 italic max-w-[140px] truncate" title={g.blacklist_reason}>
                                {g.blacklist_reason}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>In Good Standing</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit Profile Button */}
                          <button
                            onClick={() => handleOpenEditModal(g)}
                            className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-[#382216] text-[11px] font-bold border border-stone-200 flex items-center gap-1 cursor-pointer transition-colors"
                            title="Edit Profile"
                          >
                            <Edit3 className="w-3 h-3 text-[#D8AD56]" />
                            <span>Edit</span>
                          </button>

                          {/* Toggle Blacklist Button */}
                          <button
                            onClick={() => handleOpenBlacklistModal(g)}
                            className={`px-2 py-1 rounded-lg text-[11px] font-bold border cursor-pointer transition-colors ${
                              g.is_blacklisted
                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300'
                                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                            }`}
                            title={g.is_blacklisted ? 'Reinstate Guest' : 'Blacklist Guest'}
                          >
                            {g.is_blacklisted ? 'Reinstate' : 'Blacklist'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: EDIT GUEST PROFILE */}
      {editModalGuest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#D8AD56]/40 p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE3D6] pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#D8AD56]" />
                <h3 className="font-serif text-lg font-bold text-[#241912]">
                  Edit Guest Profile: {editModalGuest.full_name}
                </h3>
              </div>
              <button
                onClick={() => setEditModalGuest(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#786B61] uppercase mb-1">
                    Phone (WhatsApp) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#EFE3D6] font-mono focus:border-[#D8AD56] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#786B61] uppercase mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-[#EFE3D6] focus:border-[#D8AD56] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#786B61] uppercase mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={editCity}
                    onChange={(e) => setEditCity(e.target.value)}
                    placeholder="e.g. Anantapur, Bengaluru"
                    className="w-full text-xs p-2.5 rounded-lg border border-[#EFE3D6] focus:border-[#D8AD56] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#786B61] uppercase mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={editState}
                    onChange={(e) => setEditState(e.target.value)}
                    placeholder="e.g. Andhra Pradesh, Karnataka"
                    className="w-full text-xs p-2.5 rounded-lg border border-[#EFE3D6] focus:border-[#D8AD56] focus:outline-none"
                  />
                </div>
              </div>

              {/* VIP Tier Selector */}
              <div>
                <label className="block text-[11px] font-bold text-[#786B61] uppercase mb-1.5">
                  VIP Classification Tier
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['regular', 'silver', 'gold', 'vip_platinum'] as GuestVIPTier[]).map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setEditVIPTier(tier)}
                      className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer text-center ${
                        editVIPTier === tier
                          ? tier === 'vip_platinum'
                            ? 'bg-purple-900 text-white border-purple-900 shadow-xs'
                            : tier === 'gold'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : tier === 'silver'
                            ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                            : 'bg-stone-700 text-white border-stone-700 shadow-xs'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {tier.replace('_', ' ').toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Guest Preferences */}
              <div>
                <label className="block text-[11px] font-bold text-[#786B61] uppercase mb-1.5">
                  Guest Stay Preferences
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {editPreferences.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#43001F] text-[#D8AD56] inline-flex items-center gap-1.5 shadow-xs"
                    >
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePreference(tag)}
                        className="hover:text-white cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Quick Add Pills */}
                <div className="text-[10px] text-[#786B61] font-semibold mb-1">Quick Select:</div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {COMMON_PREFERENCES.filter((p) => !editPreferences.includes(p)).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleAddPreference(p)}
                      className="px-2 py-0.5 rounded text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer"
                    >
                      + {p}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPreferenceTag}
                    onChange={(e) => setNewPreferenceTag(e.target.value)}
                    placeholder="Add custom preference tag..."
                    className="flex-1 text-xs p-2 rounded-lg border border-[#EFE3D6] focus:border-[#D8AD56] focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddPreference(newPreferenceTag);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleAddPreference(newPreferenceTag)}
                    className="px-3 py-2 rounded-lg bg-stone-800 text-white text-xs font-bold hover:bg-stone-900 cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold text-[#786B61] uppercase mb-1">
                  Staff CRM Notes
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Special instructions, pilgrimage history, or family notes..."
                  className="w-full text-xs p-2.5 rounded-lg border border-[#EFE3D6] focus:border-[#D8AD56] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  onClick={() => setEditModalGuest(null)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2 rounded-lg bg-[#43001F] hover:bg-[#2E0015] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingEdit ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TOGGLE BLACKLIST */}
      {blacklistModalGuest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-rose-300 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#EFE3D6] pb-3">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-serif text-lg font-bold text-[#241912]">
                  {blacklistModalGuest.is_blacklisted ? 'Reinstate Guest' : 'Blacklist Guest'}
                </h3>
              </div>
              <button
                onClick={() => setBlacklistModalGuest(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#786B61]">
              {blacklistModalGuest.is_blacklisted
                ? `Are you sure you want to reinstate ${blacklistModalGuest.full_name}? They will be permitted to make room and banquet reservations again.`
                : `Blacklisting ${blacklistModalGuest.full_name} will flag their phone number (${blacklistModalGuest.phone}) across all front desk check-ins and online bookings.`}
            </p>

            <form onSubmit={handleToggleBlacklist} className="space-y-4">
              {!blacklistModalGuest.is_blacklisted && (
                <div>
                  <label className="block text-[11px] font-bold text-[#786B61] uppercase mb-1">
                    Blacklist Reason *
                  </label>
                  <input
                    type="text"
                    required
                    value={blacklistReason}
                    onChange={(e) => setBlacklistReason(e.target.value)}
                    placeholder="e.g. Non-payment, Room vandalism, Dispute"
                    className="w-full text-xs p-2.5 rounded-lg border border-[#EFE3D6] focus:border-rose-500 focus:outline-none"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  onClick={() => setBlacklistModalGuest(null)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBlacklist}
                  className={`px-5 py-2 rounded-lg text-white text-xs font-bold cursor-pointer disabled:opacity-50 ${
                    blacklistModalGuest.is_blacklisted
                      ? 'bg-emerald-700 hover:bg-emerald-800'
                      : 'bg-rose-700 hover:bg-rose-800'
                  }`}
                >
                  {isSubmittingBlacklist
                    ? 'Processing...'
                    : blacklistModalGuest.is_blacklisted
                    ? 'Confirm Reinstatement'
                    : 'Confirm Blacklist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
