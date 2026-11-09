'use client';

import { useState, useEffect } from 'react';
import {
  Sparkles,
  Printer,
  Download,
  ExternalLink,
  Wifi,
  QrCode,
  CheckCircle2,
  Copy,
  RefreshCw,
} from 'lucide-react';

interface ReceptionStandeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultToken?: string;
}

export function ReceptionStandeeModal({
  isOpen,
  onClose,
  defaultToken = 'STG_RECEPT_DESK_SEC_7749',
}: ReceptionStandeeModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const targetUrl = `https://sri-tayi-grand.vercel.app/walk-in?token=${encodeURIComponent(defaultToken)}`;

  // Fetch generated high-res QR code
  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;

    async function loadQR() {
      setIsGenerating(true);
      try {
        const res = await fetch(`/api/walk-in/standee-qr?targetUrl=${encodeURIComponent(targetUrl)}&format=json`);
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && data.dataUrl) {
            setQrDataUrl(data.dataUrl);
          }
        }
      } catch (err) {
        console.error('Failed to generate standee QR:', err);
      } finally {
        if (!isCancelled) setIsGenerating(false);
      }
    }

    loadQR();
    return () => {
      isCancelled = true;
    };
  }, [targetUrl, isOpen]);

  if (!isOpen) return null;

  const downloadPngUrl = `/api/walk-in/standee-qr?targetUrl=${encodeURIComponent(targetUrl)}&download=true`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#D8AD56]/40 p-5 sm:p-6 space-y-4 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#EFE3D6]">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#D8AD56]">
              FRONT DESK HARDWARE DEPLOYMENT
            </span>
            <h3 className="font-serif text-lg sm:text-xl font-bold text-[#241912] flex items-center gap-2">
              <QrCode className="w-5 h-5 text-[#D8AD56]" />
              <span>Reception Acrylic Standee & QR</span>
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-600 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Clean QR Destination Link */}
        <div className="space-y-1.5 text-xs bg-[#FAF7F2] p-3 rounded-xl border border-[#EFE3D6]">
          <label className="font-bold text-[#382216] block">QR Code Destination Link:</label>
          <div className="flex items-center justify-between text-[11px] bg-white p-2.5 rounded-lg border border-[#EFE3D6]">
            <span className="truncate font-mono text-[#241912] max-w-[340px]">{targetUrl}</span>
            <button
              type="button"
              onClick={handleCopyUrl}
              className="text-[#D8AD56] hover:text-[#b58e3e] font-bold flex items-center gap-1 shrink-0 ml-2 cursor-pointer transition-colors"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#D8AD56]" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Printable Acrylic Card Preview (A6 / 4x6" Luxury Styling) */}
        <div
          id="reception-standee-card"
          className="p-5 rounded-2xl bg-gradient-to-b from-[#241912] via-[#382216] to-[#1E110A] text-white text-center space-y-3 border-2 border-[#D8AD56]/60 shadow-xl relative overflow-hidden"
        >
          {/* Gold Crest Top */}
          <div className="flex items-center justify-center gap-1.5 text-[#D8AD56]">
            <Sparkles className="w-4 h-4 text-[#D8AD56]" />
            <span className="font-serif font-black text-sm tracking-widest uppercase">SRI TAYI GRAND</span>
            <Sparkles className="w-4 h-4 text-[#D8AD56]" />
          </div>
          <p className="text-[10px] text-[#EFE3D6]/80 font-medium">Main Road, Kadiri &bull; Luxury Stay & Suites</p>

          {/* QR Code Container */}
          <div className="p-3 bg-white rounded-2xl inline-block shadow-2xl my-1 border-2 border-[#D8AD56]/40">
            {isGenerating || !qrDataUrl ? (
              <div className="w-44 h-44 flex flex-col items-center justify-center text-gray-400 gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-[#D8AD56]" />
                <span className="text-[10px] text-[#241912]">Generating HD QR...</span>
              </div>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={qrDataUrl}
                alt="Reception Walk-In QR Code"
                className="w-44 h-44 mx-auto rounded-lg"
              />
            )}
          </div>

          {/* Bilingual Instructions */}
          <div className="space-y-1 text-xs">
            <p className="font-serif font-black text-sm text-[#D8AD56] tracking-wide">
              SCAN TO SELF CHECK-IN
            </p>
            <p className="text-[12px] font-semibold text-white/95">
              స్కాన్ చేయండి &bull; గది ఎంచుకోండి &bull; కీ తీసుకోండి
            </p>
            <p className="text-[10px] text-[#EFE3D6]/70">
              Scan QR &bull; Select Room on Phone &bull; Collect Keycard
            </p>
          </div>

          {/* Wi-Fi Credentials Footer */}
          <div className="pt-2.5 border-t border-white/10 text-[10px] text-[#D8AD56] flex items-center justify-center gap-4">
            <span className="flex items-center gap-1">
              <Wifi className="w-3 h-3" />
              <span>Wi-Fi: <b>SriTayiGrand_Guest</b></span>
            </span>
            <span>Pass: <b>TayiGrand@2026</b></span>
          </div>
        </div>

        {/* 3 Main Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs">
          {/* Direct PNG Download */}
          <a
            href={downloadPngUrl}
            download="sri_tayi_grand_reception_qr.png"
            className="py-3 px-3 rounded-xl bg-[#43001F] hover:bg-[#2E0015] text-white font-bold flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer text-center"
          >
            <Download className="w-4 h-4" />
            <span>Download QR (PNG)</span>
          </a>

          {/* Print Standee */}
          <button
            type="button"
            onClick={() => window.print()}
            className="py-3 px-3 rounded-xl bg-[#382216] hover:bg-[#25150F] text-[#D8AD56] font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#D8AD56]" />
            <span>Print Standee</span>
          </button>

          {/* Test Link */}
          <a
            href={targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="col-span-2 sm:col-span-1 py-3 px-3 rounded-xl border border-gray-300 hover:bg-gray-50 text-[#382216] font-bold flex items-center justify-center gap-1.5 transition-all text-center"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open Portal</span>
          </a>
        </div>
      </div>
    </div>
  );
}
