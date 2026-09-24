import React, { useState } from 'react';
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
  Lock
} from 'lucide-react';
import confetti from 'canvas-confetti';

export function LmoInspectorPortal({ 
  officers, 
  selectedOfficer, 
  setSelectedOfficer,
  applications, 
  certificates, 
  onInspectApplication,
  onOpenCertificate
}) {
  const [selectedApp, setSelectedApp] = useState(null);
  const [activeTab, setActiveTab] = useState('queue'); // 'queue', 'testing', 'completed'

  // Verification Suite Form State
  const [visualCheck, setVisualCheck] = useState({
    enclosureIntact: true,
    levelingCentered: true,
    modelApprovalPlatePresent: true,
    environmentalCheckPassed: true
  });

  const [testLoads, setTestLoads] = useState([
    { name: '10% Min Load', loadKg: 3.0, observedKg: 3.001, mpeGrams: 2.0, passed: true },
    { name: '50% Half Capacity', loadKg: 15.0, observedKg: 15.002, mpeGrams: 4.0, passed: true },
    { name: '100% Max Capacity', loadKg: 30.0, observedKg: 30.003, mpeGrams: 5.0, passed: true }
  ]);

  const [repeatabilityPassed, setRepeatabilityPassed] = useState(true);
  const [eccentricityPassed, setEccentricityPassed] = useState(true);
  const [leadSealNo, setLeadSealNo] = useState(`MH-LMO42-LS-${Math.floor(1000 + Math.random() * 9000)}`);
  const [hologramNo, setHologramNo] = useState(`HOL-GOI-2026-${Math.floor(100000 + Math.random() * 900000)}`);
  const [inspectorNotes, setInspectorNotes] = useState('Tested with standard Class M1 calibrated test weights. All error points within statutory tolerance.');

  // Filter applications for this officer's jurisdiction
  const officerQueue = applications.filter(a => 
    a.district?.toLowerCase() === selectedOfficer?.jurisdictionDistrict?.toLowerCase() ||
    a.assignedOfficerId === selectedOfficer?.id
  );

  const pendingQueue = officerQueue.filter(a => a.status !== 'VERIFIED_STAMPED' && a.status !== 'REJECTED');
  const completedQueue = officerQueue.filter(a => a.status === 'VERIFIED_STAMPED');

  // Select application to start testing
  const handleStartInspection = (app) => {
    setSelectedApp(app);
    const max = Number(app.maxCapacityKg) || 30;
    const e = Number(app.verificationInterval_e) || 5;

    // Prepopulate realistic test loads for this instrument capacity
    setTestLoads([
      { name: 'Min / 10% Load', loadKg: parseFloat((max * 0.1).toFixed(3)), observedKg: parseFloat((max * 0.1).toFixed(3)), mpeGrams: e, passed: true },
      { name: '50% Half Load', loadKg: parseFloat((max * 0.5).toFixed(3)), observedKg: parseFloat((max * 0.5).toFixed(3)), mpeGrams: e * 2, passed: true },
      { name: '100% Max Load', loadKg: max, observedKg: max, mpeGrams: e * 2, passed: true }
    ]);

    setLeadSealNo(`${app.state === 'Maharashtra' ? 'MH' : 'GOI'}-LMO-LS-${Math.floor(1000 + Math.random() * 9000)}`);
    setHologramNo(`HOL-GOI-2026-${Math.floor(100000 + Math.random() * 900000)}`);
    setActiveTab('testing');
  };

  // Live test weight observation update
  const handleObservedChange = (index, val) => {
    const updated = [...testLoads];
    const item = updated[index];
    item.observedKg = parseFloat(val) || 0;
    const errorGrams = Math.abs((item.observedKg - item.loadKg) * 1000);
    item.passed = errorGrams <= item.mpeGrams;
    setTestLoads(updated);
  };

  const allTestsPassed = 
    visualCheck.enclosureIntact &&
    visualCheck.levelingCentered &&
    visualCheck.modelApprovalPlatePresent &&
    visualCheck.environmentalCheckPassed &&
    testLoads.every(t => t.passed) &&
    repeatabilityPassed &&
    eccentricityPassed;

  // Submit Final Verification Decision
  const handleApproveVerification = () => {
    const inspectionData = {
      officerId: selectedOfficer.id,
      officerName: selectedOfficer.name,
      visualInspectionPassed: true,
      repeatabilityPassed,
      eccentricityPassed,
      testLoads,
      passedAllTests: true,
      leadSealNo,
      hologramNo,
      remarks: inspectorNotes
    };

    onInspectApplication(selectedApp.id, inspectionData);
    setActiveTab('completed');
    setSelectedApp(null);

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const handleRejectVerification = () => {
    const inspectionData = {
      officerId: selectedOfficer.id,
      officerName: selectedOfficer.name,
      visualInspectionPassed: false,
      repeatabilityPassed: false,
      eccentricityPassed: false,
      testLoads,
      passedAllTests: false,
      leadSealNo: null,
      hologramNo: null,
      remarks: inspectorNotes || 'Failed Maximum Permissible Error tolerance test under Legal Metrology General Rules 2011.'
    };

    onInspectApplication(selectedApp.id, inspectionData);
    setActiveTab('queue');
    setSelectedApp(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Officer Header & Jurisdiction */}
      <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full border-2 border-emerald-400 overflow-hidden flex-shrink-0 bg-slate-800">
              <img
                src={selectedOfficer.avatar}
                alt={selectedOfficer.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold tracking-tight">{selectedOfficer.name}</h2>
                <span className="bg-emerald-600/80 text-white text-xs font-mono font-bold px-2 py-0.5 rounded border border-emerald-400">
                  {selectedOfficer.badgeNumber}
                </span>
                <span className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded border border-slate-700">
                  {selectedOfficer.designation}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Jurisdiction: <strong>{selectedOfficer.jurisdictionDistrict}, {selectedOfficer.jurisdictionState}</strong> • Assigned Inspections: {pendingQueue.length} Pending
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Authorized under Section 15 of Legal Metrology Act, 2009 for Stamping & Seizure
              </p>
            </div>
          </div>

          {/* Quick Officer Switcher for Demonstration */}
          <div className="flex items-center gap-2 bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
            <span className="text-xs text-slate-400 whitespace-nowrap">Switch Officer:</span>
            <select
              value={selectedOfficer.id}
              onChange={(e) => {
                const found = officers.find(o => o.id === e.target.value);
                if (found) setSelectedOfficer(found);
              }}
              className="text-xs font-medium text-white bg-slate-900 border border-slate-700 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer"
            >
              {officers.map(o => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.jurisdictionDistrict})
                </option>
              ))}
            </select>
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
                Applications submitted by merchants within {selectedOfficer.jurisdictionDistrict}
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
              pendingQueue.map((app) => (
                <div key={app.id} className="p-4 sm:p-5 hover:bg-slate-50 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200">
                        {app.id}
                      </span>
                      <span className="font-bold text-sm text-slate-900">{app.merchantName}</span>
                      <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-semibold">
                        {app.applicationType}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 flex flex-wrap gap-x-4 gap-y-1">
                      <span>Instrument: <strong>{app.brand} {app.model}</strong></span>
                      <span>S/N: <strong className="font-mono">{app.serialNumber}</strong></span>
                      <span>Class: <strong className="text-indigo-700">{app.accuracyClass}</strong></span>
                      <span>Capacity: <strong>{app.maxCapacityKg} kg</strong> (e={app.verificationInterval_e}g)</span>
                    </div>

                    <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                      <span>Submitted: {app.submissionDate}</span>
                      <span>Preferred Slot: <strong className="text-slate-700">{app.preferredInspectionDate}</strong></span>
                      <span>Statutory Fee: <strong className="text-emerald-700">₹{app.statutoryFee} (PAID)</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStartInspection(app)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
                    >
                      <Scale className="w-4 h-4" />
                      <span>Start Field Verification</span>
                    </button>
                  </div>
                </div>
              ))
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
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded">
                App ID: {selectedApp.id}
              </span>
            </div>
          </div>

          {/* Section 1: Visual & Mechanical Integrity Checklist */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-indigo-600" />
              1. Visual & Environmental Inspection Checklist (Rule 24)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer">
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

              <label className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer">
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

              <label className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer">
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

              <label className="flex items-center gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer">
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
                    const errorGrams = ((t.observedKg - t.loadKg) * 1000).toFixed(2);
                    return (
                      <tr key={idx} className={t.passed ? 'bg-white' : 'bg-rose-50/60'}>
                        <td className="p-3 font-semibold text-slate-900">{t.name}</td>
                        <td className="p-3 font-mono font-bold text-slate-800">{t.loadKg} kg</td>
                        <td className="p-3">
                          <input
                            type="number"
                            step="any"
                            value={t.observedKg}
                            onChange={(e) => handleObservedChange(idx, e.target.value)}
                            className="w-28 border border-slate-300 rounded px-2 py-1 font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                          />
                        </td>
                        <td className="p-3 font-mono">
                          <span className={t.passed ? 'text-slate-700' : 'text-rose-600 font-bold'}>
                            {errorGrams > 0 ? `+${errorGrams}` : errorGrams} g
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-600">
                          ±{t.mpeGrams} g
                        </td>
                        <td className="p-3 text-right">
                          {t.passed ? (
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
            <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/50">
              <span className="font-bold text-slate-900 block mb-1">Repeatability Test (3 Weighing Cycles):</span>
              <p className="text-[11px] text-slate-500 mb-2">
                Difference between 3 weighings of identical load cannot exceed statutory MPE.
              </p>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-emerald-800">
                  <input
                    type="radio"
                    name="repeatability"
                    checked={repeatabilityPassed}
                    onChange={() => setRepeatabilityPassed(true)}
                  />
                  <span>Consistent (Difference &lt; 0.5e)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-rose-700">
                  <input
                    type="radio"
                    name="repeatability"
                    checked={!repeatabilityPassed}
                    onChange={() => setRepeatabilityPassed(false)}
                  />
                  <span>Inconsistent</span>
                </label>
              </div>
            </div>

            <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/50">
              <span className="font-bold text-slate-900 block mb-1">Eccentricity (Corner Load) Test:</span>
              <p className="text-[11px] text-slate-500 mb-2">
                Corner load test with 1/3 capacity on 4 quadrant corners of the platform.
              </p>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-emerald-800">
                  <input
                    type="radio"
                    name="eccentricity"
                    checked={eccentricityPassed}
                    onChange={() => setEccentricityPassed(true)}
                  />
                  <span>Within Limit (±MPE)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-rose-700">
                  <input
                    type="radio"
                    name="eccentricity"
                    checked={!eccentricityPassed}
                    onChange={() => setEccentricityPassed(false)}
                  />
                  <span>Corner Bias Error</span>
                </label>
              </div>
            </div>
          </div>

          {/* Section 4: Security Seals Binding */}
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-amber-600" />
              3. Security Seal & Hologram Assignment
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Physical Lead / Wire Seal Serial No:</label>
                <input
                  type="text"
                  required
                  value={leadSealNo}
                  onChange={(e) => setLeadSealNo(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Crimped with official officer stamp die</span>
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Tamper-Evident Hologram Barcode ID:</label>
                <input
                  type="text"
                  required
                  value={hologramNo}
                  onChange={(e) => setHologramNo(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Affixed across chassis partition to prevent opening</span>
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
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-1.5 w-full sm:w-auto"
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
              Verified & Stamped Instruments under {selectedOfficer.jurisdictionDistrict}
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

    </div>
  );
}
