import React, { useState } from 'react';
import { 
  Building2, 
  PlusCircle, 
  FileText, 
  QrCode, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  ShieldAlert, 
  Calendar, 
  CreditCard, 
  Check, 
  Search, 
  ExternalLink,
  ChevronRight,
  Filter,
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';

export function MerchantPortal({ 
  merchants, 
  selectedMerchant, 
  setSelectedMerchant,
  instruments, 
  applications, 
  certificates,
  onOpenCertificate, 
  onOpenQrSticker,
  onSubmitApplication,
  onRegisterInstrument
}) {
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [activeTab, setActiveTab] = useState('instruments'); // 'instruments' or 'applications'

  // Application Wizard State
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedInstForApp, setSelectedInstForApp] = useState(null);
  const [appForm, setAppForm] = useState({
    applicationType: 'Periodic Renewal Verification',
    instrumentCategory: 'Electronic Weighing Scale (Counter/Tabletop)',
    brand: '',
    model: '',
    serialNumber: '',
    accuracyClass: 'Class III',
    maxCapacityKg: 30,
    verificationInterval_e: 5,
    preferredInspectionDate: new Date(Date.now() + 5 * 86400000).toISOString().substring(0, 10),
    paymentMethod: 'BHARATKOSH',
    notes: ''
  });

  // New Instrument Registration State
  const [newInstForm, setNewInstForm] = useState({
    category: 'Electronic Weighing Scale (Counter/Tabletop)',
    brand: '',
    model: '',
    serialNumber: '',
    modelApprovalNumber: 'IND/09/2024/',
    accuracyClass: 'Class III',
    maxCapacityKg: 15,
    minCapacityGrams: 40,
    verificationInterval_e: 2,
    locationAddress: selectedMerchant?.address || ''
  });

  // Filter instruments for this merchant
  const merchantInstruments = instruments.filter(i => i.merchantId === selectedMerchant?.id);
  const merchantApplications = applications.filter(a => a.merchantId === selectedMerchant?.id);

  // Statistics
  const totalCount = merchantInstruments.length;
  const verifiedCount = merchantInstruments.filter(i => i.status === 'VERIFIED').length;
  const expiringSoonCount = merchantInstruments.filter(i => i.status === 'EXPIRING_SOON').length;
  const expiredCount = merchantInstruments.filter(i => i.status === 'EXPIRED').length;
  const pendingCount = merchantInstruments.filter(i => i.status === 'PENDING_INSPECTION').length;

  const filteredInstruments = merchantInstruments.filter(i => {
    const matchesStatus = filterStatus === 'ALL' || i.status === filterStatus;
    const matchesSearch = searchQuery === '' || 
      i.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Start renewal flow from card
  const handleStartRenewal = (inst) => {
    setSelectedInstForApp(inst);
    setAppForm({
      applicationType: inst.status === 'EXPIRED' ? 'Overdue Periodic Verification (Post Expiry)' : 'Periodic Renewal Verification',
      instrumentCategory: inst.category,
      brand: inst.brand,
      model: inst.model,
      serialNumber: inst.serialNumber,
      accuracyClass: inst.accuracyClass,
      maxCapacityKg: inst.maxCapacityKg,
      verificationInterval_e: inst.verificationInterval_e,
      preferredInspectionDate: new Date(Date.now() + 4 * 86400000).toISOString().substring(0, 10),
      paymentMethod: 'UPI',
      notes: inst.status === 'EXPIRED' ? 'Late renewal request with statutory fee.' : 'Standard 12-month periodic verification.'
    });
    setWizardStep(1);
    setShowApplyModal(true);
  };

  // Fee calculation helper
  const calculateAppFee = () => {
    let base = 300;
    const cat = appForm.instrumentCategory;
    const cap = Number(appForm.maxCapacityKg) || 10;
    
    if (cat.includes('Counter') || cat.includes('Tabletop')) {
      base = cap <= 10 ? 200 : (cap <= 50 ? 300 : 400);
    } else if (cat.includes('Platform')) {
      base = cap <= 100 ? 400 : 600;
    } else if (cat.includes('Precision') || cat.includes('Analytical')) {
      base = appForm.accuracyClass === 'Class I' ? 1500 : 1000;
    } else if (cat.includes('Weighbridge')) {
      base = cap <= 50000 ? 3000 : 5000;
    } else if (cat.includes('Fuel')) {
      base = 1000;
    }

    const isLate = selectedInstForApp?.status === 'EXPIRED' || appForm.applicationType.includes('Overdue');
    const penalty = isLate ? base : 0;
    return { base, penalty, total: base + penalty };
  };

  const currentFee = calculateAppFee();

  const handleApplicationSubmit = (e) => {
    e.preventDefault();
    const appData = {
      ...appForm,
      merchantId: selectedMerchant.id,
      merchantName: selectedMerchant.tradeName,
      district: selectedMerchant.district,
      state: selectedMerchant.state,
      instrumentId: selectedInstForApp?.id || null,
      statutoryFee: currentFee.total
    };

    onSubmitApplication(appData);
    setShowApplyModal(false);
    setSelectedInstForApp(null);
    setWizardStep(1);

    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 }
    });
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    const instData = {
      ...newInstForm,
      merchantId: selectedMerchant.id,
      merchantName: selectedMerchant.tradeName,
      district: selectedMerchant.district,
      state: selectedMerchant.state
    };
    onRegisterInstrument(instData);
    setShowRegisterModal(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Merchant Profile Banner & Quick Switcher */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 flex-shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900">{selectedMerchant.tradeName}</h2>
                <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded border border-emerald-200">
                  GSTIN: {selectedMerchant.gstin}
                </span>
                <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded border border-slate-200">
                  Lic: {selectedMerchant.licenseNumber}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {selectedMerchant.address} • <strong>{selectedMerchant.district}, {selectedMerchant.state}</strong>
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Proprietor: <strong>{selectedMerchant.ownerName}</strong> | Contact: {selectedMerchant.contactPhone}
              </p>
            </div>
          </div>

          {/* Quick Merchant Profile Switcher for Live Demo */}
          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
            <span className="text-xs text-slate-500 whitespace-nowrap font-medium">Demo Establishment:</span>
            <select
              value={selectedMerchant.id}
              onChange={(e) => {
                const found = merchants.find(m => m.id === e.target.value);
                if (found) setSelectedMerchant(found);
              }}
              className="text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              {merchants.map(m => (
                <option key={m.id} value={m.id}>
                  {m.tradeName} ({m.businessType.split(' ')[0]})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium block">Total Instruments</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</div>
          <span className="text-[10px] text-slate-400">Registered at Premise</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm">
          <span className="text-xs text-emerald-700 font-medium block flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Active & Verified
          </span>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{verifiedCount}</div>
          <span className="text-[10px] text-emerald-600 font-medium">Legally Stamped</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm">
          <span className="text-xs text-amber-700 font-medium block flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> Expiring &lt; 30 Days
          </span>
          <div className="text-2xl font-bold text-amber-700 mt-1">{expiringSoonCount}</div>
          <span className="text-[10px] text-amber-600 font-medium">Renewal Due</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm">
          <span className="text-xs text-rose-700 font-medium block flex items-center gap-1">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" /> Overdue / Expired
          </span>
          <div className="text-2xl font-bold text-rose-700 mt-1">{expiredCount}</div>
          <span className="text-[10px] text-rose-600 font-medium">100% Late Penalty</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-indigo-200 shadow-sm">
          <span className="text-xs text-indigo-700 font-medium block flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Under Inspection
          </span>
          <div className="text-2xl font-bold text-indigo-700 mt-1">{pendingCount}</div>
          <span className="text-[10px] text-indigo-600 font-medium">LMO Scheduled</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Navigation Tabs & Actions */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('instruments')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'instruments'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Instruments Fleet ({merchantInstruments.length})
            </button>
            <button
              onClick={() => setActiveTab('applications')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'applications'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Verification Applications ({merchantApplications.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRegisterModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-slate-600" />
              <span>Register Instrument</span>
            </button>

            <button
              onClick={() => {
                setSelectedInstForApp(null);
                setWizardStep(1);
                setShowApplyModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Apply for Verification</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Instruments Fleet */}
        {activeTab === 'instruments' && (
          <div>
            {/* Filter Bar */}
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search serial, brand, model..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto scrollbar-none">
                {['ALL', 'VERIFIED', 'EXPIRING_SOON', 'EXPIRED', 'PENDING_INSPECTION'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition cursor-pointer ${
                      filterStatus === status
                        ? 'bg-emerald-100 text-emerald-800 font-bold'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {status === 'ALL' ? 'All Instruments' :
                     status === 'VERIFIED' ? 'Verified' :
                     status === 'EXPIRING_SOON' ? 'Expiring Soon' :
                     status === 'EXPIRED' ? 'Expired' : 'Inspection Pending'}
                  </button>
                ))}
              </div>
            </div>

            {/* Instruments List */}
            <div className="divide-y divide-slate-100">
              {filteredInstruments.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  No instruments found matching the selected filter.
                </div>
              ) : (
                filteredInstruments.map((inst) => {
                  const cert = certificates.find(c => c.certificateNumber === inst.certificateNumber);
                  return (
                    <div key={inst.id} className="p-4 sm:p-5 hover:bg-slate-50/70 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      
                      {/* Instrument Information */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900">{inst.brand} - {inst.model}</span>
                          <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                            S/N: {inst.serialNumber}
                          </span>
                          
                          {/* Status Badge */}
                          {inst.status === 'VERIFIED' && (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle className="w-3 h-3 text-emerald-600" /> Legally Verified
                            </span>
                          )}
                          {inst.status === 'EXPIRING_SOON' && (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" /> Expiring Soon
                            </span>
                          )}
                          {inst.status === 'EXPIRED' && (
                            <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 text-xs font-semibold px-2 py-0.5 rounded-full border border-rose-200">
                              <ShieldAlert className="w-3 h-3 text-rose-600" /> Expired (Penalty Risk)
                            </span>
                          )}
                          {inst.status === 'PENDING_INSPECTION' && (
                            <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full border border-indigo-200">
                              <Calendar className="w-3 h-3 text-indigo-600" /> Inspection Pending
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                          <span>Category: <strong>{inst.category}</strong></span>
                          <span>Accuracy: <strong className="text-indigo-700">{inst.accuracyClass}</strong></span>
                          <span>Max Capacity: <strong>{inst.maxCapacityKg} kg</strong> (e = {inst.verificationInterval_e} g)</span>
                          <span>Approval: <strong className="font-mono">{inst.modelApprovalNumber}</strong></span>
                        </div>

                        <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
                          <span>Location: <em>{inst.locationAddress}</em></span>
                          {inst.lastVerificationDate && (
                            <span>Last Stamped: <strong>{inst.lastVerificationDate}</strong></span>
                          )}
                          {inst.validUntilDate && (
                            <span className={inst.status === 'EXPIRED' ? 'text-rose-600 font-bold' : 'text-emerald-700 font-semibold'}>
                              Validity Due: <strong>{inst.validUntilDate}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Security Seals & Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2 lg:flex-shrink-0">
                        {inst.certificateNumber && (
                          <div className="hidden sm:block text-right text-xs pr-2 border-r border-slate-200">
                            <span className="text-[10px] text-slate-400 block font-mono">SEAL: {inst.leadSealNo || 'MH-LS-092'}</span>
                            <span className="font-mono text-slate-700 font-semibold">{inst.certificateNumber}</span>
                          </div>
                        )}

                        {cert && (
                          <button
                            onClick={() => onOpenCertificate(cert)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
                            title="View Schedule VIII Certificate"
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-600" />
                            <span>Certificate</span>
                          </button>
                        )}

                        <button
                          onClick={() => onOpenQrSticker(inst, cert)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg border border-emerald-200 transition cursor-pointer"
                          title="Generate QR Verification Sticker"
                        >
                          <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                          <span>QR Stamp</span>
                        </button>

                        {(inst.status === 'EXPIRING_SOON' || inst.status === 'EXPIRED') && (
                          <button
                            onClick={() => handleStartRenewal(inst)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
                          >
                            <span>Renew</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Applications History */}
        {activeTab === 'applications' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Application ID</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Instrument</th>
                  <th className="p-3">Fee & Payment</th>
                  <th className="p-3">Assigned LMO Officer</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Certificate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {merchantApplications.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400">
                      No verification applications found.
                    </td>
                  </tr>
                ) : (
                  merchantApplications.map((app) => {
                    const cert = certificates.find(c => c.certificateNumber === app.certificateNumber);
                    return (
                      <tr key={app.id} className="hover:bg-slate-50/70">
                        <td className="p-3 font-mono font-bold text-slate-900">{app.id}</td>
                        <td className="p-3 font-medium">{app.applicationType}</td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-900">{app.brand} {app.model}</div>
                          <div className="font-mono text-[11px] text-slate-500">{app.serialNumber}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">₹{app.statutoryFee}</div>
                          <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> Paid ({app.paymentTransactionRef?.substring(0, 16)}...)
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-slate-900">{app.assignedOfficerName || 'Jurisdiction LMO'}</div>
                          <div className="text-[10px] text-slate-500">{app.scheduledDateTime || 'Slot pending'}</div>
                        </td>
                        <td className="p-3">
                          {app.status === 'VERIFIED_STAMPED' ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[11px]">
                              <CheckCircle className="w-3 h-3 text-emerald-600" /> Stamped & Verified
                            </span>
                          ) : app.status === 'INSPECTION_SCHEDULED' ? (
                            <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-800 font-semibold px-2 py-0.5 rounded text-[11px]">
                              <Calendar className="w-3 h-3 text-indigo-600" /> Inspection Scheduled
                            </span>
                          ) : app.status === 'UNDER_REVIEW' ? (
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded text-[11px]">
                              <Clock className="w-3 h-3 text-amber-600" /> Under Review
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded text-[11px]">
                              {app.status}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {cert ? (
                            <button
                              onClick={() => onOpenCertificate(cert)}
                              className="text-emerald-700 hover:text-emerald-800 font-bold text-xs underline cursor-pointer"
                            >
                              {cert.certificateNumber}
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Pending Test</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* 4-Step Verification Application Wizard Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
            
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm tracking-wide">
                  Statutory Verification Application Wizard
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Legal Metrology Act, 2009 & General Rules, 2011 (Schedule XII Fee)
                </p>
              </div>
              <button
                onClick={() => setShowApplyModal(false)}
                className="text-slate-400 hover:text-white transition cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            {/* Stepper Indicator */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between text-xs">
              <div className={`flex items-center gap-1.5 ${wizardStep >= 1 ? 'font-bold text-emerald-700' : 'text-slate-400'}`}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center bg-emerald-100 border border-emerald-300 text-[10px]">1</span>
                <span>Instrument</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <div className={`flex items-center gap-1.5 ${wizardStep >= 2 ? 'font-bold text-emerald-700' : 'text-slate-400'}`}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center bg-emerald-100 border border-emerald-300 text-[10px]">2</span>
                <span>Category</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <div className={`flex items-center gap-1.5 ${wizardStep >= 3 ? 'font-bold text-emerald-700' : 'text-slate-400'}`}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center bg-emerald-100 border border-emerald-300 text-[10px]">3</span>
                <span>Statutory Fee</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <div className={`flex items-center gap-1.5 ${wizardStep >= 4 ? 'font-bold text-emerald-700' : 'text-slate-400'}`}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center bg-emerald-100 border border-emerald-300 text-[10px]">4</span>
                <span>Slot Booking</span>
              </div>
            </div>

            {/* Step 1: Instrument Selection */}
            {wizardStep === 1 && (
              <div className="p-6 space-y-4">
                <h4 className="text-sm font-bold text-slate-900">Select Instrument for Verification:</h4>
                
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {merchantInstruments.map((inst) => {
                    const isSelected = selectedInstForApp?.id === inst.id;
                    return (
                      <div
                        key={inst.id}
                        onClick={() => {
                          setSelectedInstForApp(inst);
                          setAppForm(prev => ({
                            ...prev,
                            instrumentCategory: inst.category,
                            brand: inst.brand,
                            model: inst.model,
                            serialNumber: inst.serialNumber,
                            accuracyClass: inst.accuracyClass,
                            maxCapacityKg: inst.maxCapacityKg,
                            verificationInterval_e: inst.verificationInterval_e,
                            applicationType: inst.status === 'EXPIRED' ? 'Overdue Periodic Verification (Post Expiry)' : 'Periodic Renewal Verification'
                          }));
                        }}
                        className={`p-3 rounded-lg border text-xs cursor-pointer transition flex items-center justify-between ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/70 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-slate-900">{inst.brand} - {inst.model}</div>
                          <div className="text-[11px] text-slate-500 font-mono">S/N: {inst.serialNumber} | Class: {inst.accuracyClass}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Capacity: {inst.maxCapacityKg} kg | e = {inst.verificationInterval_e} g</div>
                        </div>
                        <div className="text-right">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            inst.status === 'EXPIRED' ? 'bg-rose-100 text-rose-800' :
                            inst.status === 'EXPIRING_SOON' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {inst.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 border-t flex justify-end">
                  <button
                    disabled={!selectedInstForApp}
                    onClick={() => setWizardStep(2)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    Proceed to Verification Details →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Verification Type Details */}
            {wizardStep === 2 && (
              <div className="p-6 space-y-4 text-xs">
                <h4 className="text-sm font-bold text-slate-900">Verification Application Type</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { type: 'Periodic Renewal Verification', desc: 'Standard 12-month or 24-month statutory cycle' },
                    { type: 'Initial Verification of New Instrument', desc: 'Mandatory before placing in transaction' },
                    { type: 'Re-verification After Repair / Recalibration', desc: 'Required when seal broken for repair' }
                  ].map((item) => (
                    <div
                      key={item.type}
                      onClick={() => setAppForm(prev => ({ ...prev, applicationType: item.type }))}
                      className={`p-3 rounded-lg border cursor-pointer transition ${
                        appForm.applicationType === item.type
                          ? 'border-emerald-600 bg-emerald-50/70 font-semibold'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-bold text-slate-900">{item.type}</div>
                      <div className="text-[10px] text-slate-500 mt-1">{item.desc}</div>
                    </div>
                  ))}
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-800">Selected Instrument Summary:</span>
                  <p className="text-slate-600">
                    {appForm.brand} {appForm.model} (S/N: {appForm.serialNumber}) • {appForm.accuracyClass} • Max {appForm.maxCapacityKg} kg
                  </p>
                </div>

                <div className="pt-4 border-t flex justify-between">
                  <button
                    onClick={() => setWizardStep(1)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => setWizardStep(3)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Calculate Statutory Fee →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Statutory Fee Calculation & Simulated Payment */}
            {wizardStep === 3 && (
              <div className="p-6 space-y-4 text-xs">
                <h4 className="text-sm font-bold text-slate-900">
                  Statutory Fee Calculation (Schedule XII, Legal Metrology Rules 2011)
                </h4>

                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-3">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-600">Instrument Classification Fee:</span>
                    <span className="font-semibold text-slate-900">₹{currentFee.base}</span>
                  </div>
                  {currentFee.penalty > 0 && (
                    <div className="flex justify-between border-b pb-2 text-rose-600 font-semibold">
                      <span>Statutory Late Fee Surcharge (100% per Sec 24):</span>
                      <span>+ ₹{currentFee.penalty}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-b pb-2 text-slate-600">
                    <span>GST (Exempt under Govt. Statutory Fee notification):</span>
                    <span>₹0</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-slate-900 pt-1">
                    <span>Total Fee Payable to Government:</span>
                    <span className="text-emerald-700">₹{currentFee.total}</span>
                  </div>
                </div>

                <div>
                  <span className="font-bold text-slate-800 block mb-2">Select Government Payment Gateway:</span>
                  <div className="grid grid-cols-3 gap-2">
                    {['BHARATKOSH', 'UPI (BHIM / GPay)', 'Net Banking (SBI / Treasury)'].map(gateway => (
                      <div
                        key={gateway}
                        onClick={() => setAppForm(prev => ({ ...prev, paymentMethod: gateway }))}
                        className={`p-2.5 rounded border text-center cursor-pointer transition ${
                          appForm.paymentMethod === gateway
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <CreditCard className="w-4 h-4 mx-auto mb-1 text-slate-600" />
                        <span className="text-[11px]">{gateway}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t flex justify-between">
                  <button
                    onClick={() => setWizardStep(2)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => setWizardStep(4)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Proceed to Slot Booking →
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Slot Booking & Submission */}
            {wizardStep === 4 && (
              <form onSubmit={handleApplicationSubmit} className="p-6 space-y-4 text-xs">
                <h4 className="text-sm font-bold text-slate-900">
                  Select Preferred On-Site Verification Slot
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Preferred Inspection Date:</label>
                    <input
                      type="date"
                      required
                      value={appForm.preferredInspectionDate}
                      onChange={(e) => setAppForm(prev => ({ ...prev, preferredInspectionDate: e.target.value }))}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Assigned Legal Metrology Zone:</label>
                    <input
                      type="text"
                      disabled
                      value={`${selectedMerchant.district} Sub-division, ${selectedMerchant.state}`}
                      className="w-full bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Special Notes for Inspecting Officer:</label>
                  <textarea
                    rows={2}
                    value={appForm.notes}
                    onChange={(e) => setAppForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="e.g., scale located on Counter 2, standard test weights available on premise..."
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  ></textarea>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-emerald-800 flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="text-[11px]">
                    <strong>Statutory Fee Paid: ₹{currentFee.total}</strong> via {appForm.paymentMethod}. An electronic receipt and application tracking ID will be generated upon confirmation.
                  </div>
                </div>

                <div className="pt-4 border-t flex justify-between">
                  <button
                    type="button"
                    onClick={() => setWizardStep(3)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Confirm & Submit Application</span>
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

      {/* Register New Instrument Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm tracking-wide">
                Register New Weighing / Measuring Instrument
              </h3>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-slate-400 hover:text-white transition cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Instrument Category:</label>
                <select
                  value={newInstForm.category}
                  onChange={(e) => setNewInstForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="Electronic Weighing Scale (Counter/Tabletop)">Electronic Weighing Scale (Counter/Tabletop)</option>
                  <option value="Platform Scale / Heavy Bench Scale">Platform Scale / Heavy Bench Scale</option>
                  <option value="Precision Analytical Balance (Jeweler/Lab)">Precision Analytical Balance (Jeweler/Lab)</option>
                  <option value="Weighbridge (Lorry/Truck)">Weighbridge (Lorry/Truck)</option>
                  <option value="Fuel Dispensing Unit (Petrol/Diesel)">Fuel Dispensing Unit (Petrol/Diesel)</option>
                  <option value="Flow Meter / Bulk Liquid Measure">Flow Meter / Bulk Liquid Measure</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Manufacturer / Make:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Essae, Avery, Mettler"
                    value={newInstForm.brand}
                    onChange={(e) => setNewInstForm(prev => ({ ...prev, brand: e.target.value }))}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Model Name / Number:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DS-252, FX-120"
                    value={newInstForm.model}
                    onChange={(e) => setNewInstForm(prev => ({ ...prev, model: e.target.value }))}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Serial Number (Factory ID):</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SN-88992"
                    value={newInstForm.serialNumber}
                    onChange={(e) => setNewInstForm(prev => ({ ...prev, serialNumber: e.target.value }))}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Model Approval No (IND/...):</label>
                  <input
                    type="text"
                    required
                    placeholder="IND/09/2024/..."
                    value={newInstForm.modelApprovalNumber}
                    onChange={(e) => setNewInstForm(prev => ({ ...prev, modelApprovalNumber: e.target.value }))}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Accuracy Class:</label>
                  <select
                    value={newInstForm.accuracyClass}
                    onChange={(e) => setNewInstForm(prev => ({ ...prev, accuracyClass: e.target.value }))}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Class I">Class I (Special)</option>
                    <option value="Class II">Class II (High)</option>
                    <option value="Class III">Class III (Medium)</option>
                    <option value="Class IIII">Class IIII (Ordinary)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Max Capacity (kg):</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={newInstForm.maxCapacityKg}
                    onChange={(e) => setNewInstForm(prev => ({ ...prev, maxCapacityKg: e.target.value }))}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-1">Scale Interval e (g):</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={newInstForm.verificationInterval_e}
                    onChange={(e) => setNewInstForm(prev => ({ ...prev, verificationInterval_e: e.target.value }))}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-medium mb-1">Installed Location / Premise Section:</label>
                <input
                  type="text"
                  placeholder="e.g. Counter 1, Bakery Section, Delivery Bay"
                  value={newInstForm.locationAddress}
                  onChange={(e) => setNewInstForm(prev => ({ ...prev, locationAddress: e.target.value }))}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold cursor-pointer"
                >
                  Save to Registry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
