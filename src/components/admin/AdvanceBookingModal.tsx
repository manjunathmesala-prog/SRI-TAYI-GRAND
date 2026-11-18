'use client';
import React, { useState } from 'react';
import { X, Calendar } from 'lucide-react';
import { toast } from '@/components/ui/Toast';
import { adminOperations } from '@/lib/realtime-client';

export function AdvanceBookingModal({ isOpen, onClose, onSuccess }: { isOpen: boolean; onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    guestName: '',
    guestPhone: '',
    guestEmail: '',
    checkInDate: '',
    checkOutDate: '',
    categoryId: 'cat-double-03', // default
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await adminOperations.createBooking({
        guest_name: formData.guestName,
        guest_phone: formData.guestPhone,
        guest_email: formData.guestEmail,
        check_in_date: formData.checkInDate,
        check_out_date: formData.checkOutDate,
        category_id: formData.categoryId,
        category_name: 'Double Room',
        rooms_count: 1,
        adults_count: 2,
        children_count: 0,
        status: 'confirmed',
        payment_status: 'pending',
        payment_method: 'pay_at_hotel',
        subtotal_amount: 1800,
        total_amount: 1800,
        paid_amount: 0,
        additional_charges_amount: 0,
        tax_amount: 0,
      });

      if (res.success) {
        toast.success('Advance booking confirmed successfully.');
        onSuccess();
        onClose();
      } else {
        toast.error(res.error || 'Failed to create booking.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error creating booking.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">New Advance Booking</h2>
          <button onClick={onClose}><X /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Guest Name" className="w-full border p-2 rounded" onChange={(e) => setFormData({...formData, guestName: e.target.value})} required />
          <input type="text" placeholder="Phone" className="w-full border p-2 rounded" onChange={(e) => setFormData({...formData, guestPhone: e.target.value})} required />
          <input type="date" className="w-full border p-2 rounded" onChange={(e) => setFormData({...formData, checkInDate: e.target.value})} required />
          <input type="date" className="w-full border p-2 rounded" onChange={(e) => setFormData({...formData, checkOutDate: e.target.value})} required />
          <button type="submit" className="w-full bg-[#8D672F] text-white p-2 rounded">Confirm Booking</button>
        </form>
      </div>
    </div>
  );
}
