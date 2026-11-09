'use client';

import { useState, useCallback, useEffect } from 'react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface RazorpayCheckoutOptions {
  orderId: string;
  amount: number; // in paise
  currency?: string;
  keyId?: string;
  name?: string;
  description?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  themeColor?: string;
  onSuccess: (paymentData: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => Promise<void> | void;
  onDismiss?: () => void;
  onError?: (error: string) => void;
}

export function useRazorpayCheckout() {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isScriptError, setIsScriptError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dynamically load the Razorpay checkout script with caching & cleanup
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.Razorpay) {
      setIsScriptLoaded(true);
      return;
    }

    const scriptId = 'razorpay-checkout-script';
    let scriptElement = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!scriptElement) {
      scriptElement = document.createElement('script');
      scriptElement.id = scriptId;
      scriptElement.src = 'https://checkout.razorpay.com/v1/checkout.js';
      scriptElement.async = true;

      scriptElement.onload = () => {
        setIsScriptLoaded(true);
        setIsScriptError(false);
      };

      scriptElement.onerror = () => {
        setIsScriptError(true);
        setErrorMessage('Failed to load Razorpay payment gateway script. Please check your network connection.');
      };

      document.body.appendChild(scriptElement);
    } else {
      setIsScriptLoaded(true);
    }
  }, []);

  const openCheckout = useCallback(
    (options: RazorpayCheckoutOptions) => {
      setErrorMessage(null);

      if (!window.Razorpay) {
        const err = 'Razorpay checkout SDK is not ready yet. Please try again in a moment.';
        setErrorMessage(err);
        options.onError?.(err);
        return;
      }

      setIsProcessing(true);

      const razorpayOptions = {
        key: options.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_Ty3N7lQ7MDxqRm',
        amount: options.amount,
        currency: options.currency || 'INR',
        name: options.name || 'SRI TAYI GRAND',
        description: options.description || 'Hotel Reservation Payment',
        order_id: options.orderId,
        image: '/images/hotel/tayi-grand-logo.png',
        prefill: {
          name: options.prefill?.name || '',
          email: options.prefill?.email || '',
          contact: options.prefill?.contact || '',
        },
        notes: options.notes || {},
        theme: {
          color: options.themeColor || '#43001F',
        },
        handler: async function (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) {
          try {
            await options.onSuccess(response);
          } catch (handlerErr: any) {
            const msg = handlerErr?.message || 'Payment processing failed during verification.';
            setErrorMessage(msg);
            options.onError?.(msg);
          } finally {
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
            options.onDismiss?.();
          },
          escape: true,
          backdropclose: false,
        },
      };

      try {
        const rzp = new window.Razorpay(razorpayOptions);

        rzp.on('payment.failed', function (response: any) {
          setIsProcessing(false);
          const reason = response.error?.description || 'Your payment was declined or could not be completed.';
          setErrorMessage(reason);
          options.onError?.(reason);
        });

        rzp.open();
      } catch (launchErr: any) {
        setIsProcessing(false);
        const err = launchErr?.message || 'Failed to open Razorpay payment modal.';
        setErrorMessage(err);
        options.onError?.(err);
      }
    },
    []
  );

  return {
    isScriptLoaded,
    isScriptError,
    isProcessing,
    errorMessage,
    setErrorMessage,
    openCheckout,
  };
}
