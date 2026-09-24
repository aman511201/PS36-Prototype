import React, { useState } from 'react';
import { FlaskConical, CheckCircle, ShieldCheck, Scale, FileText, ArrowRight, Award, Truck } from 'lucide-react';
import confetti from 'canvas-confetti';

export function GatcPortal({ gatcCenters, instruments, onOpenCertificate }) {
  const [selectedCenter, setSelectedCenter] = useState(gatcCenters[0]);
  const [selectedTestItem, setSelectedTestItem] = useState(null);
  const [calibratedTonnage, setCalibratedTonnage] = useState(60);

  // Heavy instruments that require GATC testing
  const heavyInstruments = instruments.filter(i => 
    i.category.includes('Weighbridge') || 
    i.category.includes('Flow Meter') || 
    i.category.includes('Fuel')
  );

  const [activeTestStep, setActiveTestStep] = useState(1);
  const [testReadings, setTestReadings] = useState([
    { loadTonnes: 10, observedTonnes: 10.0, errorKg: 0, status: 'PASSED' },
    { loadTonnes: 30, observedTonnes: 30.01, errorKg: 10, status: 'PASSED' },
    { loadTonnes: 60, observedTonnes: 60.02, errorKg: 20, status: 'PASSED' }
  ]);

  const handleCompleteGatcTest = () => {
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.6 }
    });
    alert(`GATC Test Report Generated for ${selectedTestItem?.serialNumber}! Traceability to National Physical Laboratory (NPL) standards confirmed. Sent to State LMO for statutory stamping.`);
    setSelectedTestItem(null);
  };

  return (
    <div className="space-y-6">
      
      {/* GATC Center Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 border border-purple-300 flex items-center justify-center text-purple-800 flex-shrink-0">
              <FlaskConical className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900">{selectedCenter.name}</h2>
                <span className="bg-purple-50 text-purple-700 text-xs font-semibold px-2 py-0.5 rounded border border-purple-200">
                  {selectedCenter.recognitionNumber}
                </span>
                <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded border border-emerald-200">
                  Govt Notified Centre
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                In-Charge: <strong>{selectedCenter.inCharge}</strong> • Accredited Scopes: {selectedCenter.accreditedScopes.join(', ')}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Standard Weights Capacity: <strong>{selectedCenter.standardWeightsAvailableTonnes} Tonnes</strong> (Calibrated by NPL / RRSL) • Valid Until: {selectedCenter.validUntil}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
            <span className="text-xs text-slate-500 whitespace-nowrap font-medium">Select GATC Lab:</span>
            <select
              value={selectedCenter.id}
              onChange={(e) => {
                const found = gatcCenters.find(g => g.id === e.target.value);
                if (found) setSelectedCenter(found);
              }}
              className="text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
            >
              {gatcCenters.map(g => (
                <option key={g.id} value={g.id}>
                  {g.name.split('(')[0]} ({g.city})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Heavy Instruments Queue */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-purple-700" />
              Heavy Instruments Calibration Queue
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Weighbridges & Bulk Meters requiring GATC testing
            </p>
          </div>

          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {heavyInstruments.map((inst) => {
              const isSelected = selectedTestItem?.id === inst.id;
              return (
                <div
                  key={inst.id}
                  onClick={() => setSelectedTestItem(inst)}
                  className={`p-4 cursor-pointer transition text-xs ${
                    isSelected ? 'bg-purple-50/80 border-l-4 border-purple-600' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold text-slate-900">{inst.brand} - {inst.model}</div>
                  <div className="text-[11px] text-slate-600 font-mono mt-0.5">S/N: {inst.serialNumber}</div>
                  <div className="text-[11px] text-slate-500 mt-1">Capacity: <strong>{inst.maxCapacityKg} kg</strong></div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Premise: {inst.locationAddress}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                      {inst.category.split('(')[0]}
                    </span>
                    <span className="text-[10px] text-purple-700 font-bold">Calibrate →</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: GATC Calibration Workspace */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          {selectedTestItem ? (
            <div className="space-y-5 text-xs">
              <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-purple-700 tracking-wider">
                    GATC Calibration & Metrological Testing
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    {selectedTestItem.brand} - {selectedTestItem.model}
                  </h3>
                  <p className="text-slate-600">
                    Serial: <strong className="font-mono">{selectedTestItem.serialNumber}</strong> • Max: <strong>{selectedTestItem.maxCapacityKg} kg</strong>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTestItem(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ✕
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

              {/* Calibration Readings */}
              <div>
                <h4 className="font-bold text-slate-900 mb-2">Stepwise Standard Weight Load Trials:</h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                      <tr>
                        <th className="p-2.5">Standard Load (Tonnes)</th>
                        <th className="p-2.5">Observed Indicating (Tonnes)</th>
                        <th className="p-2.5">Error (kg)</th>
                        <th className="p-2.5">Permissible Tolerance</th>
                        <th className="p-2.5 text-right">Verification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {testReadings.map((r, i) => (
                        <tr key={i}>
                          <td className="p-2.5 font-bold font-mono">{r.loadTonnes} T</td>
                          <td className="p-2.5 font-mono">{r.observedTonnes} T</td>
                          <td className="p-2.5 font-mono text-emerald-700">+{r.errorKg} kg</td>
                          <td className="p-2.5 font-mono text-slate-500">±{r.loadTonnes * 0.5} kg</td>
                          <td className="p-2.5 text-right font-bold text-emerald-700">PASSED</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Strain Gauge & Off-Center Linearity */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border rounded-lg">
                  <span className="font-bold block text-slate-800">Eccentricity (Corner Shift):</span>
                  <span className="text-[11px] text-emerald-700 font-medium">±5 kg across all 4 load cell corners (PASS)</span>
                </div>
                <div className="p-3 bg-slate-50 border rounded-lg">
                  <span className="font-bold block text-slate-800">Repeatability (Half-Max Load):</span>
                  <span className="text-[11px] text-emerald-700 font-medium">Variance &lt; 0.005% of applied load (PASS)</span>
                </div>
              </div>

              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  onClick={() => setSelectedTestItem(null)}
                  className="px-3 py-1.5 border rounded text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCompleteGatcTest}
                  className="px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded font-bold shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Award className="w-4 h-4" />
                  <span>Issue GATC Test Report & Forward to LMO</span>
                </button>
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
