import React, { useState } from 'react';
import { 
  Scale, 
  Building2, 
  FlaskConical, 
  Landmark, 
  Users, 
  ShieldCheck, 
  CheckCircle2, 
  Search, 
  QrCode, 
  Calculator, 
  ArrowRight, 
  FileText, 
  Award, 
  ChevronRight, 
  AlertTriangle, 
  ExternalLink, 
  PhoneCall, 
  HelpCircle, 
  Sparkles,
  Check,
  Shield,
  FileCheck,
  Lock,
  Compass,
  TrendingUp,
  MapPin,
  Clock,
  Printer
} from 'lucide-react';
import { Emblem, HologramBadge } from './Emblem';
import { calculateStatutoryFee } from '../../../server/utils/feeCalculator';

export function LandingPage({ 
  onNavigateLogin, 
  onNavigatePortal, 
  certificates = [], 
  instruments = [], 
  onOpenCertificate 
}) {
  // Public Quick Verify State
  const [verifyQuery, setVerifyQuery] = useState('MH/LM/2025/08492');
  const [verifyResult, setVerifyResult] = useState(null);
  const [hasVerified, setHasVerified] = useState(false);

  // Statutory Fee Calculator State
  const [feeCategory, setFeeCategory] = useState('Electronic Weighing Scale (Counter/Tabletop)');
  const [feeCapacity, setFeeCapacity] = useState(15);
  const [feeAccuracy, setFeeAccuracy] = useState('Class III');
  const [feeIsLate, setFeeIsLate] = useState(false);

  // Calculated Fee
  const calculatedFee = calculateStatutoryFee({
    category: feeCategory,
    capacityKg: Number(feeCapacity) || 10,
    accuracyClass: feeAccuracy,
    isLate: feeIsLate,
    lateDays: feeIsLate ? 15 : 0
  });

  // Handle Quick Verification on Landing Page
  const handleQuickVerify = (query = verifyQuery) => {
    const q = (query || '').trim().toLowerCase();
    setHasVerified(true);

    if (!q) {
      setVerifyResult(null);
      return;
    }

    // Match in certificates
    const cert = certificates.find(c => 
      (c.certificateNumber && c.certificateNumber.toLowerCase() === q) ||
      (c.serialNumber && c.serialNumber.toLowerCase() === q) ||
      (c.leadSealNo && c.leadSealNo.toLowerCase() === q) ||
      (c.hologramNo && c.hologramNo.toLowerCase() === q)
    );

    if (cert) {
      const isExpired = new Date(cert.validUntilDate) < new Date();
      setVerifyResult({
        found: true,
        type: 'CERTIFICATE',
        isExpired,
        certificate: cert
      });
      return;
    }

    // Match in instruments
    const inst = instruments.find(i => 
      (i.serialNumber && i.serialNumber.toLowerCase() === q) ||
      (i.id && i.id.toLowerCase() === q)
    );

    if (inst) {
      const isExpired = inst.status === 'EXPIRED';
      setVerifyResult({
        found: true,
        type: 'INSTRUMENT',
        isExpired,
        instrument: inst
      });
      return;
    }

    setVerifyResult({ found: false, query });
  };

  const portalCards = [
    {
      role: 'merchant',
      title: 'Commercial Merchant & Trader',
      subtitle: 'Traders, Jewelers, Petrol Stations & Mandis',
      icon: Building2,
      accentColor: 'from-blue-600 to-indigo-700',
      tagColor: 'bg-blue-50 text-blue-700 border-blue-200',
      badge: 'Establishment Portal',
      description: 'Manage weighing instruments fleet, schedule periodic re-verification, calculate automated Schedule XII fees, and download official Schedule VIII certificates & QR seal stickers.',
      features: [
        '4-Step Periodic Verification Wizard',
        'Automated Schedule XII Fee Calculation',
        'Simulated BharatKosh / UPI Payment',
        'Digital Certificate Locker & QR Stickers'
      ],
      ctaText: 'Merchant Login / Register'
    },
    {
      role: 'inspector',
      title: 'Legal Metrology Officer (LMO)',
      subtitle: 'Field Inspectors & District Verification Officers',
      icon: Scale,
      accentColor: 'from-emerald-600 to-teal-700',
      tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      badge: 'Statutory Enforcement',
      description: 'Conduct field inspections with automated Table 2 & 3 MPE (Maximum Permissible Error) evaluation, cryptographic lead wire seal assignment, and instant Schedule VIII Form B issuance.',
      features: [
        'Jurisdiction Inspection Queue (State & District)',
        'Live MPE Tolerance Calculation Engine',
        'Cryptographic Wire Seal & Hologram Binding',
        '1-Click Schedule VIII Certificate Generator'
      ],
      ctaText: 'LMO Inspector Login'
    },
    {
      role: 'gatc',
      title: 'Government Approved Test Lab (GATC)',
      subtitle: 'Notified Calibration Labs for Heavy Scales & Bulk Meters',
      icon: FlaskConical,
      accentColor: 'from-amber-600 to-orange-700',
      tagColor: 'bg-amber-50 text-amber-700 border-amber-200',
      badge: 'Heavy Calibration',
      description: 'Specifically engineered for SIH PS 26036 notified GATC labs. Perform calibrations for 60-Tonne lorry weighbridges, bulk petroleum flow meters, and log NPL reference standards.',
      features: [
        'Weighbridge & Bulk Flow Test Logbook',
        'Unbroken NPL / RRSL Reference Standards',
        '60T Standard Test Weights Tracking',
        'Direct Integration to State LMO Stamping'
      ],
      ctaText: 'GATC Lab Login'
    },
    {
      role: 'regulator',
      title: 'Regulator Command Center',
      subtitle: 'National Directorate & State Controllers of Legal Metrology',
      icon: Landmark,
      accentColor: 'from-purple-600 to-violet-700',
      tagColor: 'bg-purple-50 text-purple-700 border-purple-200',
      badge: 'Apex Super Admin',
      description: 'Pan-India oversight dashboard to track mobile weighbridges across state lines, monitor national compliance rates, inspect revenue yields, and audit immutable SHA-256 cryptographic logs.',
      features: [
        'Pan-India Real-Time Compliance Radar',
        'Cross-Jurisdiction Mobile Scale Tracking',
        'Immutable Cryptographic SHA-256 Ledger',
        'Whistleblower Raid Escalation Heatmap'
      ],
      ctaText: 'Regulator Command Access'
    },
    {
      role: 'consumer',
      title: 'Citizen & Consumer ("Jago Grahak Jago")',
      subtitle: 'Empowering 140 Crore Indian Consumers with Transparency',
      icon: Users,
      accentColor: 'from-rose-600 to-red-700',
      tagColor: 'bg-rose-50 text-rose-700 border-rose-200',
      badge: 'Public Transparency',
      description: 'Instantly scan scale QR stickers to verify legal authenticity, inspect validity expiry dates, and file whistleblowing grievances for short weight or tampered seals with local LMO dispatch.',
      features: [
        'Instant QR Code Authenticity Verifier',
        'Detection of Expired or Counterfeit Seals',
        '1-Minute Whistleblower Grievance Lodging',
        'Live Tracking of LMO Enforcement Spot Raids'
      ],
      ctaText: 'Citizen Portal / Quick Verify'
    }
  ];

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800">
      
      {/* 1. Official Government Top Notification Ribbon */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-slate-200 text-xs py-2 px-4 border-b border-slate-700">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950 uppercase tracking-wide flex-shrink-0 animate-pulse">
              Gazette Notice
            </span>
            <p className="truncate text-slate-300">
              <span className="font-semibold text-white">Statutory Periodic Verification Cycle Active:</span> Under Legal Metrology Act 2009, all commercial scales & petroleum dispensers must hold active Schedule VIII verification stamps.
            </p>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400 flex-shrink-0">
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Central Metrology Node: 100% Operational
            </span>
            <span className="hidden sm:inline">|</span>
            <span className="hidden sm:inline">National Consumer Helpline: 1915</span>
          </div>
        </div>
      </div>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50 to-slate-100 border-b border-slate-200 py-12 lg:py-16">
        {/* Subtle Decorative Background Grid */}
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#0f172a_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            
            {/* Left Column: Heading & Call to Actions */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Govt Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Smart India Hackathon • Problem Statement ID: 26036 (PS36)</span>
              </div>

              {/* Main Headline */}
              <div className="space-y-2">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  National Legal Metrology <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-700 to-blue-700">
                    Online Verification System
                  </span>
                </h1>
                <p className="text-sm sm:text-base font-semibold text-slate-600">
                  e-Maap (NLMVS) • Governed under The Legal Metrology Act, 2009 (Act 1 of 2010)
                </p>
              </div>

              {/* Subtitle Description */}
              <p className="text-base text-slate-600 leading-relaxed max-w-2xl">
                A unified, cloud-native national verification network connecting <strong className="text-slate-900">4.2+ Crore Merchants</strong>, <strong className="text-slate-900">Legal Metrology Officers (LMOs)</strong>, <strong className="text-slate-900">Government Approved Test Centres (GATCs)</strong>, and <strong className="text-slate-900">140 Crore Consumers</strong> with cryptographic tamper-proof stamping.
              </p>

              {/* Primary Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => onNavigateLogin()}
                  className="flex items-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/25 transition cursor-pointer text-sm"
                >
                  <Lock className="w-4 h-4" />
                  <span>Portal Login Gateway</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>

                <a
                  href="#public-verify"
                  className="flex items-center gap-2 px-5 py-3.5 bg-white hover:bg-slate-50 text-slate-800 font-semibold rounded-xl border border-slate-300 shadow-sm transition text-sm cursor-pointer"
                >
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  <span>Public QR & Seal Verifier</span>
                </a>

                <a
                  href="#fee-calculator"
                  className="flex items-center gap-2 px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition text-sm cursor-pointer"
                >
                  <Calculator className="w-4 h-4 text-slate-500" />
                  <span>Fee Calculator (Sched. XII)</span>
                </a>
              </div>

              {/* Security & Statutory Highlights */}
              <div className="pt-4 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-slate-600 font-medium">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Schedule VIII Certificates</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Table 2 & 3 MPE Engine</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>SHA-256 Tamper-Proof Seals</span>
                </div>
              </div>

            </div>

            {/* Right Column: Hero Visual Card & Live Stamp Pedigree */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 relative overflow-hidden">
                {/* Government Stamp Ribbon */}
                <div className="absolute top-0 right-0 w-32 h-32 overflow-hidden pointer-events-none">
                  <div className="absolute transform rotate-45 bg-emerald-600 text-white font-bold text-[9px] py-1 right-[-35px] top-[22px] w-[130px] text-center shadow">
                    STATUTORY VERIFIED
                  </div>
                </div>

                <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                  <Emblem className="w-12 h-12" />
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Form B • Schedule VIII
                    </span>
                    <h3 className="font-bold text-slate-900 text-base">
                      Certificate of Legal Verification
                    </h3>
                    <p className="text-xs text-slate-500">Ministry of Consumer Affairs, Food & P.D.</p>
                  </div>
                </div>

                {/* Simulated Certificate Preview Box */}
                <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 font-mono text-xs">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Certificate No:</span>
                    <span className="font-bold text-slate-900">MH/LM/2025/08492</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Instrument Serial:</span>
                    <span className="font-bold text-emerald-700">OM-2024-W01</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Accuracy Class:</span>
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">Class III (Medium)</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Physical Wire Seal:</span>
                    <span className="font-bold text-slate-800">SEAL-MH-99412</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-500">Validity Period:</span>
                    <span className="font-bold text-emerald-600">Valid till 28-Feb-2027</span>
                  </div>

                  <div className="pt-2">
                    <HologramBadge serialNo="HOL-GOI-2026-99120" />
                  </div>
                </div>

                {/* Instant Action on Card */}
                <div className="mt-4 flex items-center justify-between text-xs pt-2">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-emerald-600" />
                    Cryptographic SHA-256 Hash
                  </span>
                  <button
                    onClick={() => {
                      const sampleCert = certificates[0];
                      if (sampleCert && onOpenCertificate) onOpenCertificate(sampleCert);
                    }}
                    className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>View Official Form B</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. Real-Time National Statistics Counter Bar */}
      <section className="bg-slate-900 text-white py-6 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400">1,284,590+</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-medium">Instruments Verified</div>
            </div>

            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-extrabold text-teal-400">99.4%</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-medium">Metrology Compliance</div>
            </div>

            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-400">₹ 148.2 Cr</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-medium">Schedule XII Revenue</div>
            </div>

            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-extrabold text-blue-400">36 States & UTs</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-medium">Single National Node</div>
            </div>

          </div>
        </div>
      </section>

      {/* 4. Stakeholder Role Portals (Access For Every User) */}
      <section id="portals-overview" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5 text-slate-600" />
            <span>Dedicated User Gateways</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Role-Based Workspaces for Every Stakeholder
          </h2>
          <p className="text-sm text-slate-600">
            e-Maap provides distinct, role-tailored authentication and operational toolkits conforming to the statutory requirements of each user group under Indian law.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {portalCards.map((portal) => {
            const Icon = portal.icon;
            return (
              <div 
                key={portal.role}
                className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between hover:shadow-lg hover:border-slate-300 transition duration-200 relative group"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${portal.accentColor} text-white shadow-md`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${portal.tagColor}`}>
                      {portal.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition">
                    {portal.title}
                  </h3>
                  <p className="text-xs font-medium text-slate-500 mt-0.5 mb-3">
                    {portal.subtitle}
                  </p>
                  
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    {portal.description}
                  </p>

                  <div className="space-y-2 pt-2 border-t border-slate-100 mb-6">
                    {portal.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-slate-700">
                        <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => onNavigateLogin(portal.role)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-emerald-700 text-white font-semibold text-xs transition cursor-pointer"
                  >
                    <span>{portal.ctaText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Special Quick Access Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 rounded-2xl p-6 text-white flex flex-col justify-between shadow-xl">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <ShieldCheck className="w-6 h-6" />
                </span>
                <span className="text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded">
                  SIH PS 26036
                </span>
              </div>
              <h3 className="text-lg font-bold">Smart India Hackathon Prototype</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Test the prototype with preloaded mock datasets across all 5 roles:
                Mumbai grocery store, Bengaluru jeweler, Delhi petrol pump, Gujarat weighbridge, and state controllers.
              </p>
              <div className="p-3 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-300 space-y-1">
                <div className="font-semibold text-emerald-400">Instant Demo Switcher:</div>
                <div className="text-[11px] text-slate-400">1-click autofill credentials available on the login page for evaluators.</div>
              </div>
            </div>

            <div className="pt-6">
              <button
                onClick={() => onNavigateLogin('merchant')}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition cursor-pointer"
              >
                <span>Launch Authentication Hub</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

      </section>

      {/* 5. Interactive Public Utilities (Quick QR Verifier & Statutory Fee Calculator) */}
      <section className="py-14 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          {/* Utility A: Public Instrument Verification Tool */}
          <div id="public-verify" className="scroll-mt-20">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-8">
              
              <div className="max-w-3xl mb-6">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 text-xs font-bold mb-2">
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Public Transparency Desk</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Instant Instrument & Certificate Verifier
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Consumers and merchants can verify whether any scale or petrol pump carries a valid government verification certificate under the Legal Metrology Act, 2009.
                </p>
              </div>

              {/* Search Bar */}
              <div className="flex flex-col sm:flex-row gap-2 max-w-3xl">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    value={verifyQuery}
                    onChange={(e) => setVerifyQuery(e.target.value)}
                    placeholder="Enter Certificate No. (e.g. MH/LM/2025/08492) or Scale Serial No. (e.g. OM-2024-W01)..."
                    className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono shadow-sm"
                  />
                </div>
                <button
                  onClick={() => handleQuickVerify()}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  <span>Verify Status</span>
                </button>
              </div>

              {/* Quick Preset Chips */}
              <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-slate-500">
                <span className="font-medium">Try Sample Numbers:</span>
                <button
                  onClick={() => { setVerifyQuery('MH/LM/2025/08492'); handleQuickVerify('MH/LM/2025/08492'); }}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 rounded-md font-mono text-[11px] cursor-pointer transition"
                >
                  MH/LM/2025/08492 (Supermarket Scale)
                </button>
                <button
                  onClick={() => { setVerifyQuery('KA/LM/2025/01290'); handleQuickVerify('KA/LM/2025/01290'); }}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 rounded-md font-mono text-[11px] cursor-pointer transition"
                >
                  KA/LM/2025/01290 (Jeweler Precision)
                </button>
                <button
                  onClick={() => { setVerifyQuery('DL/LM/2024/09914'); handleQuickVerify('DL/LM/2024/09914'); }}
                  className="px-2.5 py-1 bg-white hover:bg-amber-50 hover:text-amber-700 border border-slate-200 rounded-md font-mono text-[11px] cursor-pointer transition"
                >
                  DL/LM/2024/09914 (Expired Dispenser)
                </button>
              </div>

              {/* Verification Result Display */}
              {hasVerified && (
                <div className="mt-6 pt-6 border-t border-slate-200">
                  {verifyResult && verifyResult.found ? (
                    <div className={`p-4 rounded-xl border ${
                      verifyResult.isExpired 
                        ? 'bg-rose-50 border-rose-200 text-rose-900' 
                        : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    }`}>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {verifyResult.isExpired ? (
                            <AlertTriangle className="w-8 h-8 text-rose-600 flex-shrink-0" />
                          ) : (
                            <ShieldCheck className="w-8 h-8 text-emerald-600 flex-shrink-0" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm">
                                {verifyResult.isExpired ? 'EXPIRED / VERIFICATION OVERDUE' : 'AUTHENTIC & LEGALLY VERIFIED'}
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                verifyResult.isExpired ? 'bg-rose-200 text-rose-800' : 'bg-emerald-200 text-emerald-800'
                              }`}>
                                Schedule VIII Certified
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 mt-0.5">
                              {verifyResult.type === 'CERTIFICATE' 
                                ? `Certificate: ${verifyResult.certificate.certificateNumber} • Issued to: ${verifyResult.certificate.merchantName}`
                                : `Instrument: ${verifyResult.instrument.modelName} (Serial: ${verifyResult.instrument.serialNumber})`
                              }
                            </p>
                          </div>
                        </div>

                        {verifyResult.certificate && (
                          <button
                            onClick={() => onOpenCertificate && onOpenCertificate(verifyResult.certificate)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>View Official Form B Certificate</span>
                          </button>
                        )}
                      </div>

                      {/* Detail Metrics */}
                      {verifyResult.certificate && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-emerald-200/50 text-xs font-mono">
                          <div>
                            <span className="text-slate-500 block text-[10px]">Valid Until:</span>
                            <span className="font-bold">{verifyResult.certificate.validUntilDate}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">Lead Wire Seal No:</span>
                            <span className="font-bold">{verifyResult.certificate.leadSealNo}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">Hologram Serial:</span>
                            <span className="font-bold">{verifyResult.certificate.hologramNo}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[10px]">Verifying Officer:</span>
                            <span className="font-bold">{verifyResult.certificate.officerName}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <div className="text-xs">
                        <span className="font-bold">No Record Found for "{verifyResult?.query}".</span> Please check the certificate number or serial number entered, or contact your district Legal Metrology Officer.
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* Utility B: Schedule XII Statutory Fee Calculator */}
          <div id="fee-calculator" className="scroll-mt-20">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-8">
              
              <div className="max-w-3xl mb-6">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-100 text-blue-800 text-xs font-bold mb-2">
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Statutory Schedule XII Calculator</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                  Government Verification Fee Estimator
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Computes exact statutory government verification fees and late penalties in accordance with <strong className="text-slate-800">Schedule XII of the Legal Metrology (General) Rules, 2011</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Inputs Column */}
                <div className="lg:col-span-2 space-y-4">
                  
                  {/* Category Select */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Instrument Category
                    </label>
                    <select
                      value={feeCategory}
                      onChange={(e) => setFeeCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
                    >
                      <option value="Electronic Weighing Scale (Counter/Tabletop)">
                        Electronic Weighing Scale (Counter / Tabletop)
                      </option>
                      <option value="Platform Scale / Heavy Bench Scale">
                        Platform Scale / Heavy Bench Scale
                      </option>
                      <option value="Precision Analytical Balance (Jeweler/Lab)">
                        Precision Analytical Balance (Jeweler / Lab)
                      </option>
                      <option value="Weighbridge (Lorry/Truck)">
                        Weighbridge (Lorry / Commercial Truck)
                      </option>
                      <option value="Fuel Dispensing Unit (Petrol/Diesel)">
                        Fuel Dispensing Unit (Petrol / Diesel Multi-Nozzle)
                      </option>
                      <option value="Flow Meter / Bulk Liquid Measure">
                        Flow Meter / Bulk Liquid Measure (Tanker)
                      </option>
                    </select>
                  </div>

                  {/* Capacity & Class Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Max Capacity (kg or units)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={feeCapacity}
                        onChange={(e) => setFeeCapacity(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Accuracy Class
                      </label>
                      <select
                        value={feeAccuracy}
                        onChange={(e) => setFeeAccuracy(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
                      >
                        <option value="Class III">Class III (Medium Accuracy - Commercial)</option>
                        <option value="Class II">Class II (High Accuracy - Bullion/Jewelry)</option>
                        <option value="Class I">Class I (Special Analytical - Laboratory)</option>
                      </select>
                    </div>
                  </div>

                  {/* Late Status Checkbox */}
                  <div className="pt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={feeIsLate}
                        onChange={(e) => setFeeIsLate(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-xs sm:text-sm font-semibold text-slate-700">
                        Renewal overdue past validity expiry (Applies statutory 100% late surcharge)
                      </span>
                    </label>
                  </div>

                </div>

                {/* Calculation Summary Card */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Fee Breakdown (Statutory)
                    </span>

                    <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-100">
                      <span className="text-slate-600">Base Statutory Fee:</span>
                      <span className="font-bold text-slate-900">₹ {calculatedFee.baseFee}</span>
                    </div>

                    <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-100">
                      <span className="text-slate-600">Late Surcharge (100%):</span>
                      <span className={`font-bold ${calculatedFee.penalty > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                        ₹ {calculatedFee.penalty}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-100">
                      <span className="text-slate-600">GST on Govt Statutory Fee:</span>
                      <span className="font-semibold text-emerald-700">Exempt (0%)</span>
                    </div>

                    <div className="pt-2">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-bold text-slate-800">Total Statutory Fee:</span>
                        <span className="text-2xl font-extrabold text-emerald-700">₹ {calculatedFee.totalFee}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Payable via BharatKosh, UPI, or Treasury Challan.
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100">
                    <button
                      onClick={() => onNavigateLogin('merchant')}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Proceed to Apply & Book Inspection</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>

              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 6. How It Works: The 4-Step Verification Workflow */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5 text-slate-600" />
            <span>Process Architecture</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            How e-Maap Modernizes Metrological Verification
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            From merchant application to physical wire stamping and public citizen verification.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          
          {/* Step 1 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 relative">
            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-extrabold flex items-center justify-center text-sm mb-4">
              01
            </div>
            <h4 className="font-bold text-slate-900 text-sm mb-1">Online Application</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Merchant registers weighing devices, computes Schedule XII statutory fee, and pays via BharatKosh.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 relative">
            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 font-extrabold flex items-center justify-center text-sm mb-4">
              02
            </div>
            <h4 className="font-bold text-slate-900 text-sm mb-1">MPE Load Testing</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              LMO officer or GATC lab conducts Table 2 & 3 error evaluations at 10%, 50%, and 100% capacity using certified standard weights.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 relative">
            <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 font-extrabold flex items-center justify-center text-sm mb-4">
              03
            </div>
            <h4 className="font-bold text-slate-900 text-sm mb-1">Tamper-Proof Stamping</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Lead wire seal and holographic barcode attached. SHA-256 digital signature minted on official Schedule VIII certificate.
            </p>
          </div>

          {/* Step 4 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 relative">
            <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-700 font-extrabold flex items-center justify-center text-sm mb-4">
              04
            </div>
            <h4 className="font-bold text-slate-900 text-sm mb-1">Citizen Transparency</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Consumers scan the physical QR sticker to instantly confirm authenticity, or lodge short-measure whistleblowing complaints.
            </p>
          </div>

        </div>
      </section>

      {/* 7. Statutory Legal Mandate & FAQ */}
      <section className="py-14 bg-slate-100 border-t border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="text-center space-y-2">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
              Statutory Provisions & Frequently Asked Questions
            </h3>
            <p className="text-xs text-slate-600">
              Key provisions under The Legal Metrology Act, 2009 (Act 1 of 2010)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            
            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                Section 24: Mandatory Verification
              </span>
              <p className="text-slate-600 leading-relaxed">
                Every person having any weight or measure in possession for use in any transaction or for protection shall have such weight or measure verified and stamped by the legal metrology officer before being put into use.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Section 30: Penalty for Non-Compliance
              </span>
              <p className="text-slate-600 leading-relaxed">
                Whoever uses any unverified weight or measure in any transaction shall be punished with a fine which may extend to ₹25,000, and for the second or subsequent offence, with imprisonment up to one year.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-600" />
                What is the validity period of verification?
              </span>
              <p className="text-slate-600 leading-relaxed">
                Under Rule 27 of Legal Metrology (General) Rules, 2011, standard commercial non-automatic weighing instruments hold a 12-month validity. Storage tanks, bulk meters, and specific industrial measures hold up to 24 months.
              </p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <PhoneCall className="w-4 h-4 text-purple-600" />
                How to report short measures or tampered seals?
              </span>
              <p className="text-slate-600 leading-relaxed">
                Citizens can lodge complaints instantly via the Citizen Grievance Portal or call the National Consumer Helpline at 1915. Reports automatically route to the local LMO for surprise raid inspections.
              </p>
            </div>

          </div>

        </div>
      </section>

    </div>
  );
}
