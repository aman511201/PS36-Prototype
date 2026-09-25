import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Scale, 
  FlaskConical, 
  Landmark, 
  Users, 
  Lock, 
  KeyRound, 
  ShieldCheck, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Smartphone, 
  UserCheck, 
  Eye, 
  EyeOff, 
  Sparkles,
  Fingerprint,
  Info
} from 'lucide-react';
import { Emblem, HologramBadge } from './Emblem';
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
  const [twoFactorCode, setTwoFactorCode] = useState('849-210');
  
  // Captcha State
  const [captchaCode, setCaptchaCode] = useState('7K9P2');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaError, setCaptchaError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Generate random 5-char captcha
  const generateCaptcha = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let res = '';
    for (let i = 0; i < 5; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaCode(res);
    setCaptchaInput('');
    setCaptchaError(false);
  };

  useEffect(() => {
    generateCaptcha();
    // Default pre-fill based on role
    loadDefaultRoleCredentials(selectedRole);
  }, [selectedRole]);

  // Set friendly defaults when role changes
  const loadDefaultRoleCredentials = (role) => {
    setErrorMsg('');
    setCaptchaError(false);

    if (role === 'merchant') {
      const defaultM = merchants[0] || { gstin: '27AABCO1234F1Z8', contactEmail: 'contact@omsaimart.com' };
      setIdentifier(defaultM.gstin);
      setPassword('Admin@1234');
      setAuthMode('password');
    } else if (role === 'inspector') {
      const defaultO = officers[0] || { badgeNumber: 'LMO-MH-042', email: 'rajesh.sharma@legalmetrology.gov.in' };
      setIdentifier(defaultO.badgeNumber);
      setPassword('GovOfficer#2026');
      setAuthMode('password');
    } else if (role === 'gatc') {
      const defaultG = gatcCenters[0] || { recognitionNumber: 'GOI-GATC-W-2021-009' };
      setIdentifier(defaultG.recognitionNumber);
      setPassword('GatcSecure@Lab');
      setAuthMode('password');
    } else if (role === 'regulator') {
      setIdentifier('GOI-ADM-001');
      setPassword('SuperGov#Admin2026');
      setTwoFactorCode('849-210');
      setAuthMode('password');
    } else if (role === 'consumer') {
      setIdentifier('+91 98200 99881');
      setOtpCode('123456');
      setAuthMode('otp');
    }
  };

  // 1-Click Demo Account Quick Selector
  const handleSelectDemoMerchant = (m) => {
    setIdentifier(m.gstin);
    setPassword('Admin@1234');
    setErrorMsg('');
    doLogin('merchant', m);
  };

  const handleSelectDemoOfficer = (o) => {
    setIdentifier(o.badgeNumber);
    setPassword('GovOfficer#2026');
    setErrorMsg('');
    doLogin('inspector', o);
  };

  const handleSelectDemoGatc = (g) => {
    setIdentifier(g.recognitionNumber);
    setPassword('GatcSecure@Lab');
    setErrorMsg('');
    doLogin('gatc', g);
  };

  // Perform actual login
  const doLogin = async (roleToLogin = selectedRole, targetEntity = null) => {
    setIsLoading(true);
    setErrorMsg('');

    try {
      const apiRes = await api.login({
        role: roleToLogin,
        identifier: targetEntity?.gstin || targetEntity?.badgeNumber || targetEntity?.recognitionNumber || identifier,
        password,
        otp: otpCode
      });
      if (apiRes && apiRes.success) {
        setIsLoading(false);
        onLoginSuccess({
          role: apiRes.role,
          user: apiRes.user,
          entity: apiRes.entity || targetEntity,
          targetPortal: apiRes.role
        });
        return;
      }
    } catch (e) {
      // Backend offline or local mode, fall back to mock data
    }

    setTimeout(() => {
      setIsLoading(false);

      if (roleToLogin === 'merchant') {
        const matched = targetEntity || merchants.find(m => 
          m.gstin.toLowerCase() === identifier.trim().toLowerCase() ||
          m.licenseNumber.toLowerCase() === identifier.trim().toLowerCase() ||
          m.contactEmail.toLowerCase() === identifier.trim().toLowerCase()
        ) || merchants[0];

        onLoginSuccess({
          role: 'merchant',
          user: {
            name: matched.ownerName,
            tradeName: matched.tradeName,
            identifier: matched.gstin,
            district: matched.district,
            state: matched.state,
            id: matched.id,
            avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(matched.ownerName)}`
          },
          entity: matched,
          targetPortal: 'merchant'
        });
      } else if (roleToLogin === 'inspector') {
        const matched = targetEntity || officers.find(o => 
          o.badgeNumber.toLowerCase() === identifier.trim().toLowerCase() ||
          o.email.toLowerCase() === identifier.trim().toLowerCase()
        ) || officers[0];

        onLoginSuccess({
          role: 'inspector',
          user: {
            name: matched.name,
            designation: matched.designation,
            identifier: matched.badgeNumber,
            district: matched.jurisdictionDistrict,
            state: matched.jurisdictionState,
            id: matched.id,
            avatar: matched.avatar
          },
          entity: matched,
          targetPortal: 'inspector'
        });
      } else if (roleToLogin === 'gatc') {
        const matched = targetEntity || gatcCenters.find(g => 
          g.recognitionNumber.toLowerCase() === identifier.trim().toLowerCase() ||
          g.id.toLowerCase() === identifier.trim().toLowerCase()
        ) || gatcCenters[0];

        onLoginSuccess({
          role: 'gatc',
          user: {
            name: matched.inCharge,
            labName: matched.name,
            identifier: matched.recognitionNumber,
            city: matched.city,
            state: matched.state,
            id: matched.id,
            avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(matched.name)}`
          },
          entity: matched,
          targetPortal: 'gatc'
        });
      } else if (roleToLogin === 'regulator') {
        onLoginSuccess({
          role: 'regulator',
          user: {
            name: 'Dr. Suresh Chandra (Directorate Super Admin)',
            designation: 'Controller General of Legal Metrology',
            identifier: 'GOI-ADM-001',
            department: 'Department of Consumer Affairs, New Delhi',
            id: 'reg-01',
            avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
          },
          targetPortal: 'regulator'
        });
      } else if (roleToLogin === 'consumer') {
        onLoginSuccess({
          role: 'consumer',
          user: {
            name: 'Citizen Consumer',
            phone: identifier || '+91 98200 99881',
            identifier: 'CITIZEN-AUTH',
            id: 'cit-01',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=CitizenConsumer'
          },
          targetPortal: 'consumer'
        });
      }
    }, 400);
  };

  // Form Submit Handler
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Captcha validation
    if (captchaInput.trim().toUpperCase() !== captchaCode.toUpperCase()) {
      setCaptchaError(true);
      setErrorMsg('Invalid Captcha code. Please enter the exact characters displayed.');
      generateCaptcha();
      return;
    }

    if (!identifier.trim()) {
      setErrorMsg('Please enter your login credential / identification number.');
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
      <div className="max-w-4xl mx-auto w-full flex items-center justify-between pb-6">
        <button
          onClick={onBackToHome}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Landing Page</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-500">Government of India Single Sign-On</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
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
                Centralized Single Sign-On for Verification, Stamping & Statutory Compliance
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

            {/* Error Message Box */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Main Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Identifier Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {selectedRole === 'merchant' && 'GSTIN / Trade License Number / Email'}
                  {selectedRole === 'inspector' && 'Officer Badge Number / Govt Email'}
                  {selectedRole === 'gatc' && 'GATC Recognition Number (e.g. GOI-GATC-W-2021-009)'}
                  {selectedRole === 'regulator' && 'Directorate Employee / SSO ID'}
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
                      onClick={() => setPassword('Admin@1234')}
                      className="text-[11px] text-emerald-700 hover:underline cursor-pointer"
                    >
                      Use Demo Password
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
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Enter One-Time Password (OTP)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="123456"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-center tracking-widest text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                    <button
                      type="button"
                      onClick={() => setOtpCode('123456')}
                      className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer"
                    >
                      Autofill OTP (123456)
                    </button>
                  </div>
                </div>
              )}

              {/* 2FA Token for Regulator Role */}
              {selectedRole === 'regulator' && (
                <div>
                  <label className="block text-xs font-bold text-purple-900 uppercase mb-1 flex items-center justify-between">
                    <span>Apex 2FA Security Token</span>
                    <span className="text-[10px] text-emerald-600 font-semibold">Simulated Active</span>
                  </label>
                  <input
                    type="text"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    className="w-full px-3.5 py-2 bg-purple-50 border border-purple-200 rounded-xl text-xs sm:text-sm font-mono font-bold text-purple-900"
                  />
                </div>
              )}

              {/* NIC Style Captcha Verification */}
              <div className="pt-1">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Security Captcha Verification
                </label>
                <div className="flex items-center gap-3">
                  {/* Styled Captcha Display */}
                  <div className="px-4 py-2 bg-gradient-to-r from-slate-800 to-slate-900 text-amber-300 font-mono font-extrabold text-base tracking-widest rounded-xl select-none shadow-inner border border-slate-700 flex items-center justify-center min-w-[110px]">
                    <span className="line-through decoration-emerald-400 decoration-2">{captchaCode}</span>
                  </div>

                  <button
                    type="button"
                    onClick={generateCaptcha}
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                    title="Refresh Captcha"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>

                  <input
                    type="text"
                    required
                    maxLength={5}
                    value={captchaInput}
                    onChange={(e) => {
                      setCaptchaInput(e.target.value);
                      setCaptchaError(false);
                    }}
                    placeholder="Enter Code"
                    className={`flex-1 px-3 py-2 bg-slate-50 border rounded-xl text-xs font-bold font-mono focus:outline-none focus:ring-2 ${
                      captchaError 
                        ? 'border-rose-400 focus:ring-rose-500 bg-rose-50' 
                        : 'border-slate-300 focus:ring-emerald-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setCaptchaInput(captchaCode)}
                    className="text-[10px] text-slate-500 hover:text-emerald-700 underline cursor-pointer"
                  >
                    Fill
                  </button>
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
                        {selectedRole === 'regulator' && 'Authorize Regulator Super Admin Access'}
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
                    onClick={() => doLogin('consumer')}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Continue as Guest Citizen (Instant QR Check & Grievance)</span>
                  </button>
                )}
              </div>

            </form>

            {/* National Single Sign-On (MeriPehchan) Alternative Simulation */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => doLogin(selectedRole)}
                className="w-full py-2 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center justify-center gap-2 cursor-pointer"
              >
                <Fingerprint className="w-4 h-4 text-orange-600" />
                <span>Sign in via <strong>Jan Parichay (MeriPehchan SSO)</strong></span>
              </button>
            </div>

          </div>

          {/* Right: Quick Demo Accounts & Role Context */}
          <div className="lg:col-span-5 bg-slate-50 rounded-xl border border-slate-200 p-5 flex flex-col justify-between space-y-4">
            
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>1-Click Evaluator Demo Accounts</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  Instant Test
                </span>
              </div>

              <p className="text-[11px] text-slate-500 mb-3">
                Click any pre-seeded profile below to instantly authenticate and test real workflows:
              </p>

              {/* Demo Profiles by Role */}
              {selectedRole === 'merchant' && (
                <div className="space-y-2">
                  {merchants.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleSelectDemoMerchant(m)}
                      className="w-full text-left p-2.5 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition text-xs group cursor-pointer"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-slate-900 group-hover:text-blue-700">
                          {m.ownerName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">{m.district}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">{m.tradeName}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">GSTIN: {m.gstin}</div>
                    </button>
                  ))}
                </div>
              )}

              {selectedRole === 'inspector' && (
                <div className="space-y-2">
                  {officers.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => handleSelectDemoOfficer(o)}
                      className="w-full text-left p-2.5 rounded-lg bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 transition text-xs group cursor-pointer"
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-slate-900 group-hover:text-emerald-700">
                          {o.name}
                        </span>
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                          {o.badgeNumber}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">{o.designation}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Jurisdiction: {o.jurisdictionDistrict}, {o.jurisdictionState}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedRole === 'gatc' && (
                <div className="space-y-2">
                  {gatcCenters.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => handleSelectDemoGatc(g)}
                      className="w-full text-left p-2.5 rounded-lg bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 transition text-xs group cursor-pointer"
                    >
                      <div className="font-bold text-slate-900 group-hover:text-amber-700">
                        {g.name}
                      </div>
                      <div className="text-[11px] text-slate-500">In-Charge: {g.inCharge}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Recognition: {g.recognitionNumber}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedRole === 'regulator' && (
                <div className="p-3 bg-white rounded-lg border border-purple-200 space-y-2 text-xs">
                  <div className="font-bold text-purple-900">Apex National Directorate Account</div>
                  <p className="text-[11px] text-slate-600">
                    Provides pan-India visibility across all states, 1,280,000+ instruments, and the immutable SHA-256 cryptographic audit trail.
                  </p>
                  <button
                    type="button"
                    onClick={() => doLogin('regulator')}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-bold text-xs cursor-pointer"
                  >
                    1-Click Super Admin Login
                  </button>
                </div>
              )}

              {selectedRole === 'consumer' && (
                <div className="p-3 bg-white rounded-lg border border-rose-200 space-y-2 text-xs">
                  <div className="font-bold text-rose-900">Jago Grahak Jago Citizen Mode</div>
                  <p className="text-[11px] text-slate-600">
                    Allows any citizen to scan shop scales, verify stamp validity dates, and report short weights or fraudulent measures with evidence photos.
                  </p>
                  <button
                    type="button"
                    onClick={() => doLogin('consumer')}
                    className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-md font-bold text-xs cursor-pointer"
                  >
                    1-Click Citizen Access
                  </button>
                </div>
              )}

            </div>

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

    </div>
  );
}
