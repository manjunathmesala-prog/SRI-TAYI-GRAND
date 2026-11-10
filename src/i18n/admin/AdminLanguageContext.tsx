'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { AdminLocale, DEFAULT_ADMIN_LOCALE, STORAGE_KEY_ADMIN_LANG } from './config';
import enTranslations from './locales/en.json';
import teTranslations from './locales/te.json';

type TranslationTree = { [key: string]: any };

const translations: Record<AdminLocale, TranslationTree> = {
  en: enTranslations,
  te: teTranslations,
};

// Dynamic status mappings for common database values
const STATUS_DICTIONARY: Record<AdminLocale, Record<string, string>> = {
  en: {
    // Room operational statuses
    available: 'Available',
    occupied: 'Occupied',
    reserved: 'Reserved',
    cleaning: 'Cleaning',
    maintenance: 'Maintenance',
    out_of_service: 'Out of Service',
    
    // Cleaning statuses
    clean: 'Clean',
    dirty: 'Needs Cleaning',
    in_progress: 'Cleaning in Progress',
    inspected: 'Inspected & Ready',
    
    // Booking statuses
    confirmed: 'Confirmed',
    pending: 'Pending',
    checked_in: 'Checked In',
    checked_out: 'Checked Out',
    cancelled: 'Cancelled',
    no_show: 'No Show',
    
    // Payment statuses & methods
    successful: 'Successful',
    failed: 'Failed',
    refunded: 'Refunded',
    partial: 'Partially Paid',
    cash: 'Cash',
    upi: 'UPI / QR',
    card: 'Card',
    online: 'Online',
    bank_transfer: 'Bank Transfer',
    
    // General statuses
    active: 'Active',
    inactive: 'Inactive',
    yes: 'Yes',
    no: 'No',
  },
  te: {
    // Room operational statuses
    available: 'అందుబాటులో ఉంది',
    occupied: 'బుక్ చేయబడింది',
    reserved: 'రిజర్వ్ చేయబడింది',
    cleaning: 'శుభ్రం చేస్తున్నారు',
    maintenance: 'మరమ్మతులో ఉంది',
    out_of_service: 'సేవలో లేదు',
    
    // Cleaning statuses
    clean: 'శుభ్రంగా ఉంది',
    dirty: 'శుభ్రం చేయాలి',
    in_progress: 'శుభ్రం చేస్తున్నారు',
    inspected: 'తనిఖీ చేయబడింది',
    
    // Booking statuses
    confirmed: 'నిర్ధారించబడింది',
    pending: 'పెండింగ్‌లో ఉంది',
    checked_in: 'చెక్-ఇన్ అయ్యారు',
    checked_out: 'చెక్-అవుట్ అయ్యారు',
    cancelled: 'రద్దు చేయబడింది',
    no_show: 'రాలేదు',
    
    // Payment statuses & methods
    successful: 'విజయవంతమైంది',
    failed: 'విఫలమైంది',
    refunded: 'వాపసు చేయబడింది',
    partial: 'పాక్షిక చెల్లింపు',
    cash: 'కౌంటర్ నగదు',
    upi: 'UPI / QR',
    card: 'కార్డ్',
    online: 'ఆన్‌లైన్',
    bank_transfer: 'బ్యాంక్ బదిలీ',
    
    // General statuses
    active: 'సక్రియం',
    inactive: 'నిష్క్రియం',
    yes: 'అవును',
    no: 'కాదు',
  },
};

interface AdminLanguageContextType {
  locale: AdminLocale;
  setLocale: (newLocale: AdminLocale) => Promise<void>;
  t: (key: string, fallback?: string, params?: Record<string, string | number>) => string;
  translateStatus: (status: string | undefined | null) => string;
  formatCurrency: (amount: number | string | undefined | null) => string;
  formatDate: (date: Date | string | number | undefined | null, options?: Intl.DateTimeFormatOptions) => string;
  formatTime: (date: Date | string | number | undefined | null) => string;
  isTelugu: boolean;
}

const AdminLanguageContext = createContext<AdminLanguageContextType | undefined>(undefined);

