# e-Maap | National Online Verification System for Weighing and Measuring Instruments

### Smart India Hackathon (SIH) • Problem Statement ID: 26036 (PS36)
**Governed under:** The Legal Metrology Act, 2009 (Act 1 of 2010) & The Legal Metrology (General) Rules, 2011  
**Authority:** Department of Consumer Affairs, Ministry of Consumer Affairs, Food & Public Distribution, Government of India

---

## 🎯 Executive Summary & Problem Overview

Under the **Legal Metrology Act, 2009** and the **Legal Metrology (General) Rules, 2011**, every weighing and measuring instrument used in commercial transaction or protection (grocery counter scales, jeweler precision balances, petrol pump fuel dispensers, commercial weighbridges, bulk flow meters) must be **periodically verified and stamped** before being put into use.

### Current Challenges Addressed:
1. **Manual Friction:** Cumbersome physical applications, manual paper fee challans, paper logbooks, and delays in scheduling.
2. **Jurisdictional Silos:** Local physical registers prevent regulators from monitoring verification status across districts and state borders.
3. **Counterfeiting & Tampering:** Lack of cryptographic certificate verification enables fraudulent seals or expired scales in circulation.
4. **Consumer Information Asymmetry:** Consumers cannot verify whether a merchant's scale is verified, calibrated, or tampered.

### The Solution: `e-Maap (NLMVS)`
A unified, cloud-native **National Metrology Online Verification Platform** connecting Merchants, Legal Metrology Officers (LMOs), Government Approved Test Centres (GATCs), Regulators, and Citizens in real-time.

---

## 🌟 Key Features & Innovations

### 1. 🏢 Merchant / Trader Self-Service Portal
- **Premise Instrument Registry:** Manage all weighing devices, serial numbers, accuracy classes, and central model approvals (`IND/...`).
- **4-Step Verification Wizard:**
  - Instrument selection & verification category (Initial, Periodic 12/24-month Renewal, Post-Repair).
  - **Automated Schedule XII Fee Calculation:** Computes base fees according to instrument capacity + automatic 100% late surcharge if overdue.
  - Simulated payment integration (BharatKosh, UPI, NetBanking).
  - Preferred inspection slot booking.
- **Proactive Expiry Alerts:** Auto-detects validity periods (<30 days due, expired/penalty risk) with 1-click renewal.
- **Digital Certificate Locker:** View, download, and print official Schedule VIII certificates and QR seal stickers.

### 2. ⚖️ Legal Metrology Officer (LMO) Field Toolkit
- **Jurisdiction Inspection Queue:** Direct routing of verification tasks based on State & District boundaries.
- **Automated MPE (Maximum Permissible Error) Test Engine:**
  - Implements exact formulas from **Legal Metrology General Rules, 2011 Table 2 & 3**.
  - Computes scale interval $e$, scale division count $n = Max/e$, and permissible tolerance limits at 10%, 50%, and 100% capacity.
  - Instant live PASS/FAIL indicator as the officer inputs observed scale readings.
  - Repeatability error test & Eccentricity (corner load) test.
- **Cryptographic Security Stamping:**
  - Binds physical wire/lead seal ID and tamper-evident holographic barcode.
  - Generates an immutable **SHA-256 digital verification hash**.
  - 1-click issuance of official **Schedule VIII / Form B Certificate of Verification**.
  - Rejection / Seizure notice issuance under Section 24 for non-compliant instruments.

### 3. 🔬 Government Approved Test Centre (GATC) Lab Portal
- Specifically addresses the SIH requirement for GATC centers notified by the Government.
- Workflows for heavy, bulk, or specialized instruments (e.g. 60T Lorry Weighbridges, bulk liquid flow meters).
- **National Physical Laboratory (NPL) Traceability:** Standard test weights calibration logging with unbroken traceability to NPL/RRSL reference standards.
- Issues GATC Calibration Reports forwarded to State LMOs for statutory stamping.

