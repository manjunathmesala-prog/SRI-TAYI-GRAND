'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Booking, PhysicalRoom, RoomTransferReasonCategory, RoomTransferRecord } from '@/types';
import { adminOperations } from '@/lib/realtime-client';
import {
  issuePhysicalKeycard,
  playChimeSound,
  checkBridgeHealth,
} from '@/lib/rfid/bridge-client';
import { useAdminLanguage } from '@/i18n/admin/AdminLanguageContext';
import {
  X,
  ArrowRightLeft,
  Wind,
  Droplets,
  Sparkles,
  Volume2,
  Crown,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  DoorOpen,
  KeyRound,
  ShieldAlert,
  Clock,
  History,
  Info,
} from 'lucide-react';
import { LuxurySelect } from '@/components/ui/LuxurySelect';

interface ChangeRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  rooms: PhysicalRoom[];
  onRoomChanged?: (updatedBooking: Booking, newRoomNumber: string) => void;
}

const REASONS: {
  id: RoomTransferReasonCategory;
  labelEn: string;
  labelTe: string;
  icon: any;
  color: string;
  defaultNote: string;
  suggestMaintenance: boolean;
}[] = [
  {
    id: 'ac_issue',
    labelEn: 'AC / Cooling Issue',
    labelTe: 'AC పని చేయడం లేదు / చల్లదనం లేదు',
    icon: Wind,
    color: 'border-sky-500 bg-sky-50 text-sky-800',
    defaultNote: 'Guest reported AC is not cooling properly and blowing warm air after 30 mins in room.',
    suggestMaintenance: true,
  },
  {
    id: 'plumbing_water',
    labelEn: 'Water / Plumbing Issue',
    labelTe: 'నీరు రావడం లేదు / ప్లంబింగ్ సమస్య',
    icon: Droplets,
    color: 'border-blue-500 bg-blue-50 text-blue-800',
    defaultNote: 'Guest reported no running water or hot water pressure failure in bathroom.',
    suggestMaintenance: true,
  },
  {
    id: 'cleanliness',
    labelEn: 'Cleanliness / Hygiene',
    labelTe: 'పరిశుభ్రత లోపం / లినెన్ సమస్య',
    icon: Sparkles,
    color: 'border-amber-500 bg-amber-50 text-amber-800',
    defaultNote: 'Guest unsatisfied with room cleanliness, linen condition, or lingering odor.',
    suggestMaintenance: false,
  },
  {
    id: 'noise',
    labelEn: 'Noise / Disturbance',
    labelTe: 'శబ్దం / అంతరాయం',
    icon: Volume2,
    color: 'border-purple-500 bg-purple-50 text-purple-800',
    defaultNote: 'Guest requested room change due to excessive corridor or exterior noise.',
    suggestMaintenance: false,
  },
  {
    id: 'upgrade',
    labelEn: 'Room Upgrade Request',
    labelTe: 'గది అప్‌గ్రేడ్ అభ్యర్థన',
    icon: Crown,
    color: 'border-amber-600 bg-amber-50 text-amber-900',
    defaultNote: 'Guest opted for Deluxe / Suite category upgrade.',
    suggestMaintenance: false,
  },
  {
    id: 'other_technical',
    labelEn: 'Other Technical Defect',
    labelTe: 'ఇతర సాంకేతిక సమస్య',
    icon: Wrench,
    color: 'border-rose-500 bg-rose-50 text-rose-800',
    defaultNote: 'Technical issue with TV, door latch, lighting, or electrical outlets.',
    suggestMaintenance: true,
  },
];

