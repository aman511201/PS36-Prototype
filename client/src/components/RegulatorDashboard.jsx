import React, { useState } from 'react';
import { 
  Landmark, 
  ShieldCheck, 
  AlertTriangle, 
  TrendingUp, 
  MapPin, 
  Search, 
  FileText, 
  Lock, 
  Building, 
  Users, 
  Scale, 
  Clock, 
  CheckCircle,
  Activity,
  Layers,
  FileCheck
} from 'lucide-react';

export function RegulatorDashboard({ 
  regulatorStats, 
  auditLogs, 
  certificates, 
  grievances,
  onOpenCertificate 
}) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'cross-jurisdiction', 'audit-ledger', 'grievances'
  const [auditSearch, setAuditSearch] = useState('');
  const [selectedStateFilter, setSelectedStateFilter] = useState('ALL');

  const kpis = regulatorStats?.kpis || {
    totalInstruments: 7,
    verifiedInstruments: 5,
    expiringSoon: 1,
    expired: 1,
    complianceRate: 71,
    totalFeeCollected: 4400,
    totalGrievances: 2,
    resolvedGrievances: 1,
    activeOfficersCount: 4,
    gatcCentersCount: 2
  };

  const stateBreakdown = regulatorStats?.stateBreakdown || [
    { state: 'Maharashtra', totalInstruments: 3, verified: 2, defaulters: 1, complianceRate: 67 },
    { state: 'Karnataka', totalInstruments: 2, verified: 2, defaulters: 0, complianceRate: 100 },
    { state: 'Delhi', totalInstruments: 1, verified: 1, defaulters: 0, complianceRate: 100 },
    { state: 'Gujarat', totalInstruments: 1, verified: 1, defaulters: 0, complianceRate: 100 },
    { state: 'Uttar Pradesh', totalInstruments: 0, verified: 0, defaulters: 0, complianceRate: 100 },
    { state: 'Tamil Nadu', totalInstruments: 0, verified: 0, defaulters: 0, complianceRate: 100 }
  ];

  const filteredLogs = auditLogs.filter(log => {
    return auditSearch === '' ||
      log.actorName.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.target.toLowerCase().includes(auditSearch.toLowerCase()) ||
      log.details.toLowerCase().includes(auditSearch.toLowerCase());
  });

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 flex-shrink-0">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-semibold text-amber-400 tracking-wider">
                  Central Regulators Command & Control
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded font-mono">
                  PAN-INDIA REGISTRY
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white mt-0.5">
                Directorate of Legal Metrology • National Oversight Center
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Centralized Cross-Jurisdictional Verification Tracking & Anti-Tampering Audit Ledger
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-800 p-2 rounded-lg border border-slate-700">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-mono text-slate-300">Sync: State & Central Metrology Grid</span>
          </div>
        </div>
      </div>

      {/* Top National KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] text-slate-500 font-medium block">Total Instruments</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{kpis.totalInstruments}</div>
          <span className="text-[10px] text-slate-400">National Database</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-sm">
          <span className="text-[11px] text-emerald-700 font-medium block">Compliance Rate</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{kpis.complianceRate}%</div>
          <span className="text-[10px] text-emerald-600 font-medium">Legally Stamped</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm">
          <span className="text-[11px] text-rose-700 font-medium block">Overdue Defaulters</span>
          <div className="text-2xl font-bold text-rose-700 mt-1">{kpis.expired}</div>
          <span className="text-[10px] text-rose-600 font-medium">Seizure / Penalty Risk</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-indigo-200 shadow-sm">
          <span className="text-[11px] text-indigo-700 font-medium block">Statutory Revenue</span>
          <div className="text-2xl font-bold text-indigo-700 mt-1">₹{kpis.totalFeeCollected}</div>
          <span className="text-[10px] text-indigo-600 font-medium">Schedule XII Fees</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-purple-200 shadow-sm">
          <span className="text-[11px] text-purple-700 font-medium block">Active LMOs</span>
          <div className="text-2xl font-bold text-purple-700 mt-1">{kpis.activeOfficersCount}</div>
          <span className="text-[10px] text-purple-600 font-medium">Field Officers</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm">
          <span className="text-[11px] text-amber-700 font-medium block">Grievance Resolution</span>
          <div className="text-2xl font-bold text-amber-700 mt-1">
            {kpis.resolvedGrievances}/{kpis.totalGrievances}
          </div>
          <span className="text-[10px] text-amber-600 font-medium">Public Redressal</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        
        <div className="p-3 border-b border-slate-200 flex items-center gap-2 bg-slate-50">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'overview' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Pan-India Overview</span>
          </button>

          <button
            onClick={() => setActiveTab('cross-jurisdiction')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'cross-jurisdiction' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Cross-Jurisdiction Monitoring</span>
          </button>

          <button
            onClick={() => setActiveTab('audit-ledger')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'audit-ledger' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Immutable Audit Trail ({auditLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('grievances')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'grievances' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Consumer Complaints ({grievances.length})</span>
          </button>
        </div>

        {/* Tab 1: Pan-India Overview */}
        {activeTab === 'overview' && (
          <div className="p-6 space-y-6">
            
            {/* National Compliance Heatmap Bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-800">Pan-India Stamping Compliance Rate</span>
                <span className="font-mono font-bold text-emerald-700">{kpis.complianceRate}% Verified</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
                <div style={{ width: `${kpis.complianceRate}%` }} className="bg-emerald-500 h-full"></div>
                <div style={{ width: `${(kpis.expiringSoon / (kpis.totalInstruments || 1)) * 100}%` }} className="bg-amber-400 h-full"></div>
                <div style={{ width: `${(kpis.expired / (kpis.totalInstruments || 1)) * 100}%` }} className="bg-rose-500 h-full"></div>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-1">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></span> Verified & Stamped</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-amber-400 rounded-sm"></span> Expiring Soon (&lt;30d)</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-rose-500 rounded-sm"></span> Overdue Defaulters</span>
              </div>
            </div>

            {/* Quick State Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {stateBreakdown.slice(0, 3).map((s) => (
                <div key={s.state} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm text-slate-900">{s.state}</span>
                    <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      {s.complianceRate}%
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 flex justify-between">
                    <span>Instruments: <strong>{s.totalInstruments}</strong></span>
                    <span>Defaulters: <strong className={s.defaulters > 0 ? 'text-rose-600' : 'text-slate-500'}>{s.defaulters}</strong></span>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Stamped Certificates Table */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Recently Issued Central Verification Certificates
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                    <tr>
                      <th className="p-2.5">Certificate ID</th>
                      <th className="p-2.5">Establishment</th>
                      <th className="p-2.5">Instrument</th>
                      <th className="p-2.5">Jurisdiction</th>
                      <th className="p-2.5">Stamping Date</th>
                      <th className="p-2.5">Valid Until</th>
                      <th className="p-2.5 text-right">Certificate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {certificates.slice(0, 4).map((c) => (
                      <tr key={c.certificateNumber} className="hover:bg-slate-50">
                        <td className="p-2.5 font-mono font-bold text-slate-900">{c.certificateNumber}</td>
                        <td className="p-2.5 font-medium">{c.merchantName}</td>
                        <td className="p-2.5">{c.brand} ({c.serialNumber})</td>
                        <td className="p-2.5">{c.district}, {c.state}</td>
                        <td className="p-2.5">{c.stampingDate}</td>
                        <td className="p-2.5 font-semibold text-emerald-700">{c.validUntilDate}</td>
                        <td className="p-2.5 text-right">
                          <button
                            onClick={() => onOpenCertificate(c)}
                            className="text-xs font-bold text-slate-700 hover:text-emerald-700 underline cursor-pointer"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* Tab 2: Cross-Jurisdiction Monitoring */}
        {activeTab === 'cross-jurisdiction' && (
          <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Cross-Jurisdictional Verification Matrix
                </h3>
                <p className="text-xs text-slate-500">
                  Tackles inter-district & inter-state monitoring gaps under Legal Metrology Act, 2009
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">Filter State:</span>
                <select
                  value={selectedStateFilter}
                  onChange={(e) => setSelectedStateFilter(e.target.value)}
                  className="border rounded px-2.5 py-1 text-xs font-medium"
                >
                  <option value="ALL">All States</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="Delhi">Delhi</option>
                  <option value="Gujarat">Gujarat</option>
                </select>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                  <tr>
                    <th className="p-3">State / Jurisdiction</th>
                    <th className="p-3">Total Instruments Registered</th>
                    <th className="p-3">Verified & Stamped</th>
                    <th className="p-3">Defaulters / Overdue</th>
                    <th className="p-3">Compliance Rate</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stateBreakdown
                    .filter(s => selectedStateFilter === 'ALL' || s.state === selectedStateFilter)
                    .map((s) => (
                      <tr key={s.state} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-900 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{s.state}</span>
                        </td>
                        <td className="p-3 font-semibold">{s.totalInstruments} units</td>
                        <td className="p-3 text-emerald-700 font-semibold">{s.verified} units</td>
                        <td className="p-3">
                          {s.defaulters > 0 ? (
                            <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              {s.defaulters} Defaulters
                            </span>
                          ) : (
                            <span className="text-slate-400">0 Overdue</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-200 h-2 rounded-full overflow-hidden">
                              <div style={{ width: `${s.complianceRate}%` }} className="bg-emerald-600 h-full"></div>
                            </div>
                            <span className="font-bold text-slate-800">{s.complianceRate}%</span>
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => alert(`Cross-Jurisdiction Notice Generated for ${s.state} Controller!`)}
                            className="text-[11px] font-bold text-slate-700 hover:text-emerald-700 border px-2 py-1 rounded bg-white shadow-xs cursor-pointer"
                          >
                            Inspection Audit
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Inter-State Mobile Transport Scale Tracking Note */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs space-y-1">
              <span className="font-bold text-slate-900 block">
                Inter-State Mobile Instruments & Weighbridge Tracking:
              </span>
              <p className="text-slate-600">
                Under the unified National Metrology Verification Registry, mobile instruments (e.g. mobile weighbridges, petroleum road tankers) stamped in Maharashtra are verifiable instantly by inspectors in Gujarat or Delhi via central QR hash scanning, eliminating jurisdictional disputes.
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Immutable Cryptographic Audit Ledger */}
        {activeTab === 'audit-ledger' && (
          <div className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  Immutable System Event & Stamping Audit Ledger
                </h3>
                <p className="text-xs text-slate-500">
                  Cryptographically hashed events preventing unauthorized modifications or retroactive stamping
                </p>
              </div>

              <div className="w-full sm:w-64">
                <input
                  type="text"
                  placeholder="Search audit trail..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b">
                  <tr>
                    <th className="p-2.5">Timestamp</th>
                    <th className="p-2.5">Actor & Role</th>
                    <th className="p-2.5">Action Type</th>
                    <th className="p-2.5">Target</th>
                    <th className="p-2.5">Details</th>
                    <th className="p-2.5 font-mono">SHA-256 Signature</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">{log.timestamp}</td>
                      <td className="p-2.5">
                        <div className="font-semibold text-slate-900">{log.actorName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{log.actorRole}</div>
                      </td>
                      <td className="p-2.5">
                        <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-semibold">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono text-[11px] text-slate-800">{log.target}</td>
                      <td className="p-2.5 text-slate-600 text-[11px] max-w-xs">{log.details}</td>
                      <td className="p-2.5 font-mono text-[10px] text-indigo-700">
                        {log.signatureHash?.substring(0, 16)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Consumer Grievances ("Jago Grahak Jago") */}
        {activeTab === 'grievances' && (
          <div className="p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Citizen Grievance Redressal & Enforcement Registry
              </h3>
              <p className="text-xs text-slate-500">
                Complaints lodged by consumers regarding short weight, broken stamps, or unverified scales
              </p>
            </div>

            <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg">
              {grievances.map((g) => (
                <div key={g.id} className="p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{g.id}</span>
                      <span className="font-bold text-slate-800">{g.merchantName}</span>
                      <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-semibold">
                        {g.complaintType}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      g.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {g.status}
                    </span>
                  </div>

                  <p className="text-slate-600">
                    "{g.description}"
                  </p>

                  <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-4 pt-1">
                    <span>Complainant: <strong>{g.complainantName}</strong> ({g.complainantPhone})</span>
                    <span>District: {g.district}, {g.state}</span>
                    <span>Investigating LMO: <strong>{g.assignedOfficerName}</strong></span>
                  </div>

                  {g.officerRemarks && (
                    <div className="bg-slate-50 p-2 rounded border border-slate-200 text-[11px] text-slate-700">
                      <strong>LMO Enforcement Action:</strong> {g.officerRemarks}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
