import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  QrCode, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  FileText, 
  Send, 
  Camera, 
  MapPin, 
  Award,
  ChevronDown,
  Info
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';

export function ConsumerPortal({ 
  certificates, 
  instruments, 
  onSubmitGrievance,
  onOpenCertificate 
}) {
  const [activeTab, setActiveTab] = useState('verify'); // 'verify', 'grievance', 'know-rights'
  const [searchQuery, setSearchQuery] = useState('MH/LM/2025/08492');
  const [verificationResult, setVerificationResult] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Grievance Form State
  const [grievanceForm, setGrievanceForm] = useState({
    complainantName: '',
    complainantPhone: '',
    merchantName: '',
    merchantAddress: '',
    district: 'Mumbai Suburban',
    state: 'Maharashtra',
    instrumentSerialOrDetails: '',
    complaintType: 'Short Measure / Underweight Goods',
    description: '',
    evidencePhotoUrl: ''
  });

  const [submittedTicket, setSubmittedTicket] = useState(null);

  // Quick verification function
  const handleVerify = (query = searchQuery) => {
    const q = (query || '').trim().toLowerCase();
    setHasSearched(true);

    if (!q) {
      setVerificationResult(null);
      return;
    }

    // Try finding in certificates
    const cert = certificates.find(c => 
      c.certificateNumber.toLowerCase() === q ||
      c.serialNumber.toLowerCase() === q ||
      c.leadSealNo.toLowerCase() === q ||
      c.hologramNo.toLowerCase() === q
    );

    if (cert) {
      const isExpired = new Date(cert.validUntilDate) < new Date();
      setVerificationResult({
        found: true,
        type: 'CERTIFICATE',
        isExpired,
        certificate: cert
      });
      return;
    }

    // Try finding in instruments
    const inst = instruments.find(i => 
      i.serialNumber.toLowerCase() === q ||
      i.id.toLowerCase() === q
    );

    if (inst) {
      const certForInst = certificates.find(c => c.certificateNumber === inst.certificateNumber);
      setVerificationResult({
        found: true,
        type: 'INSTRUMENT',
        isExpired: inst.status === 'EXPIRED',
        instrument: inst,
        certificate: certForInst
      });
      return;
    }

    // Not found
    setVerificationResult({
      found: false,
      searchedQuery: query
    });
  };

  const handleGrievanceSubmit = (e) => {
    e.preventDefault();
    const newGrievance = {
      ...grievanceForm,
      evidencePhotoUrl: grievanceForm.evidencePhotoUrl || 'https://images.unsplash.com/photo-1584483766114-2cea6facdf57?w=500&auto=format&fit=crop&q=80'
    };

    onSubmitGrievance(newGrievance);
    setSubmittedTicket(`GRV-2026-${Math.floor(1000 + Math.random() * 9000)}`);
    confetti({
      particleCount: 50,
      spread: 50,
      origin: { y: 0.6 }
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Consumer Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="bg-amber-400 text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
              Jago Grahak Jago • Citizen Transparency Portal
            </span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              Verify Any Weighing Scale Instantly
            </h2>
            <p className="text-xs text-emerald-100 max-w-xl">
              Under the Legal Metrology Act, 2009, every weighing scale or petrol pump must display a valid government verification certificate & tamper-proof physical stamp. Scan the QR code or enter the serial number below.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('verify')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'verify' ? 'bg-white text-emerald-950 shadow-sm' : 'bg-emerald-700/60 hover:bg-emerald-700 text-white'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>Verify Instrument</span>
            </button>
            <button
              onClick={() => setActiveTab('grievance')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'grievance' ? 'bg-white text-emerald-950 shadow-sm' : 'bg-emerald-700/60 hover:bg-emerald-700 text-white'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Report Fraud</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab 1: Instant Verification & QR Checker */}
      {activeTab === 'verify' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900">National Metrology Public Search</h3>
              <p className="text-xs text-slate-500">
                Enter Certificate Number, Serial Number, or Lead Seal Barcode
              </p>
            </div>

            {/* Search Input */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="e.g. MH/LM/2025/08492 or ES-2023-99841"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                  className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-inner"
                />
              </div>
              <button
                onClick={() => handleVerify()}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-lg shadow transition cursor-pointer"
              >
                Verify Scale
              </button>
            </div>

            {/* Quick Demo Pre-sets */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs pt-1">
              <span className="text-slate-400 text-[11px]">Quick Try:</span>
              <button
                onClick={() => {
                  setSearchQuery('MH/LM/2025/08492');
                  handleVerify('MH/LM/2025/08492');
                }}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-mono text-slate-700 cursor-pointer"
              >
                Om Sai Scale (Verified)
              </button>
              <button
                onClick={() => {
                  setSearchQuery('KA/LM/2026/01290');
                  handleVerify('KA/LM/2026/01290');
                }}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-mono text-slate-700 cursor-pointer"
              >
                Kalyan Jeweler Balance
              </button>
              <button
                onClick={() => {
                  setSearchQuery('PHX-2021-12009');
                  handleVerify('PHX-2021-12009');
                }}
                className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 rounded text-[11px] font-mono text-rose-700 cursor-pointer"
              >
                Expired Platform Scale
              </button>
              <button
                onClick={() => {
                  setSearchQuery('FAKE-SEAL-8899');
                  handleVerify('FAKE-SEAL-8899');
                }}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[11px] font-mono text-slate-500 cursor-pointer"
              >
                Fake Seal Test
              </button>
            </div>
          </div>

          {/* Verification Result Card */}
          {hasSearched && verificationResult && (
            <div className="max-w-2xl mx-auto pt-4 border-t border-slate-100">
              {verificationResult.found ? (
                <div className={`p-5 rounded-xl border-2 shadow-sm space-y-4 ${
                  verificationResult.isExpired 
                    ? 'border-amber-400 bg-amber-50/40' 
                    : 'border-emerald-500 bg-emerald-50/30'
                }`}>
                  {/* Status Banner */}
                  <div className="flex items-center justify-between border-b pb-3">
                    <div className="flex items-center gap-2">
                      {!verificationResult.isExpired ? (
                        <>
                          <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                          <div>
                            <h4 className="font-bold text-sm text-emerald-950">
                              AUTHENTIC & LEGALLY VERIFIED INSTRUMENT
                            </h4>
                            <p className="text-[11px] text-emerald-800">
                              Registered on Government of India Central Legal Metrology Registry
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                          <div>
                            <h4 className="font-bold text-sm text-amber-950">
                              VERIFICATION VALIDITY HAS EXPIRED
                            </h4>
                            <p className="text-[11px] text-amber-800">
                              Using this instrument in transactions is a violation under Section 24 of LM Act, 2009
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    <span className={`px-2.5 py-1 rounded text-xs font-bold font-mono ${
                      !verificationResult.isExpired ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                    }`}>
                      {verificationResult.certificate?.certificateNumber || 'VERIFIED'}
                    </span>
                  </div>

                  {/* Certified Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block">Establishment Name:</span>
                      <span className="font-bold text-slate-900">
                        {verificationResult.certificate?.merchantName || verificationResult.instrument?.merchantName}
                      </span>
                      <span className="text-[11px] text-slate-600 block mt-0.5">
                        {verificationResult.certificate?.premiseAddress || verificationResult.instrument?.locationAddress}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block">Instrument Specification:</span>
                      <span className="font-bold text-slate-900">
                        {verificationResult.certificate?.brand} {verificationResult.certificate?.model || verificationResult.instrument?.model}
                      </span>
                      <span className="font-mono text-slate-700 block text-[11px]">
                        S/N: {verificationResult.certificate?.serialNumber || verificationResult.instrument?.serialNumber}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block">Accuracy Class & Capacity:</span>
                      <span className="font-medium text-slate-800">
                        {verificationResult.certificate?.accuracyClass || verificationResult.instrument?.accuracyClass} • Max: {verificationResult.certificate?.maxCapacityKg || verificationResult.instrument?.maxCapacityKg} kg
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block">Validity Expiry Date:</span>
                      <span className={`font-bold ${verificationResult.isExpired ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {verificationResult.certificate?.validUntilDate || verificationResult.instrument?.validUntilDate}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block">Lead Wire Seal No:</span>
                      <span className="font-mono text-slate-800 font-semibold">
                        {verificationResult.certificate?.leadSealNo || verificationResult.instrument?.leadSealNo}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block">Verified & Stamped By:</span>
                      <span className="font-medium text-slate-800">
                        {verificationResult.certificate?.officerName || verificationResult.instrument?.officerName}
                      </span>
                    </div>
                  </div>

                  {/* Cryptographic Proof & View Certificate */}
                  <div className="pt-3 border-t flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-mono">
                      SHA-256 Verified: {verificationResult.certificate?.cryptographicHash?.substring(0, 16)}...
                    </span>

                    {verificationResult.certificate && (
                      <button
                        onClick={() => onOpenCertificate(verificationResult.certificate)}
                        className="flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View Full Schedule VIII Certificate</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Unregistered / Counterfeit Alert */
                <div className="p-5 rounded-xl border-2 border-rose-500 bg-rose-50/50 space-y-3">
                  <div className="flex items-center gap-2 text-rose-800">
                    <XCircle className="w-6 h-6 text-rose-600 flex-shrink-0" />
                    <div>
                      <h4 className="font-bold text-sm text-rose-950">
                        UNVERIFIED INSTRUMENT / POTENTIAL COUNTERFEIT SEAL!
                      </h4>
                      <p className="text-[11px] text-rose-700">
                        No active legal verification certificate was found in the National Metrology Registry for "{verificationResult.searchedQuery}".
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-rose-800">
                    Using unstamped or unverified weights and measures in trade is illegal under Section 24 and punishable with fine and imprisonment under Section 30 of the Legal Metrology Act, 2009.
                  </p>

                  <div className="pt-2">
                    <button
                      onClick={() => {
                        setGrievanceForm(prev => ({
                          ...prev,
                          instrumentSerialOrDetails: verificationResult.searchedQuery,
                          complaintType: 'Unverified / Missing Legal Metrology Stamp'
                        }));
                        setActiveTab('grievance');
                      }}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold shadow-sm transition cursor-pointer"
                    >
                      Report This Merchant to Legal Metrology Inspector →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* Tab 2: File Consumer Grievance */}
      {activeTab === 'grievance' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="max-w-xl mx-auto">
            
            <div className="text-center space-y-1 mb-6">
              <h3 className="text-lg font-bold text-slate-900">
                Lodge Consumer Grievance ("Jago Grahak Jago")
              </h3>
              <p className="text-xs text-slate-500">
                Direct statutory complaint forwarded automatically to the local Legal Metrology Officer
              </p>
            </div>

            {submittedTicket ? (
              <div className="p-6 rounded-xl border-2 border-emerald-500 bg-emerald-50/40 text-center space-y-3">
                <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto" />
                <h4 className="text-base font-bold text-slate-900">
                  Grievance Registered Successfully!
                </h4>
                <div className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100 py-1 px-3 rounded inline-block">
                  Ticket ID: {submittedTicket}
                </div>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Your complaint has been automatically assigned to the Legal Metrology Inspector for investigation. You will receive SMS updates on enforcement action taken under Section 15 of Legal Metrology Act.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setSubmittedTicket(null);
                      setGrievanceForm({
                        complainantName: '',
                        complainantPhone: '',
                        merchantName: '',
                        merchantAddress: '',
                        district: 'Mumbai Suburban',
                        state: 'Maharashtra',
                        instrumentSerialOrDetails: '',
                        complaintType: 'Short Measure / Underweight Goods',
                        description: '',
                        evidencePhotoUrl: ''
                      });
                    }}
                    className="px-4 py-1.5 bg-emerald-600 text-white rounded text-xs font-bold cursor-pointer"
                  >
                    File Another Complaint
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGrievanceSubmit} className="space-y-4 text-xs">
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Your Name (Optional / Confidential):</label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Patil"
                      value={grievanceForm.complainantName}
                      onChange={(e) => setGrievanceForm(prev => ({ ...prev, complainantName: e.target.value }))}
                      className="w-full border border-slate-300 rounded px-2.5 py-2 text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Mobile Number (For Updates):</label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98XXX XXXXX"
                      value={grievanceForm.complainantPhone}
                      onChange={(e) => setGrievanceForm(prev => ({ ...prev, complainantPhone: e.target.value }))}
                      className="w-full border border-slate-300 rounded px-2.5 py-2 text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Merchant / Shop Name:</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Bandra Provision Store"
                      value={grievanceForm.merchantName}
                      onChange={(e) => setGrievanceForm(prev => ({ ...prev, merchantName: e.target.value }))}
                      className="w-full border border-slate-300 rounded px-2.5 py-2 text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">District / Jurisdiction:</label>
                    <select
                      value={grievanceForm.district}
                      onChange={(e) => setGrievanceForm(prev => ({ ...prev, district: e.target.value }))}
                      className="w-full border border-slate-300 rounded px-2.5 py-2 text-xs focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="Mumbai Suburban">Mumbai Suburban</option>
                      <option value="Bengaluru Urban">Bengaluru Urban</option>
                      <option value="South Delhi">South Delhi</option>
                      <option value="Ahmedabad">Ahmedabad</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Shop Address / Location:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Shop 4, Linking Road, Bandra West"
                    value={grievanceForm.merchantAddress}
                    onChange={(e) => setGrievanceForm(prev => ({ ...prev, merchantAddress: e.target.value }))}
                    className="w-full border border-slate-300 rounded px-2.5 py-2 text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Nature of Violation:</label>
                    <select
                      value={grievanceForm.complaintType}
                      onChange={(e) => setGrievanceForm(prev => ({ ...prev, complaintType: e.target.value }))}
                      className="w-full border border-slate-300 rounded px-2.5 py-2 text-xs focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="Short Measure / Underweight Goods">Short Measure / Underweight Goods</option>
                      <option value="Expired Verification Stamp in Use">Expired Verification Stamp in Use</option>
                      <option value="Broken / Tampered Lead Wire Seal">Broken / Tampered Lead Wire Seal</option>
                      <option value="Non-standard Dial or Mechanical Scale">Non-standard Dial or Mechanical Scale</option>
                      <option value="Fuel Dispenser Short Delivery">Fuel Dispenser Short Delivery</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Scale Serial / Stamp Details:</label>
                    <input
                      type="text"
                      placeholder="e.g. Counter Scale 1 (S/N if visible)"
                      value={grievanceForm.instrumentSerialOrDetails}
                      onChange={(e) => setGrievanceForm(prev => ({ ...prev, instrumentSerialOrDetails: e.target.value }))}
                      className="w-full border border-slate-300 rounded px-2.5 py-2 text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Detailed Description of Incident:</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Describe how much you purchased, what weight was delivered, and whether the merchant showed the stamp..."
                    value={grievanceForm.description}
                    onChange={(e) => setGrievanceForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-emerald-500"
                  ></textarea>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-4 h-4" />
                    <span>Lodge Statutory Grievance to Legal Metrology Dept</span>
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