export function ChangeRoomModal({
  isOpen,
  onClose,
  booking,
  rooms,
  onRoomChanged,
}: ChangeRoomModalProps) {
  const { isTelugu } = useAdminLanguage();

  const [selectedReason, setSelectedReason] = useState<RoomTransferReasonCategory>('ac_issue');
  const [reasonNotes, setReasonNotes] = useState('');
  const [selectedRoomNumber, setSelectedRoomNumber] = useState('');
  const [createMaintenanceTicket, setCreateMaintenanceTicket] = useState(true);
  const [encodeKeyNow, setEncodeKeyNow] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isRfidOnline, setIsRfidOnline] = useState(false);

  // Calculate duration guest has spent in current room
  const stayDurationText = useMemo(() => {
    if (!booking) return '';
    const checkInTime = booking.checked_in_at ? new Date(booking.checked_in_at).getTime() : null;
    if (!checkInTime) return 'Checked in today';

    const now = Date.now();
    const diffMs = Math.max(0, now - checkInTime);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 60) {
      return `${diffMins} ${isTelugu ? 'నిమిషాల క్రితం చెక్-ఇన్ అయ్యారు' : 'minutes spent in room'}`;
    }
    return `${diffHours} hr ${diffMins % 60} mins ${isTelugu ? 'గదిలో ఉన్నారు' : 'spent in room'}`;
  }, [booking, isTelugu]);

  // Current room info
  const currentRoomNumber = booking?.assigned_room_number || booking?.room_number || '';
  const currentRoom = useMemo(() => {
    return rooms.find((r) => r.room_number === currentRoomNumber || r.id === booking?.assigned_room_id);
  }, [rooms, currentRoomNumber, booking]);

  // Available clean rooms excluding current room
  const availableRooms = useMemo(() => {
    return rooms.filter(
      (r) =>
        r.room_number !== currentRoomNumber &&
        r.operational_status === 'available'
    );
  }, [rooms, currentRoomNumber]);

  // Check hardware bridge online status
  useEffect(() => {
    if (!isOpen) return;
    checkBridgeHealth().then((status) => {
      setIsRfidOnline(status.isOnline);
    }).catch(() => setIsRfidOnline(false));
  }, [isOpen]);

  // Reset form when modal opens or booking changes
  useEffect(() => {
    if (!isOpen || !booking) return;

    setSelectedReason('ac_issue');
    setReasonNotes(REASONS[0].defaultNote);
    setCreateMaintenanceTicket(true);
    setEncodeKeyNow(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    // Default select first available clean room in same category, or first clean room
    const sameCategoryClean = availableRooms.find(
      (r) => r.category_id === booking.category_id && r.housekeeping_status === 'clean'
    );
    const anyClean = availableRooms.find((r) => r.housekeeping_status === 'clean');
    const firstAvail = sameCategoryClean || anyClean || availableRooms[0];
    setSelectedRoomNumber(firstAvail ? firstAvail.room_number : '');
  }, [isOpen, booking, availableRooms]);

  // Update default notes and ticket recommendation when reason changes
  const handleSelectReason = (reasonId: RoomTransferReasonCategory) => {
    setSelectedReason(reasonId);
    const conf = REASONS.find((r) => r.id === reasonId);
    if (conf) {
      setReasonNotes(conf.defaultNote);
      setCreateMaintenanceTicket(conf.suggestMaintenance);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    if (!selectedRoomNumber) {
      setErrorMessage(isTelugu ? 'దయచేసి బదిలీ చేయడానికి ఒక ఖాళీ గదిని ఎంచుకోండి.' : 'Please select an available target room.');
      return;
    }

    if (selectedRoomNumber === currentRoomNumber) {
      setErrorMessage(isTelugu ? 'లక్ష్య గది ప్రస్తుత గదికి భిన్నంగా ఉండాలి.' : 'Target room must be different from current room.');
      return;
    }

    if (!reasonNotes.trim()) {
      setErrorMessage(isTelugu ? 'దయచేసి గది మార్పుకు కారణం వివరించండి.' : 'Please enter the reason for room change.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await adminOperations.changeRoom({
        bookingReference: booking.booking_reference,
        toRoomIdOrNumber: selectedRoomNumber,
        reasonCategory: selectedReason,
        reasonNotes: reasonNotes.trim(),
        createMaintenanceTicket,
        oldRoomAction: createMaintenanceTicket ? 'maintenance' : 'cleaning',
      });

      // If physical encoder is requested and bridge is online, encode new keycard
      if (encodeKeyNow && isRfidOnline) {
        try {
          await issuePhysicalKeycard({
            roomNumber: selectedRoomNumber,
            guestName: booking.guest_name,
            staffUser: 'Front Desk',
          });
        } catch (encErr) {
          console.warn('[RFID ENCODE WARN ON ROOM CHANGE]:', encErr);
        }
      }

      playChimeSound(true);
      setSuccessMessage(
        isTelugu
          ? `గెస్ట్ ${booking.guest_name} విజయవంతంగా గది #${selectedRoomNumber}కి మార్చబడ్డారు!`
          : `Guest ${booking.guest_name} successfully transferred to Room #${selectedRoomNumber}!`
      );

      if (onRoomChanged && result.booking) {
        onRoomChanged(result.booking, selectedRoomNumber);
      }

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      playChimeSound(false);
      setErrorMessage(err.message || 'Failed to process room transfer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !booking) return null;

  const pastTransfers: RoomTransferRecord[] = booking.room_transfers || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#FCFAF7] border border-[#D8AD56]/40 rounded-2xl shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#382216] via-[#2A180F] to-[#1E110A] text-[#EFE3D6] p-5 sm:p-6 border-b border-[#D8AD56]/40">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#D8AD56]/20 border border-[#D8AD56]/40 text-[#D8AD56]">
                <ArrowRightLeft className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <span>{isTelugu ? 'గది మార్పిడి & రీలోకేషన్' : 'Guest Room Change & Relocation'}</span>
                </h3>
                <p className="text-xs text-[#EFE3D6]/70 mt-0.5">
                  Ref: <strong className="font-mono text-[#D8AD56]">{booking.booking_reference}</strong> &bull; Guest: <strong>{booking.guest_name}</strong>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 rounded-lg text-[#EFE3D6]/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Current Room & Duration Banner */}
          <div className="mt-4 p-3 rounded-xl bg-white/10 border border-white/15 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#D8AD56] bg-black/40 px-2.5 py-1 rounded-lg font-mono text-sm">
                Room #{currentRoomNumber || 'N/A'}
              </span>
              <span className="text-white/90">
                {currentRoom?.category_name || booking.category_name} &bull; Floor {currentRoom?.floor_number || 1}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-300 font-semibold text-[11px] bg-amber-500/20 px-2.5 py-1 rounded-full border border-amber-500/30">
              <Clock className="w-3.5 h-3.5" />
              <span>{stayDurationText}</span>
            </div>
          </div>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 shadow-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-start gap-2 shadow-xs animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="font-semibold">{successMessage}</span>
            </div>
          )}

          {/* 1. Reason Selection Grid */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#382216] uppercase tracking-wider">
              {isTelugu ? '1. గది మార్పుకు గల కారణం ఎంచుకోండి' : '1. Select Reason for Room Change'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {REASONS.map((r) => {
                const Icon = r.icon;
                const isSelected = selectedReason === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleSelectReason(r.id)}
                    className={`p-2.5 rounded-xl text-left border transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? `${r.color} ring-2 ring-offset-1 ring-[#D8AD56] font-bold shadow-sm`
                        : 'border-[#EFE3D6] bg-white hover:bg-[#FAF7F2] text-[#382216]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <Icon className="w-4 h-4 shrink-0" />
                      {isSelected && <span className="w-2 h-2 rounded-full bg-current" />}
                    </div>
                    <span className="text-[11px] leading-tight block">
                      {isTelugu ? r.labelTe : r.labelEn}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Reason Details / Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#382216]">
              {isTelugu ? 'కారణ వివరాలు / సిబ్బంది గమనిక' : 'Issue Description / Reception Notes'}
            </label>
            <textarea
              rows={2}
              value={reasonNotes}
              onChange={(e) => setReasonNotes(e.target.value)}
              placeholder="e.g. Guest reported AC not cooling and making loud noise after 30 mins in room..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#D8AD56]/40 bg-white focus:outline-none focus:ring-2 focus:ring-[#D8AD56] text-[#241912]"
              required
            />
          </div>

          {/* 3. Target Room Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-[#382216] uppercase tracking-wider">
                {isTelugu ? '2. కొత్త గదిని ఎంచుకోండి (లభ్యత గల గదులు)' : '2. Select New Room (Available Clean Rooms)'}
              </label>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {availableRooms.length} {isTelugu ? 'గదులు లభ్యంలో ఉన్నాయి' : 'Rooms Available'}
              </span>
            </div>

            {availableRooms.length === 0 ? (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs text-center font-medium">
                No clean available rooms found. Please check room rack or inspect a cleaned room.
              </div>
            ) : (
              <LuxurySelect
                value={selectedRoomNumber}
                onChange={setSelectedRoomNumber}
                options={availableRooms.map((r) => {
                  const isClean = r.housekeeping_status === 'clean';
                  const isSameCat = r.category_id === booking.category_id;
                  return {
                    value: r.room_number,
                    label: `Room ${r.room_number} • Floor ${r.floor_number} • ${r.category_name || 'Standard'} ${
                      isSameCat ? '(Same Category)' : '(Category Upgrade/Change)'
                    } ${isClean ? '🟢 Clean' : '🟡 Inspected'}`,
                  };
                })}
              />
            )}
          </div>

          {/* 4. Old Room Handling & Auto-Maintenance */}
          <div className="p-3.5 rounded-xl bg-[#FAF7F2] border border-[#EFE3D6] space-y-3">
            <div className="flex items-start gap-2.5">
              <input
                type="checkbox"
                id="chk-maintenance"
                checked={createMaintenanceTicket}
                onChange={(e) => setCreateMaintenanceTicket(e.target.checked)}
                className="mt-0.5 rounded border-[#D8AD56] text-[#382216] focus:ring-[#D8AD56] cursor-pointer"
              />
              <label htmlFor="chk-maintenance" className="text-xs text-[#382216] cursor-pointer select-none">
                <strong className="block text-rose-900">
                  {isTelugu ? `పాత గది #${currentRoomNumber} ని మెయింటెనెన్స్‌కు లాక్ చేసి వర్క్ ఆర్డర్ నమోదు చేయండి` : `Lock Old Room #${currentRoomNumber} for Maintenance & Create Work Order`}
                </strong>
                <span className="text-[11px] text-[#786B61] block mt-0.5">
                  {isTelugu
                    ? 'సాంకేతిక లేదా AC సమస్య పరిష్కరించబడే వరకు ఈ గదిని ఇతర గెస్టులకు కేటాయించకుండా బ్లాక్ చేస్తుంది.'
                    : 'Blocks Room #' + currentRoomNumber + ' from new bookings until technician inspects & resolves the issue.'}
                </span>
              </label>
            </div>

            {/* Keycard Invalidation Notice */}
            <div className="pt-2 border-t border-[#EFE3D6] flex items-center justify-between text-xs text-[#786B61]">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                <span>{isTelugu ? `పాత గది #${currentRoomNumber} కీకార్డు ఆటోమేటిక్‌గా రద్దు చేయబడుతుంది.` : `Old Room #${currentRoomNumber} keycard will be deactivated.`}</span>
              </span>

              {isRfidOnline && (
                <label className="flex items-center gap-1.5 text-emerald-800 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={encodeKeyNow}
                    onChange={(e) => setEncodeKeyNow(e.target.checked)}
                    className="rounded border-[#D8AD56] text-[#382216] focus:ring-[#D8AD56]"
                  />
                  <span>{isTelugu ? 'కొత్త కీకార్డు ఎన్‌కోడ్ చేయండి' : '1-Click Encode New Key'}</span>
                </label>
              )}
            </div>
          </div>

          {/* Past Transfer History (If any) */}
          {pastTransfers.length > 0 && (
            <div className="p-3 rounded-xl bg-white border border-[#EFE3D6] space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#382216]">
                <History className="w-3.5 h-3.5 text-[#D8AD56]" />
                <span>{isTelugu ? 'ఈ స్టే గది మార్పిడి చరిత్ర' : 'Past Relocation History for this Stay'} ({pastTransfers.length})</span>
              </div>
              <div className="space-y-1.5 text-[11px] text-[#786B61]">
                {pastTransfers.map((t, idx) => (
                  <div key={t.id || idx} className="p-2 rounded-lg bg-[#FAF7F2] border border-[#EFE3D6] flex items-center justify-between">
                    <div>
                      <strong className="text-[#382216]">Room #{t.from_room_number} &rarr; Room #{t.to_room_number}</strong>
                      <p className="text-[10px] mt-0.5">{t.reason_notes}</p>
                    </div>
                    <div className="text-right text-[10px]">
                      <span>{t.transferred_at ? new Date(t.transferred_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      <span className="block text-[#D8AD56] font-semibold">{t.actor}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-[#EFE3D6]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-[#EFE3D6] bg-white hover:bg-[#FAF7F2] text-[#382216] text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
            >
              {isTelugu ? 'రద్దు చేయండి' : 'Cancel'}
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !selectedRoomNumber || availableRooms.length === 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D8AD56] to-[#C69940] hover:from-[#C69940] hover:to-[#B58830] text-[#241912] text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{isTelugu ? 'గది మారుస్తున్నారు...' : 'Transferring Guest...'}</span>
                </>
              ) : (
                <>
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>
                    {isTelugu
                      ? `గది #${selectedRoomNumber}కి బదిలీని నిర్ధారించండి`
                      : `Confirm Transfer to Room #${selectedRoomNumber}`}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
