'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Booking, FolioCharge, FolioChargeCategory, PaymentMethod } from '@/types';
import { adminOperations } from '@/lib/realtime-client';
import {
  X,
  Receipt,
  Plus,
  Trash2,
  Printer,
  CreditCard,
  BedDouble,
  Shirt,
  UtensilsCrossed,
  Clock,
  Tag,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  IndianRupee,
} from 'lucide-react';
import { LuxurySelect } from '@/components/ui/LuxurySelect';

interface GuestFolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onOpenPrintInvoice: (booking: Booking, charges: FolioCharge[]) => void;
  onBookingUpdated?: () => void;
}

export function GuestFolioModal({
  isOpen,
  onClose,
  booking,
  onOpenPrintInvoice,
  onBookingUpdated,
}: GuestFolioModalProps) {
  const [folioCharges, setFolioCharges] = useState<FolioCharge[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Add charge form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [chargeCategory, setChargeCategory] = useState<FolioChargeCategory>('extra_bed');
  const [chargeDescription, setChargeDescription] = useState('Rollaway Extra Bed & Linen (₹500/night)');
  const [chargeAmount, setChargeAmount] = useState<number>(500);
  const [isSubmittingCharge, setIsSubmittingCharge] = useState(false);

  // Settlement payment form state
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Fetch folio charges from API
  const loadFolioCharges = useCallback(async () => {
    if (!booking) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await adminOperations.fetchFolioCharges(booking.booking_reference || booking.id);
      if (data.success) {
        setFolioCharges(data.charges || []);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load charges';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  }, [booking]);

  useEffect(() => {
    if (isOpen && booking) {
      loadFolioCharges();
      setShowAddForm(false);
      setShowPaymentForm(false);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, booking, loadFolioCharges]);

  if (!isOpen || !booking) return null;

  // Category presets helper
  const handleCategoryChange = (category: FolioChargeCategory) => {
    setChargeCategory(category);
    switch (category) {
      case 'extra_bed':
        setChargeDescription('Rollaway Extra Bed & Comfort Linen (₹500/night)');
        setChargeAmount(500);
        break;
      case 'laundry':
        setChargeDescription('Express Laundry Service (Traditional Attire)');
        setChargeAmount(350);
        break;
      case 'room_service':
        setChargeDescription('South Indian Breakfast & Filter Coffee Tray');
        setChargeAmount(250);
        break;
      case 'late_checkout':
        setChargeDescription('Late Checkout Extension Fee (up to 3:00 PM)');
        setChargeAmount(500);
        break;
      case 'misc':
      default:
        setChargeDescription('Incidental Service / Amenity Kit');
        setChargeAmount(200);
        break;
    }
  };

  // Base Room Calculations
  const baseRoomTariff = booking.room_charges_amount || booking.subtotal_amount;
  const roomTax = booking.tax_amount || 0;
  const roomCgst = Math.round((roomTax / 2) * 100) / 100;
  const roomSgst = Math.round((roomTax - roomCgst) * 100) / 100;
  const roomTotal = Math.round((baseRoomTariff + roomTax) * 100) / 100;

  // Running Ledger Computations
  const totalIncidentalsBase = folioCharges.reduce((acc, c) => acc + (c.amount || 0), 0);
  const totalIncidentalsTax = folioCharges.reduce((acc, c) => acc + (c.tax_amount || 0), 0);
  const totalIncidentalsGross = folioCharges.reduce((acc, c) => acc + (c.total_amount || 0), 0);

  const totalFolioBill = Math.round((roomTotal + totalIncidentalsGross) * 100) / 100;
  const totalPaidAmount = booking.paid_amount || 0;
  const balanceDue = Math.max(0, Math.round((totalFolioBill - totalPaidAmount) * 100) / 100);

  // Line item tax preview for the Add form (5% GST = 2.5% CGST + 2.5% SGST)
  const previewTax = Math.round(chargeAmount * 0.05 * 100) / 100;
  const previewCgst = Math.round((previewTax / 2) * 100) / 100;
  const previewSgst = Math.round((previewTax - previewCgst) * 100) / 100;
  const previewTotal = Math.round((chargeAmount + previewTax) * 100) / 100;

  // Add Folio Charge Handler
  const handleAddCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    if (!chargeDescription.trim() || chargeAmount <= 0) {
      setErrorMsg('Please specify a valid description and positive amount');
      return;
    }

    setIsSubmittingCharge(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const result = await adminOperations.addFolioCharge(booking.booking_reference, {
        category: chargeCategory,
        description: chargeDescription.trim(),
        amount: Number(chargeAmount),
        tax_rate: 0.05,
        posted_by: 'Front Desk / Accounts',
      });

      if (result.success) {
        setSuccessMsg(`Added folio charge: ${chargeDescription} (₹${previewTotal.toLocaleString('en-IN')})`);
        setShowAddForm(false);
        await loadFolioCharges();
        if (onBookingUpdated) onBookingUpdated();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to post charge';
      setErrorMsg(message);
    } finally {
      setIsSubmittingCharge(false);
    }
  };

  // Delete Folio Charge Handler
  const handleDeleteCharge = async (chargeId: string, desc: string) => {
    if (!booking) return;
    if (!confirm(`Are you sure you want to remove folio charge "${desc}"?`)) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const result = await adminOperations.deleteFolioCharge(booking.booking_reference, chargeId);
      if (result.success) {
        setSuccessMsg(`Removed folio charge: ${desc}`);
        await loadFolioCharges();
        if (onBookingUpdated) onBookingUpdated();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete charge';
      setErrorMsg(message);
    }
  };

  // Record Payment / Settle Balance Handler
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking || paymentAmount <= 0) return;

    setIsSubmittingPayment(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await adminOperations.recordPayment({
        bookingReference: booking.booking_reference,
        guestName: booking.guest_name,
        amount: Number(paymentAmount),
        paymentMethod,
        staffName: 'Front Desk Billing Desk',
      });

      if (res.success) {
        booking.paid_amount = (booking.paid_amount || 0) + Number(paymentAmount);
        if (booking.paid_amount >= totalFolioBill) {
          booking.payment_status = 'successful';
        }
        setSuccessMsg(`Payment of ₹${paymentAmount.toLocaleString('en-IN')} recorded via ${paymentMethod.toUpperCase()}.`);
        setShowPaymentForm(false);
        if (onBookingUpdated) onBookingUpdated();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Payment settlement failed';
      setErrorMsg(message);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'extra_bed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
            <BedDouble className="w-3 h-3" />
            <span>Extra Bed (₹500)</span>
          </span>
        );
      case 'laundry':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
            <Shirt className="w-3 h-3" />
            <span>Laundry</span>
          </span>
        );
      case 'room_service':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
            <UtensilsCrossed className="w-3 h-3" />
            <span>Room Service</span>
          </span>
        );
      case 'late_checkout':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[10px] font-bold">
            <Clock className="w-3 h-3" />
            <span>Late Checkout</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 text-[10px] font-bold">
            <Tag className="w-3 h-3" />
            <span>Incidental</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-[#D8AD56]/40 max-w-4xl w-full shadow-2xl max-h-[92vh] overflow-y-auto flex flex-col justify-between">
        {/* Modal Top Header */}
        <div className="p-5 sm:p-6 border-b border-[#EFE3D6] bg-[#FAF7F2] flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#382216] text-[#D8AD56] flex items-center justify-center font-bold shadow-md">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#D8AD56]">
                  PMS GUEST FOLIO & RUNNING LEDGER
                </span>
                <span className="px-2 py-0.2 rounded-full font-mono text-[10px] font-extrabold bg-[#382216] text-[#D8AD56]">
                  {booking.booking_reference}
                </span>
              </div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-[#241912]">
                Folio Billing &bull; {booking.guest_name}
              </h2>
              <p className="text-xs text-[#786B61]">
                Room {booking.assigned_room_number || booking.room_number || 'Unassigned'} &bull; {booking.category_name} ({booking.check_in_date} to {booking.check_out_date})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenPrintInvoice(booking, folioCharges)}
              className="px-3.5 py-2 rounded-xl bg-[#382216] hover:bg-[#25150F] text-[#D8AD56] text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Tax Invoice</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 space-y-6 flex-1">
          {/* Notifications */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Running Financial Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-[#FAF7F2] border border-[#EFE3D6] space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#786B61] tracking-wider block">
                Total Folio Bill (Room + Incidentals)
              </span>
              <div className="font-serif text-2xl font-black text-[#241912]">
                ₹ {totalFolioBill.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] text-[#786B61]">
                Room: ₹{roomTotal} + Incidentals: ₹{totalIncidentalsGross}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1">
              <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">
                Total Amount Paid
              </span>
              <div className="font-serif text-2xl font-black text-emerald-700">
                ₹ {totalPaidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[10px] text-emerald-800">
                Method: <strong>{booking.payment_method?.toUpperCase() || 'CASH'}</strong>
              </p>
            </div>

            <div
              className={`p-4 rounded-xl border space-y-1 ${
                balanceDue > 0
                  ? 'bg-amber-50/60 border-amber-300 text-amber-900'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-900'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider block">
                  Net Balance Outstanding
                </span>
                {balanceDue > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentAmount(balanceDue);
                      setShowPaymentForm(true);
                    }}
                    className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#382216] text-[#D8AD56] hover:bg-[#25150F] cursor-pointer"
                  >
                    + Settle Now
                  </button>
                )}
              </div>
              <div className="font-serif text-2xl font-black">
                ₹ {balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[10px]">
                {balanceDue > 0 ? 'Pending counter settlement' : 'Fully Settled & Reconciled'}
              </p>
            </div>
          </div>

          {/* Record Settlement Form (Collapsible) */}
          {showPaymentForm && (
            <div className="p-4 rounded-xl bg-[#FAF7F2] border-2 border-[#D8AD56] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#D8AD56]" />
                  <span className="font-serif font-bold text-sm text-[#241912]">
                    Record Settlement Payment for {booking.booking_reference}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPaymentForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleRecordPayment} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="text-[10px] font-bold text-[#786B61] uppercase block mb-1">
                    Amount to Collect (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={balanceDue}
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    className="w-full text-xs font-mono font-bold p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#786B61] uppercase block mb-1">
                    Payment Channel
                  </label>
                  <LuxurySelect
                    size="md"
                    variant="admin"
                    value={paymentMethod}
                    onChange={(val) => setPaymentMethod(val as PaymentMethod)}
                    options={[
                      { value: 'cash', label: 'Cash (Front Desk Drawer)' },
                      { value: 'upi', label: 'UPI / PhonePe / GPay' },
                      { value: 'card', label: 'Card (POS Terminal)' },
                    ]}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="w-full py-2.5 px-3 rounded-lg bg-[#382216] hover:bg-[#25150F] text-[#D8AD56] text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingPayment ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>Settle ₹{paymentAmount} via {paymentMethod.toUpperCase()}</span>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Running Ledger Table */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-serif font-bold text-sm text-[#241912] flex items-center gap-2">
                  <span>Guest Folio Items & Incidental Charges</span>
                  <span className="text-[10px] font-semibold text-[#786B61]">
                    ({1 + folioCharges.length} ledger line items)
                  </span>
                </h3>
                <p className="text-[11px] text-[#786B61]">
                  Complete itemized breakdown with statutory 5% GST (2.5% CGST + 2.5% SGST)
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-3 py-1.5 rounded-xl bg-[#FAF7F2] hover:bg-[#EFE3D6] border border-[#D8AD56]/40 text-xs font-bold text-[#382216] transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#D8AD56]" />
                <span>{showAddForm ? 'Cancel Add Charge' : 'Add Incidental Charge'}</span>
              </button>
            </div>

            {/* Add Incidental Charge Form */}
            {showAddForm && (
              <form
                onSubmit={handleAddCharge}
                className="p-4 rounded-xl bg-[#FAF7F2] border border-[#D8AD56] space-y-3 transition-all"
              >
                <div className="flex items-center justify-between pb-2 border-b border-[#EFE3D6]">
                  <span className="text-[11px] uppercase font-bold text-[#D8AD56]">
                    Post Incidental Charge to Room Folio
                  </span>
                  <span className="text-[10px] text-[#786B61]">
                    5% GST (2.5% CGST + 2.5% SGST) calculated automatically
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-[#786B61] uppercase block mb-1">
                      Category *
                    </label>
                    <LuxurySelect
                      size="md"
                      variant="admin"
                      value={chargeCategory}
                      onChange={(val) => handleCategoryChange(val as FolioChargeCategory)}
                      options={[
                        { value: 'extra_bed', label: 'Rollaway Extra Bed (₹500)' },
                        { value: 'laundry', label: 'Laundry & Dry Cleaning' },
                        { value: 'room_service', label: 'Room Service & Dining' },
                        { value: 'late_checkout', label: 'Late Checkout Extension' },
                        { value: 'misc', label: 'Miscellaneous Service' },
                      ]}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold text-[#786B61] uppercase block mb-1">
                      Charge Description *
                    </label>
                    <input
                      type="text"
                      required
                      value={chargeDescription}
                      onChange={(e) => setChargeDescription(e.target.value)}
                      placeholder="e.g. Rollaway Extra Bed & Linen (1 Night)"
                      className="w-full text-xs font-medium p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[#786B61] uppercase block mb-1">
                      Base Tariff (₹) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={chargeAmount}
                      onChange={(e) => setChargeAmount(Number(e.target.value))}
                      className="w-full text-xs font-mono font-bold p-2.5 rounded-lg border border-[#EFE3D6] bg-white text-[#241912]"
                    />
                  </div>
                </div>

                {/* Live Tax Preview Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-white border border-[#EFE3D6] text-xs">
                  <div className="flex items-center gap-3 font-mono text-[11px]">
                    <span>Base: <strong>₹{chargeAmount}</strong></span>
                    <span>+</span>
                    <span>CGST (2.5%): <strong>₹{previewCgst}</strong></span>
                    <span>+</span>
                    <span>SGST (2.5%): <strong>₹{previewSgst}</strong></span>
                    <span>=</span>
                    <span className="font-bold text-sm text-[#382216]">
                      Line Total: ₹{previewTotal}
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingCharge}
                    className="px-4 py-2 rounded-lg bg-[#382216] hover:bg-[#25150F] text-[#D8AD56] text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmittingCharge ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    <span>Post Folio Charge</span>
                  </button>
                </div>
              </form>
            )}

            {/* Ledger Table */}
            <div className="bg-white rounded-xl border border-[#EFE3D6] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F2] text-[#786B61] uppercase text-[10px] tracking-wider border-b border-[#EFE3D6]">
                  <tr>
                    <th className="py-3 px-3.5 font-semibold">Service Description</th>
                    <th className="py-3 px-3 font-semibold">Category</th>
                    <th className="py-3 px-3 font-semibold text-right">Base (₹)</th>
                    <th className="py-3 px-3 font-semibold text-right">CGST 2.5%</th>
                    <th className="py-3 px-3 font-semibold text-right">SGST 2.5%</th>
                    <th className="py-3 px-3 font-semibold text-right">Total (₹)</th>
                    <th className="py-3 px-3 font-semibold text-center">Posted By</th>
                    <th className="py-3 px-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFE3D6] text-[#241912]">
                  {/* Fixed Line 1: Primary Room Tariff */}
                  <tr className="bg-[#FAF7F2]/40 hover:bg-[#FAF7F2]">
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-sm text-[#382216]">Room Accommodation Tariff</div>
                      <div className="text-[10px] text-[#786B61]">
                        {booking.category_name} &bull; Room {booking.assigned_room_number || 'Standard'} &bull; SAC 996311
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full bg-[#E3F2FD] text-[#1565C0] text-[10px] font-bold">
                        Room Stay
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold">
                      ₹ {baseRoomTariff.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[11px] text-[#786B61]">
                      ₹ {roomCgst.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-[11px] text-[#786B61]">
                      ₹ {roomSgst.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-[#382216]">
                      ₹ {roomTotal.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-center text-[11px] text-[#786B61]">
                      System
                    </td>
                    <td className="py-3 px-3 text-right text-[10px] text-[#786B61] italic">
                      Locked
                    </td>
                  </tr>

                  {/* Incidental Charges */}
                  {folioCharges.map((charge) => {
                    const cgst = Math.round((charge.tax_amount / 2) * 100) / 100;
                    const sgst = Math.round((charge.tax_amount - cgst) * 100) / 100;

                    return (
                      <tr key={charge.id} className="hover:bg-[#FAF7F2]/60 transition-colors">
                        <td className="py-3 px-3.5">
                          <div className="font-semibold text-[#241912]">{charge.description}</div>
                          <div className="text-[10px] text-[#786B61] font-mono">
                            {new Date(charge.created_at).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          {getCategoryBadge(charge.category)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-semibold">
                          ₹ {charge.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-[11px] text-[#786B61]">
                          ₹ {cgst.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-[11px] text-[#786B61]">
                          ₹ {sgst.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-[#382216]">
                          ₹ {charge.total_amount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-3 text-center text-[10px] text-[#786B61]">
                          {charge.posted_by || 'Staff'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteCharge(charge.id, charge.description)}
                            className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Remove Charge"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="p-4 sm:p-5 border-t border-[#EFE3D6] bg-[#FAF7F2] flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky bottom-0">
          <div className="flex items-center gap-3 text-xs">
            <span>
              Net Balance: <strong className={balanceDue > 0 ? 'text-red-600 font-mono text-sm' : 'text-green-700 font-mono text-sm'}>
                {balanceDue > 0 ? `₹ ${balanceDue.toLocaleString('en-IN')} Pending` : '₹ 0 (Settled)'}
              </strong>
            </span>
            {balanceDue > 0 && !showPaymentForm && (
              <button
                type="button"
                onClick={() => {
                  setPaymentAmount(balanceDue);
                  setShowPaymentForm(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-[#382216] text-[#D8AD56] text-xs font-bold hover:bg-[#25150F] transition-all cursor-pointer"
              >
                Record Payment
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenPrintInvoice(booking, folioCharges)}
              className="px-4 py-2 rounded-xl bg-[#382216] hover:bg-[#25150F] text-[#D8AD56] text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Tax Invoice</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-xs font-semibold text-gray-700 transition-colors"
            >
              Close Folio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
