import React from 'react';

export function Emblem({ className = "w-10 h-10" }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      {/* Ashoka Chakra & National Seal Graphic */}
      <svg viewBox="0 0 100 100" className="w-full h-full text-amber-700 drop-shadow-sm">
        <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="50" cy="50" r="41" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2,2" />
        <circle cx="50" cy="50" r="28" fill="none" stroke="#1d4ed8" strokeWidth="1.5" />
        {/* Ashoka 24 spokes simulation */}
        {[...Array(24)].map((_, i) => (
          <line
            key={i}
            x1="50"
            y1="50"
            x2={50 + 28 * Math.cos((i * 15 * Math.PI) / 180)}
            y2={50 + 28 * Math.sin((i * 15 * Math.PI) / 180)}
            stroke="#1d4ed8"
            strokeWidth="1.2"
          />
        ))}
        <circle cx="50" cy="50" r="5" fill="#1d4ed8" />
        {/* Crown / Three Lions Top Emblem Graphic Representation */}
        <path
          d="M 32 30 Q 50 18 68 30 Q 64 36 50 36 Q 36 36 32 30 Z"
          fill="#b45309"
        />
        <text
          x="50"
          y="88"
          textAnchor="middle"
          fontSize="6.5"
          fontWeight="bold"
          fill="#78350f"
          letterSpacing="0.8"
        >
          सत्यमेव जयते
        </text>
      </svg>
    </div>
  );
}

export function HologramBadge({ serialNo = "HOL-GOI-2026-99120", className = "" }) {
  return (
    <div className={`relative overflow-hidden rounded-md border border-amber-300 bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 p-2 shadow-inner ${className}`}>
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#b45309_1px,transparent_1px)] [background-size:6px_6px]"></div>
      <div className="relative flex items-center justify-between text-[10px] font-mono font-bold text-amber-900">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
          SECURE HOLOGRAM
        </span>
        <span>{serialNo}</span>
      </div>
      <div className="text-[8px] text-center text-amber-800 uppercase tracking-widest mt-0.5">
        Govt of India • Legal Metrology • Anti-Tamper Seal
      </div>
    </div>
  );
}
