'use client';

import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { subscribeToSyncStatus, processSyncQueue } from '@/lib/sync/offline-sync';

export function OfflineSyncBadge() {
  const [syncState, setSyncState] = useState<{
    isOnline: boolean;
    isProcessing: boolean;
    pendingCount: number;
  }>({
    isOnline: true,
    isProcessing: false,
    pendingCount: 0,
  });

  useEffect(() => {
    const unsubscribe = subscribeToSyncStatus((state) => {
      setSyncState(state);
    });
    return () => unsubscribe();
  }, []);

  const handleManualSync = async () => {
    if (syncState.isOnline && !syncState.isProcessing) {
      await processSyncQueue();
    }
  };

  if (syncState.isOnline && syncState.pendingCount === 0 && !syncState.isProcessing) {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 rounded-full"
        title="Connected to Supabase PostgreSQL cloud database"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <Wifi className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Online</span>
      </div>
    );
  }

  if (syncState.isProcessing) {
    return (
      <button
        onClick={handleManualSync}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-blue-400 bg-blue-950/40 border border-blue-800/40 rounded-full animate-pulse cursor-pointer"
        title="Syncing pending changes with PostgreSQL..."
      >
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        <span>Syncing ({syncState.pendingCount})</span>
      </button>
    );
  }

  if (!syncState.isOnline) {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-400 bg-amber-950/40 border border-amber-800/40 rounded-full"
        title="Working offline. Mutations are safely stored in IndexedDB and will synchronize upon reconnection."
      >
        <WifiOff className="w-3.5 h-3.5" />
        <span>Offline ({syncState.pendingCount} queued)</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleManualSync}
      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-300 bg-amber-950/60 border border-amber-700/60 rounded-full hover:bg-amber-900/60 transition cursor-pointer"
      title="Click to manually retry pending sync queue"
    >
      <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
      <span>{syncState.pendingCount} Pending</span>
    </button>
  );
}
