'use client';

import React from 'react';
import { CreditCard, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { useRazorpayCheckout } from '@/hooks/useRazorpayCheckout';

interface RazorpayCheckoutButtonProps {
  amountRupees: number;
  bookingReference?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  description?: string;
  buttonText?: string;
  className?: string;
  disabled?: boolean;
  onSuccessRedirectUrl?: string;
  onPaymentSuccess?: (paymentResult: any) => void;
  onPaymentFailure?: (error: string) => void;
}

export function RazorpayCheckoutButton({
  amountRupees,
  bookingReference,
  customerName,
  customerEmail,
  customerPhone,
  description = 'Room Reservation Payment',
  buttonText,
  className = '',
  disabled = false,
  onSuccessRedirectUrl,
  onPaymentSuccess,
  onPaymentFailure,
}: RazorpayCheckoutButtonProps) {
  const { isProcessing, errorMessage, setErrorMessage, openCheckout } = useRazorpayCheckout();

  const handleInitiatePayment = async () => {
    setErrorMessage(null);

    try {
      // 1. Create Server-Side Authoritative Order
      const res = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingReference,
          guestName: customerName,
          guestEmail: customerEmail,
          guestPhone: customerPhone,
        }),
      });

      const orderData = await res.json();
      if (!res.ok) {
        throw new Error(orderData.error || 'Failed to create payment order.');
      }

      // 2. Open Standard Razorpay Checkout Modal
      openCheckout({
        orderId: orderData.orderId,
        amount: orderData.amount, // in paise
        currency: orderData.currency || 'INR',
        keyId: orderData.keyId,
        name: 'SRI TAYI GRAND',
        description,
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: customerPhone,
        },
        notes: {
          booking_reference: bookingReference || orderData.receipt,
        },
        onSuccess: async (paymentData) => {
          // 3. Server-side HMAC-SHA256 Cryptographic Verification
          const verifyRes = await fetch('/api/razorpay/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bookingReference: bookingReference || orderData.receipt,
              orderId: paymentData.razorpay_order_id,
              paymentId: paymentData.razorpay_payment_id,
              signature: paymentData.razorpay_signature,
            }),
          });

          const verifyData = await verifyRes.json();
          if (!verifyRes.ok) {
            throw new Error(verifyData.error || 'Cryptographic payment verification failed.');
          }

          onPaymentSuccess?.(verifyData);

          if (onSuccessRedirectUrl) {
            window.location.href = onSuccessRedirectUrl;
          } else if (bookingReference) {
            window.location.href = `/booking/confirmation/${bookingReference}`;
          }
        },
        onError: (err) => {
          onPaymentFailure?.(err);
        },
      });
    } catch (err: any) {
      const msg = err?.message || 'Payment initiation failed.';
      setErrorMessage(msg);
      onPaymentFailure?.(msg);
    }
  };

  return (
    <div className="w-full space-y-3">
      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block">Payment Alert</span>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleInitiatePayment}
        disabled={disabled || isProcessing}
        className={`w-full py-4 px-6 rounded-2xl bg-[#43001F] hover:bg-[#2E0015] active:scale-[0.98] text-white text-sm uppercase tracking-wider font-bold shadow-luxury hover:shadow-luxury-lg transition-all duration-300 flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${className}`}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-[#D8AD56]" />
            <span>Securing Payment...</span>
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 text-[#D8AD56]" />
            <span>
              {buttonText || `Pay ₹${amountRupees.toLocaleString('en-IN')} via Razorpay`}
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-400 ml-auto" />
          </>
        )}
      </button>

      <div className="flex items-center justify-center gap-4 text-[11px] text-[#786A5B]">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>256-bit SSL Encryption</span>
        </span>
        <span>•</span>
        <span>UPI / Cards / NetBanking</span>
        <span>•</span>
        <span className="font-semibold text-[#43001F]">Razorpay Verified</span>
      </div>
    </div>
  );
}
