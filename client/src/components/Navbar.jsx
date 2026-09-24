import React from 'react';
import { 
  Building2, 
  Scale, 
  FlaskConical, 
  Landmark, 
  Users, 
  Bell, 
  CheckCircle2,
  ShieldAlert,
  Search
} from 'lucide-react';
import { Emblem } from './Emblem';

export function Navbar({ activePortal, setActivePortal, alertsCount = 2, onSearchClick }) {
  const portals = [
    { id: 'merchant', label: 'Merchant Portal', icon: Building2, subtitle: 'Traders & Establishments' },
    { id: 'inspector', label: 'LMO Inspector', icon: Scale, subtitle: 'Field Verification Toolkit' },
    { id: 'gatc', label: 'GATC Test Lab', icon: FlaskConical, subtitle: 'Approved Test Centres' },
    { id: 'regulator', label: 'Regulator Command', icon: Landmark, subtitle: 'Cross-Jurisdiction & Audit' },
    { id: 'consumer', label: 'Citizen / Consumer', icon: Users, subtitle: 'Public QR Check & Grievance' }
  ];

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
        <div className="flex items-center gap-3">
          <Emblem className="w-11 h-11 flex-shrink-0" />
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

        {/* Right Action Icons & Badges */}
        <div className="flex items-center gap-3">
          
          <button
            onClick={onSearchClick}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-medium transition cursor-pointer"
            title="Search Certificate or Serial Number"
          >
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden md:inline">Quick Verify</span>
          </button>

          {/* Connected Live Database Badge */}
          <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 bg-emerald-50 rounded-full border border-emerald-200 text-[11px] font-medium text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Central Metrology Node: Live</span>
          </div>

          {/* Expiry Alerts Bell */}
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

        </div>
      </div>

      {/* Role / Portal Navigation Bar */}
      <div className="bg-slate-900 text-slate-300 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-1 scrollbar-none" aria-label="Portals">
            {portals.map((p) => {
              const Icon = p.icon;
              const isActive = activePortal === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setActivePortal(p.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
