/**
 * API Service for Legal Metrology Online Verification System (e-Maap)
 * Secure JWT Authorization & State Management
 */

const API_BASE = '/api';
const TOKEN_KEY = 'nlmvs_access_token';
const REFRESH_KEY = 'nlmvs_refresh_token';
const USER_KEY = 'nlmvs_auth_user';

// Session event listeners: (event: 'login' | 'logout' | 'expired' | 'refreshed', data) => void
const sessionListeners = new Set();

function notifySession(event, data = null) {
  sessionListeners.forEach(listener => {
    try {
      listener(event, data);
    } catch (e) {
      console.error('Session listener error:', e);
    }
  });
}

export const tokenStorage = {
  getToken: () => {
    try {
      return localStorage.getItem(TOKEN_KEY) || localStorage.getItem('nlmvs_jwt_token');
    } catch {
      return null;
    }
  },
  setToken: (token) => {
    try {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
        // keep nlmvs_jwt_token synced for backwards compatibility
        localStorage.setItem('nlmvs_jwt_token', token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem('nlmvs_jwt_token');
      }
    } catch {
      // localStorage unavailable in certain environments
    }
  },
  getRefreshToken: () => {
    try {
      return localStorage.getItem(REFRESH_KEY);
    } catch {
      return null;
    }
  },
  setRefreshToken: (refreshToken) => {
    try {
      if (refreshToken) {
        localStorage.setItem(REFRESH_KEY, refreshToken);
      } else {
        localStorage.removeItem(REFRESH_KEY);
      }
    } catch {
      // ignore
    }
  },
  getUser: () => {
    try {
      const u = localStorage.getItem(USER_KEY);
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },
  setUser: (user) => {
    try {
      if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(USER_KEY);
      }
    } catch {
      // ignore
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem('nlmvs_jwt_token');
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      // ignore
    }
  },
  parseJwt: (token) => {
    if (!token || typeof token !== 'string') return null;
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  },
  isTokenExpired: (token, bufferSeconds = 20) => {
    const payload = tokenStorage.parseJwt(token);
    if (!payload || !payload.exp) return true;
    const nowSeconds = Math.floor(Date.now() / 1000);
    return nowSeconds >= (payload.exp - bufferSeconds);
  },
  getTimeUntilExpiry: (token) => {
    const payload = tokenStorage.parseJwt(token);
    if (!payload || !payload.exp) return 0;
    const remainingMs = (payload.exp * 1000) - Date.now();
    return remainingMs > 0 ? remainingMs : 0;
  }
};

// Global refresh promise to deduplicate concurrent refresh calls
let refreshPromise = null;

