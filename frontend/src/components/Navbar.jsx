import React from 'react';
import { 
  Bell, 
  CheckCircle2,
  Search,
  Home,
  LogIn,
  LogOut
} from 'lucide-react';
import { Emblem } from './Emblem';

export function Navbar({ 
  activePortal, 
  setActivePortal, 
  alertsCount = 2, 
  onSearchClick,
  currentUser = null,
  onLogout,
  onNavigateLogin,
  onNavigateHome
}) {

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm no-print">
      {/* National Flag Tricolor Bar */}
      <div className="h-1.5 w-full flex">
        <div className="h-full w-1/3 bg-orange-500"></div>
        <div className="h-full w-1/3 bg-white"></div>
        <div className="h-full w-1/3 bg-emerald-600"></div>
      </div>

      {/* Main Top Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        
        {/* Brand & Govt Identity */}
        <div 
          onClick={currentUser ? () => setActivePortal(currentUser.role) : onNavigateHome}
          className="flex items-center gap-3 cursor-pointer group"
          title={currentUser ? "Current Workspace" : "Return to e-Maap National Home"}
        >
          <Emblem className="w-11 h-11 flex-shrink-0 group-hover:scale-105 transition-transform" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Department of Consumer Affairs • Govt of India
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
                LM Act 2009
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
              <span className="text-emerald-700">e-Maap</span>
              <span className="text-slate-400 font-light">|</span>
              <span className="text-slate-800">National Online Verification System</span>
            </h1>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Centralized Registry & Tamper-Proof Stamping for Weighing and Measuring Instruments
            </p>
          </div>
        </div>

        {/* Right Action Icons & Auth Badges */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Home button when visitor is not on the landing page */}
          {!currentUser && activePortal !== 'landing' && (
            <button
              onClick={onNavigateHome}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition cursor-pointer"
              title="Return to e-Maap Home"
            >
              <Home className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">e-Maap Home</span>
            </button>
          )}

          {/* Quick Verify button only for unauthenticated public visitor */}
          {!currentUser && (
            <button
              onClick={onSearchClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-medium transition cursor-pointer"
              title="Search Certificate or Serial Number"
            >
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden md:inline">Quick Verify</span>
            </button>
          )}

          {/* Connected Live Database Badge */}
          <div className="hidden xl:flex items-center gap-1 px-2.5 py-1 bg-emerald-50 rounded-full border border-emerald-200 text-[11px] font-medium text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Central Node: Live</span>
          </div>

          {/* Expiry Alerts Bell - Only for Merchant */}
          {currentUser?.role === 'merchant' && (
            <div className="relative">
              <button
                onClick={() => setActivePortal('merchant')}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition relative cursor-pointer"
                title="Verification Alerts"
              >
                <Bell className="w-4 h-4" />
                {alertsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {alertsCount}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* User Profile / Auth State Button */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-1 border-l border-slate-200">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-800 truncate max-w-[140px]">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider">
                  {currentUser.role === 'merchant' && (currentUser.tradeName || 'Merchant')}
                  {currentUser.role === 'inspector' && (currentUser.identifier || 'LMO Inspector')}
                  {currentUser.role === 'gatc' && 'GATC Test Lab'}
                  {currentUser.role === 'regulator' && 'Super Admin'}
                  {currentUser.role === 'consumer' && 'Citizen'}
                </span>
              </div>

              {currentUser.avatar ? (
                <img 
                  src={currentUser.avatar} 
                  alt={currentUser.name} 
                  className="w-8 h-8 rounded-full border border-slate-300 object-cover shadow-sm"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                  {currentUser.name ? currentUser.name.charAt(0) : 'U'}
                </div>
              )}

              <button
                onClick={onLogout}
                className="px-3 py-1.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                title="Sign out and terminate session"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-600" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => onNavigateLogin()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Portal Login</span>
            </button>
          )}

        </div>
      </div>
    </header>
  );
}
