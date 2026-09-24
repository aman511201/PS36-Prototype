import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Printer, X, ShieldCheck, QrCode } from 'lucide-react';
import { Emblem, HologramBadge } from './Emblem';

export function QrCodeStickerModal({ instrument, certificate, onClose }) {
  if (!instrument && !certificate) return null;

  const certNo = certificate?.certificateNumber || instrument?.certificateNumber || 'MH/LM/2025/08492';
  const serialNo = certificate?.serialNumber || instrument?.serialNumber;
  const validUntil = certificate?.validUntilDate || instrument?.validUntilDate || '2026-10-14';
  const stampingDate = certificate?.stampingDate || instrument?.lastVerificationDate || '2025-10-15';
  const leadSeal = certificate?.leadSealNo || instrument?.leadSealNo || 'MH-LMO42-LS-8921';
  const hologram = certificate?.hologramNo || instrument?.hologramNo || 'HOL-GOI-2025-783921';

  // Construct URL or payload that can be scanned
  const qrPayload = JSON.stringify({
    certNumber: certNo,
    serialNumber: serialNo,
    validUntil: validUntil,
    leadSealNo: leadSeal
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="no-print bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-xs tracking-wide">
              Official Metrology Verification Stamp Sticker
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Sticker
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sticker Surface (Printable) */}
        <div id="printable-certificate" className="p-6 bg-amber-50/40 text-slate-800 flex flex-col items-center">
          
          <div className="w-full max-w-[320px] bg-gradient-to-b from-emerald-50 via-white to-amber-50/60 border-2 border-emerald-700 rounded-xl p-4 shadow-md relative overflow-hidden">
            {/* Tamper Warning Top Rib */}
            <div className="bg-emerald-800 text-white text-[9px] font-bold text-center py-1 -mx-4 -mt-4 mb-3 uppercase tracking-wider flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-300" />
              Legal Metrology Department • Govt of India
            </div>

            <div className="flex items-center justify-between mb-2">
              <Emblem className="w-8 h-8" />
              <div className="text-right">
                <span className="text-[9px] text-slate-500 uppercase block font-semibold">Verification Seal</span>
                <span className="text-xs font-mono font-bold text-emerald-950">{certNo}</span>
              </div>
            </div>

            {/* Scannable QR Code */}
            <div className="flex flex-col items-center justify-center p-3 bg-white rounded-lg border border-slate-200 my-2 shadow-inner">
              <QRCodeSVG value={qrPayload} size={135} level="H" includeMargin={true} />
              <div className="text-[10px] font-semibold text-emerald-800 mt-1 flex items-center gap-1">
                <QrCode className="w-3 h-3" /> SCAN TO VERIFY AUTHENTICITY
              </div>
            </div>

            {/* Key Instrument Data */}
            <div className="space-y-1 text-[11px] border-t border-b border-dashed border-slate-300 py-2 my-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Instrument S/N:</span>
                <span className="font-mono font-bold text-slate-900">{serialNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Stamping Date:</span>
                <span className="font-medium text-slate-800">{stampingDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">VALID UNTIL:</span>
                <span className="font-bold text-emerald-700 bg-emerald-100 px-1.5 rounded">{validUntil}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-400">Lead Seal No:</span>
                <span className="font-mono text-slate-600">{leadSeal}</span>
              </div>
            </div>

            {/* Hologram Barcode */}
            <HologramBadge serialNo={hologram} className="mt-2" />

            <div className="text-[8px] text-center text-slate-500 mt-2 font-mono">
              TAMPERING VOIDS LEGALITY • SEC. 25 LM ACT 2009
            </div>
          </div>

          <p className="no-print text-xs text-slate-500 text-center mt-4 max-w-xs">
            Affix this physical stamp sticker on the body of the verified instrument in clear view of consumers.
          </p>

        </div>

      </div>
    </div>
  );
}
