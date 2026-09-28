import React, { useState, useEffect } from 'react';
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
  Info,
  UploadCloud,
  FileCheck,
  X,
  RefreshCw,
  Wrench,
  History,
  Ban,
  CalendarCheck,
  Eye,
  Trash2,
  Paperclip
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';

export function MerchantPortal({ 
  currentUser,
  merchant,
  selectedMerchant,
  instruments = [], 
  applications = [], 
  certificates = [],
  onOpenCertificate, 
  onOpenQrSticker,
  onSubmitApplication,
  onRegisterInstrument,
  onRescheduleApplication,
  onCancelApplication
}) {
  const activeMerchant = merchant || selectedMerchant || currentUser || {};
  const merchantId = currentUser?.id || activeMerchant.id;

  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [activeTab, setActiveTab] = useState('instruments'); // 'instruments', 'applications', 'rejections'

  // Application Wizard State
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedInstForApp, setSelectedInstForApp] = useState(null);
  const [linkedOriginalApp, setLinkedOriginalApp] = useState(null);
  const [appForm, setAppForm] = useState({
    applicationType: 'Periodic Renewal Verification',
    originalApplicationId: null,
    instrumentCategory: 'Electronic Weighing Scale (Counter/Tabletop)',
    brand: '',
    model: '',
    serialNumber: '',
    accuracyClass: 'Class III',
    maxCapacityKg: 30,
    verificationInterval_e: 5,
    preferredInspectionDate: new Date(Date.now() + 5 * 86400000).toISOString().substring(0, 10),
    paymentMethod: 'BHARATKOSH (Simulated Demo)',
    notes: '',
    repairDeclaration: {
      repairDetails: '',
      repairedBy: '',
      repairAgency: '',
      repairDate: new Date().toISOString().substring(0, 10),
      evidence: ''
    }
  });

  // Statutory Fee Quote & Server Payment State Flow: PENDING -> INITIATING -> INITIATED -> CONFIRMING -> SUCCESS / FAILED
  const [feeQuote, setFeeQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [paymentState, setPaymentState] = useState('PENDING');
  const [paymentRecord, setPaymentRecord] = useState(null);
  const [paymentError, setPaymentError] = useState(null);

  // Simplified New Instrument Registration State (6 core fields + documents + backend rule engine specs)
  const [newInstForm, setNewInstForm] = useState({
    instrumentType: 'Electronic Weighing Scale (Counter/Tabletop)',
    manufacturer: '',
    model: '',
    serialNumber: '',
    capacity: 30,
    installationLocation: activeMerchant?.address || ''
  });
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [docTypeInput, setDocTypeInput] = useState('Purchase Invoice & Tax Bill');
  const [derivedSpecs, setDerivedSpecs] = useState(null);
  const [specLoading, setSpecLoading] = useState(false);
  const [approvedModels, setApprovedModels] = useState([]);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [registerError, setRegisterError] = useState(null);
  const [registerLoading, setRegisterLoading] = useState(false);

  // Timeline & Reschedule / Cancel Modals
  const [timelineModalApp, setTimelineModalApp] = useState(null);
  const [rescheduleModalApp, setRescheduleModalApp] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleError, setRescheduleError] = useState(null);

  const [cancelModalApp, setCancelModalApp] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  // Selected rejection detail modal
  const [viewFailureApp, setViewFailureApp] = useState(null);

  // Filter instruments and applications for this merchant
  const merchantInstruments = instruments.filter(i => i.merchantId === merchantId);
  const merchantApplications = applications.filter(a => a.merchantId === merchantId);
  const rejectedApplications = merchantApplications.filter(a => a.status === 'REJECTED');

  // Statistics
  const totalCount = merchantInstruments.length;
  const verifiedCount = merchantInstruments.filter(i => i.status === 'VERIFIED').length;
  const expiringSoonCount = merchantInstruments.filter(i => i.status === 'EXPIRING_SOON').length;
  const expiredCount = merchantInstruments.filter(i => i.status === 'EXPIRED').length;
  const pendingCount = merchantInstruments.filter(i => i.status === 'PENDING_INSPECTION').length;
  const rejectedCount = rejectedApplications.length;

  const filteredInstruments = merchantInstruments.filter(i => {
    const matchesStatus = filterStatus === 'ALL' || i.status === filterStatus;
    const matchesSearch = searchQuery === '' || 
      i.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.category?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Fetch Central Approved Models list for quick reference / autocomplete
  useEffect(() => {
    api.getApprovedModels().then(res => {
      if (Array.isArray(res)) setApprovedModels(res);
    }).catch(err => console.warn('Could not load approved models catalog:', err));
  }, []);

  // Derive specs from backend rule engine whenever registration inputs change
  useEffect(() => {
    if (!showRegisterModal) return;
    const timer = setTimeout(async () => {
      setSpecLoading(true);
      try {
        const specs = await api.deriveInstrumentSpecs({
          instrumentType: newInstForm.instrumentType,
          capacityKg: Number(newInstForm.capacity) || 10,
          manufacturer: newInstForm.manufacturer,
          model: newInstForm.model
        });
        setDerivedSpecs(specs);
      } catch (e) {
        console.warn('Failed to derive specs from backend rule engine:', e);
      } finally {
        setSpecLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [newInstForm.instrumentType, newInstForm.capacity, newInstForm.manufacturer, newInstForm.model, showRegisterModal]);

  // Reset payment and wizard state
  const resetApplyFlow = () => {
    setSelectedInstForApp(null);
    setLinkedOriginalApp(null);
    setWizardStep(1);
    setFeeQuote(null);
    setPaymentState('PENDING');
    setPaymentRecord(null);
    setPaymentError(null);
    setAppForm({
      applicationType: 'Periodic Renewal Verification',
      originalApplicationId: null,
      instrumentCategory: 'Electronic Weighing Scale (Counter/Tabletop)',
      brand: '',
      model: '',
      serialNumber: '',
      accuracyClass: 'Class III',
      maxCapacityKg: 30,
      verificationInterval_e: 5,
      preferredInspectionDate: new Date(Date.now() + 5 * 86400000).toISOString().substring(0, 10),
      paymentMethod: 'BHARATKOSH (Simulated Demo)',
      notes: '',
      repairDeclaration: {
        repairDetails: '',
        repairedBy: '',
        repairAgency: '',
        repairDate: new Date().toISOString().substring(0, 10),
        evidence: ''
      }
    });
  };

  // Start renewal flow from instrument card
  const handleStartRenewal = (inst) => {
    resetApplyFlow();
    setSelectedInstForApp(inst);
    setAppForm({
      applicationType: inst.status === 'EXPIRED' ? 'Overdue Periodic Verification (Post Expiry)' : 'Periodic Renewal Verification',
      originalApplicationId: null,
      instrumentCategory: inst.category || inst.instrumentType,
      brand: inst.brand || inst.manufacturer,
      model: inst.model,
      serialNumber: inst.serialNumber,
      accuracyClass: inst.accuracyClass,
      maxCapacityKg: inst.maxCapacityKg || inst.capacity,
      verificationInterval_e: inst.verificationInterval_e,
      preferredInspectionDate: new Date(Date.now() + 4 * 86400000).toISOString().substring(0, 10),
      paymentMethod: 'UPI / BHIM QR (Simulated Demo)',
      notes: inst.status === 'EXPIRED' ? 'Late renewal request with statutory fee.' : 'Standard 12-month periodic verification.',
      repairDeclaration: {
        repairDetails: '',
        repairedBy: '',
        repairAgency: '',
        repairDate: new Date().toISOString().substring(0, 10),
        evidence: ''
      }
    });
    setShowApplyModal(true);
  };

  // Start Re-verification After Repair Flow linked to a failed application
  const handleStartReverificationAfterRepair = (failedApp) => {
    resetApplyFlow();
    const linkedInst = merchantInstruments.find(i => i.id === failedApp.instrumentId || i.serialNumber === failedApp.serialNumber);
    setSelectedInstForApp(linkedInst || null);
    setLinkedOriginalApp(failedApp);
    setAppForm({
      applicationType: 'Re-verification After Repair / Recalibration',
      originalApplicationId: failedApp.id,
      instrumentCategory: failedApp.instrumentCategory || linkedInst?.category,
      brand: failedApp.brand || linkedInst?.brand,
      model: failedApp.model || linkedInst?.model,
      serialNumber: failedApp.serialNumber || linkedInst?.serialNumber,
      accuracyClass: failedApp.accuracyClass || linkedInst?.accuracyClass,
      maxCapacityKg: failedApp.maxCapacityKg || linkedInst?.maxCapacityKg,
      verificationInterval_e: failedApp.verificationInterval_e || linkedInst?.verificationInterval_e,
      preferredInspectionDate: new Date(Date.now() + 3 * 86400000).toISOString().substring(0, 10),
      paymentMethod: 'BHARATKOSH (Simulated Demo)',
      notes: `Re-verification requested following repair and rectification for rejected inspection #${failedApp.id}.`,
      repairDeclaration: {
        repairDetails: 'Load cell sensor realignment, leveling bubble restoration, calibration verification against Class M1 test masses.',
        repairedBy: 'Licensed Metrology Technician (Reg. #TECH-MH-2024-881)',
        repairAgency: `${failedApp.brand || 'Authorized'} Metrology Service & Calibration Works`,
        repairDate: new Date().toISOString().substring(0, 10),
        evidence: 'https://legalmetrology.gov.in/docs/repair-job-card-signed.pdf'
      }
    });
    setShowApplyModal(true);
    setWizardStep(2); // Jump directly to verification type & repair declaration details
  };

  // Client fee estimation fallback
  const calculateAppFee = () => {
    let base = 300;
    const cat = appForm.instrumentCategory || '';
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

  // Load Authoritative Fee Quote from Backend
  const handleProceedToFeeStep = async () => {
    // Validate repair declaration if re-verification
    if (appForm.applicationType.includes('Repair') || appForm.originalApplicationId) {
      const rd = appForm.repairDeclaration;
      if (!rd.repairDetails?.trim() || !rd.repairedBy?.trim() || !rd.repairAgency?.trim() || !rd.repairDate?.trim()) {
        alert('All repair declaration fields (Repair Details, Repaired By, Repair Agency, and Repair Date) are mandatory for Re-verification.');
        return;
      }
    }

    setQuoteLoading(true);
    setPaymentError(null);
    setPaymentState('PENDING');
    setPaymentRecord(null);
    setWizardStep(3);

    try {
      const quote = await api.quoteFee({
        instrumentId: selectedInstForApp?.id || null,
        instrumentCategory: selectedInstForApp?.category || appForm.instrumentCategory,
        maxCapacityKg: selectedInstForApp ? selectedInstForApp.maxCapacityKg : Number(appForm.maxCapacityKg),
        accuracyClass: selectedInstForApp ? selectedInstForApp.accuracyClass : appForm.accuracyClass,
        applicationType: appForm.applicationType
      });
      setFeeQuote(quote);
    } catch (err) {
      console.error('Failed to load statutory fee quotation:', err);
      setPaymentError(err.message || 'Could not retrieve authoritative fee quote from government server.');
    } finally {
      setQuoteLoading(false);
    }
  };

  // Initiate Server Payment Order (PENDING -> INITIATED)
  const handleInitiatePayment = async () => {
    setPaymentState('INITIATING');
    setPaymentError(null);
    try {
      const payload = {
        instrumentId: selectedInstForApp?.id || null,
        instrumentCategory: selectedInstForApp?.category || appForm.instrumentCategory,
        maxCapacityKg: selectedInstForApp ? selectedInstForApp.maxCapacityKg : Number(appForm.maxCapacityKg),
        accuracyClass: selectedInstForApp ? selectedInstForApp.accuracyClass : appForm.accuracyClass,
        applicationType: appForm.applicationType,
        gateway: appForm.paymentMethod
      };
      const res = await api.initiatePayment(payload);
      setPaymentRecord(res);
      setPaymentState('INITIATED');
    } catch (err) {
      console.error('Failed to initiate payment order:', err);
      setPaymentError(err.message || 'Failed to initiate simulated payment order.');
      setPaymentState('FAILED');
    }
  };

  // Confirm Server Payment (INITIATED -> SUCCESS / FAILED)
  const handleConfirmPayment = async (simulateSuccess = true) => {
    if (!paymentRecord?.id) return;
    setPaymentState('CONFIRMING');
    setPaymentError(null);
    try {
      const res = await api.confirmPayment(paymentRecord.id, {
        simulateSuccess,
        failureReason: simulateSuccess ? null : 'User simulated payment failure in demo sandbox.'
      });
      setPaymentRecord(res);
      if (simulateSuccess && res.status === 'SUCCESS') {
        setPaymentState('SUCCESS');
      } else {
        setPaymentState('FAILED');
        setPaymentError(res.failureReason || 'Payment simulation failed.');
      }
    } catch (err) {
      console.error('Failed to confirm payment:', err);
      setPaymentError(err.message || 'Payment confirmation failed.');
      setPaymentState('FAILED');
    }
  };

  // Application Submission (Requires confirmed payment & authoritative backend validation)
  const handleApplicationSubmit = async (e) => {
    e.preventDefault();
    if (paymentState !== 'SUCCESS' || !paymentRecord?.id) {
      alert('Statutory fee payment must be confirmed before submitting application.');
      return;
    }

    const appData = {
      ...appForm,
      merchantId: merchantId,
      merchantName: activeMerchant.tradeName || currentUser?.name,
      district: activeMerchant.district || currentUser?.district,
      state: activeMerchant.state || currentUser?.state,
      instrumentId: selectedInstForApp?.id || null,
      statutoryFee: paymentRecord.amount,
      paymentId: paymentRecord.id,
      paymentMethod: paymentRecord.gateway,
      originalApplicationId: appForm.originalApplicationId,
      repairDeclaration: appForm.originalApplicationId ? appForm.repairDeclaration : undefined
    };

    const result = await onSubmitApplication(appData);
    if (result?.success !== false) {
      setShowApplyModal(false);
      resetApplyFlow();

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
    }
  };

  // Document upload handler for registration modal
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const newDoc = {
          id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          type: docTypeInput,
          sizeKb: Math.round(file.size / 1024),
          dataUrl: evt.target.result,
          uploadedAt: new Date().toISOString().substring(0, 10)
        };
        setUploadedDocs(prev => [...prev, newDoc]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  // Simplified Instrument Registration Submit
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegisterError(null);
    setRegisterLoading(true);

    const instData = {
      instrumentType: newInstForm.instrumentType,
      manufacturer: newInstForm.manufacturer,
      model: newInstForm.model,
      serialNumber: newInstForm.serialNumber.trim(),
      capacity: Number(newInstForm.capacity) || 30.0,
      installationLocation: newInstForm.installationLocation || activeMerchant.address || '',
      documents: uploadedDocs
    };

    try {
      const res = await onRegisterInstrument(instData);
      if (res && res.success === false) {
        setRegisterError(res.error || 'Failed to register instrument in National Registry.');
        setRegisterLoading(false);
        return;
      }
      setShowRegisterModal(false);
      setNewInstForm({
        instrumentType: 'Electronic Weighing Scale (Counter/Tabletop)',
        manufacturer: '',
        model: '',
        serialNumber: '',
        capacity: 30,
        installationLocation: activeMerchant?.address || ''
      });
      setUploadedDocs([]);
      setDerivedSpecs(null);
      setRegisterError(null);
      confetti({
        particleCount: 70,
        spread: 50,
        origin: { y: 0.6 }
      });
    } catch (err) {
      setRegisterError(err.message || 'Server rejected registration.');
    } finally {
      setRegisterLoading(false);
    }
  };

  // Handle Reschedule Submit
  const handleRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleModalApp || !rescheduleDate || !rescheduleReason.trim()) {
      alert('Rescheduled appointment date and reason are required.');
      return;
    }
    setRescheduleLoading(true);
    setRescheduleError(null);
    try {
      const res = await onRescheduleApplication(rescheduleModalApp.id, {
        rescheduledDate: rescheduleDate,
        reason: rescheduleReason.trim()
      });
      if (res?.success === false) {
        setRescheduleError(res.error || 'Could not reschedule appointment.');
        return;
      }
      setRescheduleModalApp(null);
      setRescheduleDate('');
      setRescheduleReason('');
    } catch (err) {
      setRescheduleError(err.message || 'Rescheduling failed.');
    } finally {
      setRescheduleLoading(false);
    }
  };

  // Handle Cancel Submit
  const handleCancelSubmit = async (e) => {
    e.preventDefault();
    if (!cancelModalApp || !cancelReason.trim()) {
      alert('Cancellation reason is mandatory.');
      return;
    }
    setCancelLoading(true);
    setCancelError(null);
    try {
      const res = await onCancelApplication(cancelModalApp.id, {
        reason: cancelReason.trim()
      });
      if (res?.success === false) {
        setCancelError(res.error || 'Could not cancel application.');
        return;
      }
      setCancelModalApp(null);
      setCancelReason('');
    } catch (err) {
      setCancelError(err.message || 'Cancellation failed.');
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Merchant Profile Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800 flex-shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900">{activeMerchant.tradeName || currentUser?.name}</h2>
                <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded border border-emerald-200">
                  GSTIN: {activeMerchant.gstin || currentUser?.identifier}
                </span>
                {activeMerchant.licenseNumber && (
                  <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded border border-slate-200">
                    Lic: {activeMerchant.licenseNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {activeMerchant.address ? `${activeMerchant.address} • ` : ''}<strong>{activeMerchant.district || currentUser?.district}, {activeMerchant.state || currentUser?.state}</strong>
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Proprietor: <strong>{activeMerchant.ownerName || currentUser?.name}</strong> {activeMerchant.contactPhone ? `| Contact: ${activeMerchant.contactPhone}` : ''}
              </p>
            </div>
          </div>

          {/* Authenticated Establishment Status */}
          <div className="flex items-center gap-2 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs text-emerald-800 font-bold whitespace-nowrap">
              Authenticated Legal Establishment
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
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
          <span className="text-[10px] text-rose-600 font-medium">100% Late Surcharge</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-indigo-200 shadow-sm">
          <span className="text-xs text-indigo-700 font-medium block flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Under Inspection
          </span>
          <div className="text-2xl font-bold text-indigo-700 mt-1">{pendingCount}</div>
          <span className="text-[10px] text-indigo-600 font-medium">LMO Scheduled</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-red-200 shadow-sm">
          <span className="text-xs text-red-700 font-medium block flex items-center gap-1">
            <Wrench className="w-3.5 h-3.5 text-red-600" /> Failed Verification
          </span>
          <div className="text-2xl font-bold text-red-700 mt-1">{rejectedCount}</div>
          <span className="text-[10px] text-red-600 font-medium">Repair Required</span>
        </div>
      </div>

      {/* Non-Compliant / Rejected Inspection Notice Banner */}
      {rejectedCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-red-900 font-bold text-sm">
              <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0" />
              <span>Section 24 Non-Compliance Notice: {rejectedCount} instrument verification(s) failed statutory inspection</span>
            </div>
            <span className="text-xs text-red-700 font-semibold bg-red-100 px-2.5 py-0.5 rounded border border-red-300">
              Statutory Rectification Notice
            </span>
          </div>
          <p className="text-xs text-red-800">
            Instruments that failed statutory tolerance, visual, repeatability, or corner bias tests must be repaired by an authorized technician and re-verified before commercial use.
          </p>

          <div className="space-y-2 pt-1">
            {rejectedApplications.map((failedApp) => (
              <div key={failedApp.id} className="bg-white rounded-lg p-3 border border-red-200 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{failedApp.brand} {failedApp.model}</span>
                    <span className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">S/N: {failedApp.serialNumber}</span>
                    <span className="font-mono text-[11px] text-red-700 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-200">{failedApp.id}</span>
                  </div>
                  <p className="text-slate-600 mt-1">
                    <strong>Failure Summary:</strong> {failedApp.notes || 'Verification non-compliant.'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setViewFailureApp(failedApp)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Failed Parameters</span>
                  </button>
                  <button
                    onClick={() => handleStartReverificationAfterRepair(failedApp)}
                    className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Request Re-verification After Repair</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
              onClick={() => {
                setRegisterError(null);
                setShowRegisterModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5 text-slate-600" />
              <span>Register Instrument</span>
            </button>

            <button
              onClick={() => {
                resetApplyFlow();
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
                  const linkedApp = merchantApplications.find(a => a.instrumentId === inst.id || a.serialNumber === inst.serialNumber);
                  return (
                    <div key={inst.id} className="p-4 sm:p-5 hover:bg-slate-50/70 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      
                      {/* Instrument Information */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900">{inst.brand || inst.manufacturer} - {inst.model}</span>
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
                          {inst.status === 'REJECTED' && (
                            <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full border border-red-200">
                              <Wrench className="w-3 h-3 text-red-600" /> Verification Failed
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                          <span>Category: <strong>{inst.category || inst.instrumentType}</strong></span>
                          <span>Accuracy: <strong className="text-indigo-700">{inst.accuracyClass}</strong></span>
                          <span>Max Capacity: <strong>{inst.maxCapacityKg || inst.capacity} kg</strong> (e = {inst.verificationInterval_e} g)</span>
                          <span>Model Approval: <strong className="font-mono text-slate-700">{inst.modelApprovalNumber || 'Rule 18 / Statutory NAWI'}</strong></span>
                        </div>

                        <div className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
                          <span>Location: <em>{inst.installationLocation || inst.locationAddress}</em></span>
                          {inst.lastVerificationDate && (
                            <span>Last Stamped: <strong>{inst.lastVerificationDate}</strong></span>
                          )}
                          {inst.validUntilDate && (
                            <span className={inst.status === 'EXPIRED' ? 'text-rose-600 font-bold' : 'text-emerald-700 font-semibold'}>
                              Validity Due: <strong>{inst.validUntilDate}</strong>
                            </span>
                          )}
                          {inst.documents?.length > 0 && (
                            <span className="text-indigo-600 flex items-center gap-1">
                              <Paperclip className="w-3 h-3" />
                              <span>{inst.documents.length} Supporting Doc(s)</span>
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

                        {linkedApp?.status === 'REJECTED' && (
                          <button
                            onClick={() => handleStartReverificationAfterRepair(linkedApp)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                            <span>Re-verify</span>
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
                  <th className="p-3">Type & Origin</th>
                  <th className="p-3">Instrument</th>
                  <th className="p-3">Fee & Payment</th>
                  <th className="p-3">Assigned LMO Officer</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions & Lifecycle</th>
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
                    const canReschedule = ['UNDER_REVIEW', 'SUBMITTED', 'INSPECTION_SCHEDULED'].includes(app.status);
                    const canCancel = ['UNDER_REVIEW', 'SUBMITTED', 'INSPECTION_SCHEDULED'].includes(app.status);
                    return (
                      <tr key={app.id} className="hover:bg-slate-50/70">
                        <td className="p-3 font-mono font-bold text-slate-900">{app.id}</td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-900">{app.applicationType}</div>
                          {app.originalApplicationId && (
                            <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                              Linked to Failed #{app.originalApplicationId}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="font-semibold text-slate-900">{app.brand} {app.model}</div>
                          <div className="font-mono text-[11px] text-slate-500">{app.serialNumber}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900">₹{app.statutoryFee}</div>
                          {app.paymentStatus === 'PAID' ? (
                            <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-0.5">
                              <Check className="w-3 h-3" /> Paid ({(app.paymentReceiptNumber || app.paymentReference || app.paymentTransactionRef || 'Conf')?.substring(0, 14)})
                            </div>
                          ) : (
                            <div className="text-[10px] text-amber-600 font-semibold flex items-center gap-0.5">
                              <Clock className="w-3 h-3" /> Payment Pending
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="font-medium text-slate-900">{app.assignedOfficerName || 'Jurisdiction LMO'}</div>
                          <div className="text-[10px] text-slate-500">{app.scheduledDateTime || app.preferredInspectionDate || 'Slot pending'}</div>
                        </td>
                        <td className="p-3">
                          {app.status === 'VERIFIED_STAMPED' ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[11px]">
                              <CheckCircle className="w-3 h-3 text-emerald-600" /> Stamped & Verified
                            </span>
                          ) : app.status === 'INSPECTION_SCHEDULED' ? (
                            <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-800 font-semibold px-2 py-0.5 rounded text-[11px]">
                              <Calendar className="w-3 h-3 text-indigo-600" /> Scheduled
                            </span>
                          ) : app.status === 'UNDER_REVIEW' ? (
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded text-[11px]">
                              <Clock className="w-3 h-3 text-amber-600" /> Under Review
                            </span>
                          ) : app.status === 'REJECTED' ? (
                            <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded text-[11px]">
                              <Wrench className="w-3 h-3 text-red-600" /> Verification Failed
                            </span>
                          ) : app.status === 'CANCELLED' ? (
                            <span className="inline-flex items-center gap-1 bg-slate-200 text-slate-700 font-medium px-2 py-0.5 rounded text-[11px]">
                              <Ban className="w-3 h-3 text-slate-500" /> Cancelled
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 font-medium px-2 py-0.5 rounded text-[11px]">
                              {app.status}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Track Timeline */}
                            <button
                              onClick={() => setTimelineModalApp(app)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                              title="View Application Lifecycle Timeline"
                            >
                              <History className="w-3 h-3 text-slate-600" />
                              <span>Timeline</span>
                            </button>

                            {/* Failed verification parameter details */}
                            {app.status === 'REJECTED' && (
                              <button
                                onClick={() => setViewFailureApp(app)}
                                className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Failure Details</span>
                              </button>
                            )}

                            {/* Reschedule button */}
                            {canReschedule && (
                              <button
                                onClick={() => {
                                  setRescheduleModalApp(app);
                                  setRescheduleDate(app.scheduledDateTime || app.preferredInspectionDate || '');
                                  setRescheduleReason('');
                                  setRescheduleError(null);
                                }}
                                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                                title="Reschedule Inspection Slot"
                              >
                                <CalendarCheck className="w-3 h-3" />
                                <span>Reschedule</span>
                              </button>
                            )}

                            {/* Cancel button */}
                            {canCancel && (
                              <button
                                onClick={() => {
                                  setCancelModalApp(app);
                                  setCancelReason('');
                                  setCancelError(null);
                                }}
                                className="px-2 py-1 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 rounded text-[11px] font-semibold cursor-pointer"
                                title="Cancel Application"
                              >
                                Cancel
                              </button>
                            )}

                            {/* View Certificate */}
                            {cert && (
                              <button
                                onClick={() => onOpenCertificate(cert)}
                                className="text-emerald-700 hover:text-emerald-800 font-bold text-xs underline cursor-pointer ml-1"
                              >
                                Certificate
                              </button>
                            )}
                          </div>
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
                <span>Category & Repair</span>
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
                            instrumentCategory: inst.category || inst.instrumentType,
                            brand: inst.brand || inst.manufacturer,
                            model: inst.model,
                            serialNumber: inst.serialNumber,
                            accuracyClass: inst.accuracyClass,
                            maxCapacityKg: inst.maxCapacityKg || inst.capacity,
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
                          <div className="font-bold text-slate-900">{inst.brand || inst.manufacturer} - {inst.model}</div>
                          <div className="text-[11px] text-slate-500 font-mono">S/N: {inst.serialNumber} | Class: {inst.accuracyClass}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">Capacity: {inst.maxCapacityKg || inst.capacity} kg | e = {inst.verificationInterval_e} g</div>
                        </div>
                        <div className="text-right">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            inst.status === 'EXPIRED' ? 'bg-rose-100 text-rose-800' :
                            inst.status === 'EXPIRING_SOON' ? 'bg-amber-100 text-amber-800' : 
                            inst.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
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

            {/* Step 2: Verification Type & Repair Declaration */}
            {wizardStep === 2 && (
              <div className="p-6 space-y-4 text-xs max-h-[70vh] overflow-y-auto">
                <h4 className="text-sm font-bold text-slate-900">Verification Application Type</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { type: 'Periodic Renewal Verification', desc: 'Standard 12-month or 24-month statutory cycle' },
                    { type: 'Initial Verification of New Instrument', desc: 'Mandatory before placing in transaction' },
                    { type: 'Re-verification After Repair / Recalibration', desc: 'Required following repair of a failed verification record' }
                  ].map((item) => (
                    <div
                      key={item.type}
                      onClick={() => {
                        setAppForm(prev => ({
                          ...prev,
                          applicationType: item.type,
                          originalApplicationId: item.type.includes('Repair') ? (prev.originalApplicationId || rejectedApplications[0]?.id || null) : null
                        }));
                      }}
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

                {/* Statutory Repair Declaration if Re-verification selected */}
                {(appForm.applicationType.includes('Repair') || appForm.originalApplicationId) && (
                  <div className="bg-red-50/60 border border-red-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-red-900 font-bold text-xs">
                      <Wrench className="w-4 h-4 text-red-600" />
                      <span>Statutory Repair Declaration (Section 24 Compliance)</span>
                    </div>
                    <p className="text-[11px] text-red-800">
                      Re-verification must be formally linked to the original failed inspection record with a certified repair declaration.
                    </p>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Select Original Failed Verification Record:</label>
                      <select
                        value={appForm.originalApplicationId || ''}
                        onChange={(e) => setAppForm(prev => ({ ...prev, originalApplicationId: e.target.value }))}
                        className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white font-mono text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
                      >
                        <option value="">Select failed application...</option>
                        {rejectedApplications.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.id} - {a.brand} {a.model} (S/N: {a.serialNumber}) - Failed: {a.submissionDate}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Repaired By (Technician Name & Lic. ID):</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Ramesh Kumar (Technician #KA-TECH-409)"
                          value={appForm.repairDeclaration?.repairedBy || ''}
                          onChange={(e) => setAppForm(prev => ({
                            ...prev,
                            repairDeclaration: { ...prev.repairDeclaration, repairedBy: e.target.value }
                          }))}
                          className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Repair Agency / Service Center:</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Essae Authorized Metrology Service Works"
                          value={appForm.repairDeclaration?.repairAgency || ''}
                          onChange={(e) => setAppForm(prev => ({
                            ...prev,
                            repairDeclaration: { ...prev.repairDeclaration, repairAgency: e.target.value }
                          }))}
                          className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Repair Completion Date:</label>
                        <input
                          type="date"
                          required
                          value={appForm.repairDeclaration?.repairDate || ''}
                          onChange={(e) => setAppForm(prev => ({
                            ...prev,
                            repairDeclaration: { ...prev.repairDeclaration, repairDate: e.target.value }
                          }))}
                          className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Repair Evidence URL / Job Card Reference:</label>
                        <input
                          type="text"
                          placeholder="e.g. Job card #JC-2026-9912 / invoice link"
                          value={appForm.repairDeclaration?.evidence || ''}
                          onChange={(e) => setAppForm(prev => ({
                            ...prev,
                            repairDeclaration: { ...prev.repairDeclaration, evidence: e.target.value }
                          }))}
                          className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Details of Repair & Recalibration Work Executed:</label>
                      <textarea
                        rows={2}
                        required
                        placeholder="e.g., Replacement of damaged strain gauge load cell, corner load balancing, spirit bubble leveling calibration..."
                        value={appForm.repairDeclaration?.repairDetails || ''}
                        onChange={(e) => setAppForm(prev => ({
                          ...prev,
                          repairDeclaration: { ...prev.repairDeclaration, repairDetails: e.target.value }
                        }))}
                        className="w-full border border-slate-300 rounded p-2 bg-white text-xs focus:ring-1 focus:ring-red-500 focus:outline-none"
                      ></textarea>
                    </div>
                  </div>
                )}

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
                    onClick={handleProceedToFeeStep}
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
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">
                    Statutory Fee Calculation (Schedule XII, Legal Metrology Rules 2011)
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    Demo Payment Simulation Mode
                  </span>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-900 text-xs">
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    <Info className="w-4 h-4 text-amber-700 flex-shrink-0" />
                    <span>Simulated Sandbox Environment (No Real Money Debited)</span>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Legal Metrology verification fees are computed authoritatively by the backend engine per Schedule XII. Live payment gateways (BharatKosh NTRP, UPI QR, Treasury NetBanking) are operated in demonstration simulation mode for testing.
                  </p>
                </div>

                {quoteLoading ? (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center text-slate-600">
                    Calculating authoritative statutory fee from government schedule...
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 space-y-3">
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-slate-600">Instrument Classification Fee:</span>
                      <span className="font-semibold text-slate-900">₹{feeQuote?.baseFee ?? currentFee.base}</span>
                    </div>
                    {(feeQuote?.penalty > 0 || currentFee.penalty > 0) && (
                      <div className="flex justify-between border-b pb-2 text-rose-600 font-semibold">
                        <span>Statutory Late Fee Surcharge (100% per Sec 24):</span>
                        <span>+ ₹{feeQuote?.penalty ?? currentFee.penalty}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-b pb-2 text-slate-600">
                      <span>GST (Exempt under Govt. Statutory Fee notification):</span>
                      <span>₹0</span>
                    </div>
                    <div className="flex justify-between text-base font-bold text-slate-900 pt-1">
                      <span>Total Fee Payable to Government:</span>
                      <span className="text-emerald-700">₹{feeQuote?.totalFee ?? currentFee.total}</span>
                    </div>
                    <div className="text-[10px] text-slate-500 pt-1 border-t">
                      Statutory Basis: {feeQuote?.statutoryRuleRef || 'Schedule XII, Legal Metrology (General) Rules, 2011'}
                    </div>
                  </div>
                )}

                <div>
                  <span className="font-bold text-slate-800 block mb-2">Select Government Payment Gateway (Simulation):</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      'BHARATKOSH (Simulated Demo)',
                      'UPI / BHIM QR (Simulated Demo)',
                      'Treasury Net Banking (Simulated Demo)'
                    ].map(gateway => (
                      <div
                        key={gateway}
                        onClick={() => {
                          if (paymentState === 'PENDING' || paymentState === 'FAILED') {
                            setAppForm(prev => ({ ...prev, paymentMethod: gateway }));
                          }
                        }}
                        className={`p-2.5 rounded border text-center transition ${
                          paymentState !== 'PENDING' && paymentState !== 'FAILED'
                            ? 'cursor-not-allowed opacity-75'
                            : 'cursor-pointer'
                        } ${
                          appForm.paymentMethod === gateway
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <CreditCard className="w-4 h-4 mx-auto mb-1 text-slate-600" />
                        <span className="text-[11px] block">{gateway}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment State Controller */}
                {paymentState === 'PENDING' && (
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={quoteLoading}
                      onClick={handleInitiatePayment}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-lg text-xs shadow transition cursor-pointer flex items-center justify-center gap-2"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>Initiate Simulated Payment of ₹{feeQuote?.totalFee ?? currentFee.total}</span>
                    </button>
                  </div>
                )}

                {paymentState === 'INITIATING' && (
                  <div className="p-3 bg-slate-100 rounded-lg text-center text-xs text-slate-600">
                    Initiating simulated payment session with server...
                  </div>
                )}

                {paymentState === 'INITIATED' && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-900 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        <span>Payment Order Initiated</span>
                      </span>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                        {paymentRecord?.id}
                      </span>
                    </div>
                    <div className="text-[11px] text-blue-800 space-y-1">
                      <div><strong>Gateway Mode:</strong> {paymentRecord?.gateway}</div>
                      <div><strong>Transaction Reference:</strong> <span className="font-mono">{paymentRecord?.transactionReference}</span></div>
                      <div><strong>Statutory Amount:</strong> ₹{paymentRecord?.amount}</div>
                    </div>
                    <div className="pt-2 border-t border-blue-200 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleConfirmPayment(true)}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs cursor-pointer shadow flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Simulate Successful Payment</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConfirmPayment(false)}
                        className="py-2 px-3 bg-rose-100 hover:bg-rose-200 text-rose-800 font-semibold rounded text-xs cursor-pointer transition"
                      >
                        Simulate Failure
                      </button>
                    </div>
                  </div>
                )}

                {paymentState === 'CONFIRMING' && (
                  <div className="p-3 bg-slate-100 rounded-lg text-center text-xs text-slate-600">
                    Processing simulated settlement on server...
                  </div>
                )}

                {paymentState === 'SUCCESS' && (
                  <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-lg space-y-2 text-xs text-emerald-900">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <span>Payment Confirmed (Simulated Sandbox)</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 font-mono text-[10px] font-bold">
                        {paymentRecord?.receiptNumber}
                      </span>
                    </div>
                    <div className="text-[11px] space-y-0.5 text-emerald-800">
                      <div><strong>Amount Paid:</strong> ₹{paymentRecord?.amount} (GST Exempt)</div>
                      <div><strong>Transaction Ref:</strong> <span className="font-mono">{paymentRecord?.transactionReference}</span></div>
                      <div><strong>Gateway Mode:</strong> {paymentRecord?.gateway}</div>
                      <div><strong>Confirmed At:</strong> {new Date(paymentRecord?.confirmedAt || Date.now()).toLocaleString()}</div>
                    </div>
                  </div>
                )}

                {paymentState === 'FAILED' && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs space-y-2">
                    <div className="text-rose-800 font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Payment Simulation Failed: {paymentError || paymentRecord?.failureReason || 'Transaction rejected in demo sandbox.'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleInitiatePayment}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-xs cursor-pointer shadow transition"
                    >
                      Retry Payment Simulation
                    </button>
                  </div>
                )}

                <div className="pt-4 border-t flex justify-between items-center">
                  <button
                    onClick={() => setWizardStep(2)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    ← Back
                  </button>
                  {paymentState === 'SUCCESS' ? (
                    <button
                      onClick={() => setWizardStep(4)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Proceed to Slot Booking →</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 italic">Confirmed payment required to proceed</span>
                      <button
                        disabled
                        className="px-4 py-2 bg-slate-200 text-slate-400 rounded-lg text-xs font-semibold cursor-not-allowed"
                      >
                        Proceed to Slot Booking →
                      </button>
                    </div>
                  )}
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
                      value={`${activeMerchant.district || currentUser?.district || 'District'} Sub-division, ${activeMerchant.state || currentUser?.state || 'State'}`}
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
                    <strong>Statutory Fee Paid: ₹{paymentRecord?.amount ?? feeQuote?.totalFee ?? currentFee.total}</strong> via {paymentRecord?.gateway || appForm.paymentMethod} (Receipt: {paymentRecord?.receiptNumber || 'Pending'}). An electronic receipt and application tracking ID will be generated upon confirmation.
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

      {/* Simplified Instrument Registration Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm tracking-wide">
                  Register Instrument in National Metrology Fleet
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Statutory Rule Engine automatically derives accuracy class, interval e, verification rules & fee
                </p>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-slate-400 hover:text-white transition cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            {/* Error Banner */}
            {registerError && (
              <div className="bg-rose-50 border-b border-rose-200 p-3.5 text-rose-800 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span className="font-semibold">{registerError}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="p-6 space-y-4 text-xs max-h-[78vh] overflow-y-auto">
              
              {/* 1. Instrument Type */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">1. Instrument Type / Category:</label>
                <select
                  value={newInstForm.instrumentType}
                  onChange={(e) => setNewInstForm(prev => ({ ...prev, instrumentType: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none bg-white"
                >
                  <option value="Electronic Weighing Scale (Counter/Tabletop)">Electronic Weighing Scale (Counter/Tabletop)</option>
                  <option value="Platform Scale / Heavy Bench Scale">Platform Scale / Heavy Bench Scale</option>
                  <option value="Precision Analytical Balance (Jeweler/Lab)">Precision Analytical Balance (Jeweler/Lab)</option>
                  <option value="Weighbridge (Lorry/Truck)">Weighbridge (Lorry/Truck)</option>
                  <option value="Fuel Dispensing Unit (Petrol/Diesel)">Fuel Dispensing Unit (Petrol/Diesel)</option>
                  <option value="Flow Meter / Bulk Liquid Measure">Flow Meter / Bulk Liquid Measure</option>
                </select>
              </div>

              {/* 2 & 3. Manufacturer & Model with Central Model Approval Search */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-700 font-bold">2 & 3. Manufacturer & Model Name:</label>
                  <button
                    type="button"
                    onClick={() => setShowModelPicker(!showModelPicker)}
                    className="text-indigo-600 hover:text-indigo-800 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Search className="w-3 h-3" />
                    <span>Search Approved Models Registry</span>
                  </button>
                </div>

                {showModelPicker && (
                  <div className="bg-indigo-50/70 border border-indigo-200 rounded-lg p-3 space-y-2">
                    <span className="text-[11px] font-bold text-indigo-900 block">
                      Select Verified Model from National Model Approval Registry:
                    </span>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {approvedModels
                        .filter(m => !newInstForm.instrumentType || m.instrumentType.toLowerCase().includes(newInstForm.instrumentType.toLowerCase().substring(0, 10)))
                        .map(m => (
                          <div
                            key={m.modelApprovalNumber}
                            onClick={() => {
                              setNewInstForm(prev => ({
                                ...prev,
                                instrumentType: m.instrumentType,
                                manufacturer: m.manufacturer,
                                model: m.model,
                                capacity: m.maxCapacityKg
                              }));
                              setShowModelPicker(false);
                            }}
                            className="p-2 rounded bg-white hover:bg-indigo-100/60 border border-indigo-100 cursor-pointer text-[11px] flex items-center justify-between transition"
                          >
                            <div>
                              <strong>{m.manufacturer}</strong> - {m.model}
                              <div className="text-slate-500 text-[10px]">Cap: {m.maxCapacityKg}kg • {m.accuracyClass} (e={m.verificationInterval_e}g)</div>
                            </div>
                            <span className="font-mono text-[10px] bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.5 rounded">
                              {m.modelApprovalNumber}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Manufacturer / Make:</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Essae-Teraoka, Avery, Mettler"
                      value={newInstForm.manufacturer}
                      onChange={(e) => setNewInstForm(prev => ({ ...prev, manufacturer: e.target.value }))}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
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
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 4 & 5. Serial Number & Capacity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">4. Serial Number (Unique):</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ES-2026-99120"
                    value={newInstForm.serialNumber}
                    onChange={(e) => setNewInstForm(prev => ({ ...prev, serialNumber: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none bg-white font-bold"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Factory stamp / serial plate number</span>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">5. Maximum Capacity (kg):</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 30"
                    value={newInstForm.capacity}
                    onChange={(e) => setNewInstForm(prev => ({ ...prev, capacity: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Instrument nominal max capacity</span>
                </div>
              </div>

              {/* 6. Installation Location */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">6. Installation Location Address / Section:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Counter #1, Billing & Packaging Bay, Bandra West"
                  value={newInstForm.installationLocation}
                  onChange={(e) => setNewInstForm(prev => ({ ...prev, installationLocation: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Statutory Specification Derivation Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Statutory Rule Engine Derivation</span>
                  </span>
                  {specLoading ? (
                    <span className="text-[10px] text-indigo-600 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Deriving...
                    </span>
                  ) : derivedSpecs?.isApprovedModel ? (
                    <span className="font-mono text-[10px] bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded border border-emerald-300">
                      Approved: {derivedSpecs.modelApprovalNumber}
                    </span>
                  ) : (
                    <span className="text-[10px] bg-slate-200 text-slate-700 font-medium px-2 py-0.5 rounded">
                      Standard Statutory NAWI Heuristic
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-slate-500 block text-[10px]">Accuracy Class</span>
                    <strong className="text-indigo-700">{derivedSpecs?.accuracyClass || 'Class III'}</strong>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-slate-500 block text-[10px]">Verification Interval (e)</span>
                    <strong className="text-slate-900">{derivedSpecs?.verificationInterval_e ?? 5} g</strong>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-slate-500 block text-[10px]">Verification Cycle</span>
                    <strong className="text-slate-900">{derivedSpecs?.verificationPeriodMonths || 12} Months</strong>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-slate-500 block text-[10px]">Fee Category</span>
                    <strong className="text-slate-900 truncate block">{derivedSpecs?.feeCategory || 'Counter Scale'}</strong>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200">
                  Applicable Rules: <em>{derivedSpecs?.applicableRules || 'Schedule VI & XII, Legal Metrology (General) Rules, 2011'}</em>
                </div>
              </div>

              {/* Supporting Document / Evidence Upload Mechanism */}
              <div className="border border-slate-200 rounded-xl p-3.5 space-y-2 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                    <UploadCloud className="w-4 h-4 text-emerald-600" />
                    <span>Supporting Registration Documents & Evidence (Optional / Statutory)</span>
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {uploadedDocs.length} uploaded
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  <select
                    value={docTypeInput}
                    onChange={(e) => setDocTypeInput(e.target.value)}
                    className="w-full sm:w-56 border border-slate-300 rounded px-2 py-1.5 text-xs bg-white focus:outline-none"
                  >
                    <option value="Purchase Invoice & Tax Bill">Purchase Invoice & Tax Bill</option>
                    <option value="Nameplate & Model Stamp Photo">Nameplate & Model Stamp Photo</option>
                    <option value="Manufacturer Calibration Certificate">Manufacturer Calibration Certificate</option>
                    <option value="Existing Verification Certificate">Existing Verification Certificate</option>
                    <option value="Warranty & Sale Document">Warranty & Sale Document</option>
                  </select>

                  <label className="w-full sm:flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-dashed border-emerald-400 hover:bg-emerald-50/50 text-emerald-800 rounded text-xs font-semibold cursor-pointer transition">
                    <Paperclip className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Upload Document / Photo</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {uploadedDocs.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {uploadedDocs.map((doc, idx) => (
                      <div key={doc.id || idx} className="bg-white p-2 rounded border border-slate-200 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <FileCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                          <span className="font-medium text-slate-800 truncate">{doc.name}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded shrink-0">{doc.type}</span>
                          {doc.sizeKb && <span className="text-[10px] text-slate-400 shrink-0">({doc.sizeKb} KB)</span>}
                        </div>
                        <button
                          type="button"
                          onClick={() => setUploadedDocs(prev => prev.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-rose-600 cursor-pointer p-1"
                          title="Remove document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registerLoading}
                  className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer flex items-center gap-1.5"
                >
                  {registerLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Registering...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Register Instrument</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Application Lifecycle Timeline Modal */}
      {timelineModalApp && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm tracking-wide">
                    Application Lifecycle Timeline
                  </h3>
                  <span className="font-mono text-xs bg-slate-800 text-emerald-400 font-bold px-2 py-0.5 rounded border border-slate-700">
                    {timelineModalApp.id}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {timelineModalApp.brand} {timelineModalApp.model} (S/N: {timelineModalApp.serialNumber})
                </p>
              </div>
              <button
                onClick={() => setTimelineModalApp(null)}
                className="text-slate-400 hover:text-white transition cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {(timelineModalApp.timeline && timelineModalApp.timeline.length > 0
                  ? timelineModalApp.timeline
                  : [
                      {
                        status: 'SUBMITTED',
                        title: 'Application Submitted',
                        timestamp: timelineModalApp.submissionDate || '2026-09-22',
                        actor: timelineModalApp.merchantName,
                        actorRole: 'MERCHANT',
                        description: `Verification application filed for ${timelineModalApp.instrumentCategory} (S/N: ${timelineModalApp.serialNumber}).`
                      },
                      {
                        status: 'PAYMENT_CONFIRMED',
                        title: 'Statutory Fee Confirmed',
                        timestamp: timelineModalApp.submissionDate || '2026-09-22',
                        actor: 'BharatKosh / Statutory Treasury',
                        actorRole: 'SYSTEM',
                        description: `Statutory verification fee of ₹${timelineModalApp.statutoryFee} confirmed.`
                      },
                      {
                        status: 'OFFICER_ASSIGNED',
                        title: 'Legal Metrology Officer Assigned',
                        timestamp: timelineModalApp.submissionDate || '2026-09-22',
                        actor: timelineModalApp.assignedOfficerName || 'Legal Metrology Officer',
                        actorRole: 'INSPECTOR',
                        description: `Assigned for field verification in ${timelineModalApp.district}.`
                      }
                    ]
                ).map((evt, idx) => {
                  const isSuccess = ['VERIFICATION_PASSED', 'CERTIFICATE_ISSUED', 'PAYMENT_CONFIRMED', 'REPAIR_DECLARED'].includes(evt.status);
                  const isFail = ['VERIFICATION_FAILED', 'APPLICATION_CANCELLED'].includes(evt.status);
                  const isPending = ['SUBMITTED', 'INSPECTION_SCHEDULED', 'INSPECTION_RESCHEDULED', 'OFFICER_ASSIGNED'].includes(evt.status);

                  return (
                    <div key={evt.id || idx} className="relative group">
                      <span className={`absolute -left-6 top-1 w-4 h-4 rounded-full border-2 flex items-center justify-center bg-white ${
                        isSuccess ? 'border-emerald-500 text-emerald-500' :
                        isFail ? 'border-red-500 text-red-500' : 'border-indigo-500 text-indigo-500'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isSuccess ? 'bg-emerald-500' :
                          isFail ? 'bg-red-500' : 'bg-indigo-500'
                        }`} />
                      </span>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className="font-bold text-slate-900">{evt.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{evt.timestamp}</span>
                        </div>
                        <p className="text-slate-600 text-[11px]">{evt.description}</p>
                        <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-500">
                          <span>Actor: <strong>{evt.actor}</strong></span>
                          {evt.actorRole && (
                            <span className="bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-semibold text-[9px]">
                              {evt.actorRole}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setTimelineModalApp(null)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Failed Parameters & Section 24 Notice Modal */}
      {viewFailureApp && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden border border-red-200">
            <div className="bg-red-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-400" />
                  <h3 className="font-bold text-sm tracking-wide">
                    Section 24 Rectification & Inspection Failure Report
                  </h3>
                </div>
                <p className="text-[11px] text-red-200 mt-0.5">
                  Application #{viewFailureApp.id} • {viewFailureApp.brand} {viewFailureApp.model} (S/N: {viewFailureApp.serialNumber})
                </p>
              </div>
              <button
                onClick={() => setViewFailureApp(null)}
                className="text-red-200 hover:text-white transition cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-900 text-xs">
                <span className="font-bold block mb-1">Official Legal Metrology Non-Compliance Notice:</span>
                <p className="text-[11px] text-red-800">
                  The instrument failed statutory verification tests conducted under the Legal Metrology (General) Rules, 2011. Commercial use of an unstamped/failed instrument is prohibited under Section 24 and attracts penalties under Section 30.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-2">Non-Compliant Parameters & Observed Deviations:</h4>
                <div className="space-y-2.5">
                  {(viewFailureApp.failedParameters && viewFailureApp.failedParameters.length > 0
                    ? viewFailureApp.failedParameters
                    : [
                        {
                          parameter: 'Repeatability Test (3 Cycle Variance)',
                          observedValue: '0.450 g error difference',
                          statutoryLimit: '±0.150 g MPE',
                          reason: 'Maximum variation between consecutive weighings exceeded statutory tolerance limit.',
                          evidence: 'Observed during on-site inspection'
                        }
                      ]
                  ).map((param, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between border-b pb-1.5">
                        <span className="font-bold text-red-900">{param.parameter}</span>
                        <span className="bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded text-[10px]">
                          FAILED
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-500 block text-[10px]">Observed Measurement Value:</span>
                          <strong className="text-red-700 font-mono">{param.observedValue}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Statutory Permissible Limit:</span>
                          <strong className="text-slate-800 font-mono">{param.statutoryLimit}</strong>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-600 pt-1">
                        <strong>Reason:</strong> {param.reason}
                      </div>
                      {param.evidence && (
                        <div className="text-[10px] text-slate-500 pt-0.5 font-mono">
                          Evidence: {param.evidence}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-800 block mb-1">Inspector Remarks:</span>
                <p className="text-slate-600 text-[11px]">
                  {viewFailureApp.notes || 'Verification failed. Rectification notice issued.'}
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <button
                onClick={() => setViewFailureApp(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const target = viewFailureApp;
                  setViewFailureApp(null);
                  handleStartReverificationAfterRepair(target);
                }}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Request Re-verification After Repair</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleModalApp && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm tracking-wide">
                Reschedule Verification Appointment
              </h3>
              <button
                onClick={() => setRescheduleModalApp(null)}
                className="text-slate-400 hover:text-white transition cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            {rescheduleError && (
              <div className="p-3 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs">
                {rescheduleError}
              </div>
            )}

            <form onSubmit={handleRescheduleSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Application:</span>
                <strong className="text-slate-900">{rescheduleModalApp.id} ({rescheduleModalApp.brand} {rescheduleModalApp.model})</strong>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">New Requested Inspection Date & Time:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026-10-05 11:30 AM"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Reason for Rescheduling (Mandatory):</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Premise undergoing maintenance / Annual inventory audit scheduled on current slot..."
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                ></textarea>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRescheduleModalApp(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rescheduleLoading}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded text-xs font-bold cursor-pointer"
                >
                  {rescheduleLoading ? 'Updating...' : 'Submit Reschedule Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModalApp && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm tracking-wide">
                Cancel Verification Application
              </h3>
              <button
                onClick={() => setCancelModalApp(null)}
                className="text-slate-400 hover:text-white transition cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            {cancelError && (
              <div className="p-3 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs">
                {cancelError}
              </div>
            )}

            <form onSubmit={handleCancelSubmit} className="p-6 space-y-4 text-xs">
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-amber-900 text-xs">
                <strong>Notice:</strong> Cancelling application #{cancelModalApp.id} will release the assigned inspection slot.
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Reason for Cancellation (Mandatory):</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Instrument decommissioned / transferred to another warehouse..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none"
                ></textarea>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCancelModalApp(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold cursor-pointer"
                >
                  Keep Application
                </button>
                <button
                  type="submit"
                  disabled={cancelLoading}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white rounded text-xs font-bold cursor-pointer"
                >
                  {cancelLoading ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
