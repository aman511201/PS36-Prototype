import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { ExpiryNotificationBanner } from './components/ExpiryNotificationBanner';
import { MerchantPortal } from './components/MerchantPortal';
import { LmoInspectorPortal } from './components/LmoInspectorPortal';
import { GatcPortal } from './components/GatcPortal';
import { RegulatorDashboard } from './components/RegulatorDashboard';
import { ConsumerPortal } from './components/ConsumerPortal';
import { CertificateModal } from './components/CertificateModal';
import { QrCodeStickerModal } from './components/QrCodeStickerModal';
import { api } from './services/api';
import { CheckCircle2, Info, X } from 'lucide-react';
import { 
  officers as defaultOfficers,
  gatcCenters as defaultGatcCenters,
  merchants as defaultMerchants,
  initialInstruments as defaultInstruments,
  initialApplications as defaultApplications,
  initialCertificates as defaultCertificates,
  initialGrievances as defaultGrievances,
  initialAuditLogs as defaultAuditLogs
} from './data/mockData';

export function App() {
  // Navigation & Session State
  // Values: 'landing', 'login', 'merchant', 'inspector', 'gatc', 'regulator', 'consumer'
  const [activePortal, setActivePortal] = useState('landing');
  const [loginTargetRole, setLoginTargetRole] = useState('merchant');
  const [currentUser, setCurrentUser] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  
  // Data State
  const [merchants, setMerchants] = useState(defaultMerchants);
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  
  const [officers, setOfficers] = useState(defaultOfficers);
  const [selectedOfficer, setSelectedOfficer] = useState(null);
  
  const [gatcCenters, setGatcCenters] = useState(defaultGatcCenters);
  const [selectedGatcCenter, setSelectedGatcCenter] = useState(null);
  const [instruments, setInstruments] = useState(defaultInstruments);
  const [applications, setApplications] = useState(defaultApplications);
  const [certificates, setCertificates] = useState(defaultCertificates);
  const [grievances, setGrievances] = useState(defaultGrievances);
  const [auditLogs, setAuditLogs] = useState(defaultAuditLogs);
  const [regulatorStats, setRegulatorStats] = useState(null);

  // Modal State
  const [activeCertificate, setActiveCertificate] = useState(null);
  const [activeSticker, setActiveSticker] = useState(null);

  // Fetch public directories and restore active session if valid JWT exists
  useEffect(() => {
    const initApp = async () => {
      // 1. Fetch public directories
      let currentMerchants = defaultMerchants;
      let currentOfficers = defaultOfficers;
      try {
        const [mRes, oRes, gRes] = await Promise.all([
          api.getMerchants().catch(() => defaultMerchants),
          api.getOfficers().catch(() => defaultOfficers),
          api.getGatcCenters().catch(() => defaultGatcCenters)
        ]);
        if (Array.isArray(mRes) && mRes.length) {
          setMerchants(mRes);
          currentMerchants = mRes;
        }
        if (Array.isArray(oRes) && oRes.length) {
          setOfficers(oRes);
          currentOfficers = oRes;
        }
        if (Array.isArray(gRes)) setGatcCenters(gRes);
      } catch (err) {
        console.warn('Directory fetch warning:', err);
      }

      // 2. Restore authenticated session if valid token present
      let token = api.getToken();
      if (token) {
        if (api.isTokenExpired(token)) {
          const refreshedToken = await api.refreshToken();
          if (refreshedToken) {
            token = refreshedToken;
          }
        }

        try {
          const meRes = await api.getMe();
          if (meRes && meRes.user) {
            setCurrentUser(meRes.user);
            if (meRes.user.role === 'merchant') {
              const matched = meRes.entity || currentMerchants.find(m => m.id === meRes.user.id || m.gstin === meRes.user.identifier);
              if (matched) setSelectedMerchant(matched);
            } else if (meRes.user.role === 'inspector') {
              const matched = meRes.entity || currentOfficers.find(o => o.id === meRes.user.id || o.badgeNumber === meRes.user.identifier);
              if (matched) setSelectedOfficer(matched);
            } else if (meRes.user.role === 'gatc') {
              const matched = meRes.entity || (defaultGatcCenters || []).find(g => g.id === meRes.user.gatcCenterId || g.id === meRes.user.id || g.recognitionNumber === meRes.user.identifier);
              if (matched) setSelectedGatcCenter(matched);
            }
            setActivePortal(meRes.user.role);
          }
        } catch {
          // Token expired or revoked
          await api.logout();
          setCurrentUser(null);
        }
      }
    };

    initApp();
  }, []);

  // Fetch role-authorized data when user logs in or role changes
  useEffect(() => {
    if (!currentUser) return;

    const loadRoleData = async () => {
      try {
        if (currentUser.role === 'merchant') {
          const [iRes, aRes, cRes] = await Promise.all([
            api.getInstruments().catch(() => []),
            api.getApplications().catch(() => []),
            api.getCertificates().catch(() => [])
          ]);
          if (Array.isArray(iRes)) setInstruments(iRes);
          if (Array.isArray(aRes)) setApplications(aRes);
          if (Array.isArray(cRes)) setCertificates(cRes);
        } else if (currentUser.role === 'inspector') {
          const [aRes, iRes, cRes, grRes] = await Promise.all([
            api.getApplications().catch(() => []),
            api.getInstruments().catch(() => []),
            api.getCertificates().catch(() => []),
            api.getGrievances().catch(() => [])
          ]);
          if (Array.isArray(aRes)) setApplications(aRes);
          if (Array.isArray(iRes)) setInstruments(iRes);
          if (Array.isArray(cRes)) setCertificates(cRes);
          if (Array.isArray(grRes)) setGrievances(grRes);
        } else if (currentUser.role === 'gatc') {
          const [iRes, cRes] = await Promise.all([
            api.getInstruments().catch(() => []),
            api.getCertificates().catch(() => [])
          ]);
          if (Array.isArray(iRes)) setInstruments(iRes);
          if (Array.isArray(cRes)) setCertificates(cRes);
        } else if (currentUser.role === 'regulator') {
          const [statsRes, audRes, iRes, aRes, cRes, grRes] = await Promise.all([
            api.getRegulatorStats().catch(() => null),
            api.getAuditLogs().catch(() => []),
            api.getInstruments().catch(() => []),
            api.getApplications().catch(() => []),
            api.getCertificates().catch(() => []),
            api.getGrievances().catch(() => [])
          ]);
          if (statsRes) setRegulatorStats(statsRes);
          if (Array.isArray(audRes)) setAuditLogs(audRes);
          if (Array.isArray(iRes)) setInstruments(iRes);
          if (Array.isArray(aRes)) setApplications(aRes);
          if (Array.isArray(cRes)) setCertificates(cRes);
          if (Array.isArray(grRes)) setGrievances(grRes);
        }
      } catch (err) {
        console.error('Failed to load role-specific data:', err);
      }
    };

    loadRoleData();
  }, [currentUser]);

  // Subscribe to auth session lifecycle events (expiry, refresh, logout)
  useEffect(() => {
    const unsubscribe = api.onSessionChange((event, data) => {
      if (event === 'expired') {
        setCurrentUser(null);
        setSelectedMerchant(null);
        setSelectedOfficer(null);
        setSelectedGatcCenter(null);
        setActivePortal('login');
        setToastMessage({
          type: 'error',
          text: 'Your security session has expired. Please sign in to continue.'
        });
        setTimeout(() => setToastMessage(null), 5000);
      } else if (event === 'refreshed' && data?.user) {
        setCurrentUser(data.user);
      } else if (event === 'logout') {
        setCurrentUser(null);
        setSelectedMerchant(null);
        setSelectedOfficer(null);
        setSelectedGatcCenter(null);
        setActivePortal('landing');
      }
    });

    // Periodic heartbeat to verify token expiration and attempt proactive refresh
    const expiryInterval = setInterval(async () => {
      const token = api.getToken();
      if (token) {
        if (api.isTokenExpired(token, 15)) {
          const refreshed = await api.refreshToken();
          if (!refreshed && api.isTokenExpired(token, 0)) {
            // Token expired and cannot be refreshed
            await api.logout();
            setCurrentUser(null);
            setSelectedMerchant(null);
            setSelectedOfficer(null);
            setSelectedGatcCenter(null);
            setActivePortal('login');
            setToastMessage({
              type: 'error',
              text: 'Your session has expired. Please sign in again.'
            });
            setTimeout(() => setToastMessage(null), 5000);
          }
        }
      }
    }, 15000);

    return () => {
      unsubscribe();
      clearInterval(expiryInterval);
    };
  }, []);

  // Route Security: Protect routes and lock authenticated users to their authorized workspace
  useEffect(() => {
    const protectedPortals = ['merchant', 'inspector', 'gatc', 'regulator'];
    if (currentUser) {
      if (activePortal !== currentUser.role && activePortal !== 'login') {
        setActivePortal(currentUser.role);
      }
    } else {
      if (protectedPortals.includes(activePortal)) {
        setLoginTargetRole(activePortal);
        setActivePortal('login');
      }
    }
  }, [currentUser, activePortal]);

  // Authentication Handlers
  const handleLoginSuccess = (authData) => {
    setCurrentUser(authData.user);
    if (authData.role === 'merchant' && authData.entity) {
      setSelectedMerchant(authData.entity);
    }
    if (authData.role === 'inspector' && authData.entity) {
      setSelectedOfficer(authData.entity);
    }
    if (authData.role === 'gatc' && authData.entity) {
      setSelectedGatcCenter(authData.entity);
    }
    setActivePortal(authData.targetPortal || 'merchant');
    
    setToastMessage({
      type: 'success',
      text: `Welcome, ${authData.user?.name || 'User'}! Authenticated to ${authData.role.toUpperCase()} Workspace.`
    });
    setTimeout(() => setToastMessage(null), 5000);
  };

  const handleLogout = async (isExpired = false) => {
    await api.logout();
    setCurrentUser(null);
    setSelectedMerchant(null);
    setSelectedOfficer(null);
    setSelectedGatcCenter(null);
    setActivePortal(isExpired ? 'login' : 'landing');
    setToastMessage({
      type: isExpired ? 'error' : 'info',
      text: isExpired 
        ? 'Session expired. Please sign in to continue.' 
        : 'Session securely terminated and revoked on server.'
    });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleOpenLogin = (role = 'merchant') => {
    setLoginTargetRole(role);
    setActivePortal('login');
  };

  // Action: Register New Instrument
  const handleRegisterInstrument = async (instData) => {
    try {
      const created = await api.createInstrument(instData);
      setInstruments(prev => [created, ...prev]);
      return { success: true, instrument: created };
    } catch (e) {
      console.error("Instrument registration error:", e);
      return { success: false, error: e.message || 'Registration failed' };
    }
  };

  // Action: Reschedule Application
  const handleRescheduleApplication = async (appId, reschedData) => {
    try {
      const res = await api.rescheduleApplication(appId, reschedData);
      if (res?.application) {
        setApplications(prev => prev.map(a => a.id === appId ? res.application : a));
      }
      return { success: true, application: res?.application };
    } catch (e) {
      console.error("Reschedule failed:", e);
      return { success: false, error: e.message || 'Failed to reschedule application' };
    }
  };

  // Action: Cancel Application
  const handleCancelApplication = async (appId, cancelData) => {
    try {
      const res = await api.cancelApplication(appId, cancelData);
      if (res?.application) {
        setApplications(prev => prev.map(a => a.id === appId ? res.application : a));
      }
      return { success: true, application: res?.application };
    } catch (e) {
      console.error("Cancellation failed:", e);
      return { success: false, error: e.message || 'Failed to cancel application' };
    }
  };

  // Action: Submit Application
  const handleSubmitApplication = async (appData) => {
    try {
      const created = await api.createApplication(appData);
      setApplications(prev => [created, ...prev]);
      if (appData.instrumentId) {
        setInstruments(prev => prev.map(i => i.id === appData.instrumentId ? { ...i, status: 'PENDING_INSPECTION' } : i));
      }
      return { success: true, application: created };
    } catch (e) {
      console.error("Application submission rejected:", e);
      alert(e.message || "Failed to submit application: Statutory fee payment must be confirmed.");
      return { success: false, error: e.message };
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
      if (currentUser?.role === 'regulator') {
        const updatedLogs = await api.getAuditLogs().catch(() => null);
        if (updatedLogs) setAuditLogs(updatedLogs);
      }
      return res;
    } catch (e) {
      console.error('Inspection submission error', e);
      setToastMessage({
        type: 'error',
        message: e?.message || 'Inspection submission failed. Please verify seal numbers and test data.'
      });
      setTimeout(() => setToastMessage(null), 5000);
      throw e;
    }
  };

  // Action: GATC Technician submits heavy instrument calibration test report
  const handleGatcReportSubmitted = (res) => {
    if (res?.instrument) {
      setInstruments(prev => {
        const exists = prev.some(i => i.id === res.instrument.id || i.serialNumber === res.instrument.serialNumber);
        if (exists) {
          return prev.map(i => (i.id === res.instrument.id || i.serialNumber === res.instrument.serialNumber) ? res.instrument : i);
        }
        return [res.instrument, ...prev];
      });
    }
    setToastMessage({
      type: 'success',
      text: res?.message || 'GATC Calibration Report successfully submitted and linked.'
    });
    setTimeout(() => setToastMessage(null), 5000);
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
      
      {/* Top Navbar with Portals & Auth Indicator */}
      <Navbar
        activePortal={activePortal}
        setActivePortal={setActivePortal}
        alertsCount={instruments.filter(i => i.status === 'EXPIRING_SOON' || i.status === 'EXPIRED').length}
        onSearchClick={() => setActivePortal('consumer')}
        currentUser={currentUser}
        onLogout={handleLogout}
        onNavigateLogin={handleOpenLogin}
        onNavigateHome={() => setActivePortal('landing')}
      />

      {/* Global Notification Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 max-w-md animate-fade-in shadow-xl rounded-xl overflow-hidden border border-slate-200">
          <div className={`p-4 flex items-center justify-between gap-3 text-xs font-semibold text-white ${
            toastMessage.type === 'success' ? 'bg-emerald-700' : 'bg-slate-800'
          }`}>
            <div className="flex items-center gap-2">
              {toastMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-300 flex-shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-blue-300 flex-shrink-0" />
              )}
              <span>{toastMessage.text}</span>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-white/80 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        
        {/* 0. Landing Page */}
        {activePortal === 'landing' && (
          <LandingPage
            onNavigateLogin={handleOpenLogin}
            onNavigatePortal={(portal) => setActivePortal(portal)}
            certificates={certificates}
            instruments={instruments}
            onOpenCertificate={(cert) => setActiveCertificate(cert)}
          />
        )}

        {/* 0.5. Login Page for Every User */}
        {activePortal === 'login' && (
          <LoginPage
            initialRole={loginTargetRole}
            merchants={merchants}
            officers={officers}
            gatcCenters={gatcCenters}
            onLoginSuccess={handleLoginSuccess}
            onBackToHome={() => setActivePortal('landing')}
          />
        )}

        {/* Operational Portals Container (Visible when activePortal is one of the 5 roles) */}
        {activePortal !== 'landing' && activePortal !== 'login' && (
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
                currentUser={currentUser}
                merchant={selectedMerchant}
                instruments={instruments}
                applications={applications}
                certificates={certificates}
                onOpenCertificate={(cert) => setActiveCertificate(cert)}
                onOpenQrSticker={(inst, cert) => setActiveSticker({ instrument: inst, certificate: cert })}
                onSubmitApplication={handleSubmitApplication}
                onRegisterInstrument={handleRegisterInstrument}
                onRescheduleApplication={handleRescheduleApplication}
                onCancelApplication={handleCancelApplication}
              />
            )}

            {/* 2. Legal Metrology Officer (LMO) Inspector Portal */}
            {activePortal === 'inspector' && (
              <LmoInspectorPortal
                currentUser={currentUser}
                officer={selectedOfficer}
                applications={applications}
                certificates={certificates}
                onInspectApplication={handleInspectApplication}
                onOpenCertificate={(cert) => setActiveCertificate(cert)}
              />
            )}

            {/* 3. Government Approved Test Centre (GATC) Portal */}
            {activePortal === 'gatc' && (
              <GatcPortal
                currentUser={currentUser}
                gatcCenters={gatcCenters}
                selectedCenter={selectedGatcCenter}
                instruments={instruments}
                onOpenCertificate={(cert) => setActiveCertificate(cert)}
                onGatcReportSubmitted={handleGatcReportSubmitted}
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
        )}

      </div>

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
      <footer className="bg-slate-900 text-slate-400 text-xs py-8 border-t border-slate-800 no-print mt-auto">
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
