'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface RazorpayCheckoutButtonProps {
  amount?: number; // amount in paise (e.g. 50000 = ₹500.00). Defaults to 100 paise minimum.
  amountInRupees?: number; // convenient rupee amount (e.g. 500 = ₹500.00)
  currency?: string;
  receipt?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  notes?: Record<string, string>;
  buttonText?: string;
  className?: string;
  onSuccess?: (paymentData: {
    order_id: string;
    payment_id: string;
    signature: string;
  }) => void;
  onError?: (error: string) => void;
  onDismiss?: () => void;
}

export function RazorpayCheckoutButton({
  amount = 50000, // 50000 paise = ₹500
  amountInRupees,
  currency = 'INR',
  receipt,
  customerName = 'Valued Guest',
  customerEmail = 'guest@sritayigrand.com',
  customerPhone = '9999999999',
  notes = {},
  buttonText = 'Pay with Razorpay',
  className = '',
  onSuccess,
  onError,
  onDismiss,
}: RazorpayCheckoutButtonProps) {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // 1. Dynamically load official Razorpay SDK script
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.Razorpay) {
      setIsScriptLoaded(true);
      return;
    }

    const scriptId = 'razorpay-standard-checkout-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => setIsScriptLoaded(true);
      script.onerror = () => {
        setStatusMessage({
          type: 'error',
          text: 'Failed to load Razorpay payment gateway script. Please verify your internet connection.',
        });
      };
      document.body.appendChild(script);
    } else {
      setIsScriptLoaded(true);
    }
  }, []);

  // Compute effective amount in paise
  const effectiveAmountInPaise = amountInRupees
    ? Math.round(amountInRupees * 100)
    : Math.max(100, Math.round(amount));

  // 2. Checkout handler: Create Order -> Open Modal -> Verify Signature
  const handleCheckout = async () => {
    setStatusMessage(null);
    setIsProcessing(true);

    try {
      // Step A: Call backend create-order endpoint
      const orderRes = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: effectiveAmountInPaise,
          currency,
          receipt: receipt || `rcpt_${Date.now()}`,
          notes: {
            customer_name: customerName,
            customer_email: customerEmail,
            customer_phone: customerPhone,
            hotel: 'SRI TAYI GRAND',
            ...notes,
          },
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.order_id) {
        throw new Error(orderData.error || 'Failed to create payment order with server.');
      }

      const activeKeyId =
        orderData.key_id ||
        process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
        'rzp_test_U3aO08c0MEmri7';

      // Step B: Configure and open Razorpay Standard Checkout modal
      const options = {
        key: activeKeyId,
        amount: orderData.amount,
        currency: orderData.currency || currency,
        name: 'SRI TAYI GRAND',
        description: 'Hotel Accommodation & Services Payment',
        image: '/images/hotel/tayi-grand-logo.png',
        order_id: orderData.order_id,
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: customerPhone
            ? (customerPhone.startsWith('+') ? customerPhone : `+91${customerPhone.replace(/\D/g, '').slice(-10)}`)
            : '+919876543210',
        },
        notes: {
          receipt: orderData.receipt,
          ...notes,
        },
        theme: {
          color: '#43001F',
        },
        // Step C: On success callback from Razorpay Modal
        handler: async function (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) {
          try {
            // Step D: Send credentials to verify-payment endpoint
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyRes.ok && verifyData.success) {
              const successText = `Payment successful! Payment ID: ${response.razorpay_payment_id}`;
              setStatusMessage({ type: 'success', text: successText });
              onSuccess?.({
                order_id: response.razorpay_order_id,
                payment_id: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              });
            } else {
              const failText = verifyData.error || 'Payment signature verification failed.';
              setStatusMessage({ type: 'error', text: failText });
              onError?.(failText);
            }
          } catch (vErr: any) {
            const errText = vErr?.message || 'Network error verifying payment signature.';
            setStatusMessage({ type: 'error', text: errText });
            onError?.(errText);
          } finally {
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
            setStatusMessage({
              type: 'info',
              text: 'Payment checkout window was closed by user.',
            });
            onDismiss?.();
          },
          escape: true,
          backdropclose: false,
        },
      };

      if (!window.Razorpay) {
        throw new Error('Razorpay SDK script is still loading. Please try again in a few seconds.');
      }

      const rzpInstance = new window.Razorpay(options);

      // Handle payment declined / failed event
      rzpInstance.on('payment.failed', function (failResp: any) {
        setIsProcessing(false);
        const reason =
          failResp.error?.description ||
          failResp.error?.reason ||
          'Payment attempt was declined or cancelled.';
        setStatusMessage({ type: 'error', text: `Payment Failed: ${reason}` });
        onError?.(reason);
      });

      rzpInstance.open();
    } catch (err: any) {
      setIsProcessing(false);
      const errMsg = err?.message || 'An error occurred during payment processing.';
      setStatusMessage({ type: 'error', text: errMsg });
      onError?.(errMsg);
    }
  };

  const displayRupees = (effectiveAmountInPaise / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
  });

  return (
    <div className="inline-flex flex-col gap-2">
      <button
        type="button"
        onClick={handleCheckout}
        disabled={isProcessing || !isScriptLoaded}
        className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-white transition-all shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed ${
          className || 'bg-gradient-to-r from-[#43001F] to-[#670030] hover:from-[#320017] hover:to-[#500025]'
        }`}
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Processing Order...</span>
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5 text-[#D8AD56]" />
            <span>{buttonText} ({displayRupees})</span>
          </>
        )}
      </button>

      {statusMessage && (
        <div
          className={`flex items-start gap-2 p-3 text-xs rounded-lg mt-1 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : statusMessage.type === 'error'
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}
        >
          {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
          {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />}
          {statusMessage.type === 'info' && <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
          <div className="flex-1 font-medium">{statusMessage.text}</div>
        </div>
      )}
    </div>
  );
}
