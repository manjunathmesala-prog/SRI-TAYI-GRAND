'use client';

/**
 * ==============================================================================
 * SRI TAYI GRAND - 403 FORBIDDEN / ACCESS DENIED ERROR SCREEN
 * Renders when a staff member attempts to navigate to a privileged route.
 * ==============================================================================
 */

import React, { useEffect, useState } from 'react';
import NextLink from 'next/link';
import Image from 'next/image';
import { ShieldAlert, ArrowLeft, LogOut, Lock, Home } from 'lucide-react';

export default function ForbiddenPage() {
  const [userRole, setUserRole] = useState<string>('Staff');
  const [userName, setUserName] = useState<string>('Staff User');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedRole = localStorage.getItem('stg_role');
      const storedName = localStorage.getItem('stg_user_name');
      if (storedRole) setUserRole(storedRole);
      if (storedName) setUserName(storedName);
    }
  }, []);

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-3xl border border-[#D8AD56]/40 shadow-2xl p-8 sm:p-10 text-center relative overflow-hidden">
        {/* Subtle decorative security badge in background */}
        <div className="absolute -right-8 -top-8 w-36 h-36 bg-[#43001F]/5 rounded-full blur-2xl pointer-events-none" />

        {/* Brand Icon & Alert Icon */}
        <div className="relative mx-auto w-20 h-20 mb-6 flex items-center justify-center">
          <div className="w-20 h-20 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center shadow-inner">
            <ShieldAlert className="w-10 h-10 text-red-600 animate-pulse" />
          </div>
        </div>

        {/* Header */}
        <div className="space-y-2">
          <span className="text-[11px] uppercase tracking-[0.25em] text-red-600 font-bold bg-red-50 border border-red-200 px-3 py-1 rounded-full inline-block">
            HTTP 403 &bull; Access Denied
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#241912]">
            Restricted Permission Area
          </h1>
          <p className="text-xs sm:text-sm text-[#786B61] max-w-sm mx-auto leading-relaxed">
            Your current assigned role ({userRole}) does not hold administrative authorization to view or modify this resource.
          </p>
        </div>

        {/* Security Audit Notice Card */}
        <div className="mt-6 p-4 rounded-2xl bg-[#F8F3E9] border border-[#E6D9C5] text-left text-xs space-y-1.5">
          <div className="flex items-center gap-2 text-[#43001F] font-semibold">
            <Lock className="w-3.5 h-3.5" />
            <span>Defense-in-Depth Enforcement</span>
          </div>
          <p className="text-[#786B61] text-[11px] leading-relaxed">
            Logged In As: <strong className="text-[#241912]">{userName}</strong> ({userRole}).
            This unauthorized access attempt has been recorded in the immutable security audit log.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <NextLink
            href="/admin/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#43001F] hover:bg-[#2E0015] text-white text-xs uppercase tracking-wider font-bold shadow-md transition-all duration-300 hover:-translate-y-0.5 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </NextLink>

          <NextLink
            href="/admin/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white hover:bg-[#F8F3E9] text-[#241912] border border-[#E6D9C5] text-xs uppercase tracking-wider font-bold shadow-xs transition-all duration-300 cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-[#43001F]" />
            <span>Switch Account</span>
          </NextLink>
        </div>

        {/* Footer Note */}
        <div className="mt-8 pt-4 border-t border-[#EFE3D6] text-[11px] text-[#8C7A6B]">
          Need elevated access? Contact the Super Administrator at <span className="text-[#43001F] font-semibold">admin@sritayigrand.com</span>.
        </div>
      </div>
    </div>
  );
}
