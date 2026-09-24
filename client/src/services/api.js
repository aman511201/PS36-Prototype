/**
 * API Service for Legal Metrology Online Verification System
 */

const API_BASE = '/api';

export const api = {
  // Health
  getHealth: async () => {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },

  // Jurisdictions & reference
  getJurisdictions: async () => {
    const res = await fetch(`${API_BASE}/jurisdictions`);
    return res.json();
  },
  getOfficers: async () => {
    const res = await fetch(`${API_BASE}/officers`);
    return res.json();
  },
  getGatcCenters: async () => {
    const res = await fetch(`${API_BASE}/gatc-centers`);
    return res.json();
  },
  getMerchants: async () => {
    const res = await fetch(`${API_BASE}/merchants`);
    return res.json();
  },

  // Instruments
  getInstruments: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/instruments${query ? `?${query}` : ''}`);
    return res.json();
  },
  getInstrumentById: async (id) => {
    const res = await fetch(`${API_BASE}/instruments/${id}`);
    return res.json();
  },
  createInstrument: async (data) => {
    const res = await fetch(`${API_BASE}/instruments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Applications
  getApplications: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_BASE}/applications${query ? `?${query}` : ''}`);
    return res.json();
  },
  createApplication: async (data) => {
    const res = await fetch(`${API_BASE}/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  updateApplication: async (id, data) => {
    const res = await fetch(`${API_BASE}/applications/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  inspectApplication: async (id, inspectionData) => {
    const res = await fetch(`${API_BASE}/applications/${id}/inspect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inspectionData)
    });
    return res.json();
  },

  // Certificates
  getCertificates: async () => {
    const res = await fetch(`${API_BASE}/certificates`);
    return res.json();
  },
  getCertificateByNumber: async (certNumber) => {
    const res = await fetch(`${API_BASE}/certificates/${encodeURIComponent(certNumber)}`);
    return res.json();
  },
  verifyQrCode: async (qrPayload) => {
    const res = await fetch(`${API_BASE}/certificates/verify-qr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrPayload })
    });
    return res.json();
  },

  // Grievances
  getGrievances: async () => {
    const res = await fetch(`${API_BASE}/grievances`);
    return res.json();
  },
  createGrievance: async (data) => {
    const res = await fetch(`${API_BASE}/grievances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  updateGrievance: async (id, data) => {
    const res = await fetch(`${API_BASE}/grievances/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Audit Logs
  getAuditLogs: async () => {
    const res = await fetch(`${API_BASE}/audit-logs`);
    return res.json();
  },

  // Regulator Stats
  getRegulatorStats: async () => {
    const res = await fetch(`${API_BASE}/stats/regulator`);
    return res.json();
  },

  // Calculators
  calculateFee: async (data) => {
    const res = await fetch(`${API_BASE}/calculate-fee`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },
  calculateMPE: async (data) => {
    const res = await fetch(`${API_BASE}/calculate-mpe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  }
};
