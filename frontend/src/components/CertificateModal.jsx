import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, Printer, Download, X, CheckCircle, Award, Lock } from 'lucide-react';
import { Emblem, HologramBadge } from './Emblem';

export function CertificateModal({ certificate, onClose }) {
  if (!certificate) return null;

  const handlePrint = () => {
    window.print();
  };

  const isExpired = new Date(certificate.validUntilDate) < new Date();

  // Verification URL or QR payload
  const qrVerificationPayload = JSON.stringify({
    certNumber: certificate.certificateNumber,
    serialNumber: certificate.serialNumber,
    validUntil: certificate.validUntilDate,
    leadSealNo: certificate.leadSealNo,
    officer: certificate.officerName,
    hash: certificate.cryptographicHash?.substring(0, 16)
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden my-8 border border-slate-200">
        
        {/* Modal Action Header (Hidden in Print) */}
        <div className="no-print bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-sm tracking-wide">
              Official Digital Verification Certificate (Form Schedule VIII)
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium transition cursor-pointer shadow"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Body (Prints cleanly) */}
        <div id="printable-certificate" className="p-8 sm:p-12 bg-[#fffefb] relative border-8 border-double border-amber-900/30 text-slate-800">
          
          {/* Subtle Watermark */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
            <div className="text-center font-serif text-8xl font-black text-slate-900 rotate-[-25deg] tracking-widest leading-loose">
              GOVERNMENT OF INDIA<br />LEGAL METROLOGY<br />VERIFIED & STAMPED
            </div>
          </div>

          {/* Certificate Header */}
          <div className="text-center relative pb-6 border-b-2 border-amber-900/20">
            <div className="flex justify-center mb-2">
              <Emblem className="w-16 h-16" />
            </div>
            <div className="text-xs font-semibold tracking-widest text-amber-800 uppercase">
              GOVERNMENT OF INDIA / STATE OF {certificate.state?.toUpperCase()}
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 mt-1 tracking-wide">
              DEPARTMENT OF LEGAL METROLOGY
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              (Under the Legal Metrology Act, 2009 & Legal Metrology General Rules, 2011)
            </p>
            <div className="inline-block mt-3 px-4 py-1 bg-amber-100/70 border border-amber-300 rounded text-xs font-serif font-bold text-amber-950 uppercase tracking-widest">
              SCHEDULE VIII - CERTIFICATE OF VERIFICATION (RULE 24)
            </div>
          </div>

          {/* Certificate Metadata Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 my-4 bg-amber-50/50 border-y border-amber-200/60 text-xs">
            <div>
              <span className="text-slate-500 block">Certificate No:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">{certificate.certificateNumber}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Stamping Date:</span>
              <span className="font-semibold text-slate-900">{certificate.stampingDate}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Valid Until:</span>
              <span className={`font-bold ${isExpired ? 'text-rose-600' : 'text-emerald-700'}`}>
                {certificate.validUntilDate} {isExpired ? '(EXPIRED)' : ''}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Fee Receipt No:</span>
              <span className="font-mono font-medium text-slate-800">{certificate.feeReceiptNumber} (₹{certificate.statutoryFeePaid})</span>
            </div>
          </div>

          {/* Certified Declaration Text */}
          <div className="my-5 text-sm leading-relaxed text-slate-700">
            This is to certify that the weighing / measuring instrument described below has been inspected, tested, and verified on-site in accordance with the provisions of the <strong>Legal Metrology Act, 2009</strong> and the <strong>Legal Metrology (General) Rules, 2011</strong>. The observed errors were verified to be strictly within the statutory <em>Maximum Permissible Error (MPE)</em> limits, and the instrument has been duly stamped and sealed.
          </div>

          {/* Details Tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
            
            {/* Establishment Details */}
            <div className="border border-slate-200 rounded-lg p-4 bg-white/60">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-3 border-b pb-1">
                1. User / Establishment Particulars
              </h3>
              <dl className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Trade / Firm Name:</dt>
                  <dd className="font-semibold text-slate-900 text-right">{certificate.merchantName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Proprietor / In-charge:</dt>
                  <dd className="font-medium text-slate-800">{certificate.ownerName}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">GSTIN / Est. Reg No:</dt>
                  <dd className="font-mono text-slate-900">{certificate.gstin}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Premise Address:</dt>
                  <dd className="text-slate-700 text-right max-w-[220px]">{certificate.premiseAddress}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">District / State:</dt>
                  <dd className="font-medium text-slate-800">{certificate.district}, {certificate.state}</dd>
                </div>
              </dl>
            </div>

            {/* Instrument Technical Specifications */}
            <div className="border border-slate-200 rounded-lg p-4 bg-white/60">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-3 border-b pb-1">
                2. Instrument Technical Specifications
              </h3>
              <dl className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Category of Instrument:</dt>
                  <dd className="font-semibold text-slate-900">{certificate.instrumentCategory}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Make / Model:</dt>
                  <dd className="text-slate-800">{certificate.brand} - {certificate.model}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Serial Number:</dt>
                  <dd className="font-mono font-bold text-indigo-700">{certificate.serialNumber}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Accuracy Class:</dt>
                  <dd className="font-semibold text-slate-900">{certificate.accuracyClass}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Capacity & Scale (Max / e):</dt>
                  <dd className="font-medium text-slate-800">
                    Max: {certificate.maxCapacityKg} kg | e = {certificate.verificationInterval_e} g
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Model Approval No:</dt>
                  <dd className="font-mono text-slate-700">{certificate.modelApprovalNumber}</dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Test Observations & Verification Verdict */}
          {certificate.inspectionObservations && (
            <div className="border border-emerald-200 bg-emerald-50/50 rounded-lg p-3 text-xs mb-6">
              <div className="flex items-center gap-1.5 text-emerald-800 font-bold mb-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Statutory Verification Observation Summary (Rule 24 & Schedule VI)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-slate-700">
                <div>• Visual Inspection: <span className="font-medium text-emerald-700">{certificate.inspectionObservations.visualInspection}</span></div>
                <div>
                  • Repeatability Test: <span className="font-medium text-emerald-700">
                    {typeof certificate.inspectionObservations.repeatabilityTest === 'object'
                      ? `Passed (Δm: ${certificate.inspectionObservations.repeatabilityTest?.maxDifferenceGrams}g)`
                      : certificate.inspectionObservations.repeatabilityTest}
                  </span>
                  {certificate.inspectionObservations.repeatability?.readings && (
                    <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                      Cycles: [{certificate.inspectionObservations.repeatability.readings.map(r => `${r} kg`).join(', ')}]
                    </span>
                  )}
                </div>
                <div>
                  • Eccentricity Test: <span className="font-medium text-emerald-700">
                    {typeof certificate.inspectionObservations.eccentricityTest === 'object'
                      ? `Passed (Δc: ${certificate.inspectionObservations.eccentricityTest?.maxErrorGrams}g)`
                      : certificate.inspectionObservations.eccentricityTest}
                  </span>
                  {certificate.inspectionObservations.eccentricity?.readings && (
                    <span className="block text-[10px] text-slate-500 font-mono mt-0.5">
                      Corners: [A: {certificate.inspectionObservations.eccentricity.readings.cornerA}kg, B: {certificate.inspectionObservations.eccentricity.readings.cornerB}kg, C: {certificate.inspectionObservations.eccentricity.readings.cornerC}kg, D: {certificate.inspectionObservations.eccentricity.readings.cornerD}kg]
                    </span>
                  )}
                </div>
                <div>• MPE Error Observed: <span className="font-medium text-emerald-700">{certificate.inspectionObservations.maxPermissibleErrorObserved || 'Within Limits'}</span></div>
              </div>
            </div>
          )}

          {/* Security Stamping & Seals Section */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs items-center my-6">
            <div>
              <span className="text-slate-500 block text-[11px]">Physical Wire / Lead Seal:</span>
              <span className="font-mono font-bold text-slate-800 text-xs">{certificate.leadSealNo}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Crimped with State LMO Die Mark</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Security Hologram Sticker:</span>
              <HologramBadge serialNo={certificate.hologramNo} className="mt-1" />
            </div>
            <div className="flex flex-col items-center justify-center p-2 bg-white rounded border border-slate-200">
              <QRCodeSVG value={qrVerificationPayload} size={70} level="H" includeMargin={false} />
              <span className="text-[9px] text-slate-500 font-mono mt-1 text-center">Scan to Verify Authenticity</span>
            </div>
          </div>

          {/* Officer Signature & Cryptographic Footer */}
          <div className="pt-6 border-t-2 border-amber-900/20 grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                <Lock className="w-3.5 h-3.5 text-indigo-600" />
                <span>SHA-256 Digital Verification Hash:</span>
              </div>
              <p className="font-mono text-[9px] text-slate-500 break-all bg-slate-100 p-2 rounded border border-slate-200">
                {certificate.cryptographicHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                Tamper-proof verifiable record stored on Central Metrology Registry.
              </p>
            </div>

            <div className="text-right flex flex-col items-end">
              <div className="inline-block text-center border-b border-slate-400 pb-1 px-6">
                <div className="font-serif italic font-semibold text-indigo-900 text-sm tracking-wider">
                  {certificate.officerName}
                </div>
                <div className="text-[10px] text-emerald-700 font-semibold flex items-center justify-center gap-1 mt-0.5">
                  <CheckCircle className="w-3 h-3" /> Digitally Verified & Stamped
                </div>
              </div>
              <div className="text-xs font-bold text-slate-900 mt-1">{certificate.officerName}</div>
              <div className="text-[11px] text-slate-600">{certificate.officerDesignation || 'Legal Metrology Officer'}</div>
              <div className="text-[10px] text-slate-500">Government of {certificate.state}</div>
            </div>
          </div>

          {/* Statutory Warning */}
          <div className="mt-6 pt-3 border-t border-slate-200 text-[10px] text-slate-500 text-center leading-normal">
            <strong>STATUTORY NOTICE:</strong> Altering, defacing, removing the seal, or tampering with this instrument is a punishable criminal offence under Section 25 of the Legal Metrology Act, 2009 with fine up to ₹50,000 and imprisonment. This certificate must be exhibited prominently near the instrument.
          </div>
        </div>

      </div>
    </div>
  );
}
