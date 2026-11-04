'use client';

import React, { useState, useEffect } from 'react';
import { readCard, issueKeycard, deactivateCard, checkBridgeHealth } from './rfidClient';

interface RfidManagerProps {
  activeStaffUser?: string;
  defaultRoom?: string;
}

export default function RfidManager({ activeStaffUser = 'Admin', defaultRoom = '' }: RfidManagerProps) {
  const [roomNumber, setRoomNumber] = useState(defaultRoom);
  const [loading, setLoading] = useState(false);
  const [bridgeOnline, setBridgeOnline] = useState<boolean | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  useEffect(() => {
    checkBridgeHealth().then(online => setBridgeOnline(online));
    const timer = setInterval(() => {
      checkBridgeHealth().then(online => setBridgeOnline(online));
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const handleScanCard = async () => {
    setLoading(true);
    setStatusMessage({ text: 'Reading card from encoder...', type: 'info' });

    const result = await readCard(activeStaffUser);
    setLoading(false);

    if (result.success) {
      setRoomNumber(result.roomNumber || '');
      setStatusMessage({
        text: `Tap Read Success: Room ${result.roomNumber} (Card #${result.cardNo}). Valid until: ${result.endTime}`,
        type: 'success'
      });
    } else {
      setStatusMessage({ text: result.error || 'Failed to read card.', type: 'error' });
    }
  };

  const handleIssueKey = async () => {
    if (!roomNumber.trim()) {
      alert('Please enter or select a room number.');
      return;
    }
    setLoading(true);
    setStatusMessage({ text: `Writing Room ${roomNumber} authorization to card...`, type: 'info' });

    const result = await issueKeycard({
      roomNumber: roomNumber.trim(),
      staffUsername: activeStaffUser
    });
    setLoading(false);

    if (result.success) {
      setStatusMessage({ text: `Card for Room ${roomNumber} successfully issued & activated!`, type: 'success' });
    } else {
      setStatusMessage({ text: result.error || 'Failed to activate keycard.', type: 'error' });
    }
  };

  const handleDeactivate = async () => {
    if (!roomNumber.trim()) {
      alert('Please enter the room number to deactivate.');
      return;
    }
    setLoading(true);
    setStatusMessage({ text: `Deactivating card for Room ${roomNumber}...`, type: 'info' });

    const result = await deactivateCard(roomNumber.trim(), activeStaffUser);
    setLoading(false);

    if (result.success) {
      setStatusMessage({ text: `Card for Room ${roomNumber} deactivated and cleared.`, type: 'success' });
    } else {
      setStatusMessage({ text: result.error || 'Failed to deactivate card.', type: 'error' });
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg p-6 max-w-xl">
      <div className="flex items-center justify-between border-b pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center font-bold text-lg">
            💳
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">RFID Keycard Station</h2>
            <p className="text-xs text-gray-500">Sri Anantha Hotel Front Desk</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${bridgeOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
            {bridgeOnline === null ? 'Checking...' : bridgeOnline ? 'Encoder Online' : 'Encoder Offline'}
          </span>
        </div>
      </div>

      <div className="mb-4 text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 p-2 rounded">
        Active Staff: <strong className="text-gray-800 dark:text-gray-200">{activeStaffUser}</strong> (Every tap is audited and logged)
      </div>

      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
          Room Number
        </label>
        <input
          type="text"
          value={roomNumber}
          onChange={(e) => setRoomNumber(e.target.value)}
          placeholder="e.g. 101, 205, 302"
          className="w-full px-4 py-2 text-lg font-mono border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
        />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <button
          onClick={handleScanCard}
          disabled={loading || !bridgeOnline}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 px-3 rounded-lg text-sm transition-all shadow"
        >
          🔍 Read Tap
        </button>

        <button
          onClick={handleIssueKey}
          disabled={loading || !bridgeOnline}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium py-2.5 px-3 rounded-lg text-sm transition-all shadow"
        >
          🔑 Issue Key
        </button>

        <button
          onClick={handleDeactivate}
          disabled={loading || !bridgeOnline}
          className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-medium py-2.5 px-3 rounded-lg text-sm transition-all shadow"
        >
          🚫 Check-Out
        </button>
      </div>

      {statusMessage && (
        <div
          className={`p-3 rounded-lg text-sm font-medium transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border border-rose-200'
              : 'bg-blue-50 text-blue-800 border border-blue-200'
          }`}
        >
          {statusMessage.text}
        </div>
      )}
    </div>
  );
}
