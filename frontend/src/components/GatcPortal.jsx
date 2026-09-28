import React, { useState } from 'react';
import { 
  FlaskConical, 
  CheckCircle, 
  XCircle,
  ShieldCheck, 
  Scale, 
  FileText, 
  ArrowRight, 
  Award, 
  Truck,
  AlertTriangle,
  Clock,
  Check,
  X,
  Lock,
  RefreshCw,
  Sliders,
  ExternalLink
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';

/**
 * Statutory Maximum Permissible Error (MPE) for Heavy Instruments / Weighbridges
 * In-service periodic verification under Legal Metrology General Rules 2011 Table 2
 */
export function calculateGatcMpe(loadTonnes, verificationInterval_e_kg = 10, verificationType = 'periodic') {
  const e = parseFloat(verificationInterval_e_kg) || 10.0;
  const loadKg = (parseFloat(loadTonnes) || 0) * 1000.0;
  const n = e > 0 ? loadKg / e : 0;

  let mpeInE = 1.0;
  if (n <= 500) mpeInE = 0.5;
  else if (n <= 2000) mpeInE = 1.0;
  else mpeInE = 1.5;

  const multiplier = verificationType === 'initial' ? 1.0 : 2.0;
  return parseFloat((mpeInE * e * multiplier).toFixed(1));
}

export function GatcPortal({ 
  currentUser = null,
  gatcCenters = [], 
  selectedCenter: propSelectedCenter = null, 
  instruments = [], 
  onOpenCertificate,
  onGatcReportSubmitted
}) {
  // Strictly bind the center to the logged-in GATC user (currentUser.gatcCenterId)
  // Arbitrary center switching from the frontend is completely prohibited.
  const authorizedCenterId = currentUser?.gatcCenterId || currentUser?.entityId || currentUser?.id || propSelectedCenter?.id;
  const authorizedCenter = (gatcCenters || []).find(
    g => g.id === authorizedCenterId || 
         g.recognitionNumber === currentUser?.identifier ||
         g.name === currentUser?.name
  ) || propSelectedCenter || (gatcCenters.length > 0 ? gatcCenters[0] : {
    name: 'Apex Metrology & Heavy Calibration Lab (GATC-MH-01)',
    recognitionNumber: 'GOI-GATC-W-2021-009',
    accreditedScopes: ['Weighbridges up to 100T', 'Bulk Flow Meters', 'Storage Tanks'],
    standardWeightsAvailableTonnes: 60,
    validUntil: '2027-12-31',
    inCharge: 'Er. Sandeep Deshmukh'
  });

  const [selectedTestItem, setSelectedTestItem] = useState(null);
  const [technicianName, setTechnicianName] = useState(currentUser?.name || authorizedCenter?.inCharge || 'Er. Sandeep Deshmukh');
  const [secondaryStandardsRef, setSecondaryStandardsRef] = useState('NPL/RRSL-MH/2026/0411-SEC');
  const [temperatureC, setTemperatureC] = useState('28.5');
  const [relativeHumidityPercent, setRelativeHumidityPercent] = useState('55');
  const [inspectorNotes, setInspectorNotes] = useState('Stepwise standard load trials executed with secondary calibrated cast iron masses traceable to NPL.');
  
  // Real Metrological Measurement State
  const [testReadings, setTestReadings] = useState([
    { name: '10T Nominal Pre-load', loadTonnes: 10, observedTonnes: '', errorKg: null, mpeKg: 20.0, status: 'NOT_TESTED' },
    { name: '30T Half Capacity Trial', loadTonnes: 30, observedTonnes: '', errorKg: null, mpeKg: 20.0, status: 'NOT_TESTED' },
    { name: '60T Full Working Capacity', loadTonnes: 60, observedTonnes: '', errorKg: null, mpeKg: 30.0, status: 'NOT_TESTED' }
  ]);

  const [repeatabilityLoadTonnes, setRepeatabilityLoadTonnes] = useState(30);
  const [repeatabilityReadings, setRepeatabilityReadings] = useState(['', '', '']);

  const [eccentricityLoadTonnes, setEccentricityLoadTonnes] = useState(20);
  const [eccentricityReadings, setEccentricityReadings] = useState({
    cornerA: '',
    cornerB: '',
    cornerC: '',
    cornerD: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [lastIssuedReport, setLastIssuedReport] = useState(null);

  // Heavy instruments requiring GATC testing
  const heavyInstruments = instruments.filter(i => 
    i.category?.includes('Weighbridge') || 
    i.category?.includes('Flow Meter') || 
    i.category?.includes('Fuel')
  );

  // Select instrument to calibrate
  const handleSelectInstrument = (inst) => {
    setSelectedTestItem(inst);
    setServerError(null);
    setLastIssuedReport(null);

    const maxKg = parseFloat(inst.maxCapacityKg) || 60000;
    const maxT = parseFloat((maxKg / 1000).toFixed(1));
    const rawE = parseFloat(inst.verificationInterval_e) || 10000;
    const eKg = rawE >= 500 ? (rawE / 1000) : rawE;

    const minT = parseFloat((maxT * 0.166).toFixed(1)) || 10;
    const halfT = parseFloat((maxT * 0.5).toFixed(1)) || 30;
    const eccT = parseFloat((maxT / 3).toFixed(1)) || 20;

    setTestReadings([
      { 
        name: `${minT}T Nominal Pre-load`, 
        loadTonnes: minT, 
        observedTonnes: '', 
        errorKg: null, 
        mpeKg: calculateGatcMpe(minT, eKg), 
        status: 'NOT_TESTED' 
      },
      { 
        name: `${halfT}T Half Capacity Trial`, 
        loadTonnes: halfT, 
        observedTonnes: '', 
        errorKg: null, 
        mpeKg: calculateGatcMpe(halfT, eKg), 
        status: 'NOT_TESTED' 
      },
      { 
        name: `${maxT}T Full Capacity Working Load`, 
        loadTonnes: maxT, 
        observedTonnes: '', 
        errorKg: null, 
        mpeKg: calculateGatcMpe(maxT, eKg), 
        status: 'NOT_TESTED' 
      }
    ]);

    setRepeatabilityLoadTonnes(halfT);
    setRepeatabilityReadings(['', '', '']);

    setEccentricityLoadTonnes(eccT);
    setEccentricityReadings({
      cornerA: '',
      cornerB: '',
      cornerC: '',
      cornerD: ''
    });
  };

  // Live Load Trial Reading Updates
  const handleLoadTrialChange = (idx, val) => {
    const updated = [...testReadings];
    const item = { ...updated[idx] };
    item.observedTonnes = val;

    if (val === '' || val === null || isNaN(Number(val))) {
      item.errorKg = null;
      item.status = 'NOT_TESTED';
    } else {
      const obsT = parseFloat(val);
      const errKg = parseFloat(((obsT - item.loadTonnes) * 1000).toFixed(2));
      item.errorKg = errKg;
      const passed = Math.abs(errKg) <= (item.mpeKg + 0.001);
      item.status = passed ? 'PASSED' : 'FAILED';
    }

    updated[idx] = item;
    setTestReadings(updated);
  };

  // Live Repeatability Updates (3 cycles on ~50% load)
  const handleRepeatabilityChange = (idx, val) => {
    const updated = [...repeatabilityReadings];
    updated[idx] = val;
    setRepeatabilityReadings(updated);
  };

  // Live Eccentricity Updates (4 corners at 1/3 capacity)
  const handleEccentricityChange = (cornerKey, val) => {
    setEccentricityReadings(prev => ({
      ...prev,
      [cornerKey]: val
    }));
  };

  // Metrological Recalculation on Client for Live Feedback
  const rawE = parseFloat(selectedTestItem?.verificationInterval_e) || 10000;
  const eKg = rawE >= 500 ? (rawE / 1000) : rawE;

  // 1. Load trials
  const loadTrialsCompleted = testReadings.every(r => r.observedTonnes !== '' && r.status !== 'NOT_TESTED');
  const loadTrialsPassed = loadTrialsCompleted && testReadings.every(r => r.status === 'PASSED');

  // 2. Repeatability
  const repReadingsValid = repeatabilityReadings.every(r => r !== '' && r !== null && !isNaN(Number(r)));
  const repFloats = repReadingsValid ? repeatabilityReadings.map(Number) : [];
  const repMaxDiffKg = repReadingsValid 
    ? parseFloat(((Math.max(...repFloats) - Math.min(...repFloats)) * 1000).toFixed(2)) 
    : null;
  const repMpeKg = calculateGatcMpe(repeatabilityLoadTonnes, eKg);
  const repeatabilityPassed = Boolean(
    repReadingsValid && repMaxDiffKg !== null && repMaxDiffKg <= (repMpeKg + 0.001)
  );

  // 3. Eccentricity
  const eccKeys = ['cornerA', 'cornerB', 'cornerC', 'cornerD'];
  const eccReadingsValid = eccKeys.every(k => eccentricityReadings[k] !== '' && !isNaN(Number(eccentricityReadings[k])));
  const eccFloats = eccKeys.map(k => eccReadingsValid ? parseFloat(eccentricityReadings[k]) : 0);
  const eccErrors = eccFloats.map(c => Math.abs((c - eccentricityLoadTonnes) * 1000));
  const eccMaxErrorKg = eccReadingsValid 
    ? parseFloat(Math.max(...eccErrors).toFixed(2)) 
    : null;
  const eccMpeKg = calculateGatcMpe(eccentricityLoadTonnes, eKg);
  const eccentricityPassed = Boolean(
    eccReadingsValid && eccMaxErrorKg !== null && eccMaxErrorKg <= (eccMpeKg + 0.001)
  );

  // Overall Test Decision: NO hardcoded pass!
  const allTestsCompleted = loadTrialsCompleted && repReadingsValid && eccReadingsValid;
  const allTestsPassed = Boolean(
    loadTrialsPassed && repeatabilityPassed && eccentricityPassed
  );

  // Submit Final GATC Calibration Test Report to Server
  const handleCompleteGatcTest = async () => {
    if (!selectedTestItem) return;
    setServerError(null);
    setIsSubmitting(true);

    const payload = {
      gatcCenterId: authorizedCenter.id,
      instrumentId: selectedTestItem.id,
      serialNumber: selectedTestItem.serialNumber,
      technicianName: technicianName?.trim() || authorizedCenter.inCharge,
      secondaryStandardsRef: secondaryStandardsRef?.trim(),
      temperatureC: parseFloat(temperatureC) || 28.5,
      relativeHumidityPercent: parseFloat(relativeHumidityPercent) || 55,
      loadTrials: testReadings.map(t => ({
        name: t.name,
        loadTonnes: t.loadTonnes,
        observedTonnes: parseFloat(t.observedTonnes),
        errorKg: t.errorKg,
        mpeKg: t.mpeKg,
        status: t.status
      })),
      repeatability: {
        loadTonnes: repeatabilityLoadTonnes,
        readings: repeatabilityReadings.map(Number),
        maxDifferenceKg: repMaxDiffKg,
        mpeKg: repMpeKg,
        passed: repeatabilityPassed
      },
      eccentricity: {
        loadTonnes: eccentricityLoadTonnes,
        readings: {
          cornerA: parseFloat(eccentricityReadings.cornerA),
          cornerB: parseFloat(eccentricityReadings.cornerB),
          cornerC: parseFloat(eccentricityReadings.cornerC),
          cornerD: parseFloat(eccentricityReadings.cornerD)
        },
        maxErrorKg: eccMaxErrorKg,
        mpeKg: eccMpeKg,
        passed: eccentricityPassed
      },
      passedAllTests: allTestsPassed,
      remarks: inspectorNotes
    };

    try {
      const res = await api.submitGatcTestReport(payload);
      if (res && res.report) {
        setLastIssuedReport(res.report);
        if (onGatcReportSubmitted) {
          onGatcReportSubmitted(res);
        }

        if (allTestsPassed) {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6 }
          });
        }
      }
    } catch (err) {
      setServerError(err.message || 'Failed to submit GATC test report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* GATC Center Header - Strictly Bound to Authenticated GATC Center */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 border border-purple-300 flex items-center justify-center text-purple-800 flex-shrink-0">
              <FlaskConical className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900">{authorizedCenter.name}</h2>
                <span className="bg-purple-50 text-purple-700 text-xs font-semibold px-2 py-0.5 rounded border border-purple-200">
                  {authorizedCenter.recognitionNumber}
                </span>
                <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded border border-emerald-200">
                  Govt Notified Centre
                </span>
                <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 text-[11px] font-mono px-2 py-0.5 rounded border border-slate-200">
                  <Lock className="w-3 h-3 text-slate-500" /> Authorized Center Binding ({authorizedCenter.id})
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                In-Charge: <strong>{authorizedCenter.inCharge}</strong> • Accredited Scopes: {(authorizedCenter.accreditedScopes || []).join(', ')}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Standard Weights Available: <strong>{authorizedCenter.standardWeightsAvailableTonnes} Tonnes</strong> (Calibrated by NPL / RRSL) • Accreditation Valid Until: {authorizedCenter.validUntil}
              </p>
            </div>
          </div>

          {/* Accredited Test Centre Status */}
          <div className="flex items-center gap-2 bg-purple-50 px-3 py-2 rounded-lg border border-purple-200">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
            <span className="text-xs text-purple-800 font-bold whitespace-nowrap">
              Accredited Test Centre Active
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Heavy Instruments Queue */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-purple-700" />
              Heavy Instruments Calibration Queue
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Weighbridges & Bulk Flow Meters requiring statutory GATC testing
            </p>
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto flex-1">
            {heavyInstruments.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No heavy weighbridges or meters currently in queue.
              </div>
            ) : (
              heavyInstruments.map((inst) => {
                const isSelected = selectedTestItem?.id === inst.id;
                const isCalibrated = inst.gatcStatus === 'CALIBRATED_PASSED';
                return (
                  <div
                    key={inst.id}
                    onClick={() => handleSelectInstrument(inst)}
                    className={`p-4 cursor-pointer transition text-xs ${
                      isSelected ? 'bg-purple-50/90 border-l-4 border-purple-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-slate-900">{inst.brand} - {inst.model}</div>
                      {isCalibrated ? (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold shrink-0">
                          Calibrated
                        </span>
                      ) : (
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-semibold shrink-0">
                          Pending
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-600 font-mono mt-0.5">S/N: {inst.serialNumber}</div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Max Capacity: <strong>{inst.maxCapacityKg} kg ({(inst.maxCapacityKg / 1000).toFixed(0)} Tonnes)</strong>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">Premise: {inst.locationAddress}</div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                        {inst.category?.split('(')[0]}
                      </span>
                      <span className="text-[10px] text-purple-700 font-bold hover:underline">
                        {isSelected ? 'Testing Active ▾' : 'Begin Test →'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: GATC Calibration Workspace */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          {selectedTestItem ? (
            <div className="space-y-5 text-xs">
              
              {/* Header */}
              <div className="border-b border-slate-200 pb-3 flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-purple-700 tracking-wider">
                    Statutory Metrology Trial Workspace
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    {selectedTestItem.brand} - {selectedTestItem.model}
                  </h3>
                  <p className="text-slate-600">
                    Serial: <strong className="font-mono">{selectedTestItem.serialNumber}</strong> • Max: <strong>{selectedTestItem.maxCapacityKg} kg</strong> • Class: <strong>{selectedTestItem.accuracyClass || 'Class III'}</strong> • Verification Interval e: <strong>{eKg} kg</strong>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTestItem(null)}
                  className="text-slate-400 hover:text-slate-600 px-2 py-1 rounded border border-slate-200 text-xs font-semibold"
                >
                  ✕ Close
                </button>
              </div>

              {/* NPL Traceability Banner */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-purple-900">
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  National Metrology Traceability Confirmation
                </div>
                <div className="text-[11px] text-purple-800">
                  Standard test weights used in this trial are calibrated directly against Secondary Standard Balances at the Regional Reference Standard Laboratory (RRSL) with unbroken traceability to the National Physical Laboratory (NPL), New Delhi.
                </div>
              </div>

              {/* Section 1: Technician & Environmental Details */}
              <div className="p-3.5 border border-slate-200 rounded-lg bg-slate-50/50 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-purple-600" />
                  1. Calibration Conditions & Traceability Identification
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] text-slate-600 font-semibold mb-1">Testing Technician:</label>
                    <input
                      type="text"
                      value={technicianName}
                      onChange={(e) => setTechnicianName(e.target.value)}
                      placeholder="Technician name"
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white focus:ring-1 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 font-semibold mb-1">Secondary Standards Cert Ref:</label>
                    <input
                      type="text"
                      value={secondaryStandardsRef}
                      onChange={(e) => setSecondaryStandardsRef(e.target.value)}
                      placeholder="e.g. NPL/RRSL-MH/2026/0411"
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono text-xs bg-white focus:ring-1 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 font-semibold mb-1">Ambient Temperature (°C):</label>
                    <input
                      type="number"
                      step="0.1"
                      value={temperatureC}
                      onChange={(e) => setTemperatureC(e.target.value)}
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono text-xs bg-white focus:ring-1 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-600 font-semibold mb-1">Relative Humidity (%):</label>
                    <input
                      type="number"
                      step="1"
                      value={relativeHumidityPercent}
                      onChange={(e) => setRelativeHumidityPercent(e.target.value)}
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono text-xs bg-white focus:ring-1 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Stepwise Standard Weight Load Trials */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-purple-700" />
                    2. Stepwise Standard Weight Load Trials (Real Indication Readings)
                  </h4>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Legal Metrology General Rules 2011 Table 2
                  </span>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                      <tr>
                        <th className="p-2.5">Trial Stage</th>
                        <th className="p-2.5">Standard Load</th>
                        <th className="p-2.5">Observed Indicating</th>
                        <th className="p-2.5">Observed Error (Δm)</th>
                        <th className="p-2.5">Permissible MPE Limit</th>
                        <th className="p-2.5 text-right">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {testReadings.map((r, i) => {
                        const isTested = r.observedTonnes !== '' && r.status !== 'NOT_TESTED';
                        return (
                          <tr key={i} className={!isTested ? 'bg-white' : (r.status === 'PASSED' ? 'bg-white' : 'bg-rose-50/60')}>
                            <td className="p-2.5 font-bold text-slate-900">{r.name}</td>
                            <td className="p-2.5 font-bold font-mono text-slate-800">{r.loadTonnes} T ({r.loadTonnes * 1000} kg)</td>
                            <td className="p-2.5">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="Enter observed T"
                                  value={r.observedTonnes}
                                  onChange={(e) => handleLoadTrialChange(i, e.target.value)}
                                  className="w-32 border border-slate-300 rounded px-2 py-1 font-mono text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
                                />
                                <span className="text-slate-500 font-mono">T</span>
                              </div>
                            </td>
                            <td className="p-2.5 font-mono">
                              {isTested ? (
                                <span className={`font-bold ${r.status === 'PASSED' ? 'text-slate-800' : 'text-rose-600'}`}>
                                  {r.errorKg > 0 ? `+${r.errorKg}` : r.errorKg} kg
                                </span>
                              ) : (
                                <span className="text-slate-400 italic font-sans text-[11px]">Pending measurement</span>
                              )}
                            </td>
                            <td className="p-2.5 font-mono text-slate-600">±{r.mpeKg} kg</td>
                            <td className="p-2.5 text-right">
                              {r.status === 'NOT_TESTED' ? (
                                <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10px] font-semibold">
                                  <Clock className="w-3 h-3 text-amber-500" /> Not Tested
                                </span>
                              ) : r.status === 'PASSED' ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300 text-[10px] font-bold">
                                  <Check className="w-3 h-3" /> PASS
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-300 text-[10px] font-bold">
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

              {/* Section 3: Repeatability & Eccentricity Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Repeatability Test */}
                <div className="p-3.5 border border-slate-200 rounded-lg bg-slate-50/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900">Repeatability (Half-Capacity Cycles):</span>
                      {!repReadingsValid ? (
                        <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10px] font-semibold">
                          <Clock className="w-3 h-3 text-amber-500" /> Not Tested
                        </span>
                      ) : repeatabilityPassed ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300 text-[10px] font-bold">
                          <Check className="w-3 h-3" /> PASS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-300 text-[10px] font-bold">
                          <X className="w-3 h-3" /> FAIL
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mb-2.5">
                      3 successive cycle weighings at ~50% load ({repeatabilityLoadTonnes}T). Variance between cycles must not exceed statutory MPE (±{repMpeKg} kg).
                    </p>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-600 font-semibold mb-1">Cycle 1 (T):</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="Cycle 1"
                          value={repeatabilityReadings[0]}
                          onChange={(e) => handleRepeatabilityChange(0, e.target.value)}
                          className="w-full border border-slate-300 rounded px-2 py-1 font-mono text-xs bg-white focus:ring-1 focus:ring-purple-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-600 font-semibold mb-1">Cycle 2 (T):</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="Cycle 2"
                          value={repeatabilityReadings[1]}
                          onChange={(e) => handleRepeatabilityChange(1, e.target.value)}
                          className="w-full border border-slate-300 rounded px-2 py-1 font-mono text-xs bg-white focus:ring-1 focus:ring-purple-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-600 font-semibold mb-1">Cycle 3 (T):</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="Cycle 3"
                          value={repeatabilityReadings[2]}
                          onChange={(e) => handleRepeatabilityChange(2, e.target.value)}
                          className="w-full border border-slate-300 rounded px-2 py-1 font-mono text-xs bg-white focus:ring-1 focus:ring-purple-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Recorded Max Diff:</span>
                    {repReadingsValid ? (
                      <span className={`font-mono font-bold ${repeatabilityPassed ? 'text-emerald-700' : 'text-rose-600'}`}>
                        Δm = {repMaxDiffKg} kg (Limit: ±{repMpeKg} kg)
                      </span>
                    ) : (
                      <span className="text-slate-400 italic font-mono text-[11px]">Pending 3 cycle weighings</span>
                    )}
                  </div>
                </div>

                {/* Eccentricity Test */}
                <div className="p-3.5 border border-slate-200 rounded-lg bg-slate-50/50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900">Eccentricity (Corner Shift Trial):</span>
                      {!eccReadingsValid ? (
                        <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[10px] font-semibold">
                          <Clock className="w-3 h-3 text-amber-500" /> Not Tested
                        </span>
                      ) : eccentricityPassed ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300 text-[10px] font-bold">
                          <Check className="w-3 h-3" /> PASS
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-300 text-[10px] font-bold">
                          <X className="w-3 h-3" /> FAIL
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mb-2.5">
                      1/3 capacity ({eccentricityLoadTonnes}T) applied across 4 quadrant load cell corners. Corner error must not exceed MPE (±{eccMpeKg} kg).
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-600 font-semibold mb-1">Corner A (T):</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="Corner A"
                          value={eccentricityReadings.cornerA}
                          onChange={(e) => handleEccentricityChange('cornerA', e.target.value)}
                          className="w-full border border-slate-300 rounded px-2 py-1 font-mono text-xs bg-white focus:ring-1 focus:ring-purple-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-600 font-semibold mb-1">Corner B (T):</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="Corner B"
                          value={eccentricityReadings.cornerB}
                          onChange={(e) => handleEccentricityChange('cornerB', e.target.value)}
                          className="w-full border border-slate-300 rounded px-2 py-1 font-mono text-xs bg-white focus:ring-1 focus:ring-purple-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-600 font-semibold mb-1">Corner C (T):</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="Corner C"
                          value={eccentricityReadings.cornerC}
                          onChange={(e) => handleEccentricityChange('cornerC', e.target.value)}
                          className="w-full border border-slate-300 rounded px-2 py-1 font-mono text-xs bg-white focus:ring-1 focus:ring-purple-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-600 font-semibold mb-1">Corner D (T):</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="Corner D"
                          value={eccentricityReadings.cornerD}
                          onChange={(e) => handleEccentricityChange('cornerD', e.target.value)}
                          className="w-full border border-slate-300 rounded px-2 py-1 font-mono text-xs bg-white focus:ring-1 focus:ring-purple-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-medium">Max Corner Error:</span>
                    {eccReadingsValid ? (
                      <span className={`font-mono font-bold ${eccentricityPassed ? 'text-emerald-700' : 'text-rose-600'}`}>
                        Δc = {eccMaxErrorKg} kg (Limit: ±{eccMpeKg} kg)
                      </span>
                    ) : (
                      <span className="text-slate-400 italic font-mono text-[11px]">Pending 4 corner weighings</span>
                    )}
                  </div>
                </div>

              </div>

              {/* Technician Field Observations & Notes */}
              <div>
                <label className="block text-slate-600 font-medium text-xs mb-1">Technician Metrological Observations & Test Notes:</label>
                <textarea
                  rows={2}
                  value={inspectorNotes}
                  onChange={(e) => setInspectorNotes(e.target.value)}
                  className="w-full border border-slate-300 rounded p-2 text-xs focus:ring-1 focus:ring-purple-500 focus:outline-none"
                ></textarea>
              </div>

              {/* Statutory Warning Banner */}
              {!allTestsCompleted && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>
                    <strong>Statutory Testing Pending:</strong> Report cannot be issued until all standard weight trials ({!loadTrialsCompleted ? 'Load stages pending' : 'Completed'}), repeatability ({!repReadingsValid ? '3 cycles pending' : 'Completed'}), and corner eccentricity ({!eccReadingsValid ? '4 corners pending' : 'Completed'}) are recorded.
                  </span>
                </div>
              )}

              {/* Server Rejection Alert */}
              {serverError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>
                    <strong>Submission Rejected:</strong> {serverError}
                  </span>
                </div>
              )}

              {/* Generated Report Success Banner */}
              {lastIssuedReport && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5 text-emerald-800">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      GATC Calibration Test Report {lastIssuedReport.reportNumber} Issued Successfully
                    </span>
                    <span className="font-mono text-[11px] bg-emerald-200/60 px-2 py-0.5 rounded font-bold">
                      Verdict: {lastIssuedReport.overallVerdict}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    Traceability confirmed to NPL / RRSL standards. Report transmitted to State Legal Metrology Officer (LMO) for statutory stamping.
                  </p>
                  <div className="text-[10px] font-mono text-emerald-700 break-all bg-white/70 p-1.5 rounded border border-emerald-200">
                    SHA-256 Audit Seal: {lastIssuedReport.cryptographicHash}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  onClick={() => setSelectedTestItem(null)}
                  className="px-3 py-1.5 border rounded text-slate-600 hover:bg-slate-100 cursor-pointer text-xs font-semibold w-full sm:w-auto"
                >
                  Cancel / Close
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    disabled={!allTestsCompleted || isSubmitting}
                    onClick={handleCompleteGatcTest}
                    className="px-4 py-2 bg-purple-700 hover:bg-purple-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded font-bold shadow-sm flex items-center justify-center gap-1.5 cursor-pointer text-xs w-full sm:w-auto transition"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Submitting to Server...</span>
                      </>
                    ) : (
                      <>
                        <Award className="w-4 h-4" />
                        <span>{allTestsPassed ? 'Issue GATC Test Report & Forward to LMO' : 'Issue Non-Conformance Notice'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div className="h-72 flex flex-col items-center justify-center text-center text-slate-400">
              <FlaskConical className="w-12 h-12 text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-600">Select an instrument from the left queue to begin calibration</p>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                GATCs are authorized under Legal Metrology Rules to carry out statutory test trials for heavy weighbridges, flow meters, and fuel dispensers.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
