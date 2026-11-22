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
import { authStorage } from '@/lib/auth-storage';

export default function ForbiddenPage() {
  const [userRole, setUserRole] = useState<string>('Staff');
  const [userName, setUserName] = useState<string>('Staff User');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedRole = authStorage.getRole();
      const storedName = authStorage.getUserName();
      if (storedRole) setUserRole(storedRole);
      if (storedName) setUserName(storedName);
    }
  }, []);

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl border border-[#E6D9C5] shadow-2xl p-8 sm:p-10 text-center relative overflow-hidden">
        {/* Brand Icon & Alert Icon */}
        <div className="relative mx-auto w-16 h-16 mb-5 flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center shadow-xs">
            <ShieldAlert className="w-8 h-8 text-amber-700" />
          </div>
        </div>

        {/* Header */}
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase tracking-wider text-amber-800 font-semibold bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full inline-block">
            Access Restricted
          </span>
          <h1 className="font-serif text-2xl font-bold text-[#2A1D13]">
            Permission Required
          </h1>
          <p className="text-xs text-[#786A5B] max-w-sm mx-auto leading-relaxed">
            Your current role ({userRole}) does not have permission to view this section.
          </p>
        </div>

        {/* User Info Card */}
        <div className="mt-5 p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E6D9C5] text-left text-xs space-y-1">
          <div className="flex items-center gap-1.5 text-[#2A1D13] font-medium">
            <Lock className="w-3.5 h-3.5 text-[#8D672F]" />
            <span>Account Details</span>
          </div>
          <p className="text-[#786A5B] text-[11px]">
            Logged In: <strong className="text-[#2A1D13] font-medium">{userName}</strong> ({userRole})
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <NextLink
            href="/admin/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#2A1D13] hover:bg-[#3D2B1D] text-[#EAD8B8] text-xs font-medium shadow-xs transition-all cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return to Dashboard</span>
          </NextLink>

          <NextLink
            href="/admin/login"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-[#FAF8F5] text-[#2A1D13] border border-[#E6D9C5] text-xs font-medium shadow-xs transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-[#8D672F]" />
            <span>Switch Account</span>
          </NextLink>
        </div>

        {/* Footer Note */}
        <div className="mt-6 pt-3.5 border-t border-[#E6D9C5]/60 text-[11px] text-[#786A5B]">
          Need access? Contact the administrator at <span className="text-[#2A1D13] font-medium">admin@sritayigrand.com</span>.
        </div>
      </div>
    </div>
  );
}