export function AdminLanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AdminLocale>(DEFAULT_ADMIN_LOCALE);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load saved preference on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ADMIN_LANG) as AdminLocale | null;
      if (saved === 'en' || saved === 'te') {
        setLocaleState(saved);
        applyDocumentLanguage(saved);
      }
    } catch {
      // Ignored
    }

    // Attempt to fetch preference from authenticated profile in Supabase
    const fetchRemotePreference = async () => {
      try {
        const res = await fetch('/api/admin/profile/language', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.preferred_language === 'en' || data.preferred_language === 'te') {
            setLocaleState(data.preferred_language);
            try {
              localStorage.setItem(STORAGE_KEY_ADMIN_LANG, data.preferred_language);
            } catch {}
            applyDocumentLanguage(data.preferred_language);
          }
        }
      } catch {
        // Fallback gracefully to local storage / default
      } finally {
        setIsHydrated(true);
      }
    };

    fetchRemotePreference();
  }, []);

  const applyDocumentLanguage = (loc: AdminLocale) => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = loc;
      if (loc === 'te') {
        document.body.classList.add('admin-telugu');
      } else {
        document.body.classList.remove('admin-telugu');
      }
    }
  };

  const setLocale = useCallback(async (newLocale: AdminLocale) => {
    setLocaleState(newLocale);
    applyDocumentLanguage(newLocale);

    try {
      localStorage.setItem(STORAGE_KEY_ADMIN_LANG, newLocale);
    } catch {}

    // Persist to user profile in Supabase asynchronously
    try {
      fetch('/api/admin/profile/language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferred_language: newLocale }),
      }).catch(() => {});
    } catch {}
  }, []);

  // Translation function with fallback
  const t = useCallback(
    (key: string, fallback?: string, params?: Record<string, string | number>): string => {
      const keys = key.split('.');
      
      // Try current locale
      let current: any = translations[locale];
      for (const k of keys) {
        if (current && typeof current === 'object' && k in current) {
          current = current[k];
        } else {
          current = undefined;
          break;
        }
      }

      // If missing in current locale, fallback to English
      if (current === undefined && locale !== 'en') {
        current = translations.en;
        for (const k of keys) {
          if (current && typeof current === 'object' && k in current) {
            current = current[k];
          } else {
            current = undefined;
            break;
          }
        }
      }

      let text = typeof current === 'string' ? current : fallback || key;

      // Token substitution: {param}
      if (params) {
        Object.entries(params).forEach(([paramKey, val]) => {
          text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
        });
      }

      return text;
    },
    [locale]
  );

  // Status translator
  const translateStatus = useCallback(
    (status: string | undefined | null): string => {
      if (!status) return '';
      const normalized = status.toLowerCase().trim().replace(/[\s-]+/g, '_');
      const dict = STATUS_DICTIONARY[locale];
      if (dict && dict[normalized]) {
        return dict[normalized];
      }
      // Fallback: capitalise words
      return status
        .split(/[_\s-]+/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    },
    [locale]
  );

  // Currency formatter
  const formatCurrency = useCallback((amount: number | string | undefined | null): string => {
    const num = Number(amount) || 0;
    return `₹${new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0,
    }).format(num)}`;
  }, []);

  // Date formatter
  const formatDate = useCallback(
    (date: Date | string | number | undefined | null, options?: Intl.DateTimeFormatOptions): string => {
      if (!date) return '—';
      const d = new Date(date);
      if (isNaN(d.getTime())) return '—';

      const localeTag = locale === 'te' ? 'te-IN' : 'en-IN';
      const defaultOptions: Intl.DateTimeFormatOptions = options || {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      };

      try {
        return new Intl.DateTimeFormat(localeTag, defaultOptions).format(d);
      } catch {
        return d.toLocaleDateString('en-IN');
      }
    },
    [locale]
  );

  // Time formatter
  const formatTime = useCallback(
    (date: Date | string | number | undefined | null): string => {
      if (!date) return '—';
      const d = new Date(date);
      if (isNaN(d.getTime())) return '—';

      const localeTag = locale === 'te' ? 'te-IN' : 'en-IN';
      try {
        return new Intl.DateTimeFormat(localeTag, {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }).format(d);
      } catch {
        return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      }
    },
    [locale]
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      translateStatus,
      formatCurrency,
      formatDate,
      formatTime,
      isTelugu: locale === 'te',
    }),
    [locale, setLocale, t, translateStatus, formatCurrency, formatDate, formatTime]
  );

  return <AdminLanguageContext.Provider value={value}>{children}</AdminLanguageContext.Provider>;
}

export function useAdminLanguage() {
  const context = useContext(AdminLanguageContext);
  if (!context) {
    throw new Error('useAdminLanguage must be used within an AdminLanguageProvider');
  }
  return context;
}
