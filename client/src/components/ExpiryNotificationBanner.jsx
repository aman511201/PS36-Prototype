import React from 'react';
import { AlertTriangle, Clock, ArrowRight, ShieldAlert } from 'lucide-react';

export function ExpiryNotificationBanner({ instruments, onRenewClick }) {
  const expiringSoon = instruments.filter(i => i.status === 'EXPIRING_SOON');
  const expired = instruments.filter(i => i.status === 'EXPIRED');

  if (expiringSoon.length === 0 && expired.length === 0) return null;

  return (
    <div className="space-y-2 mb-6">
      {/* Overdue / Expired Critical Alert */}
      {expired.length > 0 && (
        <div className="bg-rose-50 border-l-4 border-rose-600 p-4 rounded-r-lg shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-rose-900">
                Statutory Action Required: {expired.length} Instrument(s) Expired!
              </h4>
              <p className="text-xs text-rose-700 mt-0.5">
                Using unverified or unstamped instruments in transactions is a violation under Section 24 & punishable under Section 30 of the Legal Metrology Act, 2009. 100% statutory late surcharge applies.
              </p>
              <div className="mt-1 flex flex-wrap gap-2">
                {expired.map(i => (
                  <span key={i.id} className="inline-block bg-rose-100 text-rose-800 text-[11px] font-mono px-2 py-0.5 rounded border border-rose-200">
                    {i.brand} ({i.serialNumber}) - Expired on {i.validUntilDate}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={() => onRenewClick(expired[0])}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded shadow transition cursor-pointer"
          >
            <span>Renew Overdue Instrument</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Expiring Soon Alert */}
      {expiringSoon.length > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                Verification Validity Expiring Soon: {expiringSoon.length} Instrument(s)
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                Apply for periodic re-verification 30 days in advance to avoid penalties and prevent disruption to commercial operations.
              </p>
              <div className="mt-1 flex flex-wrap gap-2">
                {expiringSoon.map(i => (
                  <span key={i.id} className="inline-block bg-amber-100 text-amber-800 text-[11px] font-mono px-2 py-0.5 rounded border border-amber-200">
                    {i.brand} ({i.serialNumber}) - Valid till {i.validUntilDate}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={() => onRenewClick(expiringSoon[0])}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded shadow transition cursor-pointer"
          >
            <span>Book Renewal Slot</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