async function executeRefreshToken() {
  if (refreshPromise) return refreshPromise;

  const rToken = tokenStorage.getRefreshToken();
  if (!rToken) {
    tokenStorage.clear();
    notifySession('expired', null);
    return null;
  }

  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rToken })
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.success && data?.token) {
        tokenStorage.setToken(data.token);
        if (data.refreshToken) tokenStorage.setRefreshToken(data.refreshToken);
        if (data.user) tokenStorage.setUser(data.user);
        notifySession('refreshed', data);
        return data.token;
      } else {
        tokenStorage.clear();
        notifySession('expired', null);
        return null;
      }
    } catch {
      tokenStorage.clear();
      notifySession('expired', null);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Authenticated fetch request with proactive token renewal and 401 retry interception
 */
async function request(endpoint, options = {}, isRetry = false) {
  let token = tokenStorage.getToken();

  // If token is about to expire in 20s and we have a refresh token, proactively refresh it
  if (token && tokenStorage.isTokenExpired(token, 20) && tokenStorage.getRefreshToken()) {
    const newToken = await executeRefreshToken();
    if (newToken) token = newToken;
  }

  const headers = {
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  // Handle 401 Unauthorized with token refresh & retry
  if (response.status === 401 && !isRetry && !endpoint.startsWith('/auth/login') && !endpoint.startsWith('/auth/refresh')) {
    if (tokenStorage.getRefreshToken()) {
      const refreshedToken = await executeRefreshToken();
      if (refreshedToken) {
        return request(endpoint, options, true);
      }
    }
    // If refresh failed or was impossible, clear auth state and notify
    tokenStorage.clear();
    notifySession('expired', null);
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.error || (typeof data?.detail === 'string' ? data.detail : null) || `Request failed with status ${response.status}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.code = data?.code;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Token & Session Helpers
  getToken: tokenStorage.getToken,
  setToken: tokenStorage.setToken,
  getRefreshToken: tokenStorage.getRefreshToken,
  setRefreshToken: tokenStorage.setRefreshToken,
  getUser: tokenStorage.getUser,
  setUser: tokenStorage.setUser,
  isTokenExpired: tokenStorage.isTokenExpired,
  getTimeUntilExpiry: tokenStorage.getTimeUntilExpiry,
  parseJwt: tokenStorage.parseJwt,

  // Session Event Subscriptions
  onSessionChange: (listener) => {
    sessionListeners.add(listener);
    return () => sessionListeners.delete(listener);
  },

  // Token Refresh
  refreshToken: executeRefreshToken,

  // Logout
  logout: async () => {
    const token = tokenStorage.getToken();
    const refreshToken = tokenStorage.getRefreshToken();
    try {
      if (token || refreshToken) {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ refreshToken })
        }).catch(() => null);
      }
    } finally {
      tokenStorage.clear();
      notifySession('logout', null);
    }
  },

  // Health Check
  getHealth: async () => {
    return request('/health');
  },

  // Authentication
  login: async (credentials) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.token) {
        tokenStorage.setToken(data.token);
        if (data.refreshToken) tokenStorage.setRefreshToken(data.refreshToken);
        tokenStorage.setUser(data.user);
        notifySession('login', data);
        return { success: true, ...data, status: res.status, ok: true };
      }
      return {
        success: false,
        error: data?.error || (typeof data?.detail === 'string' ? data.detail : null) || `Authentication failed with status ${res.status}`,
        status: res.status,
        ok: false
      };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Network error: could not connect to authentication server.',
        ok: false
      };
    }
  },

  guestLogin: async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.token) {
        tokenStorage.setToken(data.token);
        if (data.refreshToken) tokenStorage.setRefreshToken(data.refreshToken);
        tokenStorage.setUser(data.user);
        notifySession('login', data);
        return { success: true, ...data, status: res.status, ok: true };
      }
      return {
        success: false,
        error: data?.error || 'Could not issue guest session.',
        ok: false
      };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Network error during guest authentication.',
        ok: false
      };
    }
  },

  sendOtp: async (identifier) => {
    return request('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ identifier })
    });
  },

  verify2FA: async ({ sessionToken, totpCode }) => {
    try {
      const res = await fetch(`${API_BASE}/auth/2fa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken, totpCode })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.token) {
        tokenStorage.setToken(data.token);
        if (data.refreshToken) tokenStorage.setRefreshToken(data.refreshToken);
        tokenStorage.setUser(data.user);
        notifySession('login', data);
        return { success: true, ...data, status: res.status, ok: true };
      }
      return {
        success: false,
        error: data?.error || (typeof data?.detail === 'string' ? data.detail : null) || `2FA verification failed with status ${res.status}`,
        status: res.status,
        ok: false
      };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Network error: could not connect to 2FA verification server.',
        ok: false
      };
    }
  },

  getDemo2FACode: async (identifier = 'GOI-ADM-001') => {
    return request(`/auth/2fa/demo-code?identifier=${encodeURIComponent(identifier)}`);
  },

  // Government SSO Integration (MeriPehchan / Jan Parichay)
  getSSOConfig: async () => {
    return request('/auth/sso/config');
  },

  ssoSimulate: async ({ role = 'inspector', identifier = null } = {}) => {
    try {
      const res = await fetch(`${API_BASE}/auth/sso/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, identifier })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.token) {
        tokenStorage.setToken(data.token);
        if (data.refreshToken) tokenStorage.setRefreshToken(data.refreshToken);
        tokenStorage.setUser(data.user);
        notifySession('login', data);
        return { success: true, ...data, status: res.status, ok: true };
      }
      return {
        success: false,
        error: data?.error || (typeof data?.detail === 'string' ? data.detail : null) || `SSO simulation failed with status ${res.status}`,
        status: res.status,
        ok: false
      };
    } catch (err) {
      return {
        success: false,
        error: err.message || 'Network error: could not connect to SSO simulation service.',
        ok: false
      };
    }
  },

  getCaptcha: async () => {
    return request('/auth/captcha');
  },

  getMe: async () => {
    return request('/auth/me');
  },

  // Jurisdictions & Public References
  getJurisdictions: async () => {
    return request('/jurisdictions');
  },
  getOfficers: async () => {
    return request('/officers');
  },
  getGatcCenters: async () => {
    return request('/gatc-centers');
  },
  getMerchants: async () => {
    return request('/merchants');
  },

  // Instruments
  getInstruments: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/instruments${query ? `?${query}` : ''}`);
  },
  getInstrumentById: async (id) => {
    return request(`/instruments/${id}`);
  },
  createInstrument: async (data) => {
    return request('/instruments', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  getApprovedModels: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/instruments/approved-models${query ? `?${query}` : ''}`);
  },
  deriveInstrumentSpecs: async (data) => {
    return request('/instruments/derive-specs', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Applications
  getApplications: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/applications${query ? `?${query}` : ''}`);
  },
  getApplicationById: async (id) => {
    return request(`/applications/${id}`);
  },
  createApplication: async (data) => {
    return request('/applications', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateApplication: async (id, data) => {
    return request(`/applications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  rescheduleApplication: async (id, data) => {
    return request(`/applications/${id}/reschedule`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  cancelApplication: async (id, data) => {
    return request(`/applications/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  inspectApplication: async (id, inspectionData) => {
    return request(`/applications/${id}/inspect`, {
      method: 'POST',
      body: JSON.stringify(inspectionData)
    });
  },

  // Certificates
  getCertificates: async () => {
    return request('/certificates');
  },
  getCertificateByNumber: async (certNumber) => {
    return request(`/certificates/${encodeURIComponent(certNumber)}`);
  },
  verifyQrCode: async (qrPayload) => {
    return request('/certificates/verify-qr', {
      method: 'POST',
      body: JSON.stringify({ qrPayload })
    });
  },

  // Grievances
  getGrievances: async () => {
    return request('/grievances');
  },
  createGrievance: async (data) => {
    return request('/grievances', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  updateGrievance: async (id, data) => {
    return request(`/grievances/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // Section 24 Immutable Audit Logs (Regulator only)
  getAuditLogs: async () => {
    return request('/audit-logs');
  },

  // Regulator Stats (Regulator only)
  getRegulatorStats: async () => {
    return request('/stats/regulator');
  },

  // Seals & Security Inventory (Inspector & Regulator)
  getSealInventory: async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/seals/inventory${qs ? `?${qs}` : ''}`);
  },
  validateSeal: async (sealNumber, sealType = null, officerId = null) => {
    return request('/seals/validate', {
      method: 'POST',
      body: JSON.stringify({ sealNumber, sealType, officerId })
    });
  },

  // GATC Test Reports & Heavy Calibration (GATC & Regulator)
  getGatcReports: async (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/gatc/reports${qs ? `?${qs}` : ''}`);
  },
  getGatcInstruments: async () => {
    return request('/gatc/instruments');
  },
  submitGatcTestReport: async (reportData) => {
    return request('/gatc/test-report', {
      method: 'POST',
      body: JSON.stringify(reportData)
    });
  },

  // Statutory Fees & Simulated Payments
  quoteFee: async (data) => {
    return request('/payments/quote-fee', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  initiatePayment: async (data) => {
    return request('/payments/initiate', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  confirmPayment: async (paymentId, { simulateSuccess = true, failureReason = null } = {}) => {
    return request(`/payments/${paymentId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ simulateSuccess, failureReason })
    });
  },
  getPayment: async (paymentId) => {
    return request(`/payments/${paymentId}`);
  },
  getPaymentReceipt: async (paymentId) => {
    return request(`/payments/${paymentId}/receipt`);
  },

  // Calculators (Public)
  calculateFee: async (data) => {
    return request('/calculate-fee', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  calculateMPE: async (data) => {
    return request('/calculate-mpe', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
};
