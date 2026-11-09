'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PricingRule, PricingRuleType } from '@/types';
import { useRealtimeSync } from '@/lib/realtime-client';
import { LuxurySelect } from '@/components/ui/LuxurySelect';
import {
  TrendingUp,
  Percent,
  Calendar,
  Sparkles,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Calculator,
  Building,
  Sliders,
  X,
  Check,
  Tag,
  ArrowUpRight,
  ShieldCheck,
  CalendarRange,
} from 'lucide-react';

interface CategoryItem {
  id: string;
  name: string;
  base_price_per_night: number;
  extra_person_tariff_rupees: number;
  max_occupancy: number;
}

const RULE_TYPE_CONFIG: Record<
  PricingRuleType,
  { label: string; bg: string; text: string; border: string }
> = {
  weekend_surge: {
    label: 'Weekend Surge',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
  },
  festival_surge: {
    label: 'Festival Peak Surge',
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200',
  },
  seasonal_surge: {
    label: 'Seasonal Surge',
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
  },
  extra_bed: {
    label: 'Extra Bed / Adult Surcharge',
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200',
  },
  special_discount: {
    label: 'Special Promotional Discount',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200',
  },
};

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AdminPricingPage() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Effective Rate Calculator State
  const [calcCategoryId, setCalcCategoryId] = useState<string>('');
  const [calcDate, setCalcDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [calcExtraPersons, setCalcExtraPersons] = useState<number>(0);

  // Create Rule Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formRuleType, setFormRuleType] = useState<PricingRuleType>('weekend_surge');
  const [formAdjustmentType, setFormAdjustmentType] = useState<'percentage' | 'fixed_amount'>('percentage');
  const [formAdjustmentValue, setFormAdjustmentValue] = useState<number>(15);
  const [formCategorySelection, setFormCategorySelection] = useState<string>('all');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formDaysOfWeek, setFormDaysOfWeek] = useState<number[]>([5, 6]); // Fri, Sat default
  const [formIsActive, setFormIsActive] = useState(true);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Real-time synchronization
  const { isConnected } = useRealtimeSync({
    onEvent: (event) => {
      if (
        event.eventType === 'pricing_rule_created' ||
        event.eventType === 'pricing_rule_updated' ||
        event.eventType === 'pricing_rule_deleted'
      ) {
        fetchPricingData(false);
      }
    },
  });

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const fetchPricingData = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await fetch('/api/admin/pricing', {
        headers: { 'x-staff-role': 'Super Admin' },
      });
      const data = await res.json();
      if (data.success) {
        setRules(data.rules || []);
        setCategories(data.categories || []);
        if (data.categories?.length > 0 && !calcCategoryId) {
          setCalcCategoryId(data.categories[0].id);
        }
      }
    } catch {
      // Handle network errors gracefully
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [calcCategoryId]);

  useEffect(() => {
    fetchPricingData(true);
  }, [fetchPricingData]);

  // Toggle active state for a rule
  const handleToggleActive = async (rule: PricingRule) => {
    const updatedState = !rule.is_active;
    try {
      const res = await fetch('/api/admin/pricing', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-role': 'Super Admin',
        },
        body: JSON.stringify({
          id: rule.id,
          updates: { is_active: updatedState },
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Rule "${rule.name}" is now ${updatedState ? 'Active' : 'Paused'}.`);
        fetchPricingData(false);
      }
    } catch (err: any) {
      showNotification(`Error: ${err.message}`);
    }
  };

  // Delete a rule
  const handleDeleteRule = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete rule "${name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/pricing?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-staff-role': 'Super Admin' },
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`Rule "${name}" deleted.`);
        fetchPricingData(false);
      }
    } catch (err: any) {
      showNotification(`Error: ${err.message}`);
    }
  };

  // Create new rule form submit
  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);

    try {
      const appliesCategories = formCategorySelection === 'all' ? ['all'] : [formCategorySelection];

      const res = await fetch('/api/admin/pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-role': 'Super Admin',
        },
        body: JSON.stringify({
          name: formName,
          description: formDescription,
          rule_type: formRuleType,
          adjustment_type: formAdjustmentType,
          adjustment_value: Number(formAdjustmentValue),
          applies_to_categories: appliesCategories,
          start_date: formStartDate || undefined,
          end_date: formEndDate || undefined,
          days_of_week: formDaysOfWeek.length > 0 ? formDaysOfWeek : undefined,
          is_active: formIsActive,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showNotification(`Pricing Rule "${formName}" created and deployed.`);
        setModalOpen(false);
        resetForm();
        fetchPricingData(false);
      } else {
        showNotification(`Error: ${data.error || 'Failed to create rule'}`);
      }
    } catch (err: any) {
      showNotification(`Error: ${err.message}`);
    } finally {
      setFormSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormRuleType('weekend_surge');
    setFormAdjustmentType('percentage');
    setFormAdjustmentValue(15);
    setFormCategorySelection('all');
    setFormStartDate('');
    setFormEndDate('');
    setFormDaysOfWeek([5, 6]);
    setFormIsActive(true);
  };

  // Toggle day of week in create form
  const toggleDayOfWeek = (dayIdx: number) => {
    if (formDaysOfWeek.includes(dayIdx)) {
      setFormDaysOfWeek(formDaysOfWeek.filter((d) => d !== dayIdx));
    } else {
      setFormDaysOfWeek([...formDaysOfWeek, dayIdx].sort());
    }
  };

  // Calculator effective rate breakdown
  const calculatedBreakdown = useMemo(() => {
    const category = categories.find((c) => c.id === calcCategoryId) || categories[0];
    const baseRate = category ? category.base_price_per_night : 2500;
    const extraBedTariff = category ? category.extra_person_tariff_rupees || 500 : 500;

    let effective = baseRate;
    const appliedRules: { name: string; amount: number; type: string }[] = [];

    const targetDate = calcDate ? new Date(`${calcDate}T12:00:00`) : new Date();
    const dayOfWeek = targetDate.getDay();
    const targetDateIso = targetDate.toISOString().split('T')[0];

    for (const rule of rules) {
      if (!rule.is_active) continue;
      if (!rule.applies_to_categories.includes('all') && !rule.applies_to_categories.includes(calcCategoryId))
        continue;

      let matches = false;
      if (rule.days_of_week && rule.days_of_week.includes(dayOfWeek)) {
        matches = true;
      }
      if (rule.start_date && rule.end_date && targetDateIso >= rule.start_date && targetDateIso <= rule.end_date) {
        matches = true;
      }

      if (matches) {
        let diff = 0;
        if (rule.adjustment_type === 'percentage') {
          diff = Math.round(baseRate * (rule.adjustment_value / 100));
          effective += diff;
        } else {
          diff = rule.adjustment_value;
          effective += diff;
        }
        appliedRules.push({
          name: rule.name,
          amount: diff,
          type: rule.rule_type,
        });
      }
    }

    const extraPersonsCharge = calcExtraPersons * extraBedTariff;
    const subtotal = effective + extraPersonsCharge;
    const gstRate = 0.12; // 12% GST standard
    const gstAmount = Math.round(subtotal * gstRate * 100) / 100;
    const finalTariff = subtotal + gstAmount;

    return {
      category,
      baseRate,
      appliedRules,
      effectiveRate: effective,
      extraPersonsCharge,
      subtotal,
      gstAmount,
      finalTariff,
    };
  }, [categories, rules, calcCategoryId, calcDate, calcExtraPersons]);

  // KPI Computations
  const activeRulesCount = rules.filter((r) => r.is_active).length;
  const weekendSurges = rules.filter((r) => r.is_active && r.rule_type === 'weekend_surge');
  const avgWeekend =
    weekendSurges.length > 0
      ? Math.round(weekendSurges.reduce((s, r) => s + r.adjustment_value, 0) / weekendSurges.length)
      : 15;
  const festivalSurges = rules.filter((r) => r.is_active && r.rule_type === 'festival_surge');
  const peakFestival =
    festivalSurges.length > 0 ? Math.max(...festivalSurges.map((r) => r.adjustment_value)) : 30;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#241912] text-[#D8AD56] border border-[#D8AD56]/40 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-up">
          <Sparkles className="w-5 h-5 text-[#D8AD56] shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-[#241912] text-[#FAF7F2] rounded-2xl p-6 md:p-8 border border-[#D8AD56]/30 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-gradient-to-bl from-[#D8AD56]/15 via-[#382216]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-[#D8AD56]/20 text-[#D8AD56] border border-[#D8AD56]/40">
                Revenue & Yield Management
              </span>
              <div
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                  isConnected
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600/40'
                    : 'bg-amber-950/60 text-amber-300 border-amber-600/40'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                {isConnected ? 'Real-Time Sync Connected' : 'Connecting Stream...'}
              </div>
            </div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-white tracking-wide">
              Dynamic Tariff & Seasonal Pricing Rules
            </h1>
            <p className="text-[#FAF7F2]/70 text-sm mt-1 max-w-2xl leading-relaxed">
              Program dynamic weekend uplifts, Brahmotsavam temple festival surcharges, and rollaway bed
              tariffs with automatic rate calculations across all channels.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => fetchPricingData(true)}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-[#D8AD56]/30 bg-[#382216]/70 hover:bg-[#382216] text-[#D8AD56] font-medium text-xs flex items-center gap-2 transition-all shadow-sm"
              title="Refresh Pricing Rules"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => setModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D8AD56] to-[#b3883b] hover:from-[#e0b761] hover:to-[#c49744] text-[#241912] font-semibold text-xs flex items-center gap-2 shadow-lg transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Pricing Rule</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-[#D8AD56]/20 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-[#8A5A2B]">
              Active Rules
            </p>
            <p className="text-2xl font-serif font-bold text-[#241912] mt-1">
              {activeRulesCount} / {rules.length}
            </p>
            <p className="text-[11px] text-emerald-700 font-medium mt-1">
              Automated Yield Live
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#FAF7F2] border border-[#D8AD56]/30 flex items-center justify-center text-[#D8AD56]">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-[#D8AD56]/20 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-[#8A5A2B]">
              Weekend Uplift
            </p>
            <p className="text-2xl font-serif font-bold text-[#241912] mt-1">+{avgWeekend}%</p>
            <p className="text-[11px] text-stone-500 mt-1">Friday & Saturday stays</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#FAF7F2] border border-[#D8AD56]/30 flex items-center justify-center text-[#D8AD56]">
            <Percent className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-[#D8AD56]/20 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-[#8A5A2B]">
              Peak Festival Surge
            </p>
            <p className="text-2xl font-serif font-bold text-[#241912] mt-1">+{peakFestival}%</p>
            <p className="text-[11px] text-stone-500 mt-1">Kadiri Brahmotsavam</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#FAF7F2] border border-[#D8AD56]/30 flex items-center justify-center text-[#D8AD56]">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-[#D8AD56]/20 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-[#8A5A2B]">
              Room Categories
            </p>
            <p className="text-2xl font-serif font-bold text-[#241912] mt-1">
              {categories.length} Types
            </p>
            <p className="text-[11px] text-emerald-700 font-medium mt-1">100% Monitored</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#FAF7F2] border border-[#D8AD56]/30 flex items-center justify-center text-[#D8AD56]">
            <Building className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Grid: Simulator Widget & Active Rules List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Effective Rate Calculator / Simulator Widget */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#D8AD56]/20 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#D8AD56]/20 mb-4">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-[#D8AD56]" />
                <h3 className="font-serif font-bold text-base text-[#241912]">
                  Effective Rate Calculator & Simulator
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200">
                Live Pricing Engine
              </span>
            </div>

            <p className="text-xs text-stone-500 mb-4">
              Select room category and prospective stay date to view real-time calculated tariff breakdown
              with active seasonal and weekend rules applied.
            </p>

            <div className="space-y-3.5 text-xs">
              {/* Category Selector */}
              <div>
                <label className="block text-stone-600 font-medium mb-1">Room Category</label>
                <LuxurySelect
                  size="md"
                  variant="admin"
                  value={calcCategoryId}
                  onChange={(val) => setCalcCategoryId(String(val))}
                  options={categories.map((c) => ({
                    value: c.id,
                    label: `${c.name} (Base ₹${c.base_price_per_night})`,
                  }))}
                />
              </div>

              {/* Date Input & Quick Presets */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-stone-600 font-medium">Stay Date</label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCalcDate(new Date().toISOString().split('T')[0])}
                      className="text-[10px] text-[#8A5A2B] hover:underline font-medium"
                    >
                      Today
                    </button>
                    <span className="text-stone-300">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        const distToFri = (5 - d.getDay() + 7) % 7 || 7;
                        d.setDate(d.getDate() + distToFri);
                        setCalcDate(d.toISOString().split('T')[0]);
                      }}
                      className="text-[10px] text-[#8A5A2B] hover:underline font-medium"
                    >
                      This Friday (Weekend)
                    </button>
                    <span className="text-stone-300">•</span>
                    <button
                      type="button"
                      onClick={() => setCalcDate('2026-03-05')}
                      className="text-[10px] text-[#8A5A2B] hover:underline font-medium"
                    >
                      Brahmotsavam Peak
                    </button>
                  </div>
                </div>
                <input
                  type="date"
                  value={calcDate}
                  onChange={(e) => setCalcDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:border-[#D8AD56]"
                />
              </div>

              {/* Extra Guests / Rollaway Bed */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-stone-600 font-medium">Extra Adults / Rollaway Bed</label>
                  <span className="text-stone-500 font-mono text-[11px]">
                    +₹{calculatedBreakdown.category?.extra_person_tariff_rupees || 500} / guest
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {[0, 1, 2].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setCalcExtraPersons(num)}
                      className={`flex-1 py-1.5 rounded-lg border font-semibold text-xs transition-colors ${
                        calcExtraPersons === num
                          ? 'bg-[#382216] text-[#D8AD56] border-[#D8AD56]/40'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {num === 0 ? 'None' : `+${num} Adult`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tariff Breakdown Card */}
              <div className="mt-4 p-4 rounded-xl bg-[#FAF7F2] border border-[#D8AD56]/30 space-y-2">
                <div className="flex items-center justify-between text-xs text-stone-600">
                  <span>Base Category Tariff:</span>
                  <span className="font-mono font-semibold text-stone-800">
                    ₹{calculatedBreakdown.baseRate.toLocaleString('en-IN')}
                  </span>
                </div>

                {calculatedBreakdown.appliedRules.length === 0 ? (
                  <div className="text-[11px] text-stone-500 italic py-1">
                    No surge rules triggered on this date (Standard Weekday Rate).
                  </div>
                ) : (
                  calculatedBreakdown.appliedRules.map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-xs text-amber-900">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3 text-[#D8AD56]" />
                        <span>{r.name}</span>
                      </span>
                      <span className="font-mono font-bold text-emerald-700">
                        +₹{r.amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))
                )}

                {calculatedBreakdown.extraPersonsCharge > 0 && (
                  <div className="flex items-center justify-between text-xs text-purple-900">
                    <span>Extra Bed Charges:</span>
                    <span className="font-mono font-bold text-purple-700">
                      +₹{calculatedBreakdown.extraPersonsCharge.toLocaleString('en-IN')}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-stone-600 pt-1.5 border-t border-[#D8AD56]/20">
                  <span>Room Charges Subtotal:</span>
                  <span className="font-mono font-semibold text-stone-800">
                    ₹{calculatedBreakdown.subtotal.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-stone-600">
                  <span>Goods & Services Tax (12% GST):</span>
                  <span className="font-mono font-semibold text-stone-800">
                    ₹{calculatedBreakdown.gstAmount.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Final Total */}
                <div className="flex items-center justify-between pt-2 border-t border-[#D8AD56]/40 text-sm">
                  <span className="font-serif font-bold text-[#241912]">Final Nightly Tariff:</span>
                  <span className="font-serif font-bold text-lg text-[#241912] bg-white px-2.5 py-0.5 rounded-lg border border-[#D8AD56]/40 shadow-sm">
                    ₹{calculatedBreakdown.finalTariff.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Rules List */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#D8AD56]/20 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#D8AD56]/20 mb-4">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#8A5A2B]" />
                <h3 className="font-serif font-bold text-base text-[#241912]">
                  Configured Pricing Rules & Automated Surges
                </h3>
              </div>
              <span className="text-xs text-stone-500 font-mono">
                {rules.length} Rules Registered
              </span>
            </div>

            <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
              {rules.length === 0 ? (
                <div className="text-center py-12 text-stone-400 text-xs">
                  No pricing rules configured yet. Click &quot;Create Pricing Rule&quot; to begin.
                </div>
              ) : (
                rules.map((rule) => {
                  const typeCfg = RULE_TYPE_CONFIG[rule.rule_type] || {
                    label: rule.rule_type,
                    bg: 'bg-stone-50',
                    text: 'text-stone-800',
                    border: 'border-stone-200',
                  };

                  return (
                    <div
                      key={rule.id}
                      className={`p-4 rounded-xl border transition-all ${
                        rule.is_active
                          ? 'border-[#D8AD56]/40 bg-white hover:border-[#D8AD56] shadow-sm'
                          : 'border-stone-200 bg-stone-50/60 opacity-75'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-serif font-bold text-sm text-[#241912]">
                              {rule.name}
                            </h4>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${typeCfg.bg} ${typeCfg.text} ${typeCfg.border}`}
                            >
                              {typeCfg.label}
                            </span>
                          </div>
                          <p className="text-stone-600 text-xs mt-0.5">{rule.description}</p>
                        </div>

                        {/* Active Toggle Switch */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(rule)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              rule.is_active ? 'bg-emerald-600' : 'bg-stone-300'
                            }`}
                            title={rule.is_active ? 'Click to Pause Rule' : 'Click to Activate Rule'}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                rule.is_active ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteRule(rule.id, rule.name)}
                            className="p-1 rounded text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Rule"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Rule Metadata Bar */}
                      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-stone-100 text-xs font-mono">
                        <div className="flex items-center gap-1 text-[#8A5A2B] font-bold">
                          <span>Adjustment:</span>
                          <span className="bg-[#FAF7F2] px-2 py-0.5 rounded border border-[#D8AD56]/30">
                            {rule.adjustment_value > 0 ? `+${rule.adjustment_value}` : rule.adjustment_value}
                            {rule.adjustment_type === 'percentage' ? '%' : ' INR'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-stone-600">
                          <span>Applies To:</span>
                          <span className="font-sans font-medium text-stone-800">
                            {rule.applies_to_categories.includes('all')
                              ? 'All Room Categories'
                              : rule.applies_to_categories.join(', ')}
                          </span>
                        </div>

                        {rule.days_of_week && rule.days_of_week.length > 0 && (
                          <div className="flex items-center gap-1 text-stone-600">
                            <span>Days:</span>
                            <span className="font-semibold text-stone-800">
                              {rule.days_of_week.map((d) => DAYS_OF_WEEK[d]).join(', ')}
                            </span>
                          </div>
                        )}

                        {rule.start_date && rule.end_date && (
                          <div className="flex items-center gap-1 text-stone-600">
                            <CalendarRange className="w-3.5 h-3.5 text-[#8A5A2B]" />
                            <span>
                              {rule.start_date} to {rule.end_date}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* "Create Pricing Rule" Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-[#D8AD56]/40 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-[#241912] text-[#FAF7F2] p-5 flex items-center justify-between border-b border-[#D8AD56]/30">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#D8AD56]" />
                <h3 className="font-serif font-bold text-lg text-white">
                  Create Dynamic Pricing Rule
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-stone-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-stone-600 font-semibold mb-1">Rule Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diwali & Karthika Masam Surge"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:border-[#D8AD56]"
                />
              </div>

              <div>
                <label className="block text-stone-600 font-semibold mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. 25% festive peak holiday tariff adjustment"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:border-[#D8AD56]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 font-semibold mb-1">Rule Type</label>
                  <LuxurySelect
                    size="md"
                    variant="admin"
                    value={formRuleType}
                    onChange={(val) => setFormRuleType(val as PricingRuleType)}
                    options={[
                      { value: 'weekend_surge', label: 'Weekend Surge' },
                      { value: 'festival_surge', label: 'Festival Surge' },
                      { value: 'seasonal_surge', label: 'Seasonal Surge' },
                      { value: 'extra_bed', label: 'Extra Bed / Adult' },
                      { value: 'special_discount', label: 'Special Discount' },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-stone-600 font-semibold mb-1">Adjustment Type</label>
                  <LuxurySelect
                    size="md"
                    variant="admin"
                    value={formAdjustmentType}
                    onChange={(val) => setFormAdjustmentType(val as 'percentage' | 'fixed_amount')}
                    options={[
                      { value: 'percentage', label: 'Percentage (%)' },
                      { value: 'fixed_amount', label: 'Fixed Amount (₹ INR)' },
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 font-semibold mb-1">
                    Adjustment Value ({formAdjustmentType === 'percentage' ? '%' : '₹'})
                  </label>
                  <input
                    type="number"
                    required
                    value={formAdjustmentValue}
                    onChange={(e) => setFormAdjustmentValue(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:border-[#D8AD56]"
                  />
                </div>

                <div>
                  <label className="block text-stone-600 font-semibold mb-1">Target Categories</label>
                  <LuxurySelect
                    size="md"
                    variant="admin"
                    value={formCategorySelection}
                    onChange={(val) => setFormCategorySelection(String(val))}
                    options={[
                      { value: 'all', label: 'All Room Categories' },
                      ...categories.map((c) => ({ value: c.id, label: c.name })),
                    ]}
                  />
                </div>
              </div>

              {/* Days of week */}
              <div>
                <label className="block text-stone-600 font-semibold mb-1">
                  Days of Week (Optional recurrence)
                </label>
                <div className="flex items-center gap-1.5">
                  {DAYS_OF_WEEK.map((dayName, idx) => {
                    const isSelected = formDaysOfWeek.includes(idx);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleDayOfWeek(idx)}
                        className={`flex-1 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors ${
                          isSelected
                            ? 'bg-[#382216] text-[#D8AD56] border-[#D8AD56]/40'
                            : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                        }`}
                      >
                        {dayName}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 font-semibold mb-1">
                    Start Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:border-[#D8AD56]"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 font-semibold mb-1">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:border-[#D8AD56]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="formIsActive"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="rounded border-stone-300 accent-[#D8AD56] h-4 w-4"
                />
                <label htmlFor="formIsActive" className="text-stone-700 font-medium">
                  Deploy rule immediately (Active)
                </label>
              </div>

              <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#D8AD56] to-[#b3883b] hover:from-[#e0b761] hover:to-[#c49744] text-[#241912] font-bold shadow-md transition-all flex items-center gap-2"
                >
                  <Check className={`w-4 h-4 ${formSubmitting ? 'animate-spin' : ''}`} />
                  <span>{formSubmitting ? 'Deploying...' : 'Deploy Rule'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
