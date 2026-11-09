'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { WifiOff, Wifi, X, Download, Share2, PlusSquare } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function PwaProvider() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [showOnlineToast, setShowOnlineToast] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const isIOSRef = useRef(false);

  const handleInstallClick = useCallback(async () => {
    const prompt = deferredPromptRef.current;
    if (prompt) {
      await prompt.prompt();
      const choiceResult = await prompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setShowInstallBanner(false);
      }
      deferredPromptRef.current = null;
      setDeferredPrompt(null);
    } else if (isIOSRef.current) {
      setShowIOSModal(true);
    }
  }, []);

  const handleDismissBanner = useCallback(() => {
    setShowInstallBanner(false);
    // Dismiss for 7 days
    const nextAllowedTime = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem('sri_tayi_pwa_dismissed', nextAllowedTime.toString());
  }, []);

  useEffect(() => {
    // 1. Check if running in standalone mode (already installed)
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsStandalone(isStandaloneMode);
    };
    checkStandalone();

    // 2. Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            // Check for updates periodically
            registration.addEventListener('updatefound', () => {
              const installingWorker = registration.installing;
              if (installingWorker) {
                installingWorker.addEventListener('statechange', () => {
                  if (
                    installingWorker.state === 'installed' &&
                    navigator.serviceWorker.controller
                  ) {
                    console.log('[PWA] New content is available; please refresh.');
                  }
                });
              }
            });
          })
          .catch((err) => {
            console.warn('[PWA] Service Worker registration failed:', err);
          });
      });
    }

    // 3. Listen for BeforeInstallPromptEvent (Chrome/Edge/Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      deferredPromptRef.current = promptEvent;
      setDeferredPrompt(promptEvent);

      // Check if user previously dismissed banner
      const dismissedUntil = localStorage.getItem('sri_tayi_pwa_dismissed');
      if (!dismissedUntil || Date.now() > parseInt(dismissedUntil, 10)) {
        setTimeout(() => {
          setShowInstallBanner(true);
        }, 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 4. iOS Detection
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice =
      /iphone|ipad|ipod/.test(userAgent) &&
      !(window.navigator as unknown as { standalone?: boolean }).standalone;
    isIOSRef.current = isIOSDevice;
    setIsIOS(isIOSDevice);

    if (isIOSDevice) {
      const dismissedUntil = localStorage.getItem('sri_tayi_pwa_dismissed');
      if (!dismissedUntil || Date.now() > parseInt(dismissedUntil, 10)) {
        setTimeout(() => {
          setShowInstallBanner(true);
        }, 4000);
      }
    }

    // 5. Online / Offline network listeners
    const handleOnline = () => {
      setIsOffline(false);
      setShowOnlineToast(true);
      const timer = setTimeout(() => setShowOnlineToast(false), 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowOnlineToast(false);
    };

    setIsOffline(!navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 6. Custom Trigger from UI Buttons
    const handleCustomInstallTrigger = () => {
      if (deferredPromptRef.current) {
        handleInstallClick();
      } else if (isIOSRef.current) {
        setShowIOSModal(true);
      } else {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('open-pwa-install', handleCustomInstallTrigger);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('open-pwa-install', handleCustomInstallTrigger);
    };
  }, [handleInstallClick]);

  // If already installed and running standalone, do not show install banners
  if (isStandalone) {
    return (
      <>
        {isOffline && (
          <div className="fixed top-0 left-0 right-0 z-[100] bg-[#43001F] text-amber-100 text-xs sm:text-sm font-medium px-4 py-2 flex items-center justify-center gap-2 border-b border-amber-600/40 shadow-lg animate-in slide-in-from-top duration-300">
            <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Offline mode active. Cached hotel amenities and direct call links remain available.</span>
          </div>
        )}
        {showOnlineToast && (
          <div className="fixed top-0 left-0 right-0 z-[100] bg-emerald-800 text-emerald-100 text-xs sm:text-sm font-medium px-4 py-2 flex items-center justify-center gap-2 border-b border-emerald-600 shadow-lg animate-in slide-in-from-top duration-300">
            <Wifi className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>Connection restored. You are back online.</span>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {/* 1. Offline Notification Bar */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-[#43001F] text-amber-100 text-xs sm:text-sm font-medium px-4 py-2 flex items-center justify-center gap-2 border-b border-amber-600/40 shadow-lg animate-in slide-in-from-top duration-300">
          <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Offline mode active. Cached hotel amenities and direct call links remain available.</span>
        </div>
      )}

      {/* 2. Restored Connection Toast */}
      {showOnlineToast && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-emerald-800 text-emerald-100 text-xs sm:text-sm font-medium px-4 py-2 flex items-center justify-center gap-2 border-b border-emerald-600 shadow-lg animate-in slide-in-from-top duration-300">
          <Wifi className="w-4 h-4 text-emerald-300 shrink-0" />
          <span>Connection restored. You are back online.</span>
        </div>
      )}

      {/* 3. Luxury Floating PWA Install Banner */}
      {showInstallBanner && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 animate-in slide-in-from-bottom duration-500">
          <div className="bg-[#43001F] text-white p-4 rounded-2xl shadow-2xl border border-[#B18A4A]/40 flex flex-col gap-3 relative overflow-hidden backdrop-blur-md">
            {/* Gold Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#B18A4A] via-[#E2C785] to-[#B18A4A]" />

            <div className="flex items-start gap-3">
              <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-[#B18A4A]/50 bg-black/40">
                <Image
                  src="/icons/icon-192x192.png"
                  alt="Sri Tayi Grand"
                  fill
                  className="object-cover"
                />
              </div>

              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-semibold text-sm text-white tracking-wide truncate">
                    Sri Tayi Grand
                  </h4>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#B18A4A]/30 text-[#E2C785] border border-[#B18A4A]/40">
                    Official App
                  </span>
                </div>
                <p className="text-xs text-amber-100/80 mt-0.5 leading-snug line-clamp-2">
                  Fast room booking, wedding hall inquiries & offline concierge access.
                </p>
              </div>

              <button
                onClick={handleDismissBanner}
                className="absolute top-3 right-3 text-white/60 hover:text-white p-1 rounded-full transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleInstallClick}
                className="flex-1 bg-gradient-to-r from-[#B18A4A] to-[#C99D57] hover:from-[#C99D57] hover:to-[#B18A4A] text-[#22000F] font-semibold text-xs py-2.5 px-3 rounded-xl transition-all shadow flex items-center justify-center gap-1.5 active:scale-[0.98]"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install App</span>
              </button>
              <button
                onClick={handleDismissBanner}
                className="text-xs text-white/70 hover:text-white px-3 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 transition-colors"
              >
                Not Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. iOS Safari Add to Home Screen Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#43001F] text-white w-full max-w-sm rounded-3xl p-6 border border-[#B18A4A]/40 shadow-2xl relative">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 text-white/60 hover:text-white p-1.5 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-[#B18A4A]/50 bg-black/40">
                <Image
                  src="/icons/apple-touch-icon.png"
                  alt="Sri Tayi Grand"
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <h3 className="font-semibold text-base text-white">Install on iPhone / iPad</h3>
                <p className="text-xs text-amber-200/70">Add Sri Tayi Grand to Home Screen</p>
              </div>
            </div>

            <div className="space-y-3 my-4 text-xs text-white/90">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10">
                <div className="p-2 rounded-lg bg-[#B18A4A]/20 text-[#E2C785] shrink-0">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium text-white">Step 1: Tap Share</p>
                  <p className="text-white/70 mt-0.5">
                    Tap the <strong>Share</strong> button at the bottom navigation bar of Safari.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10">
                <div className="p-2 rounded-lg bg-[#B18A4A]/20 text-[#E2C785] shrink-0">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium text-white">Step 2: Add to Home Screen</p>
                  <p className="text-white/70 mt-0.5">
                    Scroll down and choose <strong>Add to Home Screen</strong>.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full bg-[#B18A4A] text-[#22000F] font-semibold text-xs py-2.5 rounded-xl hover:bg-[#C99D57] transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
