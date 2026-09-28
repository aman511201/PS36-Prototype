import React, { useState, useEffect } from 'react';
import { 
  Scale, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  ShieldCheck, 
  FileText, 
  UserCheck, 
  Calendar, 
  Award, 
  Eye, 
  CheckSquare, 
  Sliders, 
  Check, 
  X, 
  ArrowRight,
  Sparkles,
  QrCode,
  Lock,
  Clock,
  Scan,
  RefreshCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';

export function calculateStatutoryMpe({
  accuracyClass = 'Class III',
  verificationInterval_e = 5.0,
  testLoadKg = 15.0,
  verificationType = 'periodic'
}) {
  const e = parseFloat(verificationInterval_e) || 1.0;
  const loadGrams = (parseFloat(testLoadKg) || 0) * 1000.0;
  const n = e > 0 ? loadGrams / e : 0;

  let mpeInE = 1.0;
  if (accuracyClass === 'Class I') {
    if (n <= 50000) mpeInE = 0.5;
    else if (n <= 200000) mpeInE = 1.0;
    else mpeInE = 1.5;
  } else if (accuracyClass === 'Class II') {
    if (n <= 5000) mpeInE = 0.5;
    else if (n <= 20000) mpeInE = 1.0;
    else mpeInE = 1.5;
  } else if (accuracyClass === 'Class III' || !accuracyClass) {
    if (n <= 500) mpeInE = 0.5;
    else if (n <= 2000) mpeInE = 1.0;
    else mpeInE = 1.5;
  } else {
    // Class IIII
    if (n <= 50) mpeInE = 0.5;
    else if (n <= 200) mpeInE = 1.0;
    else mpeInE = 1.5;
  }

  const multiplier = verificationType === 'initial' ? 1.0 : 2.0;
  return parseFloat((mpeInE * e * multiplier).toFixed(3));
}

export function LmoInspectorPortal({ 
  currentUser,
  officer,
  selectedOfficer: legacyOfficer,
  applications = [], 
  certificates = [], 
  onInspectApplication,
  onOpenCertificate
}) {
  const currentOfficer = officer || legacyOfficer || currentUser || {};
  const officerId = currentUser?.id || currentOfficer.id;
  const officerName = currentUser?.name || currentOfficer.name;
  const officerBadge = currentUser?.identifier || currentOfficer.badgeNumber;
  const officerDistrict = currentUser?.district || currentUser?.jurisdictionDistrict || currentOfficer.jurisdictionDistrict;
  const officerState = currentUser?.state || currentUser?.jurisdictionState || currentOfficer.jurisdictionState;
  const officerDesignation = currentUser?.designation || currentOfficer.designation || 'Legal Metrology Officer';

  const [selectedApp, setSelectedApp] = useState(null);
  const [activeTab, setActiveTab] = useState('queue'); // 'queue', 'testing', 'completed'

  // Application Lifecycle Timeline & Officer Reschedule Modals
  const [timelineModalApp, setTimelineModalApp] = useState(null);
  const [rescheduleModalApp, setRescheduleModalApp] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [officerRemarks, setOfficerRemarks] = useState('');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleError, setRescheduleError] = useState(null);

  // Verification Suite Form State - all mandatory checks must be physically completed
  const [visualCheck, setVisualCheck] = useState({
    enclosureIntact: false,
    levelingCentered: false,
    modelApprovalPlatePresent: false,
    environmentalCheckPassed: false
  });

  const [testLoads, setTestLoads] = useState([
    { name: '10% Min Load', loadKg: 3.0, observedKg: '', mpeGrams: 2.0, passed: null, status: 'NOT_TESTED' },
    { name: '50% Half Capacity', loadKg: 15.0, observedKg: '', mpeGrams: 4.0, passed: null, status: 'NOT_TESTED' },
    { name: '100% Max Capacity', loadKg: 30.0, observedKg: '', mpeGrams: 5.0, passed: null, status: 'NOT_TESTED' }
  ]);

  // Repeatability Test State: 3 numeric cycle readings on identical test mass
  const [repeatabilityLoadKg, setRepeatabilityLoadKg] = useState(15.0);
  const [repeatabilityReadings, setRepeatabilityReadings] = useState(['', '', '']);

  // Eccentricity Test State: 4 quadrant corner readings with 1/3 capacity
  const [eccentricityLoadKg, setEccentricityLoadKg] = useState(10.0);
  const [eccentricityReadings, setEccentricityReadings] = useState({
    cornerA: '',
    cornerB: '',
    cornerC: '',
    cornerD: ''
  });

  // Physical Security Seals - initialized empty / Not Assigned until validated against government inventory
  const [leadSealNo, setLeadSealNo] = useState('');
  const [hologramNo, setHologramNo] = useState('');
  const [leadSealValidation, setLeadSealValidation] = useState({ status: 'UNASSIGNED', message: '', loading: false, seal: null });
  const [hologramValidation, setHologramValidation] = useState({ status: 'UNASSIGNED', message: '', loading: false, seal: null });
  const [allocatedSeals, setAllocatedSeals] = useState({ leadSeals: [], holograms: [] });
  const [loadingSeals, setLoadingSeals] = useState(false);
  const [sealSubmissionError, setSealSubmissionError] = useState(null);

  const [inspectorNotes, setInspectorNotes] = useState('Tested with standard Class M1 calibrated test weights. All error points within statutory tolerance.');

  // Fetch official allocated security seals for this inspecting officer from server
  const fetchOfficerSeals = async (targetId) => {
    const idToFetch = targetId || officerId;
    if (!idToFetch) return;
    setLoadingSeals(true);
    try {
      const res = await api.getSealInventory({ status: 'AVAILABLE', officerId: idToFetch });
      if (res && res.seals) {
        setAllocatedSeals({
          leadSeals: res.seals.filter(s => s.sealType === 'LEAD_WIRE_SEAL'),
          holograms: res.seals.filter(s => s.sealType === 'HOLOGRAM_STICKER')
        });
      }
    } catch (e) {
      console.warn('Could not load official seal inventory from server:', e);
    } finally {
      setLoadingSeals(false);
    }
  };

  useEffect(() => {
    if (officerId) {
      fetchOfficerSeals(officerId);
    }
  }, [officerId]);

  // Live Backend Seal Verification against Official Government Inventory
  const handleValidateLeadSeal = async (customVal) => {
    const valToTest = (customVal !== undefined ? customVal : leadSealNo).trim();
    if (!valToTest) {
      setLeadSealValidation({ status: 'UNASSIGNED', message: 'Physical seal number cannot be empty', loading: false, seal: null });
      return;
    }
    setLeadSealValidation(prev => ({ ...prev, loading: true, message: '' }));
    try {
      const res = await api.validateSeal(valToTest, 'LEAD_WIRE_SEAL', officerId);
      if (res && res.valid) {
        setLeadSealValidation({
          status: 'VALID',
          message: res.message || `Authentic & Available (Batch: ${res.seal?.batchNumber || 'Govt Pool'})`,
          loading: false,
          seal: res.seal
        });
        setSealSubmissionError(null);
      } else {
        setLeadSealValidation({
          status: 'INVALID',
          message: res?.error || 'Physical seal not recognized in official government inventory',
          loading: false,
          seal: res?.seal || null
        });
      }
    } catch (err) {
      setLeadSealValidation({
        status: 'INVALID',
        message: err.message || 'Seal validation request failed',
        loading: false,
        seal: null
      });
    }
  };

  const handleValidateHologram = async (customVal) => {
    const valToTest = (customVal !== undefined ? customVal : hologramNo).trim();
    if (!valToTest) {
      setHologramValidation({ status: 'UNASSIGNED', message: 'Hologram barcode ID cannot be empty', loading: false, seal: null });
      return;
    }
    setHologramValidation(prev => ({ ...prev, loading: true, message: '' }));
    try {
      const res = await api.validateSeal(valToTest, 'HOLOGRAM_STICKER', officerId);
      if (res && res.valid) {
        setHologramValidation({
          status: 'VALID',
          message: res.message || `Authentic & Available (Batch: ${res.seal?.batchNumber || 'Govt Pool'})`,
          loading: false,
          seal: res.seal
        });
        setSealSubmissionError(null);
      } else {
        setHologramValidation({
          status: 'INVALID',
          message: res?.error || 'Hologram barcode not recognized in official government inventory',
          loading: false,
          seal: res?.seal || null
        });
      }
    } catch (err) {
      setHologramValidation({
        status: 'INVALID',
        message: err.message || 'Hologram validation request failed',
        loading: false,
        seal: null
      });
    }
  };

  // Filter applications for this officer's jurisdiction
  const officerQueue = applications.filter(a => 
    (a.district || '').toLowerCase() === (officerDistrict || '').toLowerCase() ||
    a.assignedOfficerId === officerId
  );

  const pendingQueue = officerQueue.filter(a => a.status !== 'VERIFIED_STAMPED' && a.status !== 'REJECTED');
  const completedQueue = officerQueue.filter(a => a.status === 'VERIFIED_STAMPED');

  // Select application to start testing
  const handleStartInspection = (app) => {
    setSelectedApp(app);
    const max = Number(app.maxCapacityKg) || 30;
    const e = Number(app.verificationInterval_e) || 5;

    // Reset visual inspection checklist - all mandatory checks must be performed by officer
    setVisualCheck({
      enclosureIntact: false,
      levelingCentered: false,
      modelApprovalPlatePresent: false,
      environmentalCheckPassed: false
    });

    // Initialize realistic test loads for this instrument capacity - empty measurements, Not Tested
    const minLoad = parseFloat((max * 0.1).toFixed(3));
    const halfLoad = parseFloat((max * 0.5).toFixed(3));
    const maxLoad = max;

    setTestLoads([
      {
        name: 'Min / 10% Load',
        loadKg: minLoad,
        observedKg: '',
        mpeGrams: calculateStatutoryMpe({ accuracyClass: app.accuracyClass, verificationInterval_e: e, testLoadKg: minLoad }),
        passed: null,
        status: 'NOT_TESTED'
      },
      {
        name: '50% Half Load',
        loadKg: halfLoad,
        observedKg: '',
        mpeGrams: calculateStatutoryMpe({ accuracyClass: app.accuracyClass, verificationInterval_e: e, testLoadKg: halfLoad }),
        passed: null,
        status: 'NOT_TESTED'
      },
      {
        name: '100% Max Load',
        loadKg: maxLoad,
        observedKg: '',
        mpeGrams: calculateStatutoryMpe({ accuracyClass: app.accuracyClass, verificationInterval_e: e, testLoadKg: maxLoad }),
        passed: null,
        status: 'NOT_TESTED'
      }
    ]);

    setRepeatabilityLoadKg(halfLoad);
    setRepeatabilityReadings(['', '', '']);

    const eccLoad = parseFloat((max / 3).toFixed(3));
    setEccentricityLoadKg(eccLoad);
    setEccentricityReadings({
      cornerA: '',
      cornerB: '',
      cornerC: '',
      cornerD: ''
    });

    // Reset physical security seals to empty / Not Assigned
    setLeadSealNo('');
    setHologramNo('');
    setLeadSealValidation({ status: 'UNASSIGNED', message: '', loading: false, seal: null });
    setHologramValidation({ status: 'UNASSIGNED', message: '', loading: false, seal: null });
    setSealSubmissionError(null);

    // Refresh allocated physical seals for the active inspecting officer
    fetchOfficerSeals(officerId);

    setActiveTab('testing');
  };

  // Live test weight observation update
  const handleObservedChange = (index, val) => {
    const updated = [...testLoads];
    const item = { ...updated[index] };
    item.observedKg = val;

    if (val === '' || val === null || isNaN(Number(val))) {
      item.passed = null;
      item.status = 'NOT_TESTED';
    } else {
      const numVal = parseFloat(val);
      const errorGrams = Math.abs((numVal - item.loadKg) * 1000);
      const isPassed = errorGrams <= (item.mpeGrams + 0.0001);
      item.passed = isPassed;
      item.status = isPassed ? 'PASSED' : 'FAILED';
    }

    updated[index] = item;
    setTestLoads(updated);
  };

  // Live repeatability readings update
  const handleRepeatabilityChange = (index, val) => {
    const updated = [...repeatabilityReadings];
    updated[index] = val;
    setRepeatabilityReadings(updated);
  };

  // Live eccentricity corner readings update
  const handleEccentricityChange = (corner, val) => {
    setEccentricityReadings(prev => ({
      ...prev,
      [corner]: val
    }));
  };

  // Strictly derive visualInspectionPassed from actual visualCheck state
  const visualInspectionPassed = Boolean(
    visualCheck &&
    visualCheck.enclosureIntact === true &&
    visualCheck.levelingCentered === true &&
    visualCheck.modelApprovalPlatePresent === true &&
    visualCheck.environmentalCheckPassed === true
  );

  const testLoadsCompleted = Boolean(
    testLoads &&
    testLoads.length >= 3 &&
    testLoads.every(t => t.observedKg !== '' && t.observedKg !== null && !isNaN(Number(t.observedKg)) && t.status !== 'NOT_TESTED' && t.passed !== null)
  );

  const testLoadsPassed = Boolean(
    testLoadsCompleted &&
    testLoads.every(t => t.passed === true)
  );

  // Automatic calculation of Repeatability variance & statutory PASS/FAIL
  const r1Valid = repeatabilityReadings[0] !== '' && repeatabilityReadings[0] !== null && !isNaN(Number(repeatabilityReadings[0]));
  const r2Valid = repeatabilityReadings[1] !== '' && repeatabilityReadings[1] !== null && !isNaN(Number(repeatabilityReadings[1]));
  const r3Valid = repeatabilityReadings[2] !== '' && repeatabilityReadings[2] !== null && !isNaN(Number(repeatabilityReadings[2]));
  const repeatabilityCompleted = r1Valid && r2Valid && r3Valid;

  const r1 = r1Valid ? parseFloat(repeatabilityReadings[0]) : 0;
  const r2 = r2Valid ? parseFloat(repeatabilityReadings[1]) : 0;
  const r3 = r3Valid ? parseFloat(repeatabilityReadings[2]) : 0;
  const maxReading = Math.max(r1, r2, r3);
  const minReading = Math.min(r1, r2, r3);
  const maxDifferenceGrams = repeatabilityCompleted 
    ? parseFloat(((maxReading - minReading) * 1000).toFixed(3))
    : null;

  const repeatabilityMpe = calculateStatutoryMpe({
    accuracyClass: selectedApp?.accuracyClass || 'Class III',
    verificationInterval_e: selectedApp?.verificationInterval_e || 5,
    testLoadKg: repeatabilityLoadKg
  });

  const repeatabilityPassed = Boolean(
    repeatabilityCompleted &&
    maxDifferenceGrams !== null &&
    maxDifferenceGrams <= (repeatabilityMpe + 0.0001)
  );

  // Automatic calculation of Eccentricity corner bias & statutory PASS/FAIL
  const cAValid = eccentricityReadings.cornerA !== '' && eccentricityReadings.cornerA !== null && !isNaN(Number(eccentricityReadings.cornerA));
  const cBValid = eccentricityReadings.cornerB !== '' && eccentricityReadings.cornerB !== null && !isNaN(Number(eccentricityReadings.cornerB));
  const cCValid = eccentricityReadings.cornerC !== '' && eccentricityReadings.cornerC !== null && !isNaN(Number(eccentricityReadings.cornerC));
  const cDValid = eccentricityReadings.cornerD !== '' && eccentricityReadings.cornerD !== null && !isNaN(Number(eccentricityReadings.cornerD));
  const eccReadingsValid = cAValid && cBValid && cCValid && cDValid;

  const cA = cAValid ? parseFloat(eccentricityReadings.cornerA) : 0;
  const cB = cBValid ? parseFloat(eccentricityReadings.cornerB) : 0;
  const cC = cCValid ? parseFloat(eccentricityReadings.cornerC) : 0;
  const cD = cDValid ? parseFloat(eccentricityReadings.cornerD) : 0;

  const errA = cAValid ? Math.abs((cA - eccentricityLoadKg) * 1000) : 0;
  const errB = cBValid ? Math.abs((cB - eccentricityLoadKg) * 1000) : 0;
  const errC = cCValid ? Math.abs((cC - eccentricityLoadKg) * 1000) : 0;
  const errD = cDValid ? Math.abs((cD - eccentricityLoadKg) * 1000) : 0;
  const maxCornerErrorGrams = eccReadingsValid 
    ? parseFloat(Math.max(errA, errB, errC, errD).toFixed(3))
    : null;

  const eccentricityMpe = calculateStatutoryMpe({
    accuracyClass: selectedApp?.accuracyClass || 'Class III',
    verificationInterval_e: selectedApp?.verificationInterval_e || 5,
    testLoadKg: eccentricityLoadKg
  });

  const eccentricityPassed = Boolean(
    eccReadingsValid &&
    maxCornerErrorGrams !== null &&
    maxCornerErrorGrams <= (eccentricityMpe + 0.0001)
  );

  const sealsAssignedAndValid = Boolean(
    leadSealNo && leadSealNo.trim() &&
    leadSealValidation.status === 'VALID' &&
    hologramNo && hologramNo.trim() &&
    hologramValidation.status === 'VALID'
  );

  const allTestsPassed = Boolean(
    visualInspectionPassed &&
    testLoadsPassed &&
    repeatabilityPassed &&
    eccentricityPassed &&
    sealsAssignedAndValid
  );

  // Submit Final Verification Decision
  const handleApproveVerification = async () => {
    if (!allTestsPassed || !visualInspectionPassed || !testLoadsPassed || !repeatabilityPassed || !eccentricityPassed || !sealsAssignedAndValid) {
      return;
    }

    setSealSubmissionError(null);

    const inspectionData = {
      officerId: officerId,
      officerName: officerName,
      visualCheck: {
        enclosureIntact: Boolean(visualCheck?.enclosureIntact),
        levelingCentered: Boolean(visualCheck?.levelingCentered),
        modelApprovalPlatePresent: Boolean(visualCheck?.modelApprovalPlatePresent),
        environmentalCheckPassed: Boolean(visualCheck?.environmentalCheckPassed)
      },
      visualInspectionPassed,
      repeatability: {
        loadKg: repeatabilityLoadKg,
        readings: [r1, r2, r3],
        maxDifferenceGrams,
        mpeGrams: repeatabilityMpe,
        passed: repeatabilityPassed
      },
      repeatabilityPassed,
      eccentricity: {
        loadKg: eccentricityLoadKg,
        readings: {
          cornerA: cA,
          cornerB: cB,
          cornerC: cC,
          cornerD: cD
        },
        maxErrorGrams: maxCornerErrorGrams,
        mpeGrams: eccentricityMpe,
        passed: eccentricityPassed
      },
      eccentricityPassed,
      testLoads: testLoads.map(t => ({
        name: t.name,
        loadKg: Number(t.loadKg),
        observedKg: t.observedKg !== '' && t.observedKg !== null && !isNaN(Number(t.observedKg)) ? Number(t.observedKg) : t.observedKg,
        errorGrams: (t.observedKg !== '' && t.observedKg !== null && !isNaN(Number(t.observedKg)))
          ? parseFloat(((Number(t.observedKg) - Number(t.loadKg)) * 1000).toFixed(3))
          : null,
        mpeGrams: Number(t.mpeGrams),
        status: t.status,
        passed: t.passed
      })),
      passedAllTests: allTestsPassed,
      leadSealNo: leadSealNo?.trim(),
      hologramNo: hologramNo?.trim(),
      remarks: inspectorNotes
    };

    try {
      await onInspectApplication(selectedApp.id, inspectionData);
      setActiveTab('completed');
      setSelectedApp(null);

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err) {
      setSealSubmissionError(err.message || 'Inspection approval failed on server');
    }
  };

  const handleRejectVerification = () => {
    const inspectionData = {
      officerId: officerId,
      officerName: officerName,
      visualCheck: {
        enclosureIntact: Boolean(visualCheck?.enclosureIntact),
        levelingCentered: Boolean(visualCheck?.levelingCentered),
        modelApprovalPlatePresent: Boolean(visualCheck?.modelApprovalPlatePresent),
        environmentalCheckPassed: Boolean(visualCheck?.environmentalCheckPassed)
      },
      visualInspectionPassed,
      repeatability: {
        loadKg: repeatabilityLoadKg,
        readings: [r1, r2, r3],
        maxDifferenceGrams: maxDifferenceGrams || 0,
        mpeGrams: repeatabilityMpe,
        passed: repeatabilityPassed
      },
      repeatabilityPassed,
      eccentricity: {
        loadKg: eccentricityLoadKg,
        readings: {
          cornerA: cA,
          cornerB: cB,
          cornerC: cC,
          cornerD: cD
        },
        maxErrorGrams: maxCornerErrorGrams || 0,
        mpeGrams: eccentricityMpe,
        passed: eccentricityPassed
      },
      eccentricityPassed,
      testLoads: testLoads.map(t => ({
        name: t.name,
        loadKg: Number(t.loadKg),
        observedKg: t.observedKg !== '' && t.observedKg !== null && !isNaN(Number(t.observedKg)) ? Number(t.observedKg) : t.observedKg,
        errorGrams: (t.observedKg !== '' && t.observedKg !== null && !isNaN(Number(t.observedKg)))
          ? parseFloat(((Number(t.observedKg) - Number(t.loadKg)) * 1000).toFixed(3))
          : null,
        mpeGrams: Number(t.mpeGrams),
        status: t.status,
        passed: t.passed
      })),
      passedAllTests: false,
      leadSealNo: null,
      hologramNo: null,
      remarks: inspectorNotes || 'Failed statutory inspection under Legal Metrology General Rules 2011.'
    };

    onInspectApplication(selectedApp.id, inspectionData);
    setActiveTab('queue');
    setSelectedApp(null);
  };

  const handleOfficerRescheduleSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleModalApp || !rescheduleDate || !rescheduleReason.trim()) {
      alert('Rescheduled appointment slot and reason are required.');
      return;
    }
    setRescheduleLoading(true);
    setRescheduleError(null);
    try {
      const res = await api.rescheduleApplication(rescheduleModalApp.id, {
        rescheduledDate: rescheduleDate,
        reason: rescheduleReason.trim(),
        officerResponse: officerRemarks.trim() || `Inspection slot updated to ${rescheduleDate} by Legal Metrology Officer ${officerName}.`
      });
      if (res?.application) {
        // update local list if available
        const idx = applications.findIndex(a => a.id === rescheduleModalApp.id);
        if (idx !== -1) {
          applications[idx] = res.application;
        }
      }
      setRescheduleModalApp(null);
      setRescheduleDate('');
      setRescheduleReason('');
      setOfficerRemarks('');
    } catch (err) {
      setRescheduleError(err.message || 'Rescheduling failed.');
    } finally {
      setRescheduleLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Officer Header & Jurisdiction */}
      <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full border-2 border-emerald-400 overflow-hidden flex-shrink-0 bg-slate-800">
              <img
                src={currentOfficer.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150'}
                alt={officerName}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold tracking-tight">{officerName}</h2>
                <span className="bg-emerald-600/80 text-white text-xs font-mono font-bold px-2 py-0.5 rounded border border-emerald-400">
                  {officerBadge}
                </span>
                <span className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded border border-slate-700">
                  {officerDesignation}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Jurisdiction: <strong>{officerDistrict}, {officerState}</strong> • Assigned Inspections: {pendingQueue.length} Pending
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Authorized under Section 15 of Legal Metrology Act, 2009 for Stamping & Seizure
              </p>
            </div>
          </div>

          {/* Verified Govt Officer Status */}
          <div className="flex items-center gap-2 bg-slate-800/90 px-3 py-2 rounded-lg border border-slate-700 text-xs text-emerald-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Field Officer Verified • Sec 15 LMA</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'queue'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Assigned Queue ({pendingQueue.length})</span>
        </button>

        {selectedApp && (
          <button
            onClick={() => setActiveTab('testing')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'testing'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Active Inspection: {selectedApp.serialNumber}</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'completed'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Completed Verifications ({completedQueue.length})</span>
        </button>
      </div>

      {/* Tab 1: Officer's Inspection Queue */}
      {activeTab === 'queue' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Pending Verification & Stamping Tasks
              </h3>
              <p className="text-[11px] text-slate-500">
                Applications submitted by merchants within {officerDistrict}
              </p>
            </div>
            <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full">
              {pendingQueue.length} Inspections Awaiting Stamping
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {pendingQueue.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No pending inspections in this jurisdiction queue right now.
              </div>
            ) : (
              pendingQueue.map((app) => {
                const repDecl = app.repairDeclaration || null;
                const isReverification = Boolean(app.originalApplicationId || repDecl);

                return (
                  <div key={app.id} className="p-4 sm:p-5 hover:bg-slate-50 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                          {app.id}
                        </span>
                        <span className="font-bold text-sm text-slate-900">{app.merchantName}</span>
                        <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-semibold">
                          {app.applicationType}
                        </span>
                        {isReverification && (
                          <span className="text-[10px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded border border-red-300">
                            Re-verification After Repair
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                        <span>Instrument: <strong>{app.brand} {app.model}</strong></span>
                        <span>S/N: <strong className="font-mono">{app.serialNumber}</strong></span>
                        <span>Class: <strong className="text-indigo-700">{app.accuracyClass}</strong></span>
                        <span>Capacity: <strong>{app.maxCapacityKg} kg</strong> (e={app.verificationInterval_e}g)</span>
                      </div>

                      {/* Repair Declaration Note if Re-verification */}
                      {repDecl && (
                        <div className="bg-red-50/70 border border-red-200 rounded p-2 text-[11px] text-red-900 space-y-0.5">
                          <div><strong>Repairer:</strong> {repDecl.repairedBy} ({repDecl.repairAgency}) • <strong>Date:</strong> {repDecl.repairDate}</div>
                          <div><strong>Work Executed:</strong> {repDecl.repairDetails}</div>
                        </div>
                      )}

                      <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                        <span>Submitted: {app.submissionDate}</span>
                        <span>Scheduled / Preferred: <strong className="text-slate-800">{app.scheduledDateTime || app.preferredInspectionDate}</strong></span>
                        <span>Fee: <strong className="text-emerald-700">₹{app.statutoryFee} (PAID)</strong></span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setTimelineModalApp(app)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold cursor-pointer"
                        title="View Application Lifecycle Timeline"
                      >
                        Timeline
                      </button>

                      <button
                        onClick={() => {
                          setRescheduleModalApp(app);
                          setRescheduleDate(app.scheduledDateTime || app.preferredInspectionDate || '');
                          setRescheduleReason('');
                          setOfficerRemarks(`Inspection slot rescheduled by Legal Metrology Officer ${officerName}.`);
                          setRescheduleError(null);
                        }}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-xs font-semibold cursor-pointer"
                        title="Reschedule Inspection Appointment"
                      >
                        Reschedule Slot
                      </button>

                      <button
                        onClick={() => handleStartInspection(app)}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
                      >
                        <Scale className="w-3.5 h-3.5" />
                        <span>Start Verification</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Interactive Field Verification Suite */}
      {activeTab === 'testing' && selectedApp && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-6 p-6">
          
          {/* Header Info */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Inspection</span>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">
                {selectedApp.brand} - {selectedApp.model} ({selectedApp.instrumentCategory})
              </h3>
              <p className="text-xs text-slate-600">
                Merchant: <strong>{selectedApp.merchantName}</strong> • S/N: <strong className="font-mono">{selectedApp.serialNumber}</strong> • Class: <strong>{selectedApp.accuracyClass}</strong>
              </p>
              {selectedApp.repairDeclaration && (
                <p className="text-[11px] text-red-700 font-medium mt-1">
                  <strong>Repair Declaration:</strong> Serviced by {selectedApp.repairDeclaration.repairedBy} ({selectedApp.repairDeclaration.repairAgency}) on {selectedApp.repairDeclaration.repairDate}
                </p>
              )}
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded">
                App ID: {selectedApp.id}
              </span>
            </div>
          </div>

          {/* Section 1: Visual & Mechanical Integrity Checklist */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-indigo-600" />
                1. Visual & Environmental Inspection Checklist (Rule 24)
              </h4>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                visualInspectionPassed 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {visualInspectionPassed 
                  ? 'All 4 Mandatory Checks Passed' 
                  : `${[visualCheck.levelingCentered, visualCheck.enclosureIntact, visualCheck.modelApprovalPlatePresent, visualCheck.environmentalCheckPassed].filter(Boolean).length} / 4 Mandatory Checks Completed`}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label className={`flex items-center gap-2.5 p-3 rounded-lg border transition cursor-pointer ${
                visualCheck.levelingCentered ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-200 bg-slate-50/50'
              }`}>
                <input
                  type="checkbox"
                  checked={visualCheck.levelingCentered}
                  onChange={(e) => setVisualCheck(prev => ({ ...prev, levelingCentered: e.target.checked }))}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <div>
                  <span className="font-bold text-slate-900">Spirit Level / Leveling Bubble Centered</span>
                  <span className="block text-[11px] text-slate-500">Scale is mounted on rigid, vibration-free surface</span>
                </div>
              </label>

              <label className={`flex items-center gap-2.5 p-3 rounded-lg border transition cursor-pointer ${
                visualCheck.enclosureIntact ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-200 bg-slate-50/50'
              }`}>
                <input
                  type="checkbox"
                  checked={visualCheck.enclosureIntact}
                  onChange={(e) => setVisualCheck(prev => ({ ...prev, enclosureIntact: e.target.checked }))}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <div>
                  <span className="font-bold text-slate-900">Enclosure & Load Receptor Intact</span>
                  <span className="block text-[11px] text-slate-500">No mechanical wear, unauthorized drilling or foreign magnets</span>
                </div>
              </label>

              <label className={`flex items-center gap-2.5 p-3 rounded-lg border transition cursor-pointer ${
                visualCheck.modelApprovalPlatePresent ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-200 bg-slate-50/50'
              }`}>
                <input
                  type="checkbox"
                  checked={visualCheck.modelApprovalPlatePresent}
                  onChange={(e) => setVisualCheck(prev => ({ ...prev, modelApprovalPlatePresent: e.target.checked }))}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <div>
                  <span className="font-bold text-slate-900">Central Model Approval Plate (IND/...)</span>
                  <span className="block text-[11px] text-slate-500">Verified manufacturer approval certificate matching GOI registry</span>
                </div>
              </label>

              <label className={`flex items-center gap-2.5 p-3 rounded-lg border transition cursor-pointer ${
                visualCheck.environmentalCheckPassed ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-200 bg-slate-50/50'
              }`}>
                <input
                  type="checkbox"
                  checked={visualCheck.environmentalCheckPassed}
                  onChange={(e) => setVisualCheck(prev => ({ ...prev, environmentalCheckPassed: e.target.checked }))}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <div>
                  <span className="font-bold text-slate-900">Environmental & Draft Protection</span>
                  <span className="block text-[11px] text-slate-500">Compliant temperature range & air current shield (for Class I/II)</span>
                </div>
              </label>
            </div>
          </div>

          {/* Section 2: Live MPE Error Tolerance Engine */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-emerald-600" />
                2. Maximum Permissible Error (MPE) Verification Engine
              </h4>
              <span className="text-[11px] text-slate-500 font-mono">
                Legal Metrology General Rules 2011 Table 2 & 3
              </span>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="p-3">Test Stage</th>
                    <th className="p-3">Standard Calibrated Mass (kg)</th>
                    <th className="p-3">Observed Reading (kg)</th>
                    <th className="p-3">Observed Error (Δm)</th>
                    <th className="p-3">Statutory MPE Limit</th>
                    <th className="p-3 text-right">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {testLoads.map((t, idx) => {
                    const isMeasured = t.observedKg !== '' && t.observedKg !== null && !isNaN(Number(t.observedKg)) && t.status !== 'NOT_TESTED';
                    const errorGrams = isMeasured
                      ? ((Number(t.observedKg) - Number(t.loadKg)) * 1000).toFixed(2)
                      : null;
                    return (
                      <tr key={idx} className={!isMeasured ? 'bg-white' : (t.passed ? 'bg-white' : 'bg-rose-50/60')}>
                        <td className="p-3 font-semibold text-slate-900">{t.name}</td>
                        <td className="p-3 font-mono font-bold text-slate-800">{t.loadKg} kg</td>
                        <td className="p-3">
                          <input
                            type="number"
                            step="any"
                            placeholder="Enter observed kg"
                            value={t.observedKg ?? ''}
                            onChange={(e) => handleObservedChange(idx, e.target.value)}
                            className="w-36 border border-slate-300 rounded px-2 py-1 font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                          />
                        </td>
                        <td className="p-3 font-mono">
                          {isMeasured ? (
                            <span className={t.passed ? 'text-slate-700' : 'text-rose-600 font-bold'}>
                              {Number(errorGrams) > 0 ? `+${errorGrams}` : errorGrams} g
                            </span>
                          ) : (
                            <span className="text-slate-400 italic font-sans text-[11px]">Pending measurement</span>
                          )}
                        </td>
                        <td className="p-3 font-mono text-slate-600">
                          ±{t.mpeGrams} g
                        </td>
                        <td className="p-3 text-right">
                          {!isMeasured ? (
                            <span className="inline-flex items-center gap-1 text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                              <Clock className="w-3 h-3 text-amber-500" /> Not Tested
                            </span>
                          ) : t.passed ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                              <Check className="w-3 h-3" /> PASS
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-100 px-2 py-0.5 rounded border border-rose-300 text-[11px]">
                              <X className="w-3 h-3" /> FAIL
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Repeatability & Eccentricity Tests */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900">Repeatability Test (3 Cycles):</span>
                  {!repeatabilityCompleted ? (
                    <span className="inline-flex items-center gap-1 text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10px]">
                      <Clock className="w-3 h-3 text-amber-500" /> Not Tested
                    </span>
                  ) : repeatabilityPassed ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                      <Check className="w-3 h-3" /> PASS
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-100 px-2 py-0.5 rounded border border-rose-300 text-[10px]">
                      <X className="w-3 h-3" /> FAIL
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mb-2.5">
                  Three consecutive weighings of {repeatabilityLoadKg} kg standard mass. Difference between readings must not exceed statutory MPE (±{repeatabilityMpe} g).
                </p>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-600 font-semibold mb-1">Reading 1 (kg):</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 15.000"
                      value={repeatabilityReadings[0]}
                      onChange={(e) => handleRepeatabilityChange(0, e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-1 font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 font-semibold mb-1">Reading 2 (kg):</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 15.000"
                      value={repeatabilityReadings[1]}
                      onChange={(e) => handleRepeatabilityChange(1, e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-1 font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 font-semibold mb-1">Reading 3 (kg):</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 15.000"
                      value={repeatabilityReadings[2]}
                      onChange={(e) => handleRepeatabilityChange(2, e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-1 font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">Recorded Max Diff:</span>
                {repeatabilityCompleted ? (
                  <span className={`font-mono font-bold ${repeatabilityPassed ? 'text-emerald-700' : 'text-rose-600'}`}>
                    Δm = {maxDifferenceGrams} g (MPE Limit: ±{repeatabilityMpe} g)
                  </span>
                ) : (
                  <span className="text-slate-400 italic font-mono text-[11px]">Pending 3 cycle weighings</span>
                )}
              </div>
            </div>

            <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/50 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900">Eccentricity (Corner Load) Test:</span>
                  {!eccReadingsValid ? (
                    <span className="inline-flex items-center gap-1 text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10px]">
                      <Clock className="w-3 h-3 text-amber-500" /> Not Tested
                    </span>
                  ) : eccentricityPassed ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[10px]">
                      <Check className="w-3 h-3" /> PASS
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-100 px-2 py-0.5 rounded border border-rose-300 text-[10px]">
                      <X className="w-3 h-3" /> FAIL
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mb-2.5">
                  1/3 capacity ({eccentricityLoadKg} kg) applied across 4 quadrant corners (Rule 24). Maximum corner error must not exceed MPE (±{eccentricityMpe} g).
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-600 font-semibold mb-1">Corner A (kg):</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Corner A"
                      value={eccentricityReadings.cornerA}
                      onChange={(e) => handleEccentricityChange('cornerA', e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-1 font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 font-semibold mb-1">Corner B (kg):</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Corner B"
                      value={eccentricityReadings.cornerB}
                      onChange={(e) => handleEccentricityChange('cornerB', e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-1 font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 font-semibold mb-1">Corner C (kg):</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Corner C"
                      value={eccentricityReadings.cornerC}
                      onChange={(e) => handleEccentricityChange('cornerC', e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-1 font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-600 font-semibold mb-1">Corner D (kg):</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="Corner D"
                      value={eccentricityReadings.cornerD}
                      onChange={(e) => handleEccentricityChange('cornerD', e.target.value)}
                      className="w-full border border-slate-300 rounded px-2 py-1 font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">Max Corner Error:</span>
                {eccReadingsValid ? (
                  <span className={`font-mono font-bold ${eccentricityPassed ? 'text-emerald-700' : 'text-rose-600'}`}>
                    Δc = {maxCornerErrorGrams} g (MPE Limit: ±{eccentricityMpe} g)
                  </span>
                ) : (
                  <span className="text-slate-400 italic font-mono text-[11px]">Pending 4 corner weighings</span>
                )}
              </div>
            </div>
          </div>

          {/* Section 3: Security Seals Binding */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-amber-600" />
                3. Security Seal & Hologram Assignment (Physical Custody Verification)
              </h4>
              <span className="text-[11px] text-slate-500 font-mono">
                Mandatory Physical Inventory Verification
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Physical Lead / Wire Seal */}
              <div className="p-3.5 border border-slate-200 rounded-lg bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-800 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
                      Physical Lead / Wire Seal:
                    </label>
                    {leadSealValidation.status === 'UNASSIGNED' && (
                      <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded text-[10px] font-medium">
                        <Clock className="w-3 h-3 text-slate-400" /> Not Assigned
                      </span>
                    )}
                    {leadSealValidation.status === 'NOT_VALIDATED' && (
                      <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                        <AlertTriangle className="w-3 h-3 text-amber-500" /> Needs Validation
                      </span>
                    )}
                    {leadSealValidation.status === 'VALID' && (
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded text-[10px] font-bold">
                        <Check className="w-3 h-3 text-emerald-600" /> Verified Authentic
                      </span>
                    )}
                    {leadSealValidation.status === 'INVALID' && (
                      <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-300 px-2 py-0.5 rounded text-[10px] font-bold">
                        <X className="w-3 h-3 text-rose-600" /> Rejected
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 mb-2">
                    Physical lead wire crimped with official officer stamp die. Must match allocated government inventory.
                  </p>

                  <div className="flex gap-1.5 mb-2">
                    <input
                      type="text"
                      placeholder="Scan or enter seal serial (e.g. MH-LMO-LS-4201)"
                      value={leadSealNo}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLeadSealNo(val);
                        setLeadSealValidation({
                          status: val.trim() ? 'NOT_VALIDATED' : 'UNASSIGNED',
                          message: val.trim() ? 'Click "Validate" to check against government inventory' : '',
                          loading: false,
                          seal: null
                        });
                      }}
                      className="flex-1 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none bg-white"
                    />
                    <button
                      type="button"
                      disabled={!leadSealNo.trim() || leadSealValidation.loading}
                      onClick={() => handleValidateLeadSeal()}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white rounded text-xs font-semibold cursor-pointer transition flex items-center gap-1 shrink-0"
                    >
                      {leadSealValidation.loading ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Checking...</span>
                        </>
                      ) : (
                        <>
                          <Scan className="w-3 h-3" />
                          <span>Validate</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Quick-Select from Allocated Officer Inventory */}
                  {allocatedSeals.leadSeals.length > 0 && (
                    <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                      <span className="text-slate-500 font-medium">Or pick available:</span>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            setLeadSealNo(e.target.value);
                            handleValidateLeadSeal(e.target.value);
                          }
                        }}
                        value={allocatedSeals.leadSeals.some(s => s.sealNumber === leadSealNo) ? leadSealNo : ''}
                        className="bg-white border border-slate-200 rounded px-2 py-0.5 text-[11px] font-mono text-slate-700 focus:outline-none max-w-[200px] truncate"
                      >
                        <option value="">Select allocated seal ({allocatedSeals.leadSeals.length} in kit)...</option>
                        {allocatedSeals.leadSeals.map(s => (
                          <option key={s.id} value={s.sealNumber}>
                            {s.sealNumber} (Batch {s.batchNumber})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-200">
                  {leadSealValidation.status === 'VALID' && (
                    <div className="text-[11px] text-emerald-700 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 flex-shrink-0 text-emerald-600" />
                      <span>{leadSealValidation.message}</span>
                    </div>
                  )}
                  {leadSealValidation.status === 'INVALID' && (
                    <div className="text-[11px] text-rose-600 flex items-start gap-1">
                      <X className="w-3.5 h-3.5 flex-shrink-0 text-rose-500 mt-0.5" />
                      <span>{leadSealValidation.message}</span>
                    </div>
                  )}
                  {(leadSealValidation.status === 'UNASSIGNED' || leadSealValidation.status === 'NOT_VALIDATED') && (
                    <span className="text-[10px] text-slate-400 block">
                      {leadSealValidation.message || 'Seal must be physically affixed and validated prior to certification.'}
                    </span>
                  )}
                </div>
              </div>

              {/* Tamper-Evident Hologram Barcode */}
              <div className="p-3.5 border border-slate-200 rounded-lg bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-800 font-bold flex items-center gap-1">
                      <QrCode className="w-3.5 h-3.5 text-slate-600" />
                      Tamper-Evident Hologram Barcode:
                    </label>
                    {hologramValidation.status === 'UNASSIGNED' && (
                      <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded text-[10px] font-medium">
                        <Clock className="w-3 h-3 text-slate-400" /> Not Assigned
                      </span>
                    )}
                    {hologramValidation.status === 'NOT_VALIDATED' && (
                      <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-semibold">
                        <AlertTriangle className="w-3 h-3 text-amber-500" /> Needs Validation
                      </span>
                    )}
                    {hologramValidation.status === 'VALID' && (
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded text-[10px] font-bold">
                        <Check className="w-3 h-3 text-emerald-600" /> Verified Authentic
                      </span>
                    )}
                    {hologramValidation.status === 'INVALID' && (
                      <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-300 px-2 py-0.5 rounded text-[10px] font-bold">
                        <X className="w-3 h-3 text-rose-600" /> Rejected
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500 mb-2">
                    Security hologram sticker barcode affixed across chassis enclosure to prevent opening.
                  </p>

                  <div className="flex gap-1.5 mb-2">
                    <input
                      type="text"
                      placeholder="Scan or enter barcode (e.g. HOL-GOI-2026-4201)"
                      value={hologramNo}
                      onChange={(e) => {
                        const val = e.target.value;
                        setHologramNo(val);
                        setHologramValidation({
                          status: val.trim() ? 'NOT_VALIDATED' : 'UNASSIGNED',
                          message: val.trim() ? 'Click "Validate" to check against government inventory' : '',
                          loading: false,
                          seal: null
                        });
                      }}
                      className="flex-1 border border-slate-300 rounded px-2.5 py-1.5 font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none bg-white"
                    />
                    <button
                      type="button"
                      disabled={!hologramNo.trim() || hologramValidation.loading}
                      onClick={() => handleValidateHologram()}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white rounded text-xs font-semibold cursor-pointer transition flex items-center gap-1 shrink-0"
                    >
                      {hologramValidation.loading ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Checking...</span>
                        </>
                      ) : (
                        <>
                          <Scan className="w-3 h-3" />
                          <span>Validate</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Quick-Select from Allocated Officer Inventory */}
                  {allocatedSeals.holograms.length > 0 && (
                    <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                      <span className="text-slate-500 font-medium">Or pick available:</span>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            setHologramNo(e.target.value);
                            handleValidateHologram(e.target.value);
                          }
                        }}
                        value={allocatedSeals.holograms.some(s => s.sealNumber === hologramNo) ? hologramNo : ''}
                        className="bg-white border border-slate-200 rounded px-2 py-0.5 text-[11px] font-mono text-slate-700 focus:outline-none max-w-[200px] truncate"
                      >
                        <option value="">Select allocated hologram ({allocatedSeals.holograms.length} in kit)...</option>
                        {allocatedSeals.holograms.map(s => (
                          <option key={s.id} value={s.sealNumber}>
                            {s.sealNumber} (Batch {s.batchNumber})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-200">
                  {hologramValidation.status === 'VALID' && (
                    <div className="text-[11px] text-emerald-700 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 flex-shrink-0 text-emerald-600" />
                      <span>{hologramValidation.message}</span>
                    </div>
                  )}
                  {hologramValidation.status === 'INVALID' && (
                    <div className="text-[11px] text-rose-600 flex items-start gap-1">
                      <X className="w-3.5 h-3.5 flex-shrink-0 text-rose-500 mt-0.5" />
                      <span>{hologramValidation.message}</span>
                    </div>
                  )}
                  {(hologramValidation.status === 'UNASSIGNED' || hologramValidation.status === 'NOT_VALIDATED') && (
                    <span className="text-[10px] text-slate-400 block">
                      {hologramValidation.message || 'Hologram must be physically affixed and validated prior to certification.'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Officer Remarks */}
          <div>
            <label className="block text-slate-600 font-medium text-xs mb-1">Inspector Field Observations & Notes:</label>
            <textarea
              rows={2}
              value={inspectorNotes}
              onChange={(e) => setInspectorNotes(e.target.value)}
              className="w-full border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            ></textarea>
          </div>

          {/* Statutory Requirement Warning Banner */}
          {!allTestsPassed && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                <strong>Statutory Requirements Not Met:</strong> Verification cannot be approved until all mandatory visual checks ({[
                  !visualCheck.levelingCentered && 'Leveling Bubble',
                  !visualCheck.enclosureIntact && 'Enclosure',
                  !visualCheck.modelApprovalPlatePresent && 'Model Approval Plate',
                  !visualCheck.environmentalCheckPassed && 'Environmental Shield'
                ].filter(Boolean).join(', ') || 'All visual checks verified'}), error tolerance (MPE: {!testLoadsCompleted ? 'Test loads pending measurement' : (!testLoadsPassed ? 'Tolerance exceeded' : 'Passed')}), repeatability ({!repeatabilityCompleted ? 'Pending 3 weighings' : (!repeatabilityPassed ? `Δm ${maxDifferenceGrams}g > ±${repeatabilityMpe}g` : 'Passed')}), eccentricity ({!eccReadingsValid ? 'Pending 4 corner weighings' : (!eccentricityPassed ? `Δc ${maxCornerErrorGrams}g > ±${eccentricityMpe}g` : 'Passed')}), and security seals ({!sealsAssignedAndValid ? (!leadSealNo || leadSealValidation.status !== 'VALID' ? 'Lead wire seal not verified' : 'Hologram sticker not verified') : 'Verified'}) are completed.
              </span>
            </div>
          )}

          {/* Seal / Verification Error Alert */}
          {sealSubmissionError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>
                <strong>Approval Error:</strong> {sealSubmissionError}
              </span>
            </div>
          )}

          {/* Decision Buttons */}
          <div className="pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              onClick={() => {
                setSelectedApp(null);
                setActiveTab('queue');
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer w-full sm:w-auto"
            >
              Cancel Inspection
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleRejectVerification}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 w-full sm:w-auto"
              >
                <XCircle className="w-4 h-4" />
                <span>Issue Rejection / Seizure Notice</span>
              </button>

              <button
                disabled={!allTestsPassed}
                onClick={handleApproveVerification}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5 w-full sm:w-auto"
              >
                <Award className="w-4 h-4" />
                <span>Approve & Issue Schedule VIII Certificate</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* Tab 3: Completed Verifications History */}
      {activeTab === 'completed' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Verified & Stamped Instruments under {officerDistrict}
            </h3>
            <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">
              {completedQueue.length} Certificates Active
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {completedQueue.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No completed verifications in this list yet.
              </div>
            ) : (
              completedQueue.map((app) => {
                const cert = certificates.find(c => c.certificateNumber === app.certificateNumber);
                return (
                  <div key={app.id} className="p-4 hover:bg-slate-50 transition flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{app.merchantName}</span>
                        <span className="font-mono text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200 font-bold">
                          {app.certificateNumber}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        {app.brand} {app.model} • S/N: {app.serialNumber} • Class: {app.accuracyClass}
                      </div>
                    </div>
                    {cert && (
                      <button
                        onClick={() => onOpenCertificate(cert)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800 transition cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View Certificate</span>
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Officer Reschedule Appointment Modal */}
      {rescheduleModalApp && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm tracking-wide">
                Reschedule On-Site Verification Slot
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

            <form onSubmit={handleOfficerRescheduleSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Merchant Establishment & Application:</span>
                <strong className="text-slate-900">{rescheduleModalApp.merchantName} • #{rescheduleModalApp.id}</strong>
                <div className="text-[11px] text-slate-600 mt-0.5">{rescheduleModalApp.brand} {rescheduleModalApp.model} (S/N: {rescheduleModalApp.serialNumber})</div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Updated Inspection Date & Time:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026-10-04 02:30 PM"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Reason for Rescheduling (Mandatory):</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Legal Metrology mobile verification van scheduled for Bandra West sector..."
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                ></textarea>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Officer Instructions / Remarks for Merchant:</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Keep scale leveled and standard weights ready on site..."
                  value={officerRemarks}
                  onChange={(e) => setOfficerRemarks(e.target.value)}
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
                  {rescheduleLoading ? 'Updating Slot...' : 'Confirm Appointment Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Application Lifecycle Timeline Modal for Officer */}
      {timelineModalApp && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm tracking-wide">
                    Application Audit & Lifecycle Timeline
                  </h3>
                  <span className="font-mono text-xs bg-slate-800 text-emerald-400 font-bold px-2 py-0.5 rounded border border-slate-700">
                    {timelineModalApp.id}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Merchant: {timelineModalApp.merchantName} • {timelineModalApp.brand} {timelineModalApp.model} (S/N: {timelineModalApp.serialNumber})
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
              {timelineModalApp.repairDeclaration && (
                <div className="bg-red-50/70 border border-red-200 rounded-lg p-3 text-xs space-y-1 text-red-900">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>Statutory Repair Declaration Recorded:</span>
                  </div>
                  <div><strong>Repairer / Technician:</strong> {timelineModalApp.repairDeclaration.repairedBy}</div>
                  <div><strong>Repair Agency:</strong> {timelineModalApp.repairDeclaration.repairAgency}</div>
                  <div><strong>Date:</strong> {timelineModalApp.repairDeclaration.repairDate}</div>
                  <div><strong>Work Details:</strong> {timelineModalApp.repairDeclaration.repairDetails}</div>
                  {timelineModalApp.repairDeclaration.evidence && (
                    <div className="text-[10px] text-slate-600 truncate">Evidence: {timelineModalApp.repairDeclaration.evidence}</div>
                  )}
                </div>
              )}

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
                        actor: officerName,
                        actorRole: 'INSPECTOR',
                        description: `Assigned for field verification in ${timelineModalApp.district}.`
                      }
                    ]
                ).map((evt, idx) => {
                  const isSuccess = ['VERIFICATION_PASSED', 'CERTIFICATE_ISSUED', 'PAYMENT_CONFIRMED', 'REPAIR_DECLARED'].includes(evt.status);
                  const isFail = ['VERIFICATION_FAILED', 'APPLICATION_CANCELLED'].includes(evt.status);

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

    </div>
  );
}

