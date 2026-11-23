'use client';

import React, { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { RazorpayCheckoutButton } from '@/components/payment/RazorpayCheckoutButton';
import { ShieldCheck, CreditCard, CheckCircle2, Lock, Sparkles, Building2 } from 'lucide-react';
import TayiBrandIcon from '@/components/anantha/TayiBrandIcon';

export default function PaymentDemoPage() {
  const [amountRupees, setAmountRupees] = useState<number>(500);
  const [customerName, setCustomerName] = useState<string>('Manjunath Sai');
  const [customerEmail, setCustomerEmail] = useState<string>('manjunath@sritayigrand.com');
  const [customerPhone, setCustomerPhone] = useState<string>('9876543210');
  const [paymentSuccess, setPaymentSuccess] = useState<{
    order_id: string;
    payment_id: string;
    signature: string;
  } | null>(null);

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col justify-between text-[#2D2424]">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl shadow-xl border border-[#EBE3D5] overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#43001F] via-[#5B0B2E] to-[#43001F] p-8 text-white relative">
            <div className="flex items-center gap-3 mb-2">
              <TayiBrandIcon size={24} className="text-[#D8AD56]" />
              <span className="text-xs uppercase tracking-[0.25em] font-semibold text-[#D8AD56]">
                SRI TAYI GRAND &bull; SECURE CHECKOUT
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white">
              Razorpay Standard Web Checkout
            </h1>
            <p className="text-white/80 text-sm mt-1">
              End-to-end encrypted payment gateway test &amp; checkout portal
            </p>

            <div className="mt-4 flex flex-wrap gap-4 text-xs text-[#D8AD56]">
              <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1 rounded-full border border-[#D8AD56]/30">
                <Lock className="w-3.5 h-3.5" /> 256-Bit SSL Secured
              </span>
              <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1 rounded-full border border-[#D8AD56]/30">
                <ShieldCheck className="w-3.5 h-3.5" /> HMAC-SHA256 Server Verified
              </span>
              <span className="flex items-center gap-1.5 bg-black/20 px-3 py-1 rounded-full border border-[#D8AD56]/30">
                <Sparkles className="w-3.5 h-3.5" /> Test Mode Active
              </span>
            </div>
          </div>

          {/* Form and Controls */}
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Payment Details */}
              <div className="space-y-4">
                <h2 className="text-base font-bold text-[#43001F] flex items-center gap-2 border-b border-[#EBE3D5] pb-2">
                  <CreditCard className="w-4 h-4 text-[#D8AD56]" />
                  1. Payment Amount
                </h2>

                <div>
                  <label className="block text-xs font-semibold text-[#786B61] uppercase tracking-wider mb-1">
                    Amount (INR ₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-500">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={amountRupees}
                      onChange={(e) => setAmountRupees(Math.max(1, Number(e.target.value)))}
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#D8AD56] font-semibold text-lg"
                    />
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Equivalent to {amountRupees * 100} paise (Minimum: 100 paise / ₹1.00)
                  </p>
                </div>

                <div className="flex gap-2">
                  {[100, 500, 1800, 2500].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmountRupees(preset)}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                        amountRupees === preset
                          ? 'bg-[#43001F] text-white border-[#43001F]'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      ₹{preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer Information */}
              <div className="space-y-4">
                <h2 className="text-base font-bold text-[#43001F] flex items-center gap-2 border-b border-[#EBE3D5] pb-2">
                  <Building2 className="w-4 h-4 text-[#D8AD56]" />
                  2. Guest Information
                </h2>

                <div>
                  <label className="block text-xs font-semibold text-[#786B61] uppercase tracking-wider mb-1">
                    Guest Name
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#D8AD56] text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#786B61] uppercase tracking-wider mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#D8AD56] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#786B61] uppercase tracking-wider mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#D8AD56] text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Section */}
            <div className="pt-6 border-t border-[#EBE3D5] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-xs text-gray-500">
                  Ready to test? Click below to launch Razorpay Standard Modal.
                </p>
                <p className="text-[11px] text-[#D8AD56] font-semibold">
                  Supports Test UPI (success@razorpay), Cards, Netbanking &amp; Wallets.
                </p>
              </div>

              <RazorpayCheckoutButton
                amountInRupees={amountRupees}
                customerName={customerName}
                customerEmail={customerEmail}
                customerPhone={customerPhone}
                buttonText="Proceed to Pay"
                onSuccess={(data) => {
                  setPaymentSuccess(data);
                }}
              />
            </div>

            {/* Success Panel */}
            {paymentSuccess && (
              <div className="mt-6 p-6 rounded-2xl bg-emerald-50 border border-emerald-200 animate-fade-in">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-emerald-900 text-sm">
                      Razorpay Payment Verified &amp; Confirmed!
                    </h3>
                    <p className="text-xs text-emerald-700">
                      HMAC-SHA256 signature verification succeeded on the server.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-emerald-100 text-xs font-mono text-gray-700">
                  <div>
                    <span className="block text-[10px] text-gray-400 uppercase font-sans">Payment ID</span>
                    <span className="font-semibold text-emerald-800 break-all">{paymentSuccess.payment_id}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-gray-400 uppercase font-sans">Order ID</span>
                    <span className="font-semibold text-gray-800 break-all">{paymentSuccess.order_id}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-gray-400 uppercase font-sans">Signature</span>
                    <span className="font-semibold text-gray-800 truncate block" title={paymentSuccess.signature}>
                      {paymentSuccess.signature.slice(0, 16)}...
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