### 4. 🏛️ National & State Regulator Command Center (Super Admin)
- **Pan-India Real-Time Metrics:** Live total instruments, national compliance rate %, statutory fee revenues, and overdue defaulters.
- **Cross-Jurisdiction Monitoring Matrix:** Solves the core problem of tracking mobile instruments (e.g. mobile weighbridges, petroleum road tankers) moving across state lines.
- **Immutable Cryptographic Audit Trail:** Searchable ledger logging every application, inspection, seal assignment, and certificate verification with SHA-256 signatures.
- **Enforcement Oversight:** Heatmaps and status of citizen complaints, notices, and compound fee penalties.

### 5. 👥 Citizen / Consumer Portal ("Jago Grahak Jago")
- **Instant QR Code Authenticity Checker:**
  - Scan QR code or search by Certificate Number / Serial Number.
  - Displays instant badge: Green **"AUTHENTIC & LEGALLY VERIFIED"** vs Red **"EXPIRED / COUNTERFEIT WARNING"**.
  - Transparent display of scale validity date, permissible error class, physical seal numbers, and verifying officer identity.
- **Citizen Grievance Redressal:**
  - Fast 1-minute whistleblowing form for short measures, underweight goods, or expired scale stamps.
  - Instant complaint ticket generation (`GRV-2026-XXXX`) with automated routing to the local LMO for spot raid / surprise inspection.

---

## 📁 System Architecture

```
PS36 prototpye/
├── frontend/                   # Frontend Application (React 19 + Vite 8 + Tailwind CSS v4)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx               # Header, tricolor government banner, role switcher
│   │   │   ├── Emblem.jsx               # National Emblem & Security Hologram SVG graphics
│   │   │   ├── MerchantPortal.jsx       # Instrument fleet, 4-step renewal wizard, fees
│   │   │   ├── LmoInspectorPortal.jsx   # Field inspection, live MPE testing, stamping
│   │   │   ├── GatcPortal.jsx           # Heavy weighbridge & NPL calibration lab
│   │   │   ├── RegulatorDashboard.jsx   # Cross-jurisdiction matrix & immutable audit log
│   │   │   ├── ConsumerPortal.jsx       # "Jago Grahak Jago" QR scanner & grievance
│   │   │   ├── CertificateModal.jsx     # Official Schedule VIII / Form B Certificate
│   │   │   ├── QrCodeStickerModal.jsx   # Printable QR verification sticker
│   │   │   └── ExpiryNotificationBanner.jsx # Real-time expiry & penalty warnings
│   │   ├── services/
│   │   │   └── api.js                   # REST API client with local fallback
│   │   ├── App.jsx                      # Main multi-role application controller
│   │   └── index.css                    # Tailwind v4 + high-fidelity print styles
│   └── vite.config.js                   # Vite proxy configuration (port 3000 -> 5000)
├── backend/                    # Backend API Server (Python FastAPI)
│   ├── data/
│   │   └── mockData.json                # Seed registry data (Maharashtra, Karnataka, Delhi, etc.)
│   ├── middleware/
│   │   └── auth.py                      # Bearer JWT auth & RBAC route protection
│   ├── routes/                          # Modular API routers (auth, instruments, certs, etc.)
│   ├── services/
│   │   └── auth_service.py              # Bcrypt hashing, JWT issuance & OTP verification
│   ├── utils/
│   │   ├── mpe_calculator.py            # Legal Metrology 2011 Table 2 & 3 MPE engine
│   │   ├── fee_calculator.py            # Schedule XII statutory fee calculation
│   │   └── crypto_seal.py               # SHA-256 cryptographic certificate hashing
│   ├── main.py                          # FastAPI application & router mounting
│   └── run.py                           # Uvicorn entry point (port 5000)
├── package.json                         # Root project runner with concurrently
└── README.md                            # Comprehensive system documentation
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18.0.0 or higher (v24+ recommended)
- **npm**: v9.0.0 or higher

### Running the Full Application with One Command
From the project root directory:

```bash
npm run dev
```

This starts:
- **Backend API Server:** `http://localhost:5000`
- **Frontend Web Application:** `http://localhost:3000` (or `http://localhost:5173`)

### 🔐 Pre-Seeded Evaluator Login Credentials
In compliance with strict security standards, **no passwords, 2FA tokens, or OTP secrets are stored in the frontend client bundle**. All accounts and credentials are verified server-side. For evaluator test credentials across all 5 roles (Merchant, LMO Inspector, GATC Lab, Apex Regulator, and Citizen OTP), please refer to:
👉 **[CREDENTIALS.md](CREDENTIALS.md)**

