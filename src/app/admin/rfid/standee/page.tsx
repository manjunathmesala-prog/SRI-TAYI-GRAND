'use client';

import { useState, useEffect } from 'react';
import NextLink from 'next/link';
import {
  Sparkles,
  Printer,
  Download,
  ExternalLink,
  Wifi,
  QrCode,
  CheckCircle2,
  Copy,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';

export default function StandeeAdminPage() {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const defaultToken = 'STG_RECEPT_DESK_SEC_7749';
  const [targetUrl, setTargetUrl] = useState(
    `https://sritayigrand.com/walk-in?token=${encodeURIComponent(defaultToken)}`
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setTargetUrl(`${window.location.origin}/walk-in?token=${encodeURIComponent(defaultToken)}`);
    }
  }, [defaultToken]);

  useEffect(() => {
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
  }, [targetUrl]);

  const downloadPngUrl = `/api/walk-in/standee-qr?targetUrl=${encodeURIComponent(targetUrl)}&download=true`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#2A1D13] p-4 sm:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Top Navigation */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E6D9C5]">
          <NextLink
            href="/admin/rfid"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#786A5B] hover:text-[#2A1D13] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Keycards</span>
          </NextLink>

          <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
            QR Engine Ready
          </span>
        </div>

        {/* Header Title */}
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#2A1D13] tracking-tight">
            Reception Standee
          </h1>
          <p className="text-xs text-[#786A5B] mt-0.5">
            Front desk QR standee for guest self check-in
          </p>
        </div>

        {/* Destination Host Display */}
        <div className="p-4 rounded-2xl bg-white border border-[#E6D9C5]/80 shadow-[0_4px_20px_rgba(33,24,15,0.03)] space-y-2">
          <label className="text-xs font-medium text-[#2A1D13] block">Destination Link:</label>
          <div className="flex items-center justify-between text-xs bg-[#FAF8F5] px-3.5 py-2 rounded-xl border border-[#E6D9C5]">
            <span className="font-mono text-xs text-[#2A1D13] truncate max-w-md">{targetUrl}</span>
            <button
              type="button"
              onClick={handleCopyUrl}
              className="text-[#8D672F] hover:text-[#2A1D13] font-medium text-xs flex items-center gap-1 shrink-0 ml-3 cursor-pointer transition-colors"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#8D672F]" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* The Luxury Standee Card Preview (A6 / 4x6" Luxury Styling) */}
        <div
          id="print-standee"
          className="p-8 rounded-3xl bg-gradient-to-b from-[#241912] via-[#382216] to-[#1E110A] text-white text-center space-y-4 border-2 border-[#D8AD56] shadow-2xl relative overflow-hidden max-w-md mx-auto"
        >
          {/* Gold Crest Top */}
          <div className="flex items-center justify-center gap-2 text-[#D8AD56]">
            <Sparkles className="w-5 h-5 text-[#D8AD56]" />
            <span className="font-serif font-black text-base tracking-widest uppercase">SRI TAYI GRAND</span>
            <Sparkles className="w-5 h-5 text-[#D8AD56]" />
          </div>
          <p className="text-[11px] text-[#EFE3D6]/80 font-medium">Main Road, Kadiri &bull; Luxury Stay & Suites</p>

          {/* QR Code Container */}
          <div className="p-4 bg-white rounded-3xl inline-block shadow-2xl my-2 border-2 border-[#D8AD56]/40">
            {isGenerating || !qrDataUrl ? (
              <div className="w-52 h-52 flex flex-col items-center justify-center text-gray-400 gap-2">
                <RefreshCw className="w-8 h-8 animate-spin text-[#D8AD56]" />
                <span className="text-xs text-[#241912] font-semibold">Generating HD QR...</span>
              </div>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={qrDataUrl}
                alt="Reception Walk-In QR Code"
                className="w-52 h-52 mx-auto rounded-xl"
              />
            )}
          </div>

          {/* Bilingual Instructions */}
          <div className="space-y-1.5 text-xs">
            <p className="font-serif font-black text-base text-[#D8AD56] tracking-wide">
              SCAN TO SELF CHECK-IN
            </p>
            <p className="text-sm font-bold text-white/95">
              స్కాన్ చేయండి &bull; గది ఎంచుకోండి &bull; కీ తీసుకోండి
            </p>
            <p className="text-[11px] text-[#EFE3D6]/70">
              Scan QR &bull; Select Room on Phone &bull; Collect Keycard at Counter
            </p>
          </div>

          {/* Wi-Fi Credentials Footer */}
          <div className="pt-3 border-t border-white/10 text-xs text-[#D8AD56] flex items-center justify-center gap-4">
            <span className="flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5" />
              <span>Wi-Fi: <b>SriTayiGrand_Guest</b></span>
            </span>
            <span>Pass: <b>TayiGrand@2026</b></span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 max-w-md mx-auto">
          {/* Direct PNG Download */}
          <a
            href={downloadPngUrl}
            download="sri_tayi_grand_reception_qr.png"
            className="py-2.5 px-3.5 rounded-xl bg-[#2A1D13] hover:bg-[#3D2B1D] text-[#EAD8B8] font-medium text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer text-center"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PNG</span>
          </a>

          {/* Print Standee */}
          <button
            type="button"
            onClick={() => window.print()}
            className="py-2.5 px-3.5 rounded-xl border border-[#E6D9C5] bg-white text-[#786A5B] hover:text-[#2A1D13] hover:bg-[#FAF8F5] font-medium text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-[#8D672F]" />
            <span>Print Standee</span>
          </button>

          {/* Open Walk-In Portal */}
          <a
            href={targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2.5 px-3.5 rounded-xl border border-[#E6D9C5] bg-white text-[#786A5B] hover:text-[#2A1D13] hover:bg-[#FAF8F5] font-medium text-xs flex items-center justify-center gap-2 transition-all text-center shadow-xs"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Portal</span>
          </a>
        </div>
      </div>
    </div>
  );
}
