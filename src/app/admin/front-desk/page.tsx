'use client';

import Link from 'next/link';

import { useState, useEffect, useCallback } from 'react';
import { ReceptionStandeeModal } from '@/components/admin/ReceptionStandeeModal';
import { StatutoryWalkInModal } from '@/components/admin/StatutoryWalkInModal';
import { Booking, PhysicalRoom, RoomCategory } from '@/types';
import { issuePhysicalKeycard, checkoutPhysicalCard, playChimeSound, checkBridgeHealth } from '@/lib/rfid/bridge-client';
import { useRealtimeSync, adminOperations } from '@/lib/realtime-client';
import {
  ConciergeBell,
  Search,
  CheckCircle2,
  LogOut,
  BedDouble,
  User,
  CreditCard,
  KeyRound,
  RefreshCw,
  Printer,
  QrCode,
  Sparkles,
  X,
  Plus,
  AlertCircle,
  Radio,
  UserCheck,
  ShieldCheck,
  Phone,
  Zap,
  Banknote,
} from 'lucide-react';
import { LuxurySelect } from '@/components/ui/LuxurySelect';

export default function FrontDeskPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<PhysicalRoom[]>([]);
  const [categories, setCategories] = useState<RoomCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [checkInModalBooking, setCheckInModalBooking] = useState<Booking | null>(null);
  const [checkOutModalBooking, setCheckOutModalBooking] = useState<Booking | null>(null);
  const [showStatutoryModal, setShowStatutoryModal] = useState(false);
  const [statutoryInitialData, setStatutoryInitialData] = useState<any>(null);

  // Check-in form fields
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [issueRfid, setIssueRfid] = useState(true);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [isSubmittingCheckIn, setIsSubmittingCheckIn] = useState(false);
  const [checkOutError, setCheckOutError] = useState<string | null>(null);
  const [isSubmittingCheckOut, setIsSubmittingCheckOut] = useState(false);

  // Expected arrival statutory check-in fields
  const [arrivalIdType, setArrivalIdType] = useState('Aadhaar Card');
  const [arrivalIdNumber, setArrivalIdNumber] = useState('');
  const [arrivalNationality, setArrivalNationality] = useState<'Indian' | 'Foreigner'>('Indian');
  const [arrivalCity, setArrivalCity] = useState('Kadiri');
  const [arrivalPurpose, setArrivalPurpose] = useState('Pilgrimage / Temple Darshan');

  // Check-out form fields
  const [additionalCharges, setAdditionalCharges] = useState<number>(0);
  const [chargeDescription, setChargeDescription] = useState('Extra Mineral Water & Tea');
  const [rfidOnline, setRfidOnline] = useState<boolean>(true);
  const [isCheckingRfid, setIsCheckingRfid] = useState(false);

  const handleRecheckRfid = useCallback(async (manual = false) => {
    setIsCheckingRfid(true);
    try {
      const res = await checkBridgeHealth();
      setRfidOnline(res.isOnline);
      if (manual) playChimeSound(res.isOnline);
    } catch {
      setRfidOnline(false);
    } finally {
      setIsCheckingRfid(false);
    }
  }, []);

  useEffect(() => {
    handleRecheckRfid(false);
    const interval = setInterval(() => handleRecheckRfid(false), 20000);
    return () => clearInterval(interval);
  }, [handleRecheckRfid]);
  const [settlementMethod, setSettlementMethod] = useState<'cash' | 'upi' | 'card'>('cash');
  const [checkOutSuccessRef, setCheckOutSuccessRef] = useState<string | null>(null);

  // Live Walk-In Reception Queue
  interface WalkInItem extends Booking {
    pickup_code?: string;
  }
  const [walkInQueue, setWalkInQueue] = useState<WalkInItem[]>([]);
  const [cleanRoomsList, setCleanRoomsList] = useState<PhysicalRoom[]>([]);
  const [selectedWalkInRooms, setSelectedWalkInRooms] = useState<Record<string, string>>({});
  const [isEncodingWalkIn, setIsEncodingWalkIn] = useState<string | null>(null);
  const [walkInAlert, setWalkInAlert] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showStandeeModal, setShowStandeeModal] = useState(false);

  // Fetch authoritative state from backend repository
  const fetchLiveState = useCallback(async () => {
    try {
      const data = await adminOperations.fetchFullState();
      if (data.success) {
        setBookings(data.bookings || []);
        setRooms(data.rooms || []);
        if (data.categories) setCategories(data.categories);
      }
    } catch {
      // Ignored
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchWalkInQueue = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/walk-ins/queue');
      if (res.ok) {
        const data = await res.json();
        const q: WalkInItem[] = data.queue || [];
        setWalkInQueue(q);
        setCleanRoomsList(data.clean_rooms || []);

        setSelectedWalkInRooms((prev) => {
          const updated = { ...prev };
          q.forEach((item) => {
            if (!updated[item.booking_reference] && data.clean_rooms?.length > 0) {
              const match = data.clean_rooms.find((r: PhysicalRoom) => r.category_id === item.category_id);
              updated[item.booking_reference] = match ? match.room_number : data.clean_rooms[0].room_number;
            }
          });
          return updated;
        });
      }
    } catch {
      // Ignored
    }
  }, []);

  useEffect(() => {
    fetchLiveState();
    fetchWalkInQueue();
  }, [fetchLiveState, fetchWalkInQueue]);

  // Real-time synchronization subscription: re-hydrates automatically on any domain event
  const { isConnected, status } = useRealtimeSync({
    onRefresh: () => {
      fetchLiveState();
      fetchWalkInQueue();
    },
  });

  const handleAssignAndEncodeWalkIn = async (booking: WalkInItem) => {
    const roomNumber = selectedWalkInRooms[booking.booking_reference];
    if (!roomNumber) {
      setWalkInAlert({ message: 'Please select a clean room number for this walk-in guest.', type: 'error' });
      return;
    }

    setIsEncodingWalkIn(booking.booking_reference);
    setWalkInAlert(null);

    try {
      const res = await fetch('/api/admin/walk-ins/assign-and-encode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingReference: booking.booking_reference,
          roomNumber,
          staffName: 'Front Desk Receptionist',
          markPaymentCollected: booking.payment_status === 'pay_at_hotel',
        }),
      });

      const data = await res.json();
      if (data.success) {
        playChimeSound(true);
        setWalkInAlert({
          message: 'Keycard issued for ' + booking.guest_name + '! Room ' + roomNumber + ' is checked in and ready.',
          type: 'success',
        });
        await fetchLiveState();
        await fetchWalkInQueue();
      } else {
        setWalkInAlert({ message: data.error || 'Failed to encode card and assign room.', type: 'error' });
      }
    } catch (err: unknown) {
      setWalkInAlert({ message: err instanceof Error ? err.message : 'Error processing keycard', type: 'error' });
    } finally {
      setIsEncodingWalkIn(null);
    }
  };

  // Filter lists
  const pendingArrivals = bookings.filter(
    (b) =>
      (b.status === 'confirmed' || b.status === 'pending') &&
      (b.guest_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.booking_reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.guest_phone.includes(searchQuery))
  );

  const activeStays = bookings.filter(
    (b) =>
      b.status === 'checked_in' &&
      (b.guest_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.booking_reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.assigned_room_number && b.assigned_room_number.includes(searchQuery)))
  );

  // Available clean rooms for walk-in modal
  const availableRooms = rooms.filter(
    (r) => r.operational_status === 'available' && r.housekeeping_status === 'clean'
  );

  // Selectable clean rooms for check-in assignment:
  // Includes available clean rooms PLUS any room already assigned/reserved for the currently selected check-in guest
  const selectableRoomsForCheckIn = rooms.filter((r) => {
    if (r.housekeeping_status !== 'clean') return false;
    if (r.operational_status === 'available') return true;
    if (
      checkInModalBooking &&
      (r.id === checkInModalBooking.assigned_room_id ||
        r.room_number === checkInModalBooking.assigned_room_number ||
        (r.current_booking_ref &&
          r.current_booking_ref.toLowerCase() === checkInModalBooking.booking_reference.toLowerCase()))
    ) {
      return true;
    }
    return false;
  });

  // Execute Authoritative Check-In
  const handleConfirmCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInModalBooking) return;

    setCheckInError(null);

    if (!selectedRoomId) {
      setCheckInError('Please select a clean physical room to assign before confirming check-in.');
      return;
    }

    const assignedRoom = rooms.find((r) => r.id === selectedRoomId || r.room_number === selectedRoomId);
    if (!assignedRoom) {
      setCheckInError(`Selected room (${selectedRoomId}) could not be found. Please select an available clean room.`);
      return;
    }

    setIsSubmittingCheckIn(true);

    try {
      await adminOperations.checkIn({
        bookingReference: checkInModalBooking.booking_reference,
        roomId: assignedRoom.id,
        roomNumber: assignedRoom.room_number,
        issueRfid,
        idProofType: arrivalIdType,
        idProofNumber: arrivalIdNumber.trim() || undefined,
        nationality: arrivalNationality,
        cityOfOrigin: arrivalCity.trim() || undefined,
        purposeOfVisit: arrivalPurpose,
        staffName: 'Front Desk Reception',
      });

      if (issueRfid) {
        issuePhysicalKeycard({
          roomNumber: assignedRoom.room_number,
          guestName: checkInModalBooking.guest_name,
          staffUser: 'Front Desk Reception',
        }).catch(() => {});
      }

      const guestName = checkInModalBooking.guest_name;
      const roomNum = assignedRoom.room_number;

      setCheckInModalBooking(null);
      setSelectedRoomId('');
      setCheckInError(null);
      setWalkInAlert({ type: 'success', message: `Guest ${guestName} checked into Room ${roomNum} successfully.` });
      await fetchLiveState();
      await fetchWalkInQueue();
    } catch (err: any) {
      setCheckInError(err.message || 'Check-in failed. Please verify room status and permissions.');
      setWalkInAlert({ type: 'error', message: err.message || 'Check-in failed' });
    } finally {
      setIsSubmittingCheckIn(false);
    }
  };

  // Execute Authoritative Check-Out
  const handleConfirmCheckOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkOutModalBooking) return;

    setCheckOutError(null);
    setIsSubmittingCheckOut(true);

    try {
      await adminOperations.checkOut({
        bookingReference: checkOutModalBooking.booking_reference,
        additionalCharges,
        chargeDescription,
        settlementMethod,
        staffName: 'Front Desk Reception',
      });

      if (checkOutModalBooking.assigned_room_number) {
        checkoutPhysicalCard(checkOutModalBooking.assigned_room_number, 'Front Desk Reception').catch(() => {});
      }

      const ref = checkOutModalBooking.booking_reference;
      setCheckOutSuccessRef(ref);
      setWalkInAlert({
        type: 'success',
        message: `Folio ${ref} checked out and room marked for housekeeping.`,
      });
      setCheckOutModalBooking(null);
      setAdditionalCharges(0);
      setCheckOutError(null);
      await fetchLiveState();
      await fetchWalkInQueue();
    } catch (err: any) {
      setCheckOutError(err.message || 'Check-out failed');
      setWalkInAlert({ type: 'error', message: err.message || 'Check-out failed' });
    } finally {
      setIsSubmittingCheckOut(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EFE3D6]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#D8AD56]">
              OPERATIONAL WORKFLOW
            </span>
            <span
              className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                isConnected
                  ? 'bg-green-100 text-green-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              <Radio className="w-2.5 h-2.5" />
              {isConnected ? 'Real-Time Sync Active' : `Sync: ${status}`}
            </span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#241912] mt-0.5 flex items-center gap-2">
            <ConciergeBell className="w-6 h-6 text-[#D8AD56]" />
            <span>Front Desk & Reception</span>
          </h1>
          <p className="text-xs text-[#786B61] mt-0.5">
            Rapid guest check-in, room key issuance, active stay folios, and checkout settlement.
          </p>
        </div>

        {/* Action Buttons & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
          <Link
            href="/admin/walk-in"
            className="px-4 py-2.5 rounded-xl bg-[#382216] hover:bg-[#25150F] text-[#D8AD56] text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer shrink-0"
          >
            <BedDouble className="w-4 h-4 text-[#D8AD56]" />
            <span>Walk-In Registration Desk</span>
          </Link>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#786B61] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guest, phone, room, or ref..."
              className="w-full text-xs font-medium pl-9 pr-3 py-2.5 rounded-xl border border-[#EFE3D6] bg-white text-[#241912] focus:border-[#D8AD56] focus:outline-none shadow-sm"
            />
          </div>
        </div>
      </div>

      {checkOutSuccessRef && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
            <span>Stay <strong>{checkOutSuccessRef}</strong> successfully checked out and settled. Room marked for housekeeping cleaning.</span>
          </div>
          <button
            onClick={() => setCheckOutSuccessRef(null)}
            className="text-green-800 font-bold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Walk-In Alert Banner */}
      {walkInAlert && (
        <div
          className={'p-4 rounded-xl text-xs flex items-center justify-between ' + (
            walkInAlert.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          )}
        >
          <div className="flex items-center gap-2">
            {walkInAlert.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{walkInAlert.message}</span>
          </div>
          <button onClick={() => setWalkInAlert(null)} className="font-bold hover:underline">
            ✕
          </button>
        </div>
      )}

      {/* LIVE RECEPTION WALK-IN QUEUE PANEL */}
      <div className="bg-gradient-to-r from-[#241912] via-[#382216] to-[#25150F] rounded-2xl border border-[#D8AD56]/40 p-5 shadow-lg text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#D8AD56] text-[#241912] flex items-center justify-center font-bold shadow-md">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-lg font-bold text-white tracking-wide">
                  Reception QR Walk-In Counter Queue
                </h2>
                {walkInQueue.length > 0 ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-[#241912] animate-pulse">
                    {walkInQueue.length} Guests Waiting
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Counter Ready
                  </span>
                )}
              </div>
              <p className="text-xs text-[#EFE3D6]/70">
                Self-service QR bookings appear here automatically. Select physical room and encode keycard in 1 click.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowStandeeModal(true)}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-[#D8AD56]/40 text-[#D8AD56] text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Desk Standee QR</span>
            </button>
          </div>
        </div>

        {/* Queue Items List */}
        {walkInQueue.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#EFE3D6]/60 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#D8AD56]" />
            <span>Reception counter is clear. Any walk-in customer scanning the acrylic desk QR will appear here instantly.</span>
          </div>
        ) : (
          <div className="grid gap-3 pt-4 sm:grid-cols-2">
            {walkInQueue.map((item) => {
              const currentSelectedRoom = selectedWalkInRooms[item.booking_reference] || '';
              const isPaid = item.payment_status === 'successful';
              const isEncoding = isEncodingWalkIn === item.booking_reference;

              return (
                <div
                  key={item.id}
                  className="rounded-xl bg-white/95 text-[#241912] p-4 border border-[#D8AD56] shadow-md flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-[#382216] text-[#D8AD56]">
                            {item.pickup_code || item.booking_reference.slice(-7)}
                          </span>
                          <span className="font-serif font-bold text-base text-[#241912]">
                            {item.guest_name}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#786B61] mt-0.5">
                          <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3 text-[#D8AD56]" /><span>{item.guest_phone}</span></span> &bull; {item.category_name}
                        </p>
                      </div>

                      <span
                        className={'text-[10px] font-bold px-2.5 py-1 rounded-full ' + (
                          isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        )}
                      >
                        {isPaid ? ('PAID ₹' + item.total_amount) : ('COLLECT CASH ₹' + item.total_amount)}
                      </span>
                    </div>

                    {/* Room Selector */}
                    <div className="p-2.5 rounded-lg bg-[#FAF7F2] border border-[#EFE3D6] space-y-1">
                      <label className="text-[10px] font-bold text-[#786B61] uppercase tracking-wider block">
                        Select Physical Clean Room:
                      </label>
                      <LuxurySelect
                        size="sm"
                        variant="admin"
                        value={currentSelectedRoom}
                        placeholder={cleanRoomsList.length === 0 ? "No clean rooms available" : "Select clean room..."}
                        onChange={(val) =>
                          setSelectedWalkInRooms((prev) => ({
                            ...prev,
                            [item.booking_reference]: String(val),
                          }))
                        }
                        options={cleanRoomsList.map((r) => ({
                          value: r.room_number,
                          label: `Room ${r.room_number} • Floor ${r.floor_number} • ${r.category_name || 'Standard'} (Clean)`,
                        }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {/* 1-Click Encode & Issue CTA */}
                    <button
                      type="button"
                      disabled={isEncoding || !currentSelectedRoom}
                      onClick={() => handleAssignAndEncodeWalkIn(item)}
                      className="w-full py-2 px-3 rounded-lg bg-[#382216] hover:bg-[#25150F] text-[#D8AD56] text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      {isEncoding ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#D8AD56]" />
                          <span>Programming Be-Tech Keycard...</span>
                        </>
                      ) : (
                        <>
                          <KeyRound className="w-3.5 h-3.5 text-[#D8AD56]" />
                          <span>
                            {isPaid
                              ? (
                                <span className="inline-flex items-center gap-1">
                                  <Zap className="w-3.5 h-3.5 text-[#D8AD56]" />
                                  <span>1-Click Encode & Issue Room {currentSelectedRoom || ''}</span>
                                </span>
                              )
                              : (
                                <span className="inline-flex items-center gap-1">
                                  <Banknote className="w-3.5 h-3.5 text-[#D8AD56]" />
                                  <span>Collect ₹{item.total_amount} & Issue Room {currentSelectedRoom || ''}</span>
                                </span>
                              )}
                          </span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setStatutoryInitialData({
                          guestName: item.guest_name,
                          guestPhone: item.guest_phone,
                          guestEmail: item.guest_email,
                          categoryId: item.category_id,
                          roomNumber: currentSelectedRoom,
                          bookingReference: item.booking_reference,
                        });
                        setShowStatutoryModal(true);
                      }}
                      className="w-full py-1.5 px-3 rounded-lg bg-[#FAF7F2] hover:bg-[#EFE3D6] border border-[#D8AD56]/40 text-[#382216] text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-[#D8AD56]" />
                      <span>Statutory Registration & Tariff Form</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Two Workstations: Expected Arrivals (Left) & In-House Stays (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Column: Arrivals / Check-In Queue */}
        <div className="bg-white rounded-2xl border border-[#D8AD56]/30 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-serif text-lg font-bold text-[#241912] flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1565C0]" />
                <span>Expected Arrivals ({pendingArrivals.length})</span>
              </h2>
              <p className="text-xs text-[#786B61]">Awaiting guest arrival and room assignment</p>
            </div>
            <span className="text-[11px] font-semibold text-[#2E7D32] bg-[#E8F5E9] px-2.5 py-1 rounded-full">
              {availableRooms.length} Clean Rooms Ready
            </span>
          </div>

          {pendingArrivals.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#786B61] bg-[#FAF7F2] rounded-xl border border-dashed border-[#EFE3D6]">
              No expected arrivals matching current query.
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {pendingArrivals.map((b) => (
                <div
                  key={b.id}
                  className="p-4 rounded-xl border border-[#EFE3D6] hover:border-[#D8AD56] transition-all bg-[#FAF7F2]/50 space-y-2.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-serif font-bold text-sm text-[#241912] block">
                        {b.guest_name}
                      </span>
                      <span className="text-[10px] font-mono text-[#786B61]">
                        {b.booking_reference} · {b.guest_phone}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E3F2FD] text-[#1565C0]">
                      {b.category_name}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-[#786B61] py-1 border-y border-[#EFE3D6]">
                    <div>Dates: <strong>{b.check_in_date} to {b.check_out_date}</strong></div>
                    <div>Pay Status: <strong className={b.payment_status === 'successful' ? 'text-[#2E7D32]' : 'text-[#E65100]'}>{b.payment_status}</strong></div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="font-bold text-xs text-[#241912]">
                      ₹ {b.total_amount.toLocaleString('en-IN')}
                    </span>
                    <button
                      onClick={() => {
                        setCheckInError(null);
                        setCheckInModalBooking(b);
                        const preAssigned = rooms.find(
                          (r) =>
                            (b.assigned_room_id && r.id === b.assigned_room_id) ||
                            (b.assigned_room_number && r.room_number === b.assigned_room_number) ||
                            (r.current_booking_ref && r.current_booking_ref.toLowerCase() === b.booking_reference.toLowerCase())
                        );
                        if (preAssigned && preAssigned.housekeeping_status === 'clean') {
                          setSelectedRoomId(preAssigned.id);
                        } else {
                          const match = rooms.find(
                            (r) => r.operational_status === 'available' && r.housekeeping_status === 'clean' && r.category_id === b.category_id
                          );
                          const anyClean = rooms.find((r) => r.operational_status === 'available' && r.housekeeping_status === 'clean');
                          setSelectedRoomId(match ? match.id : (anyClean ? anyClean.id : ''));
                        }
                        setArrivalIdType(b.id_proof_type || 'Aadhaar Card');
                        setArrivalIdNumber(b.id_proof_number || '');
                        setArrivalNationality((b.nationality as any) || 'Indian');
                        setArrivalCity(b.city_of_origin || 'Kadiri');
                        setArrivalPurpose(b.purpose_of_visit || 'Pilgrimage / Temple Darshan');
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-[#43001F] hover:bg-[#2E0015] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <ConciergeBell className="w-3.5 h-3.5" />
                      <span>Check In Guest</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: In-House Stays / Checkout Queue */}
        <div className="bg-white rounded-2xl border border-[#D8AD56]/30 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-serif text-lg font-bold text-[#241912] flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2E7D32]" />
                <span>In-House Active Stays ({activeStays.length})</span>
              </h2>
              <p className="text-xs text-[#786B61]">Currently occupied rooms and pending checkouts</p>
            </div>
          </div>

          {activeStays.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#786B61] bg-[#FAF7F2] rounded-xl border border-dashed border-[#EFE3D6]">
              No active in-house guests at this time.
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {activeStays.map((b) => {
                const pendingBalance = b.total_amount - b.paid_amount;
                return (
                  <div
                    key={b.id}
                    className="p-4 rounded-xl border border-[#EFE3D6] hover:border-[#D8AD56] transition-all bg-white shadow-xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="px-2.5 py-1.5 rounded-lg bg-[#382216] text-[#D8AD56] font-bold text-sm">
                          Room {b.assigned_room_number || 'N/A'}
                        </div>
                        <div>
                          <span className="font-serif font-bold text-sm text-[#241912] block">
                            {b.guest_name}
                          </span>
                          <span className="text-[10px] text-[#786B61]">
                            Stayed since {b.check_in_date} · Depart: {b.check_out_date}
                          </span>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E8F5E9] text-[#2E7D32]">
                        OCCUPIED
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs py-1 border-y border-[#EFE3D6]">
                      <span>Folio Total: <strong>₹ {b.total_amount.toLocaleString('en-IN')}</strong></span>
                      <span>
                        Balance: <strong className={pendingBalance > 0 ? 'text-red-600' : 'text-green-700'}>
                          {pendingBalance > 0 ? `₹ ${pendingBalance.toLocaleString('en-IN')} Due` : 'Fully Settled'}
                        </strong>
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => setCheckOutModalBooking(b)}
                        className="px-3.5 py-1.5 rounded-lg bg-[#382216] hover:bg-[#25150F] text-[#EFE3D6] text-xs font-semibold transition-colors flex items-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5 text-[#D8AD56]" />
                        <span>Checkout & Settle</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* CHECK-IN MODAL */}
      {checkInModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#D8AD56]/40 p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#EFE3D6] pb-3">
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#D8AD56]">RECEPTION CHECK-IN</span>
                <h3 className="font-serif text-lg font-bold text-[#241912]">Check In {checkInModalBooking.guest_name}</h3>
              </div>
              <button
                onClick={() => {
                  setCheckInModalBooking(null);
                  setCheckInError(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {checkInError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2 shadow-xs">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">Check-in could not be completed</p>
                  <p className="text-[11px] mt-0.5 leading-relaxed">{checkInError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleConfirmCheckIn} className="space-y-4">
              <div className="p-3 rounded-lg bg-[#FAF7F2] text-xs space-y-1">
                <div>Ref: <strong>{checkInModalBooking.booking_reference}</strong></div>
                <div>Category: <strong>{checkInModalBooking.category_name}</strong></div>
                <div>Dates: <strong>{checkInModalBooking.check_in_date} to {checkInModalBooking.check_out_date}</strong></div>
              </div>

              <div>
                <label className="block text-[11px] uppercase font-semibold text-[#786B61] mb-1">
                  Assign Physical Room (Clean & Ready) *
                </label>
                <LuxurySelect
                  size="md"
                  variant="admin"
                  value={selectedRoomId}
                  placeholder="Select a ready clean room..."
                  onChange={(val) => {
                    setSelectedRoomId(String(val));
                    setCheckInError(null);
                  }}
                  options={selectableRoomsForCheckIn.map((r) => {
                    const isPreAssigned =
                      checkInModalBooking &&
                      (r.id === checkInModalBooking.assigned_room_id ||
                        r.room_number === checkInModalBooking.assigned_room_number ||
                        (r.current_booking_ref &&
                          r.current_booking_ref.toLowerCase() === checkInModalBooking.booking_reference.toLowerCase()));
                    return {
                      value: r.id,
                      label: `Room ${r.room_number} (Floor ${r.floor_number} - ${r.category_name})${isPreAssigned ? ' • Pre-Assigned' : ''}`,
                    };
                  })}
                />
                {selectableRoomsForCheckIn.length === 0 && (
                  <p className="text-[11px] text-amber-700 mt-1.5 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    No clean rooms currently available for this category. Please check Housekeeping status.
                  </p>
                )}
              </div>

              {/* Statutory Guest Identity & Origin (Form C Norms) */}
              <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#EFE3D6] space-y-2.5">
                <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-[#D8AD56]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Indian Statutory Identity Verification</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-[#786B61] uppercase block mb-0.5">Govt ID Type *</label>
                    <LuxurySelect
                      size="sm"
                      variant="admin"
                      value={arrivalIdType}
                      onChange={(val) => setArrivalIdType(String(val))}
                      options={[
                        { value: 'Aadhaar Card', label: 'Aadhaar Card' },
                        { value: 'Passport', label: 'Passport' },
                        { value: 'Driving License', label: 'Driving License' },
                        { value: 'Voter ID', label: 'Voter ID' },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[#786B61] uppercase block mb-0.5">Govt ID Number *</label>
                    <input
                      type="text"
                      required
                      value={arrivalIdNumber}
                      onChange={(e) => setArrivalIdNumber(e.target.value)}
                      placeholder="e.g. 5482 1928 3847"
                      className="w-full p-2 text-xs font-mono font-bold rounded-lg border border-[#EFE3D6] bg-white text-[#241912]"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[#786B61] uppercase block mb-0.5">Nationality</label>
                    <LuxurySelect
                      size="sm"
                      variant="admin"
                      value={arrivalNationality}
                      onChange={(val) => setArrivalNationality(val as any)}
                      options={[
                        { value: 'Indian', label: 'Indian Citizen' },
                        { value: 'Foreigner', label: 'Foreign National' },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[#786B61] uppercase block mb-0.5">City of Origin</label>
                    <input
                      type="text"
                      value={arrivalCity}
                      onChange={(e) => setArrivalCity(e.target.value)}
                      placeholder="e.g. Bengaluru"
                      className="w-full p-2 text-xs rounded-lg border border-[#EFE3D6] bg-white text-[#241912]"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-[#786B61] uppercase block mb-0.5">Purpose of Visit</label>
                    <LuxurySelect
                      size="sm"
                      variant="admin"
                      value={arrivalPurpose}
                      onChange={(val) => setArrivalPurpose(String(val))}
                      options={[
                        { value: 'Pilgrimage / Temple Darshan', label: 'Pilgrimage / Temple Darshan' },
                        { value: 'Business', label: 'Business' },
                        { value: 'Transit', label: 'Transit' },
                        { value: 'Personal / Family', label: 'Personal / Family' },
                      ]}
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-[#EFE3D6] flex items-center justify-between bg-white">
                <div className="flex items-center gap-2 text-xs">
                  <KeyRound className="w-4 h-4 text-[#D8AD56]" />
                  <span>Issue Encoded RFID Room Keycard</span>
                </div>
                <input
                  type="checkbox"
                  checked={issueRfid}
                  onChange={(e) => setIssueRfid(e.target.checked)}
                  className="w-4 h-4 text-[#D8AD56] rounded"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  disabled={isSubmittingCheckIn}
                  onClick={() => {
                    setCheckInModalBooking(null);
                    setCheckInError(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-xs text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedRoomId || isSubmittingCheckIn}
                  className="px-5 py-2 rounded-lg bg-[#43001F] text-white text-xs font-bold hover:bg-[#2E0015] disabled:opacity-50 flex items-center gap-2 shadow-sm transition-all"
                >
                  {isSubmittingCheckIn ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Checking In...</span>
                    </>
                  ) : (
                    <span>Confirm Check-in</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHECK-OUT & SETTLEMENT MODAL */}
      {checkOutModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#D8AD56]/40 p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#EFE3D6] pb-3">
              <div>
                <span className="text-[10px] uppercase font-semibold text-[#D8AD56]">RECEPTION CHECK-OUT</span>
                <h3 className="font-serif text-lg font-bold text-[#241912]">Checkout Room {checkOutModalBooking.assigned_room_number}</h3>
              </div>
              <button
                onClick={() => {
                  setCheckOutModalBooking(null);
                  setCheckOutError(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {checkOutError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2 shadow-xs">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">Checkout could not be completed</p>
                  <p className="text-[11px] mt-0.5 leading-relaxed">{checkOutError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleConfirmCheckOut} className="space-y-4">
              <div className="p-3 rounded-lg bg-[#FAF7F2] text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span>Guest Name:</span>
                  <strong>{checkOutModalBooking.guest_name}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Room Charge:</span>
                  <span>₹ {checkOutModalBooking.subtotal_amount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST Taxes (12%):</span>
                  <span>₹ {checkOutModalBooking.tax_amount.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Previously Paid:</span>
                  <span className="text-[#2E7D32]">₹ {checkOutModalBooking.paid_amount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Add Incidental Charges */}
              <div>
                <label className="block text-[11px] uppercase font-semibold text-[#786B61] mb-1">
                  Add Incidentals / Minibar / Room Service Charges
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chargeDescription}
                    onChange={(e) => setChargeDescription(e.target.value)}
                    placeholder="Description"
                    className="flex-1 text-xs p-2 rounded-lg border border-[#EFE3D6]"
                  />
                  <input
                    type="number"
                    min="0"
                    value={additionalCharges}
                    onChange={(e) => setAdditionalCharges(Number(e.target.value))}
                    placeholder="Amount (₹)"
                    className="w-28 text-xs p-2 rounded-lg border border-[#EFE3D6]"
                  />
                </div>
              </div>

              {/* Net Balance & Settlement */}
              <div className="p-3 rounded-lg bg-[#EFE3D6]/50 border border-[#D8AD56]/30 flex items-center justify-between">
                <span className="text-xs font-semibold text-[#241912]">Settlement Amount:</span>
                <span className="font-serif text-lg font-bold text-[#382216]">
                  ₹ {Math.max(0, checkOutModalBooking.total_amount + additionalCharges - checkOutModalBooking.paid_amount).toLocaleString('en-IN')}
                </span>
              </div>

              <div>
                <label className="block text-[11px] uppercase font-semibold text-[#786B61] mb-1">
                  Payment Collection Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['cash', 'upi', 'card'].map((method) => (
                    <button
                      type="button"
                      key={method}
                      onClick={() => setSettlementMethod(method as any)}
                      className={`p-2 rounded-lg text-xs font-semibold uppercase border transition-all ${
                        settlementMethod === method
                          ? 'bg-[#382216] text-[#D8AD56] border-[#D8AD56]'
                          : 'bg-white text-gray-700 border-gray-200'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EFE3D6]">
                <button
                  type="button"
                  disabled={isSubmittingCheckOut}
                  onClick={() => {
                    setCheckOutModalBooking(null);
                    setCheckOutError(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-xs text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCheckOut}
                  className="px-5 py-2 rounded-lg bg-[#43001F] text-white text-xs font-bold hover:bg-[#2E0015] disabled:opacity-50 flex items-center gap-2 shadow-sm transition-all"
                >
                  {isSubmittingCheckOut ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Checking Out...</span>
                    </>
                  ) : (
                    <span>Complete Checkout & Settle</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ReceptionStandeeModal isOpen={showStandeeModal} onClose={() => setShowStandeeModal(false)} />
      <StatutoryWalkInModal
        isOpen={showStatutoryModal}
        onClose={() => {
          setShowStatutoryModal(false);
          setStatutoryInitialData(null);
        }}
        availableRooms={availableRooms}
        categories={categories}
        initialData={statutoryInitialData}
        onSuccess={async (booking, roomNum) => {
          setWalkInAlert({
            message: `Walk-in guest ${booking.guest_name} registered and checked into Room ${roomNum}! Smart keycard encoded.`,
            type: 'success',
          });
          await fetchLiveState();
          await fetchWalkInQueue();
        }}
      />
    </div>
  );
}