### Running Frontend or Server Individually
```bash
# Run backend server only:
npm run dev:server

# Run frontend application only:
npm run dev:frontend
```

---

## 🏆 Demonstration Walkthrough for Hackathon Judges

### Step 1: Merchant Experience (Self-Service & Application)
1. Navigate to `http://localhost:3000/`.
2. Notice the **Expiry Notification Banner** warning that an instrument has expired.
3. Switch establishments between **Om Sai Supermarket** (Retail Grocery), **Kalyan Jewellers** (Gold/Diamond Bullion Class I balance), and **Bharat Petroleum** (Fuel Dispenser).
4. Click **"Apply for Verification"** or click **"Renew"** on the expired platform scale.
5. In the wizard:
   - Step 1: Notice automatic detection of instrument specs.
   - Step 2: Choose verification type.
   - Step 3: Notice statutory fee calculation according to **Schedule XII** with late penalty surcharge.
   - Step 4: Confirm slot and submit application!
6. Click **"Certificate"** or **"QR Stamp"** on any active instrument to view the official printable Government Certificate with scannable QR code!

### Step 2: Legal Metrology Officer (LMO Field Verification Suite)
1. Click the **"LMO Inspector"** tab in the top navigation.
2. Select an application from the assigned queue and click **"Start Field Verification"**.
3. Go through the **Digital Inspection Suite**:
   - Check the visual requirements (Leveling bubble, chassis seals, model approval plate `IND/...`).
   - In the **MPE Error Engine**, change the *Observed Reading* (e.g. from 15.002 to 15.020) to see the live tolerance calculation switch to **FAIL** or **PASS**.
   - Review physical Lead Wire Seal and Hologram Barcode ID.
   - Click **"Approve & Issue Schedule VIII Certificate"** — watch celebratory confetti and instant certificate generation!

### Step 3: Government Approved Test Centre (GATC Portal)
1. Click the **"GATC Test Lab"** tab.
2. Select heavy instruments (e.g. 60-Tonne Lorry Weighbridge in Sanand, Gujarat).
3. Review the **NPL Traceability Confirmation** and standard weight load trials (10T, 30T, 60T).
4. Issue GATC Calibration Report to forward to the State LMO for statutory stamping.

### Step 4: Pan-India Regulator Command Center
1. Click the **"Regulator Command"** tab.
2. Inspect the **Pan-India Stamping Compliance Rate** and national KPIs.
3. Switch to the **"Cross-Jurisdiction Monitoring"** sub-tab to see how the system tracks compliance across Maharashtra, Karnataka, Delhi, and Gujarat.
4. Switch to the **"Immutable Audit Trail"** tab to view cryptographic SHA-256 hashes of every transaction and verification event.

### Step 5: Citizen & Consumer Portal ("Jago Grahak Jago")
1. Click the **"Citizen / Consumer"** tab.
2. Click one of the quick test buttons (e.g. *Om Sai Scale*, *Kalyan Jeweler*, or *Fake Seal Test*).
3. Observe how authentic instruments display a glowing green **"AUTHENTIC & LEGALLY VERIFIED"** badge with verified officer seal, while fake seals immediately display a critical alert with an option to report.
4. Try lodging a consumer grievance under the **"Report Fraud"** tab and obtain an instant tracking ticket (`GRV-2026-XXXX`).

---

## 📜 Statutory Compliance & Legal References
- **The Legal Metrology Act, 2009:** Sections 15, 24, 25, 30, and 53.
- **The Legal Metrology (General) Rules, 2011:**
  - **Rule 24:** Verification and inspection procedure.
  - **Schedule VI:** Testing procedures, repeatability, and eccentricity checks.
  - **Schedule VIII (Form B):** Statutory Certificate of Verification format.
  - **Schedule XII:** Prescribed Government statutory fees for verification and stamping.
  - **Table 2 & 3:** Maximum Permissible Errors (MPE) for Accuracy Classes I, II, III, and IIII.
