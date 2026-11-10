/**
 * ==============================================================================
 * SRI TAYI GRAND — ADMIN BILINGUAL CONFIGURATION (ENGLISH + TELUGU)
 * Centralized i18n configuration for the Hotel Management Administration Console.
 * ==============================================================================
 */

export type AdminLocale = 'en' | 'te';

export const DEFAULT_ADMIN_LOCALE: AdminLocale = 'en';

export const SUPPORTED_LOCALES: { code: AdminLocale; label: string; nativeName: string }[] = [
  { code: 'en', label: 'English', nativeName: 'EN' },
  { code: 'te', label: 'Telugu', nativeName: 'తెలుగు' },
];

export const STORAGE_KEY_ADMIN_LANG = 'stg_admin_preferred_language';
