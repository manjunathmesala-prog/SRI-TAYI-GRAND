'use client';

import { useState, useEffect, useCallback } from 'react';
import { OtaChannel, ChannelSyncLog } from '@/types';
import { useRealtimeSync } from '@/lib/realtime-client';
import { LuxurySelect } from '@/components/ui/LuxurySelect';
import {
  Globe,
  RefreshCw,
  Sliders,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Zap,
  ArrowRightLeft,
  Check,
  Building,
  TrendingUp,
  SlidersHorizontal,
  Layers,
  Sparkles,
} from 'lucide-react';

interface CategoryRate {
  id: string;
  name: string;
  base_price_per_night: number;
  extra_person_tariff_rupees: number;
  max_occupancy: number;
}

export default function AdminChannelsPage() {
  const [channels, setChannels] = useState<OtaChannel[]>([]);
  const [syncLogs, setSyncLogs] = useState<ChannelSyncLog[]>([]);
  const [categories, setCategories] = useState<CategoryRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingChannelId, setSyncingChannelId] = useState<string | null>(null);
  const [syncAllLoading, setSyncAllLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Webhook Simulator State
  const [simChannelId, setSimChannelId] = useState('makemytrip');
  const [simGuestName, setSimGuestName] = useState('R. Varun Teja');
  const [simGuestPhone] = useState('9849182345');
  const [simGuestEmail, setSimGuestEmail] = useState('varun.teja@gmail.com');
  const [simCategoryId, setSimCategoryId] = useState('cat-double-03');
  const [simCheckIn, setSimCheckIn] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [simCheckOut, setSimCheckOut] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [simAdults, setSimAdults] = useState(2);
  const [simChildren, setSimChildren] = useState(0);
  const [simSubmitting, setSimSubmitting] = useState(false);
  const [simResult, setSimResult] = useState<{ success: boolean; message: string } | null>(null);

  // Filter logs
  const [selectedChannelFilter, setSelectedChannelFilter] = useState('all');

  // Real-Time Synchronizer Hook
  const { isConnected } = useRealtimeSync({
    onEvent: (event) => {
      if (
        event.eventType === 'channel_synced' ||
        event.eventType === 'channel_updated' ||
        event.eventType === 'booking_created'
      ) {
        fetchChannelsData(false);
      }
    },
  });

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const fetchChannelsData = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await fetch('/api/admin/channels', {
        headers: { 'x-staff-role': 'Super Admin' },
      });
      const data = await res.json();
      if (data.success) {
        setChannels(data.channels || []);
        setSyncLogs(data.syncLogs || []);
        setCategories(data.categories || []);
      }
    } catch {
      // Handle network errors gracefully
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChannelsData(true);
  }, [fetchChannelsData]);

  // Sync a single channel
  const handleSyncChannel = async (channelId: string) => {
    setSyncingChannelId(channelId);
    try {
      const res = await fetch('/api/admin/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-role': 'Super Admin',
        },
        body: JSON.stringify({
          action: 'sync_channel',
          channelId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || `Channel ${channelId} synced successfully.`);
        fetchChannelsData(false);
      } else {
        showNotification(`Error: ${data.error || 'Failed to sync channel'}`);
      }
    } catch (err: any) {
      showNotification(`Sync Error: ${err.message}`);
    } finally {
      setSyncingChannelId(null);
    }
  };

  // Sync all channels
  const handleSyncAll = async () => {
    setSyncAllLoading(true);
    try {
      const res = await fetch('/api/admin/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-role': 'Super Admin',
        },
        body: JSON.stringify({
          action: 'sync_all',
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(data.message || 'All channels synced successfully.');
        fetchChannelsData(false);
      }
    } catch (err: any) {
      showNotification(`Sync All Error: ${err.message}`);
    } finally {
      setSyncAllLoading(false);
    }
  };

  // Toggle channel connection
  const handleToggleConnection = async (channel: OtaChannel) => {
    const updatedStatus = !channel.isConnected;
    try {
      const res = await fetch('/api/admin/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-role': 'Super Admin',
        },
        body: JSON.stringify({
          action: 'update_channel',
          channelId: channel.id,
          updates: {
            isConnected: updatedStatus,
            syncStatus: updatedStatus ? 'synced' : 'idle',
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(
          `${channel.name} 2-Way Sync ${updatedStatus ? 'Activated' : 'Paused'}.`
        );
        fetchChannelsData(false);
      }
    } catch (err: any) {
      showNotification(`Update error: ${err.message}`);
    }
  };

  // Update channel rate multiplier
  const handleUpdateMultiplier = async (channelId: string, multiplier: number) => {
    try {
      const res = await fetch('/api/admin/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-role': 'Super Admin',
        },
        body: JSON.stringify({
          action: 'update_channel',
          channelId,
          updates: {
            rateMultiplier: multiplier,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchChannelsData(false);
      }
    } catch (err: any) {
      showNotification(`Rate update error: ${err.message}`);
    }
  };

  // Submit simulated webhook
  const handleSimulateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimSubmitting(true);
    setSimResult(null);

    try {
      const res = await fetch('/api/admin/channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-staff-role': 'Super Admin',
        },
        body: JSON.stringify({
          action: 'simulate_ota_booking',
          channelId: simChannelId,
          guest_name: simGuestName,
          guest_phone: simGuestPhone,
          guest_email: simGuestEmail,
          category_id: simCategoryId,
          check_in_date: simCheckIn,
          check_out_date: simCheckOut,
          adults_count: simAdults,
          children_count: simChildren,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSimResult({
          success: true,
          message: data.message || 'OTA Booking simulated and pushed successfully.',
        });
        showNotification(`OTA Booking created! Ref: ${data.booking?.booking_reference}`);
        fetchChannelsData(false);
      } else {
        setSimResult({
          success: false,
          message: data.error || 'Failed to simulate webhook.',
        });
      }
    } catch (err: any) {
      setSimResult({
        success: false,
        message: err.message || 'Webhook invocation error.',
      });
    } finally {
      setSimSubmitting(false);
    }
  };

  // Preset loader for webhook simulator
  const loadSimulatorPreset = (preset: 'mmt' | 'booking' | 'agoda') => {
    if (preset === 'mmt') {
      setSimChannelId('makemytrip');
      setSimGuestName('Anand K. Deshmukh');
      setSimGuestEmail('anand.deshmukh@gmail.com');
      setSimCategoryId('cat-suite-01');
      setSimAdults(2);
      setSimChildren(1);
    } else if (preset === 'booking') {
      setSimChannelId('booking_com');
      setSimGuestName('Dr. Sneha Pillai');
      setSimGuestEmail('sneha.pillai@healthcorp.org');
      setSimCategoryId('cat-four-bed-02');
      setSimAdults(4);
      setSimChildren(0);
    } else if (preset === 'agoda') {
      setSimChannelId('agoda');
      setSimGuestName('V. Suresh Reddy');
      setSimGuestEmail('suresh.reddy@techsol.in');
      setSimCategoryId('cat-double-03');
      setSimAdults(2);
      setSimChildren(0);
    }
  };

  const connectedChannelsCount = channels.filter((c) => c.isConnected).length;
  const filteredLogs =
    selectedChannelFilter === 'all'
      ? syncLogs
      : syncLogs.filter((l) => l.channelId === selectedChannelFilter);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#241912] text-[#D8AD56] border border-[#D8AD56]/40 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-up">
          <Sparkles className="w-5 h-5 text-[#D8AD56] shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-[#241912] text-[#FAF7F2] rounded-2xl p-6 md:p-8 border border-[#D8AD56]/30 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-gradient-to-bl from-[#D8AD56]/15 via-[#382216]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-[#D8AD56]/20 text-[#D8AD56] border border-[#D8AD56]/40">
                Tier-2 Distribution
              </span>
              <div
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                  isConnected
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600/40'
                    : 'bg-amber-950/60 text-amber-300 border-amber-600/40'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                {isConnected ? '2-Way Live WebSocket Active' : 'Connecting Stream...'}
              </div>
            </div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-white tracking-wide">
              OTA Channel Manager & Inventory Distribution
            </h1>
            <p className="text-[#FAF7F2]/70 text-sm mt-1 max-w-2xl leading-relaxed">
              Bi-directional ARI (Availability, Rates & Inventory) synchronization across global Online
              Travel Agencies with automated rate parity protection.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => fetchChannelsData(true)}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-[#D8AD56]/30 bg-[#382216]/70 hover:bg-[#382216] text-[#D8AD56] font-medium text-xs flex items-center gap-2 transition-all shadow-sm"
              title="Refresh Channels Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleSyncAll}
              disabled={syncAllLoading}
              className="px-5 py-2.5 rounded-xl bg-[#43001F] hover:bg-[#2E0015] text-white font-semibold text-xs flex items-center gap-2 shadow-lg transition-all border border-[#D8AD56]/40"
            >
              <ArrowRightLeft className={`w-3.5 h-3.5 ${syncAllLoading ? 'animate-spin' : ''}`} />
              <span>{syncAllLoading ? 'Synchronizing All...' : 'Sync All Channels Now'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-[#D8AD56]/20 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-[#8A5A2B]">
              Active Channels
            </p>
            <p className="text-2xl font-serif font-bold text-[#241912] mt-1">
              {connectedChannelsCount} / {channels.length}
            </p>
            <p className="text-[11px] text-emerald-700 font-medium mt-1">
              {Math.round((connectedChannelsCount / (channels.length || 1)) * 100)}% Global Coverage
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#FAF7F2] border border-[#D8AD56]/30 flex items-center justify-center text-[#D8AD56]">
            <Globe className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-[#D8AD56]/20 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-[#8A5A2B]">
              Parity Protection
            </p>
            <p className="text-2xl font-serif font-bold text-[#241912] mt-1">+15% Markup</p>
            <p className="text-[11px] text-stone-500 mt-1">Covers 15-18% OTA Commission</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#FAF7F2] border border-[#D8AD56]/30 flex items-center justify-center text-[#D8AD56]">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-[#D8AD56]/20 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-[#8A5A2B]">
              Sync Frequency
            </p>
            <p className="text-2xl font-serif font-bold text-[#241912] mt-1">Instant ARI</p>
            <p className="text-[11px] text-emerald-700 font-medium mt-1">Push on reservation change</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#FAF7F2] border border-[#D8AD56]/30 flex items-center justify-center text-[#D8AD56]">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-[#D8AD56]/20 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider font-semibold text-[#8A5A2B]">
              Sync Activity Logs
            </p>
            <p className="text-2xl font-serif font-bold text-[#241912] mt-1">{syncLogs.length}</p>
            <p className="text-[11px] text-stone-500 mt-1">Live audit trail tracked</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#FAF7F2] border border-[#D8AD56]/30 flex items-center justify-center text-[#D8AD56]">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 5 OTA Channel Status Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-serif font-bold text-[#241912]">
              Connected OTA Channels & Distribution Endpoints
            </h2>
            <p className="text-xs text-stone-500">
              Configure 2-way live sync and customize commission markup buffers per portal.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {channels.map((ch) => {
            const isCurrentlySyncing = syncingChannelId === ch.id;
            const markupPercent = Math.round((ch.rateMultiplier - 1) * 100);

            return (
              <div
                key={ch.id}
                className={`bg-white rounded-xl border p-4 shadow-sm flex flex-col justify-between transition-all ${
                  ch.isConnected
                    ? 'border-[#D8AD56]/40 hover:border-[#D8AD56] hover:shadow-md'
                    : 'border-stone-200 opacity-75'
                }`}
              >
                <div>
                  {/* Card Top: Logo & Toggle */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs tracking-wider border ${
                          ch.id === 'makemytrip'
                            ? 'bg-rose-50 border-rose-200 text-rose-700'
                            : ch.id === 'goibibo'
                            ? 'bg-orange-50 border-orange-200 text-orange-700'
                            : ch.id === 'booking_com'
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : ch.id === 'agoda'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-amber-50 border-amber-200 text-amber-700'
                        }`}
                      >
                        {ch.logoText}
                      </div>
                      <div>
                        <h3 className="font-semibold text-xs text-[#241912] leading-tight line-clamp-1">
                          {ch.name}
                        </h3>
                        <span className="text-[10px] text-stone-500 uppercase font-mono">
                          {ch.category}
                        </span>
                      </div>
                    </div>

                    {/* Active/Paused Switch */}
                    <button
                      onClick={() => handleToggleConnection(ch)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        ch.isConnected ? 'bg-emerald-600' : 'bg-stone-300'
                      }`}
                      title={ch.isConnected ? 'Click to Pause Sync' : 'Click to Activate Sync'}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          ch.isConnected ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center justify-between text-[11px] mb-3">
                    <span className="text-stone-500 font-medium">Status:</span>
                    <span
                      className={`px-2 py-0.5 rounded font-semibold text-[10px] flex items-center gap-1 ${
                        ch.isConnected
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-stone-100 text-stone-600 border border-stone-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          ch.isConnected ? 'bg-emerald-500' : 'bg-stone-400'
                        }`}
                      />
                      {ch.isConnected ? '2-Way Synced' : 'Sync Paused'}
                    </span>
                  </div>

                  {/* Markup Slider */}
                  <div className="bg-[#FAF7F2] p-2.5 rounded-lg border border-[#D8AD56]/20 mb-3 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#8A5A2B] font-semibold flex items-center gap-1">
                        <Sliders className="w-3 h-3" />
                        Commission Buffer
                      </span>
                      <span className="font-mono font-bold text-[#241912]">+{markupPercent}%</span>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max="40"
                      step="1"
                      disabled={!ch.isConnected}
                      value={markupPercent}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        const multiplier = 1 + val / 100;
                        handleUpdateMultiplier(ch.id, multiplier);
                      }}
                      className="w-full accent-[#D8AD56] h-1.5 bg-stone-200 rounded-lg cursor-pointer"
                    />

                    <p className="text-[10px] text-stone-500 text-right font-mono">
                      Multiplier: {ch.rateMultiplier.toFixed(2)}x
                    </p>
                  </div>

                  {/* Last Sync Info */}
                  <div className="text-[10px] text-stone-500 mb-3 flex items-center justify-between">
                    <span>Last ARI Sync:</span>
                    <span className="font-mono text-stone-700">
                      {ch.lastSyncAt ? new Date(ch.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                    </span>
                  </div>
                </div>

                {/* Instant Sync Action */}
                <button
                  onClick={() => handleSyncChannel(ch.id)}
                  disabled={!ch.isConnected || isCurrentlySyncing}
                  className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    ch.isConnected
                      ? 'bg-[#382216] text-[#D8AD56] hover:bg-[#241912] border border-[#D8AD56]/30'
                      : 'bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200'
                  }`}
                >
                  <RefreshCw className={`w-3 h-3 ${isCurrentlySyncing ? 'animate-spin' : ''}`} />
                  <span>{isCurrentlySyncing ? 'Pushing ARI...' : 'Sync Channel Now'}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Rate Comparison Table */}
      <div className="bg-white rounded-2xl border border-[#D8AD56]/20 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[#D8AD56]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF7F2]/60">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#8A5A2B]" />
              <h2 className="text-base font-serif font-bold text-[#241912]">
                Live Rate Parity & Multi-Channel Comparison
              </h2>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Direct Hotel Website Tariff vs OTA Distribution Rates with dynamic markup buffer applied.
            </p>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 self-start sm:self-auto">
            100% Rate Parity Maintained
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F2] text-[#8A5A2B] uppercase tracking-wider font-semibold border-b border-[#D8AD56]/20">
              <tr>
                <th className="py-3 px-4">Room Category</th>
                <th className="py-3 px-4">Direct Website (Base)</th>
                {channels.map((ch) => (
                  <th key={ch.id} className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <span>{ch.name}</span>
                      <span className="text-[10px] text-stone-400 font-mono font-normal">
                        (+{Math.round((ch.rateMultiplier - 1) * 100)}%)
                      </span>
                    </div>
                  </th>
                ))}
                <th className="py-3 px-4 text-right">Commission Saved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-mono">
              {categories.map((cat) => {
                const base = cat.base_price_per_night;

                return (
                  <tr key={cat.id} className="hover:bg-[#FAF7F2]/40 transition-colors">
                    <td className="py-3.5 px-4 font-sans font-medium text-[#241912]">
                      <div className="flex items-center gap-2">
                        <Building className="w-3.5 h-3.5 text-[#8A5A2B]" />
                        <span>{cat.name}</span>
                      </div>
                      <span className="text-[10px] text-stone-500 font-mono">
                        Max {cat.max_occupancy} Guests
                      </span>
                    </td>

                    {/* Direct Rate */}
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-[#241912] bg-[#FAF7F2] px-2 py-1 rounded border border-[#D8AD56]/30">
                        ₹{base.toLocaleString('en-IN')}
                      </span>
                      <span className="block text-[10px] text-emerald-700 font-sans mt-0.5">
                        Best Available Rate
                      </span>
                    </td>

                    {/* OTA Rates with Multiplier */}
                    {channels.map((ch) => {
                      const otaRate = Math.round(base * ch.rateMultiplier);
                      const isConnected = ch.isConnected;

                      return (
                        <td key={ch.id} className="py-3.5 px-4">
                          {isConnected ? (
                            <div>
                              <span className="font-semibold text-stone-800">
                                ₹{otaRate.toLocaleString('en-IN')}
                              </span>
                              <span className="block text-[10px] text-stone-400 font-sans">
                                +₹{(otaRate - base).toLocaleString('en-IN')}
                              </span>
                            </div>
                          ) : (
                            <span className="text-stone-400 italic font-sans text-[11px]">
                              Sync Paused
                            </span>
                          )}
                        </td>
                      );
                    })}

                    {/* Commission Saved */}
                    <td className="py-3.5 px-4 text-right font-sans">
                      <span className="inline-flex items-center gap-1 text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <Check className="w-3 h-3" />
                        ₹{Math.round(base * 0.15).toLocaleString('en-IN')} / night
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid: Webhook Simulator & Sync Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Incoming OTA Reservation Webhook Simulator */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-[#D8AD56]/20 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#D8AD56]/20 mb-4">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#D8AD56]" />
                <h3 className="font-serif font-bold text-base text-[#241912]">
                  Incoming OTA Webhook Simulator
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-stone-100 text-stone-600 border border-stone-200">
                POST /api/admin/channels
              </span>
            </div>

            <p className="text-xs text-stone-500 mb-4">
              Test real-time inbound booking webhooks from OTA distribution engines to verify automatic
              inventory deductions and room lock.
            </p>

            {/* Quick Test Presets */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[11px] text-stone-500 font-medium">Quick Presets:</span>
              <button
                type="button"
                onClick={() => loadSimulatorPreset('mmt')}
                className="px-2.5 py-1 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
              >
                MMT Suite
              </button>
              <button
                type="button"
                onClick={() => loadSimulatorPreset('booking')}
                className="px-2.5 py-1 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                Booking.com 4-Bed
              </button>
              <button
                type="button"
                onClick={() => loadSimulatorPreset('agoda')}
                className="px-2.5 py-1 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
              >
                Agoda Double
              </button>
            </div>

            <form onSubmit={handleSimulateWebhook} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-600 font-medium mb-1">Originating Channel</label>
                <LuxurySelect
                  size="md"
                  variant="admin"
                  value={simChannelId}
                  onChange={(val) => setSimChannelId(String(val))}
                  options={channels.map((ch) => ({
                    value: ch.id,
                    label: `${ch.name} (${ch.logoText})`,
                  }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 font-medium mb-1">Guest Full Name</label>
                  <input
                    type="text"
                    required
                    value={simGuestName}
                    onChange={(e) => setSimGuestName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:border-[#D8AD56]"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 font-medium mb-1">Guest Phone</label>
                  <input
                    type="tel"
                    required
                    value={simGuestPhone}
                    onChange={(e) => setSimGuestName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:border-[#D8AD56]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 font-medium mb-1">Guest Email</label>
                  <input
                    type="email"
                    value={simGuestEmail}
                    onChange={(e) => setSimGuestEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:border-[#D8AD56]"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 font-medium mb-1">Room Category</label>
                  <LuxurySelect
                    size="md"
                    variant="admin"
                    value={simCategoryId}
                    onChange={(val) => setSimCategoryId(String(val))}
                    options={categories.map((cat) => ({
                      value: cat.id,
                      label: `${cat.name} (₹${cat.base_price_per_night})`,
                    }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 font-medium mb-1">Check-in Date</label>
                  <input
                    type="date"
                    required
                    value={simCheckIn}
                    onChange={(e) => setSimCheckIn(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:border-[#D8AD56]"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 font-medium mb-1">Check-out Date</label>
                  <input
                    type="date"
                    required
                    value={simCheckOut}
                    onChange={(e) => setSimCheckOut(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:border-[#D8AD56]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-600 font-medium mb-1">Adults Count</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={simAdults}
                    onChange={(e) => setSimAdults(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:border-[#D8AD56]"
                  />
                </div>
                <div>
                  <label className="block text-stone-600 font-medium mb-1">Children Count</label>
                  <input
                    type="number"
                    min="0"
                    max="4"
                    value={simChildren}
                    onChange={(e) => setSimChildren(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:border-[#D8AD56]"
                  />
                </div>
              </div>

              {simResult && (
                <div
                  className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                    simResult.success
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  {simResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  )}
                  <span>{simResult.message}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={simSubmitting}
                className="w-full mt-2 py-2.5 px-4 rounded-xl bg-[#241912] hover:bg-[#382216] text-[#D8AD56] font-semibold text-xs flex items-center justify-center gap-2 border border-[#D8AD56]/30 shadow-md transition-all"
              >
                <Send className={`w-3.5 h-3.5 ${simSubmitting ? 'animate-spin' : ''}`} />
                <span>
                  {simSubmitting ? 'Processing OTA Payload...' : 'Simulate & Fire OTA Webhook'}
                </span>
              </button>
            </form>
          </div>
        </div>

        {/* Real-time Sync Logs Table */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#D8AD56]/20 shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#D8AD56]/20 mb-4 gap-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#8A5A2B]" />
                <h3 className="font-serif font-bold text-base text-[#241912]">
                  Real-Time Channel ARI & Sync Audit Trail
                </h3>
              </div>

              {/* Channel Filter */}
              <div className="min-w-[160px]">
                <LuxurySelect
                  size="sm"
                  variant="admin"
                  value={selectedChannelFilter}
                  onChange={(val) => setSelectedChannelFilter(String(val))}
                  options={[
                    { value: 'all', label: `All Channels (${syncLogs.length})` },
                    ...channels.map((c) => ({ value: c.id, label: c.name })),
                  ]}
                />
              </div>
            </div>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-12 text-stone-400 text-xs">
                  No synchronization logs recorded yet.
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl border border-stone-100 bg-[#FAF7F2]/50 hover:bg-[#FAF7F2] transition-colors flex flex-col gap-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#241912]">{log.channelName}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                            log.syncType === 'reservation_push'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : log.syncType === 'full_inventory'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {log.syncType.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>

                      <span className="text-[10px] text-stone-400 font-mono">
                        {new Date(log.timestamp).toLocaleString([], {
                          month: 'short',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>

                    <p className="text-stone-600 text-[11px] leading-relaxed">{log.message}</p>

                    <div className="flex items-center justify-between text-[10px] text-stone-500 pt-1 border-t border-stone-100 font-mono">
                      <span>
                        Rooms: <strong className="text-stone-700">{log.roomsUpdatedCount}</strong> | Rates: <strong className="text-stone-700">{log.ratesUpdatedCount}</strong>
                      </span>
                      <span
                        className={`font-semibold ${
                          log.status === 'success'
                            ? 'text-emerald-700'
                            : log.status === 'warning'
                            ? 'text-amber-700'
                            : 'text-rose-700'
                        }`}
                      >
                        ✓ {log.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
