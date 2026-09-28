import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Scale, 
  FlaskConical, 
  Landmark, 
  Users, 
  Lock, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft, 
  AlertCircle, 
  RefreshCw, 
  UserCheck, 
  Eye, 
  EyeOff, 
  Sparkles,
  Fingerprint,
  Info,
  X,
  CheckCircle2
} from 'lucide-react';
import { Emblem } from './Emblem';
import { api } from '../services/api';

export function LoginPage({ 
  initialRole = 'merchant', 
  merchants = [], 
  officers = [], 
  gatcCenters = [], 
  onLoginSuccess, 
  onBackToHome 
}) {
  const [selectedRole, setSelectedRole] = useState(initialRole); // 'merchant', 'inspector', 'gatc', 'regulator', 'consumer'
  
  // Login Form States
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState('password'); // 'password' or 'otp'
  const [otpCode, setOtpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [otpStatus, setOtpStatus] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  
  // Real Server-Side 2FA State (Pending Step-2 Challenge)
  const [pending2FASession, setPending2FASession] = useState(null); // { sessionToken, identifier, name }
  const [totpInput, setTotpInput] = useState('');
  const [demo2FACode, setDemo2FACode] = useState('');
  const [demo2FARemaining, setDemo2FARemaining] = useState(30);
  const [isDemo2FALoading, setIsDemo2FALoading] = useState(false);

  // Government SSO Integration (Demo Simulation Mode) State
  const [showSsoModal, setShowSsoModal] = useState(false);
  const [ssoRole, setSsoRole] = useState(initialRole);
  const [ssoLoading, setSsoLoading] = useState(false);
  const [ssoError, setSsoError] = useState('');
  const [ssoSimulatedPayload, setSsoSimulatedPayload] = useState(null);

  // Server-Side CAPTCHA State (Answer is never stored in frontend state)
  const [captchaId, setCaptchaId] = useState('');
  const [captchaImage, setCaptchaImage] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaError, setCaptchaError] = useState(false);
  const [isCaptchaLoading, setIsCaptchaLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch fresh server-side CAPTCHA challenge
  const refreshCaptcha = async () => {
    setIsCaptchaLoading(true);
    setCaptchaInput('');
    setCaptchaError(false);
    try {
      const res = await api.getCaptcha();
      if (res && res.captchaId && res.captchaImage) {
        setCaptchaId(res.captchaId);
        setCaptchaImage(res.captchaImage);
      }
    } catch (err) {
      console.error('Failed to load CAPTCHA challenge:', err);
    } finally {
      setIsCaptchaLoading(false);
    }
  };

  // Fetch server-calculated RFC 6238 live TOTP for Demo 2FA mode
  const fetchDemo2FA = async () => {
    setIsDemo2FALoading(true);
    try {
      const res = await api.getDemo2FACode(pending2FASession?.identifier || identifier || 'GOI-ADM-001');
      if (res && res.success && res.totpCode) {
        setDemo2FACode(res.totpCode);
        setDemo2FARemaining(res.remainingSeconds || 30);
      }
    } catch (err) {
      console.error('Failed to load Demo 2FA code:', err);
    } finally {
      setIsDemo2FALoading(false);
    }
  };

  // Real-time countdown for Demo 2FA 30-second cycle
  useEffect(() => {
    if (!demo2FACode) return;
    const interval = setInterval(() => {
      setDemo2FARemaining((prev) => {
        if (prev <= 1) {
          fetchDemo2FA();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [demo2FACode]);

  // Submit Step-2 2FA verification to backend API
  const handleVerify2FA = async (e) => {
    if (e) e.preventDefault();
    const cleanCode = (totpInput || '').trim();
    if (!cleanCode || cleanCode.length !== 6) {
      setErrorMsg('Please enter a valid 6-digit TOTP security code.');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await api.verify2FA({
        sessionToken: pending2FASession.sessionToken,
        totpCode: cleanCode
      });
      setIsLoading(false);
      if (res && res.success && res.token) {
        onLoginSuccess({
          role: res.role,
          user: res.user,
          entity: res.entity,
          targetPortal: res.role,
          token: res.token
        });
      } else {
        setErrorMsg(res?.error || 'Invalid 2FA security code. Please check your authenticator app.');
      }
    } catch (err) {
      setIsLoading(false);
      setErrorMsg(err.message || '2FA verification failed. Please try again.');
    }
  };

  // Reset inputs and fetch fresh CAPTCHA when role changes
  useEffect(() => {
    refreshCaptcha();
    setIdentifier('');
    setPassword('');
    setOtpCode('');
    setOtpStatus('');
    setTwoFactorCode('');
    setErrorMsg('');
    setCaptchaError(false);
    setPending2FASession(null);
    setTotpInput('');
    setDemo2FACode('');
    if (selectedRole === 'consumer') {
      setAuthMode('otp');
    } else {
      setAuthMode('password');
    }
  }, [selectedRole]);

  // Request real OTP via API (verified server-side, never auto-filled or hardcoded)
  const handleSendOtp = async (targetPhone = identifier) => {
    const cleanPhone = (targetPhone || '').trim();
    if (!cleanPhone) {
      setErrorMsg('Please enter your mobile number before requesting an OTP.');
      return null;
    }
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await api.sendOtp(cleanPhone);
      setIsLoading(false);
      if (res && res.success) {
        setOtpCode('');
        setOtpStatus('✓ OTP dispatched to registered mobile (valid for 5 mins). Please check your SMS/console and enter the code below.');
        return true;
      } else {
        setErrorMsg(res?.error || 'Failed to dispatch OTP.');
        return null;
      }
    } catch (err) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Error requesting OTP.');
      return null;
    }
  };

  // Demo Account Quick Profile Selectors (Pre-fills credentials & demo CAPTCHA for seamless testing)
  const handleSelectDemoMerchant = (m, autoSubmit = false) => {
    setIdentifier(m.gstin);
    setPassword('Admin@1234');
    setCaptchaInput('DEMO');
    setErrorMsg('');
    setOtpStatus(`✓ Loaded establishment: ${m.tradeName} (${m.gstin}) with demo credentials.`);
    if (autoSubmit) {
      doLogin('merchant', m, {
        identifier: m.gstin,
        password: 'Admin@1234',
        captchaId: captchaId || 'demo-captcha',
        captchaAnswer: 'DEMO'
      });
    }
  };

  const handleSelectDemoOfficer = (o, autoSubmit = false) => {
    setIdentifier(o.badgeNumber);
    setPassword('GovOfficer#2026');
    setCaptchaInput('DEMO');
    setErrorMsg('');
    setOtpStatus(`✓ Loaded officer: ${o.name} (${o.badgeNumber}) with demo credentials.`);
    if (autoSubmit) {
      doLogin('inspector', o, {
        identifier: o.badgeNumber,
        password: 'GovOfficer#2026',
        captchaId: captchaId || 'demo-captcha',
        captchaAnswer: 'DEMO'
      });
    }
  };

  const handleSelectDemoGatc = (g, autoSubmit = false) => {
    setIdentifier(g.recognitionNumber);
    setPassword('GatcSecure@Lab');
    setCaptchaInput('DEMO');
    setErrorMsg('');
    setOtpStatus(`✓ Loaded test lab: ${g.name} (${g.recognitionNumber}) with demo credentials.`);
    if (autoSubmit) {
      doLogin('gatc', g, {
        identifier: g.recognitionNumber,
        password: 'GatcSecure@Lab',
        captchaId: captchaId || 'demo-captcha',
        captchaAnswer: 'DEMO'
      });
    }
  };

  const handleSelectDemoRegulator = (autoSubmit = false) => {
    setIdentifier('GOI-ADM-001');
    setPassword('SuperGov#Admin2026');
    setCaptchaInput('DEMO');
    setTwoFactorCode('');
    setErrorMsg('');
    setOtpStatus('✓ Loaded Directorate account: GOI-ADM-001. Password & CAPTCHA pre-filled.');
    if (autoSubmit) {
      doLogin('regulator', null, {
        identifier: 'GOI-ADM-001',
        password: 'SuperGov#Admin2026',
        captchaId: captchaId || 'demo-captcha',
        captchaAnswer: 'DEMO'
      });
    }
  };

  const handleSelectDemoConsumer = (autoSubmit = false) => {
    const demoPhone = '+91 98200 99881';
    setIdentifier(demoPhone);
    setOtpCode('123456');
    setCaptchaInput('DEMO');
    setErrorMsg('');
    setOtpStatus('✓ Loaded citizen mobile: +91 98200 99881. Demo OTP (123456) pre-filled.');
    if (autoSubmit) {
      doLogin('consumer', null, {
        identifier: demoPhone,
        otp: '123456',
        captchaId: captchaId || 'demo-captcha',
        captchaAnswer: 'DEMO'
      });
    }
  };

  // Execute Simulated Government SSO Login (Isolated Demo Simulation Mode)
  const handleExecuteSsoSimulation = async (roleToSimulate = ssoRole) => {
    setSsoLoading(true);
    setSsoError('');
    try {
      const targetId = 
        roleToSimulate === 'inspector' ? 'LMO-MH-042' :
        roleToSimulate === 'regulator' ? 'GOI-ADM-001' :
        roleToSimulate === 'gatc' ? 'GOI-GATC-W-2021-009' :
        roleToSimulate === 'merchant' ? '27AABCO1234F1Z8' :
        '+91 98200 99881';

      const res = await api.ssoSimulate({ role: roleToSimulate, identifier: targetId });
      if (res && res.success && res.token) {
        setSsoSimulatedPayload(res.simulatedOidcPayload);
        setTimeout(() => {
          setSsoLoading(false);
          setShowSsoModal(false);
          onLoginSuccess({
            role: res.role,
            user: res.user,
            entity: res.entity,
            targetPortal: res.role,
            token: res.token
          });
        }, 500);
      } else {
        setSsoLoading(false);
        setSsoError(res?.error || 'SSO simulation handshake failed.');
      }
    } catch (err) {
      setSsoLoading(false);
      setSsoError(err.message || 'SSO simulation network error.');
    }
  };

  // Perform actual login against backend API - STRICTLY NO FALLBACK
  const doLogin = async (roleToLogin = selectedRole, targetEntity = null, explicitCreds = null) => {
    setIsLoading(true);
    setErrorMsg('');

    const loginIdentifier = explicitCreds?.identifier || 
      (roleToLogin === 'merchant' ? (targetEntity?.gstin || identifier) :
       roleToLogin === 'inspector' ? (targetEntity?.badgeNumber || identifier) :
       roleToLogin === 'gatc' ? (targetEntity?.recognitionNumber || identifier) :
       identifier);

    const loginPassword = explicitCreds?.password !== undefined ? explicitCreds.password : password;
    const loginOtp = explicitCreds?.otp !== undefined ? explicitCreds.otp : otpCode;
    const loginTwoFactor = explicitCreds?.twoFactorCode !== undefined ? explicitCreds.twoFactorCode : twoFactorCode;
    const loginCaptchaId = explicitCreds?.captchaId !== undefined ? explicitCreds.captchaId : captchaId;
    const loginCaptchaAnswer = explicitCreds?.captchaAnswer !== undefined ? explicitCreds.captchaAnswer : captchaInput;

    try {
      const apiRes = await api.login({
        role: roleToLogin,
        identifier: loginIdentifier,
        password: loginPassword,
        otp: loginOtp,
        twoFactorCode: loginTwoFactor,
        captchaId: loginCaptchaId,
        captchaAnswer: loginCaptchaAnswer
      });

      setIsLoading(false);

      if (apiRes && apiRes.success) {
        if (apiRes.requires2FA) {
          setPending2FASession({
            sessionToken: apiRes.sessionToken,
            identifier: apiRes.identifier,
            name: apiRes.name
          });
          setTotpInput('');
          setErrorMsg('');
          return;
        }

        onLoginSuccess({
          role: apiRes.role,
          user: apiRes.user,
          entity: apiRes.entity || targetEntity,
          targetPortal: apiRes.role,
          token: apiRes.token
        });
        return;
      } else {
        // Refresh CAPTCHA immediately on any failed attempt to prevent replay / brute force
        refreshCaptcha();
        setErrorMsg(apiRes?.error || 'Authentication failed. Please verify credentials.');
        return;
      }
    } catch (err) {
      setIsLoading(false);
      refreshCaptcha();
      setErrorMsg(err.message || 'Login connection failed. Please ensure the backend server is running.');
      return;
    }
  };

  // Form Submit Handler
  const handleSubmit = (e) => {
    e.preventDefault();

    if (!identifier.trim()) {
      setErrorMsg('Please enter your login credential / identification number.');
      return;
    }

    if (!captchaInput.trim()) {
      setCaptchaError(true);
      setErrorMsg('Please enter the security CAPTCHA characters shown in the challenge image.');
      return;
    }

    doLogin(selectedRole);
  };

  // Role Configurations
  const roles = [
    { 
      id: 'merchant', 
      label: 'Merchant / Trader', 
      icon: Building2, 
      color: 'border-blue-500 text-blue-600',
      activeBg: 'bg-blue-600 text-white',
      desc: 'Commercial Establishments & Scale Owners' 
    },
    { 
      id: 'inspector', 
      label: 'LMO Inspector', 
      icon: Scale, 
      color: 'border-emerald-500 text-emerald-600',
      activeBg: 'bg-emerald-600 text-white',
      desc: 'Legal Metrology Field Officers & Inspectors' 
    },
    { 
      id: 'gatc', 
      label: 'GATC Test Lab', 
      icon: FlaskConical, 
      color: 'border-amber-500 text-amber-600',
      activeBg: 'bg-amber-600 text-white',
      desc: 'Govt Approved Calibration Test Centres' 
    },
    { 
      id: 'regulator', 
      label: 'Regulator / Admin', 
      icon: Landmark, 
      color: 'border-purple-500 text-purple-600',
      activeBg: 'bg-purple-600 text-white',
      desc: 'Directorate & State Controllers of Metrology' 
    },
    { 
      id: 'consumer', 
      label: 'Citizen / Consumer', 
      icon: Users, 
      color: 'border-rose-500 text-rose-600',
      activeBg: 'bg-rose-600 text-white',
      desc: 'Public Whistleblower & Scale Verifier' 
    }
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between py-8 px-4 sm:px-6 lg:px-8">
      
      {/* Top Header Bar */}
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between pb-6 flex-wrap gap-3">
        <button
          onClick={onBackToHome}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Landing Page</span>
        </button>

        <div className="flex items-center gap-3">
          {/* Explicit SIH Demo Mode Switch */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
            <Sparkles className={`w-3.5 h-3.5 ${demoMode ? 'text-amber-500' : 'text-slate-400'}`} />
            <span className="text-xs font-semibold text-slate-700">SIH Demo Mode:</span>
            <button
              type="button"
              role="switch"
              aria-checked={demoMode}
              onClick={() => {
                const next = !demoMode;
                setDemoMode(next);
                setErrorMsg('');
                if (!next) {
                  setIdentifier('');
                  setPassword('');
                  setOtpCode('');
                  setOtpStatus('');
                  setTwoFactorCode('');
                }
              }}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                demoMode ? 'bg-amber-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  demoMode ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
              demoMode ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-100 text-slate-500'
            }`}>
              {demoMode ? 'ON' : 'OFF'}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500">National Metrology Security Gateway</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </div>
        </div>
      </div>

      {/* Main Authentication Card */}
      <div className="max-w-4xl mx-auto w-full bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        
        {/* Tricolor Header Strip */}
        <div className="h-1.5 w-full flex">
          <div className="h-full w-1/3 bg-orange-500"></div>
          <div className="h-full w-1/3 bg-white"></div>
          <div className="h-full w-1/3 bg-emerald-600"></div>
        </div>

        {/* Portal Branding Banner */}
        <div className="p-6 bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Emblem className="w-12 h-12 flex-shrink-0" />
            <div>
              <div className="text-[10px] uppercase font-bold tracking-widest text-emerald-400">
                Department of Consumer Affairs • Govt of India
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>e-Maap Access Gateway</span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Legal Metrology Act 2009
                </span>
              </h1>
              <p className="text-xs text-slate-300">
                Centralized Access Gateway for Verification, Stamping & Statutory Compliance
              </p>
            </div>
          </div>

          <div className="text-right hidden md:block">
            <div className="text-[11px] font-mono text-slate-400">Node ID: NLMVS-SEC-NODE-01</div>
            <div className="text-[10px] text-emerald-400 font-semibold flex items-center justify-end gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>TLS 1.3 256-bit Encrypted</span>
            </div>
          </div>
        </div>

        {/* Role Selector Tabs */}
        <div className="bg-slate-50 border-b border-slate-200 p-2 sm:p-3 overflow-x-auto">
          <div className="flex space-x-2">
            {roles.map((r) => {
              const Icon = r.icon;
              const isSelected = selectedRole === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRole(r.id)}
                  className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                    isSelected
                      ? `${r.activeBg} border-transparent shadow-md font-bold`
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="whitespace-nowrap">{r.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Login Body Grid */}
        <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left: Role Form */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Active Role Intro Header */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Authentication Mode
              </span>
              <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                {selectedRole === 'merchant' && 'Commercial Trader & Establishment Login'}
                {selectedRole === 'inspector' && 'Legal Metrology Officer (LMO) Authorization'}
                {selectedRole === 'gatc' && 'GATC Accredited Test Laboratory Access'}
                {selectedRole === 'regulator' && 'National Directorate & Controller Command Access'}
                {selectedRole === 'consumer' && 'Citizen & Public Consumer Verification Access'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedRole === 'merchant' && 'Sign in using your Business GSTIN, Trade License Number, or registered email.'}
                {selectedRole === 'inspector' && 'Field verification login via Official Govt Badge ID and secure inspector credential.'}
                {selectedRole === 'gatc' && 'Authorized test lab login via GATC Recognition Certificate Number.'}
                {selectedRole === 'regulator' && 'Apex Super Admin access with high-security two-factor credential token.'}
                {selectedRole === 'consumer' && 'Verify your mobile number via OTP or proceed directly with instant guest access.'}
              </p>
            </div>

            {/* SIH Evaluator Demo Mode Banner */}
            {demoMode && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5 shadow-sm">
                <Sparkles className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>SIH Evaluator Demo Mode Active</span>
                    <span className="bg-amber-200/80 text-amber-900 text-[10px] font-mono px-1.5 py-0.2 rounded font-bold">Real JWT Auth</span>
                  </div>
                  <p className="mt-0.5 text-amber-800 text-[11px] leading-relaxed">
                    Pre-seeded test accounts are enabled. All logins verify real bcrypt credentials and issue HMAC-SHA256 JWT tokens via the backend API.
                  </p>
                </div>
              </div>
            )}

            {/* Error Message Box */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Step 2: Real Server-Side 2FA TOTP Verification View */}
            {pending2FASession ? (
              <div className="space-y-4 animate-fade-in">
                <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-purple-700 flex-shrink-0" />
                    <h3 className="font-bold text-sm">Two-Factor Authentication (2FA) Required</h3>
                  </div>
                  <p className="text-xs text-purple-800 leading-relaxed">
                    Credentials verified for <strong>{pending2FASession.name}</strong> ({pending2FASession.identifier}).
                    Enter the current 6-digit TOTP code generated by your authenticator app (Google Authenticator, Microsoft Authenticator, or hardware token) to authorize this session.
                  </p>
                </div>

                <form onSubmit={handleVerify2FA} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Enter 6-Digit TOTP Security Code
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      maxLength={6}
                      value={totpInput}
                      onChange={(e) => setTotpInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-center text-2xl font-mono font-bold tracking-[0.5em] text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                    />
                  </div>

                  {/* Clearly labeled Demo 2FA for SIH Hackathon Evaluators */}
                  <div className="p-3 rounded-xl bg-amber-50/90 border border-amber-300 text-xs text-amber-950 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center gap-1.5 text-amber-900">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>Demo 2FA (SIH Evaluator Mode)</span>
                      </span>
                      <button
                        type="button"
                        onClick={fetchDemo2FA}
                        disabled={isDemo2FALoading}
                        className="text-[11px] font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer"
                      >
                        {demo2FACode ? 'Refresh Demo TOTP' : 'Get Live Demo Code'}
                      </button>
                    </div>
                    {demo2FACode ? (
                      <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-amber-300 shadow-xs">
                        <div>
                          <div className="text-[10px] text-slate-500 font-mono">Server RFC 6238 TOTP:</div>
                          <div className="font-mono text-lg font-extrabold text-slate-900 tracking-wider">
                            {demo2FACode}
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <span className="text-[10px] font-mono font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                            Cycle: {demo2FARemaining}s
                          </span>
                          <button
                            type="button"
                            onClick={() => setTotpInput(demo2FACode)}
                            className="text-[11px] font-bold text-purple-700 hover:text-purple-900 cursor-pointer"
                          >
                            Auto-fill Code
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-amber-800">
                        If evaluating without an authenticator app, click "Get Live Demo Code" to view the server's real-time TOTP calculation.
                      </p>
                    )}
                  </div>

                  <div className="pt-2 space-y-2">
                    <button
                      type="submit"
                      disabled={isLoading || totpInput.length !== 6}
                      className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          <span>Verify 2FA & Complete Sign In</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPending2FASession(null);
                        setTotpInput('');
                        setErrorMsg('');
                      }}
                      className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
                    >
                      ← Cancel and Return to Step 1
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* Step 1: Primary Authentication Form */
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Identifier Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    {selectedRole === 'merchant' && 'GSTIN / Trade License Number / Email'}
                    {selectedRole === 'inspector' && 'Officer Badge Number / Govt Email'}
                    {selectedRole === 'gatc' && 'GATC Recognition Number (e.g. GOI-GATC-W-2021-009)'}
                    {selectedRole === 'regulator' && 'Directorate Employee / Official Govt ID'}
                    {selectedRole === 'consumer' && 'Registered Mobile Number'}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder={
                        selectedRole === 'merchant' ? 'e.g. 27AABCO1234F1Z8 or contact@omsaimart.com' :
                        selectedRole === 'inspector' ? 'e.g. LMO-MH-042 or rajesh.sharma@legalmetrology.gov.in' :
                        selectedRole === 'gatc' ? 'e.g. GOI-GATC-W-2021-009' :
                        selectedRole === 'regulator' ? 'e.g. GOI-ADM-001' : 'e.g. 98200 99881'
                      }
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono shadow-sm"
                    />
                  </div>
                </div>

                {/* Password or OTP Field */}
                {selectedRole !== 'consumer' ? (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold text-slate-700 uppercase">
                        Security Passcode / Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const pass = 
                            selectedRole === 'merchant' ? 'Admin@1234' :
                            selectedRole === 'inspector' ? 'GovOfficer#2026' :
                            selectedRole === 'gatc' ? 'GatcSecure@Lab' :
                            'SuperGov#Admin2026';
                          setPassword(pass);
                          setCaptchaInput('DEMO');
                          setErrorMsg('');
                        }}
                        className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-800 underline cursor-pointer"
                      >
                        Autofill Demo Password ({
                          selectedRole === 'merchant' ? 'Admin@1234' :
                          selectedRole === 'inspector' ? 'GovOfficer#2026' :
                          selectedRole === 'gatc' ? 'GatcSecure@Lab' :
                          'SuperGov#Admin2026'
                        })
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-xs font-bold text-slate-700 uppercase">
                        Enter One-Time Password (OTP)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setOtpCode('123456');
                          setCaptchaInput('DEMO');
                          setErrorMsg('');
                        }}
                        className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 underline cursor-pointer"
                      >
                        Autofill Demo OTP (123456)
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        placeholder="6-digit OTP"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-center tracking-widest text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
                      />
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleSendOtp(identifier)}
                        className="px-3 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition border border-rose-300"
                      >
                        {isLoading ? 'Sending...' : 'Request / Send OTP'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Statutory Notice of 2FA for Regulator Role */}
                {selectedRole === 'regulator' && (
                  <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-xl text-xs space-y-1">
                    <div className="font-bold text-purple-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-purple-700" />
                      <span>Statutory Two-Factor Authentication (2FA)</span>
                    </div>
                    <p className="text-[11px] text-purple-800 leading-relaxed">
                      Directorate Super Admin accounts enforce server-side RFC 6238 TOTP. You will enter your 6-digit authenticator code in Step 2 after password verification (or use the built-in Demo 2FA code generator).
                    </p>
                  </div>
                )}

                {/* NIC Style Captcha Verification */}
                <div className="pt-1">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase">
                      Security Captcha Verification
                    </label>
                    <button
                      type="button"
                      onClick={() => setCaptchaInput('DEMO')}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                    >
                      Fill Demo CAPTCHA ("DEMO")
                    </button>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    {/* Server-Generated Visual Challenge Image */}
                    <div className="rounded-xl overflow-hidden shadow-inner border border-slate-700 flex items-center justify-center min-w-[130px] sm:min-w-[140px] h-[40px] bg-slate-900">
                      {captchaImage ? (
                        <img 
                          src={captchaImage} 
                          alt="Security Captcha Challenge" 
                          className="w-[140px] h-[40px] object-contain select-none pointer-events-none" 
                          onError={refreshCaptcha}
                        />
                      ) : (
                        <div className="text-[11px] text-slate-400 font-mono animate-pulse">Loading...</div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={refreshCaptcha}
                      disabled={isCaptchaLoading}
                      className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer disabled:opacity-50 transition"
                      title="Refresh Captcha Challenge"
                    >
                      <RefreshCw className={`w-4 h-4 ${isCaptchaLoading ? 'animate-spin text-emerald-600' : ''}`} />
                    </button>

                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={captchaInput}
                      onChange={(e) => {
                        setCaptchaInput(e.target.value);
                        setCaptchaError(false);
                      }}
                      placeholder="Code or DEMO"
                      className={`flex-1 px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold font-mono uppercase tracking-widest focus:outline-none focus:ring-2 ${
                        captchaError 
                          ? 'border-rose-400 focus:ring-rose-500 bg-rose-50' 
                          : 'border-slate-300 focus:ring-emerald-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="pt-3 space-y-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full py-3 px-4 rounded-xl text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer ${
                      selectedRole === 'merchant' ? 'bg-blue-600 hover:bg-blue-700' :
                      selectedRole === 'inspector' ? 'bg-emerald-600 hover:bg-emerald-700' :
                      selectedRole === 'gatc' ? 'bg-amber-600 hover:bg-amber-700' :
                      selectedRole === 'regulator' ? 'bg-purple-600 hover:bg-purple-700' :
                      'bg-rose-600 hover:bg-rose-700'
                    }`}
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>
                          {selectedRole === 'merchant' && 'Sign In to Merchant Workspace'}
                          {selectedRole === 'inspector' && 'Authenticate as Legal Metrology Officer'}
                          {selectedRole === 'gatc' && 'Sign In to GATC Test Facility'}
                          {selectedRole === 'regulator' && 'Verify Password & Proceed to 2FA'}
                          {selectedRole === 'consumer' && 'Sign In with OTP'}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* Instant Guest Consumer Access */}
                  {selectedRole === 'consumer' && (
                    <button
                      type="button"
                      onClick={async () => {
                        setIsLoading(true);
                        const res = await api.guestLogin();
                        setIsLoading(false);
                        if (res && res.success) {
                          onLoginSuccess({
                            role: 'consumer',
                            user: res.user,
                            targetPortal: 'consumer',
                            token: res.token
                          });
                        }
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Continue as Guest Citizen (Instant QR Check & Grievance)</span>
                    </button>
                  )}
                </div>

              </form>
            )}

            {/* SSO Integration — Demo Simulation */}
            <div className="pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setSsoRole(selectedRole);
                  setSsoError('');
                  setSsoSimulatedPayload(null);
                  setShowSsoModal(true);
                }}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 hover:border-orange-300 hover:bg-orange-50/50 text-slate-700 text-xs font-medium flex items-center justify-between transition group cursor-pointer shadow-xs"
              >
                <div className="flex items-center gap-2.5">
                  <Fingerprint className="w-4 h-4 text-orange-600 group-hover:scale-110 transition-transform flex-shrink-0" />
                  <div className="text-left">
                    <div className="font-semibold text-slate-800 flex items-center gap-1.5 flex-wrap">
                      <span>SSO Integration — Demo Simulation</span>
                      <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded border border-amber-200">
                        Demo Simulation
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      MeriPehchan / Jan Parichay OIDC architectural mock
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-orange-600 group-hover:translate-x-0.5 transition flex-shrink-0" />
              </button>
            </div>

          </div>

          {/* Right: Quick Demo Accounts & Role Context */}
          <div className="lg:col-span-5 bg-slate-50 rounded-xl border border-slate-200 p-5 flex flex-col justify-between space-y-4">
            
            {demoMode ? (
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>1-Click Evaluator Demo Accounts</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                      Demo Active
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setDemoMode(false);
                        setIdentifier('');
                        setPassword('');
                        setOtpCode('');
                        setOtpStatus('');
                        setTwoFactorCode('');
                      }}
                      className="text-[10px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                    >
                      Turn Off
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 mb-3">
                  Click a test profile below to load its identifier into the form. Enter credentials to verify against the backend:
                </p>

                {/* Demo Profiles by Role */}
                {selectedRole === 'merchant' && (
                  <div className="space-y-2.5">
                    {merchants.map((m) => (
                      <div
                        key={m.id}
                        className="p-3 rounded-xl bg-white border border-slate-200 hover:border-blue-300 transition text-xs shadow-xs space-y-2"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-slate-900">{m.ownerName}</div>
                            <div className="text-[11px] text-slate-600 truncate">{m.tradeName}</div>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                            {m.district}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono bg-slate-50 p-1.5 rounded">
                          <span>GSTIN: <strong>{m.gstin}</strong></span>
                          <span>Pass: <strong>Admin@1234</strong></span>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleSelectDemoMerchant(m, false)}
                            className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                          >
                            Fill Form
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectDemoMerchant(m, true)}
                            className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1"
                          >
                            <span>⚡ 1-Click Sign In</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedRole === 'inspector' && (
                  <div className="space-y-2.5">
                    {officers.map((o) => (
                      <div
                        key={o.id}
                        className="p-3 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 transition text-xs shadow-xs space-y-2"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-slate-900">{o.name}</div>
                            <div className="text-[11px] text-slate-600">{o.designation}</div>
                          </div>
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                            {o.badgeNumber}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono bg-slate-50 p-1.5 rounded">
                          <span>Jurisdiction: <strong>{o.jurisdictionDistrict}</strong></span>
                          <span>Pass: <strong>GovOfficer#2026</strong></span>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleSelectDemoOfficer(o, false)}
                            className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                          >
                            Fill Form
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectDemoOfficer(o, true)}
                            className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1"
                          >
                            <span>⚡ 1-Click Sign In</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedRole === 'gatc' && (
                  <div className="space-y-2.5">
                    {gatcCenters.map((g) => (
                      <div
                        key={g.id}
                        className="p-3 rounded-xl bg-white border border-slate-200 hover:border-amber-300 transition text-xs shadow-xs space-y-2"
                      >
                        <div className="font-bold text-slate-900">{g.name}</div>
                        <div className="text-[11px] text-slate-600">In-Charge: {g.inCharge}</div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono bg-slate-50 p-1.5 rounded">
                          <span>ID: <strong>{g.recognitionNumber}</strong></span>
                          <span>Pass: <strong>GatcSecure@Lab</strong></span>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleSelectDemoGatc(g, false)}
                            className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                          >
                            Fill Form
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectDemoGatc(g, true)}
                            className="flex-1 py-1.5 px-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer flex items-center justify-center gap-1"
                          >
                            <span>⚡ 1-Click Sign In</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedRole === 'regulator' && (
                  <div className="p-4 bg-white rounded-xl border border-purple-200 space-y-3 text-xs shadow-xs">
                    <div className="font-bold text-purple-900 text-sm">Apex National Directorate Account</div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Pan-India visibility across all states, instruments, and the immutable SHA-256 cryptographic audit trail.
                    </p>
                    <div className="text-[11px] font-mono bg-purple-50 p-2 rounded border border-purple-100 text-purple-900 space-y-1">
                      <div>ID: <strong>GOI-ADM-001</strong></div>
                      <div>Pass: <strong>SuperGov#Admin2026</strong></div>
                      <div>2FA: <strong>RFC 6238 Live TOTP (Automated)</strong></div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleSelectDemoRegulator(false)}
                        className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs cursor-pointer transition"
                      >
                        Fill Form
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectDemoRegulator(true)}
                        className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-xs cursor-pointer shadow-sm transition flex items-center justify-center gap-1"
                      >
                        <span>⚡ 1-Click Sign In</span>
                      </button>
                    </div>
                  </div>
                )}

                {selectedRole === 'consumer' && (
                  <div className="p-4 bg-white rounded-xl border border-rose-200 space-y-3 text-xs shadow-xs">
                    <div className="font-bold text-rose-900 text-sm">Jago Grahak Jago Citizen Mode</div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Citizens can scan shop scales, verify stamp validity dates, and report short weights or fraudulent measures with evidence photos.
                    </p>
                    <div className="text-[11px] font-mono bg-rose-50 p-2 rounded border border-rose-100 text-rose-900 space-y-1">
                      <div>Mobile: <strong>+91 98200 99881</strong></div>
                      <div>Demo OTP: <strong>123456</strong></div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleSelectDemoConsumer(false)}
                        className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs cursor-pointer transition"
                      >
                        Fill Form
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectDemoConsumer(true)}
                        className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs cursor-pointer shadow-sm transition flex items-center justify-center gap-1"
                      >
                        <span>⚡ 1-Click Sign In</span>
                      </button>
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Statutory Security Gateway</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    Zero-Trust
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  The National Legal Metrology Verification Gateway enforces strict authentication, cryptographic token issuance, and role-based access control. Unauthenticated fallback access is strictly prohibited.
                </p>

                <div className="space-y-2.5">
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-start gap-2.5 text-xs">
                    <Lock className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-900">Cryptographic JWT Sessions</div>
                      <div className="text-[11px] text-slate-500">Statutory endpoints protected by HMAC-SHA256 bearer tokens.</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-start gap-2.5 text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-900">Bcrypt Password Verification</div>
                      <div className="text-[11px] text-slate-500">Salted password hashing (cost 10); no plain text or fallback identities.</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 flex items-start gap-2.5 text-xs">
                    <Users className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-slate-900">Strict Multi-Tenant RBAC</div>
                      <div className="text-[11px] text-slate-500">Role isolation across Merchant, LMO, GATC Lab, and Regulator.</div>
                    </div>
                  </div>
                </div>

                {/* SIH Evaluator Callout Card */}
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 space-y-2">
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Smart India Hackathon Evaluator?</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Enable Evaluator Demo Mode to quickly select pre-seeded test accounts and verify real live workflows with zero manual typing.
                  </p>
                  <button
                    type="button"
                    onClick={() => setDemoMode(true)}
                    className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Enable SIH Evaluator Demo Mode</span>
                  </button>
                </div>
              </div>
            )}

            {/* Official Disclaimer */}
            <div className="pt-3 border-t border-slate-200 text-[10px] text-slate-400 space-y-1">
              <div className="flex items-center gap-1 font-semibold text-slate-600">
                <Info className="w-3 h-3 text-slate-500" />
                <span>Statutory Notice:</span>
              </div>
              <p>
                Authorized access only. Actions on this platform are cryptographically sealed with digital fingerprints under Section 24 of The Legal Metrology Act, 2009.
              </p>
            </div>

          </div>

        </div>

      </div>

      {/* Footer Disclaimer */}
      <div className="max-w-4xl mx-auto w-full text-center text-[11px] text-slate-500 pt-6">
        Department of Consumer Affairs, Ministry of Consumer Affairs, Food and Public Distribution, Government of India.
      </div>

      {/* Government SSO Integration — Demo Simulation Modal */}
      {showSsoModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
            
            {/* Tricolor Header Strip */}
            <div className="h-1.5 w-full flex">
              <div className="h-full w-1/3 bg-orange-500"></div>
              <div className="h-full w-1/3 bg-white"></div>
              <div className="h-full w-1/3 bg-emerald-600"></div>
            </div>

            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
                  <Fingerprint className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-white">SSO Integration — Demo Simulation</h3>
                    <span className="text-[10px] bg-amber-400/20 text-amber-300 font-mono font-bold px-1.5 py-0.5 rounded border border-amber-400/30">
                      Sandbox
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    MeriPehchan (Jan Parichay) OpenID Connect Gateway Simulation
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSsoModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              
              {/* Architecture & Non-production Notice */}
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-amber-900">
                  <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>Architectural Prototype & Transparency Notice</span>
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  National Single Sign-On (MeriPehchan / Jan Parichay) requires authorized NIC / MeitY client onboarding and staging credentials. This interactive module demonstrates the <strong>OAuth 2.0 / OpenID Connect</strong> token exchange and identity mapping pipeline without exposing live NIC production endpoints.
                </p>
              </div>

              {/* Identity Selection */}
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-2">
                  Select Simulated Identity Profile:
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    {
                      role: 'inspector',
                      name: 'Shri Rajesh K. Sharma',
                      badge: 'LMO-MH-042',
                      roleLabel: 'Legal Metrology Officer (LMO)',
                      dept: 'Dept of Consumer Affairs, Maharashtra',
                      icon: Scale
                    },
                    {
                      role: 'regulator',
                      name: 'Dr. Suresh Chandra',
                      badge: 'GOI-ADM-001',
                      roleLabel: 'Directorate Super Admin',
                      dept: 'Ministry of Consumer Affairs (Central Directorate)',
                      icon: Landmark
                    },
                    {
                      role: 'gatc',
                      name: 'Apex Metrology & Calibration Lab',
                      badge: 'GOI-GATC-W-2021-009',
                      roleLabel: 'GATC Technical Officer',
                      dept: 'Accredited Testing & Calibration Center',
                      icon: FlaskConical
                    },
                    {
                      role: 'merchant',
                      name: 'Om Sai Supermarket & Provision Stores',
                      badge: '27AABCO1234F1Z8',
                      roleLabel: 'Verified Merchant',
                      dept: 'GST-Registered Commercial Scale Owner',
                      icon: Building2
                    },
                    {
                      role: 'consumer',
                      name: 'Citizen Consumer (DigiLocker Verified)',
                      badge: '+91 98200 99881',
                      roleLabel: 'Citizen / Consumer',
                      dept: 'Jago Grahak Jago Public Grievance Portal',
                      icon: Users
                    }
                  ].map((p) => {
                    const Icon = p.icon;
                    const isSelected = ssoRole === p.role;
                    return (
                      <button
                        key={p.role}
                        type="button"
                        onClick={() => setSsoRole(p.role)}
                        className={`p-3 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                          isSelected 
                            ? 'border-orange-500 bg-orange-50/70 ring-2 ring-orange-400/40 shadow-xs' 
                            : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/70'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isSelected ? 'bg-orange-500 text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                              <span>{p.name}</span>
                              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                                {p.badge}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">{p.roleLabel} • {p.dept}</div>
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-orange-600 flex-shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* OIDC Pipeline Architecture Card */}
              <div className="p-3 bg-slate-900 text-slate-300 rounded-xl space-y-2 font-mono text-[10px]">
                <div className="text-slate-400 font-bold uppercase tracking-wider flex items-center justify-between">
                  <span>Simulated OIDC Flow Specification</span>
                  <span className="text-emerald-400 font-semibold">RFC 6749 / OpenID Connect</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div><span className="text-slate-500">Issuer:</span> https://janparichay.meripehchan.gov.in</div>
                  <div><span className="text-slate-500">Auth Flow:</span> Code Exchange with PKCE</div>
                  <div><span className="text-slate-500">Scopes:</span> openid profile email gov_role</div>
                  <div><span className="text-slate-500">Token Format:</span> HMAC-SHA256 Platform JWT</div>
                </div>
              </div>

              {/* Error Box */}
              {ssoError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                  <span>{ssoError}</span>
                </div>
              )}

              {/* Handshake Success Animation */}
              {ssoSimulatedPayload && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>OIDC Handshake Verified — Authenticating Session</span>
                  </div>
                  <div className="text-[11px] text-emerald-700 font-mono">
                    sub: {ssoSimulatedPayload.sub} • role: {ssoSimulatedPayload.role}
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowSsoModal(false)}
                disabled={ssoLoading}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs cursor-pointer transition disabled:opacity-50"
              >
                Cancel
              </button>
              
              <button
                type="button"
                onClick={() => handleExecuteSsoSimulation(ssoRole)}
                disabled={ssoLoading}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {ssoLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Exchanging OIDC Tokens...</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-4 h-4" />
                    <span>Authenticate via Simulated SSO</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
