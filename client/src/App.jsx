import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { ExpiryNotificationBanner } from './components/ExpiryNotificationBanner';
import { MerchantPortal } from './components/MerchantPortal';
import { LmoInspectorPortal } from './components/LmoInspectorPortal';
import { GatcPortal } from './components/GatcPortal';
import { RegulatorDashboard } from './components/RegulatorDashboard';
import { ConsumerPortal } from './components/ConsumerPortal';
import { CertificateModal } from './components/CertificateModal';
import { QrCodeStickerModal } from './components/QrCodeStickerModal';
import { api } from './services/api';
import { 
  jurisdictions as defaultJurisdictions,
  officers as defaultOfficers,
  gatcCenters as defaultGatcCenters,
  merchants as defaultMerchants,
  initialInstruments as defaultInstruments,
  initialApplications as defaultApplications,
  initialCertificates as defaultCertificates,
  initialGrievances as defaultGrievances,
  initialAuditLogs as defaultAuditLogs
} from '../../server/data/mockData';

export function App() {
  const [activePortal, setActivePortal] = useState('merchant'); // 'merchant', 'inspector', 'gatc', 'regulator', 'consumer'
  
  // Data State
  const [merchants, setMerchants] = useState(defaultMerchants);
  const [selectedMerchant, setSelectedMerchant] = useState(defaultMerchants[0]);
  
  const [officers, setOfficers] = useState(defaultOfficers);
  const [selectedOfficer, setSelectedOfficer] = useState(defaultOfficers[0]);
  
  const [gatcCenters, setGatcCenters] = useState(defaultGatcCenters);
  const [instruments, setInstruments] = useState(defaultInstruments);
  const [applications, setApplications] = useState(defaultApplications);
  const [certificates, setCertificates] = useState(defaultCertificates);
  const [grievances, setGrievances] = useState(defaultGrievances);
  const [auditLogs, setAuditLogs] = useState(defaultAuditLogs);
  const [regulatorStats, setRegulatorStats] = useState(null);

  // Modal State
  const [activeCertificate, setActiveCertificate] = useState(null);
  const [activeSticker, setActiveSticker] = useState(null);

  // Fetch initial data from backend if available
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          mRes, oRes, gRes, iRes, aRes, cRes, grRes, audRes, statsRes
        ] = await Promise.all([
          api.getMerchants().catch(() => defaultMerchants),
          api.getOfficers().catch(() => defaultOfficers),
          api.getGatcCenters().catch(() => defaultGatcCenters),
          api.getInstruments().catch(() => defaultInstruments),
          api.getApplications().catch(() => defaultApplications),
          api.getCertificates().catch(() => defaultCertificates),
          api.getGrievances().catch(() => defaultGrievances),
          api.getAuditLogs().catch(() => defaultAuditLogs),
          api.getRegulatorStats().catch(() => null)
        ]);

        if (Array.isArray(mRes) && mRes.length) {
          setMerchants(mRes);
          setSelectedMerchant(mRes[0]);
        }
        if (Array.isArray(oRes) && oRes.length) {
          setOfficers(oRes);
          setSelectedOfficer(oRes[0]);
        }
        if (Array.isArray(gRes)) setGatcCenters(gRes);
        if (Array.isArray(iRes)) setInstruments(iRes);
        if (Array.isArray(aRes)) setApplications(aRes);
        if (Array.isArray(cRes)) setCertificates(cRes);
        if (Array.isArray(grRes)) setGrievances(grRes);
        if (Array.isArray(audRes)) setAuditLogs(audRes);
        if (statsRes) setRegulatorStats(statsRes);
      } catch (err) {
        console.warn('Backend sync failed, running with local in-memory metrology state.', err);
      }
    };

    fetchData();
  }, []);

  // Action: Register New Instrument
  const handleRegisterInstrument = async (instData) => {
    try {
      const created = await api.createInstrument(instData);
      setInstruments(prev => [created, ...prev]);
    } catch (e) {
      // Local fallback
      const newInst = {
        ...instData,
        id: `inst-${Date.now()}`,
        status: 'PENDING_INSPECTION'
      };
      setInstruments(prev => [newInst, ...prev]);
    }
  };

  // Action: Submit Application
  const handleSubmitApplication = async (appData) => {
    try {
      const created = await api.createApplication(appData);
      setApplications(prev => [created, ...prev]);
      // Update instrument status locally
      if (appData.instrumentId) {
        setInstruments(prev => prev.map(i => i.id === appData.instrumentId ? { ...i, status: 'PENDING_INSPECTION' } : i));
      }
    } catch (e) {
      const newApp = {
        ...appData,
        id: `APP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        status: 'UNDER_REVIEW',
        paymentStatus: 'PAID'
      };
      setApplications(prev => [newApp, ...prev]);
      if (appData.instrumentId) {
        setInstruments(prev => prev.map(i => i.id === appData.instrumentId ? { ...i, status: 'PENDING_INSPECTION' } : i));
      }
    }
  };

  // Action: Officer Inspects & Issues Certificate
  const handleInspectApplication = async (appId, inspectionData) => {
    try {
      const res = await api.inspectApplication(appId, inspectionData);
      if (res.certificate) {
        setCertificates(prev => [res.certificate, ...prev]);
        setActiveCertificate(res.certificate); // Show certificate immediately!
      }
      if (res.application) {
        setApplications(prev => prev.map(a => a.id === appId ? res.application : a));
      }
      if (res.instrument) {
        setInstruments(prev => {
          const exists = prev.some(i => i.id === res.instrument.id || i.serialNumber === res.instrument.serialNumber);
          if (exists) {
            return prev.map(i => (i.id === res.instrument.id || i.serialNumber === res.instrument.serialNumber) ? res.instrument : i);
          }
          return [res.instrument, ...prev];
        });
      }
      // Refresh audit logs
      const updatedLogs = await api.getAuditLogs().catch(() => null);
      if (updatedLogs) setAuditLogs(updatedLogs);
    } catch (e) {
      console.error('Inspection submission error', e);
    }
  };

  // Action: Citizen files grievance
  const handleSubmitGrievance = async (grvData) => {
    try {
      const created = await api.createGrievance(grvData);
      setGrievances(prev => [created, ...prev]);
    } catch (e) {
      const newGrv = {
        ...grvData,
        id: `GRV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        status: 'INSPECTOR_ASSIGNED',
        assignedOfficerName: 'Shri Rajesh K. Sharma'
      };
      setGrievances(prev => [newGrv, ...prev]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      
      {/* Top Navbar with Portals */}
      <Navbar
        activePortal={activePortal}
        setActivePortal={setActivePortal}
        alertsCount={instruments.filter(i => i.status === 'EXPIRING_SOON' || i.status === 'EXPIRED').length}
        onSearchClick={() => setActivePortal('consumer')}
      />

      {/* Main Body Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Proactive Expiry & Defaulter Alert Banner (visible on Merchant & Regulator views) */}
        {(activePortal === 'merchant' || activePortal === 'regulator') && (
          <ExpiryNotificationBanner
            instruments={instruments}
            onRenewClick={(inst) => {
              setActivePortal('merchant');
            }}
          />
        )}

        {/* 1. Merchant / Trader Portal */}
        {activePortal === 'merchant' && (
          <MerchantPortal
            merchants={merchants}
            selectedMerchant={selectedMerchant}
            setSelectedMerchant={setSelectedMerchant}
            instruments={instruments}
            applications={applications}
            certificates={certificates}
            onOpenCertificate={(cert) => setActiveCertificate(cert)}
            onOpenQrSticker={(inst, cert) => setActiveSticker({ instrument: inst, certificate: cert })}
            onSubmitApplication={handleSubmitApplication}
            onRegisterInstrument={handleRegisterInstrument}
          />
        )}

        {/* 2. Legal Metrology Officer (LMO) Inspector Portal */}
        {activePortal === 'inspector' && (
          <LmoInspectorPortal
            officers={officers}
            selectedOfficer={selectedOfficer}
            setSelectedOfficer={setSelectedOfficer}
            applications={applications}
            certificates={certificates}
            onInspectApplication={handleInspectApplication}
            onOpenCertificate={(cert) => setActiveCertificate(cert)}
          />
        )}

        {/* 3. Government Approved Test Centre (GATC) Portal */}
        {activePortal === 'gatc' && (
          <GatcPortal
            gatcCenters={gatcCenters}
            instruments={instruments}
            onOpenCertificate={(cert) => setActiveCertificate(cert)}
          />
        )}

        {/* 4. National & State Regulator Command Center */}
        {activePortal === 'regulator' && (
          <RegulatorDashboard
            regulatorStats={regulatorStats}
            auditLogs={auditLogs}
            certificates={certificates}
            grievances={grievances}
            onOpenCertificate={(cert) => setActiveCertificate(cert)}
          />
        )}

        {/* 5. Citizen / Consumer Portal */}
        {activePortal === 'consumer' && (
          <ConsumerPortal
            certificates={certificates}
            instruments={instruments}
            onSubmitGrievance={handleSubmitGrievance}
            onOpenCertificate={(cert) => setActiveCertificate(cert)}
          />
        )}

      </main>

      {/* Official Government Verification Certificate Modal */}
      {activeCertificate && (
        <CertificateModal
          certificate={activeCertificate}
          onClose={() => setActiveCertificate(null)}
        />
      )}

      {/* Official Verification QR Stamp Sticker Modal */}
      {activeSticker && (
        <QrCodeStickerModal
          instrument={activeSticker.instrument}
          certificate={activeSticker.certificate}
          onClose={() => setActiveSticker(null)}
        />
      )}

      {/* Official Government Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-8 border-t border-slate-800 no-print mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <span className="font-bold text-white text-sm">e-Maap • National Legal Metrology Verification System</span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Administered under The Legal Metrology Act, 2009 (Act No. 1 of 2010) & Legal Metrology (General) Rules, 2011
              </p>
            </div>
            <div className="text-[11px] text-slate-400 text-right">
              Designed for Smart India Hackathon (SIH Problem Statement 26036 / PS36)
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
            <div>
              © 2026 Department of Consumer Affairs, Ministry of Consumer Affairs, Food and Public Distribution, Government of India.
            </div>
            <div className="flex items-center gap-4">
              <span>Schedule VIII / Form B Compliant</span>
              <span>•</span>
              <span>Schedule XII Statutory Fees</span>
              <span>•</span>
              <span>NPL Traceable</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default App;
