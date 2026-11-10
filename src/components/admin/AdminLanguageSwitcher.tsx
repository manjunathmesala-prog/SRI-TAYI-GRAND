'use client';

import React from 'react';
import { useAdminLanguage } from '@/i18n/admin/AdminLanguageContext';
import { Globe } from 'lucide-react';

interface AdminLanguageSwitcherProps {
  className?: string;
  showIcon?: boolean;
}

export function AdminLanguageSwitcher({ className = '', showIcon = true }: AdminLanguageSwitcherProps) {
  const { locale, setLocale } = useAdminLanguage();

  return (
    <div
      role="group"
      aria-label="Language Selector"
      className={`inline-flex items-center gap-1 p-1 bg-[#F5EEDF] border border-[#E6D9C5] rounded-xl shadow-xs transition-all ${className}`}
    >
      {showIcon && (
        <span className="pl-1.5 pr-0.5 text-[#B18A4A]" aria-hidden="true">
          <Globe className="w-3.5 h-3.5" />
        </span>
      )}

      {/* English Option */}
      <button
        type="button"
        onClick={() => setLocale('en')}
        aria-pressed={locale === 'en'}
        title="Switch to English"
        className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
          locale === 'en'
            ? 'bg-[#43001F] text-white shadow-xs'
            : 'text-[#786A5B] hover:text-[#33271D] hover:bg-[#EAE0D0]'
        }`}
      >
        EN
      </button>

      <span className="text-[#D0C0AA] text-xs font-light select-none">|</span>

      {/* Telugu Option */}
      <button
        type="button"
        onClick={() => setLocale('te')}
        aria-pressed={locale === 'te'}
        title="తెలుగు భాషకు మారండి"
        className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
          locale === 'te'
            ? 'bg-[#43001F] text-white shadow-xs font-bold'
            : 'text-[#786A5B] hover:text-[#33271D] hover:bg-[#EAE0D0]'
        }`}
      >
        తెలుగు
      </button>
    </div>
  );
}
