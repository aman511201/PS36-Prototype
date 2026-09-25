import express from 'express';
import cors from 'cors';
import {
  jurisdictions,
  officers,
  gatcCenters,
  merchants,
  initialInstruments,
  initialApplications,
  initialCertificates,
  initialGrievances,
  initialAuditLogs
} from './data/mockData.js';
import { calculateMPE, evaluateLoadTest } from './utils/mpeCalculator.js';
import { calculateStatutoryFee } from './utils/feeCalculator.js';
import { generateCertificateHash, verifyCertificateIntegrity } from './utils/cryptoSeal.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// In-Memory Database initialized with mock data
let db = {
  jurisdictions: [...jurisdictions],
  officers: [...officers],
  gatcCenters: [...gatcCenters],
  merchants: [...merchants],
  instruments: [...initialInstruments],
  applications: [...initialApplications],
  certificates: [...initialCertificates],
  grievances: [...initialGrievances],
  auditLogs: [...initialAuditLogs]
};

// Helper: Add audit log entry
function addAuditLog({ actorRole, actorName, action, target, details, ipAddress = '127.0.0.1' }) {
  const logEntry = {
    id: `aud-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    actorRole,
    actorName,
    action,
    target,
    details,
    ipAddress,
    signatureHash: generateCertificateHash({
      certNumber: target,
      serialNumber: action,
      stampingDate: new Date().toISOString(),
      officerId: actorName,
      leadSealNo: 'AUDIT',
      hologramNo: 'IMMUTABLE'
    }).substring(0, 32)
  };
  db.auditLogs.unshift(logEntry);
  return logEntry;
}

// ---------------- API ROUTES ----------------

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'National Legal Metrology Verification System (e-Maap / NLMVS)',
    act: 'Legal Metrology Act, 2009 & General Rules, 2011',
    serverTime: new Date().toISOString(),
    metrics: {
      instruments: db.instruments.length,
      applications: db.applications.length,
      certificates: db.certificates.length,
      grievances: db.grievances.length
    }
  });
});

// Authentication Endpoint for all roles
app.post('/api/auth/login', (req, res) => {
  const { role = 'merchant', identifier = '', password = '', otp = '' } = req.body;
  const idQuery = (identifier || '').trim().toLowerCase();

  let user = null;
  let entity = null;

  if (role === 'merchant') {
    entity = db.merchants.find(m => 
      m.gstin.toLowerCase() === idQuery ||
      m.licenseNumber.toLowerCase() === idQuery ||
      m.contactEmail.toLowerCase() === idQuery ||
      m.id.toLowerCase() === idQuery
    ) || db.merchants[0];

    user = {
      id: entity.id,
      name: entity.ownerName,
      tradeName: entity.tradeName,
      identifier: entity.gstin,
      district: entity.district,
      state: entity.state,
      role: 'merchant'
    };
  } else if (role === 'inspector') {
    entity = db.officers.find(o => 
      o.badgeNumber.toLowerCase() === idQuery ||
      o.email.toLowerCase() === idQuery ||
      o.id.toLowerCase() === idQuery
    ) || db.officers[0];

    user = {
      id: entity.id,
      name: entity.name,
      designation: entity.designation,
      identifier: entity.badgeNumber,
      district: entity.jurisdictionDistrict,
      state: entity.jurisdictionState,
      role: 'inspector'
    };
  } else if (role === 'gatc') {
    entity = db.gatcCenters.find(g => 
      g.recognitionNumber.toLowerCase() === idQuery ||
      g.id.toLowerCase() === idQuery
    ) || db.gatcCenters[0];

    user = {
      id: entity.id,
      name: entity.inCharge,
      labName: entity.name,
      identifier: entity.recognitionNumber,
      city: entity.city,
      state: entity.state,
      role: 'gatc'
    };
  } else if (role === 'regulator') {
    user = {
      id: 'reg-01',
      name: 'Dr. Suresh Chandra (Directorate Super Admin)',
      designation: 'Controller General of Legal Metrology',
      identifier: 'GOI-ADM-001',
      department: 'Department of Consumer Affairs, New Delhi',
      role: 'regulator'
    };
  } else if (role === 'consumer') {
    user = {
      id: 'cit-01',
      name: 'Citizen Consumer',
      phone: identifier || '+91 98200 99881',
      identifier: 'CITIZEN-AUTH',
      role: 'consumer'
    };
  }

  // Audit log the sign-in
  addAuditLog({
    actorRole: (role || 'USER').toUpperCase(),
    actorName: user.name,
    action: 'SESSION_AUTHENTICATED',
    target: user.identifier || 'AUTH-NODE',
    details: `Successfully signed in via ${role} portal gateway.`
  });

  return res.json({
    success: true,
    token: `NLMVS-TOKEN-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    user,
    entity,
    role
  });
});

// Jurisdictions & reference data
app.get('/api/jurisdictions', (req, res) => res.json(db.jurisdictions));
app.get('/api/officers', (req, res) => res.json(db.officers));
app.get('/api/gatc-centers', (req, res) => res.json(db.gatcCenters));
app.get('/api/merchants', (req, res) => res.json(db.merchants));

// Instruments CRUD
app.get('/api/instruments', (req, res) => {
  const { merchantId, status, district, state } = req.query;
  let filtered = [...db.instruments];

  if (merchantId) filtered = filtered.filter(i => i.merchantId === merchantId);
  if (status) filtered = filtered.filter(i => i.status === status);
  if (district) filtered = filtered.filter(i => i.district.toLowerCase() === district.toLowerCase());
  if (state) filtered = filtered.filter(i => i.state.toLowerCase() === state.toLowerCase());

  res.json(filtered);
});

app.get('/api/instruments/:id', (req, res) => {
  const inst = db.instruments.find(i => i.id === req.params.id || i.serialNumber === req.params.id);
  if (!inst) return res.status(404).json({ error: 'Instrument not found' });
  res.json(inst);
});

app.post('/api/instruments', (req, res) => {
  const body = req.body;
  const newInst = {
    id: `inst-${Date.now()}`,
    merchantId: body.merchantId || 'm-01',
    merchantName: body.merchantName || 'Om Sai Supermarket & Provision Stores',
    category: body.category || 'Electronic Weighing Scale (Counter/Tabletop)',
    brand: body.brand || 'Essae',
    model: body.model || 'Standard Digital NAWI',
    serialNumber: body.serialNumber || `SN-${Math.floor(100000 + Math.random() * 900000)}`,
    modelApprovalNumber: body.modelApprovalNumber || 'IND/09/2024/991',
    accuracyClass: body.accuracyClass || 'Class III',
    maxCapacityKg: Number(body.maxCapacityKg) || 30,
    minCapacityGrams: Number(body.minCapacityGrams) || 100,
    verificationInterval_e: Number(body.verificationInterval_e) || 5,
    verificationPeriodMonths: Number(body.verificationPeriodMonths) || 12,
    status: 'PENDING_INSPECTION',
    lastVerificationDate: null,
    validUntilDate: null,
    certificateNumber: null,
    officerId: null,
    officerName: null,
    leadSealNo: null,
    hologramNo: null,
    district: body.district || 'Mumbai Suburban',
    state: body.state || 'Maharashtra',
    locationAddress: body.locationAddress || 'Store Premise',
    geoLocation: body.geoLocation || { lat: 19.0760, lng: 72.8777 }
  };

  db.instruments.push(newInst);
  addAuditLog({
    actorRole: 'MERCHANT',
    actorName: newInst.merchantName,
    action: 'INSTRUMENT_REGISTERED',
    target: newInst.serialNumber,
    details: `Registered ${newInst.category} (${newInst.brand} - ${newInst.model}). Awaiting verification.`
  });

  res.status(201).json(newInst);
});

// Verification Applications
app.get('/api/applications', (req, res) => {
  const { merchantId, status, district, officerId } = req.query;
  let filtered = [...db.applications];

  if (merchantId) filtered = filtered.filter(a => a.merchantId === merchantId);
  if (status) filtered = filtered.filter(a => a.status === status);
  if (district) filtered = filtered.filter(a => a.district?.toLowerCase() === district.toLowerCase());
  if (officerId) filtered = filtered.filter(a => a.assignedOfficerId === officerId);

  res.json(filtered);
});

app.post('/api/applications', (req, res) => {
  const b = req.body;
  const appId = `APP-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  // calculate fee
  const feeInfo = calculateStatutoryFee({
    category: b.instrumentCategory,
    capacityKg: b.maxCapacityKg,
    accuracyClass: b.accuracyClass,
    isLate: b.isLate || false
  });

  // assign officer by district
  const matchedOfficer = db.officers.find(o => o.jurisdictionDistrict?.toLowerCase() === b.district?.toLowerCase()) || db.officers[0];

  const newApp = {
    id: appId,
    instrumentId: b.instrumentId || null,
    merchantId: b.merchantId || 'm-01',
    merchantName: b.merchantName || 'Om Sai Supermarket & Provision Stores',
    applicationType: b.applicationType || 'Periodic Renewal Verification',
    instrumentCategory: b.instrumentCategory,
    brand: b.brand,
    model: b.model,
    serialNumber: b.serialNumber,
    accuracyClass: b.accuracyClass || 'Class III',
    maxCapacityKg: Number(b.maxCapacityKg) || 15,
    verificationInterval_e: Number(b.verificationInterval_e) || 2,
    district: b.district || 'Mumbai Suburban',
    state: b.state || 'Maharashtra',
    submissionDate: new Date().toISOString().substring(0, 10),
    preferredInspectionDate: b.preferredInspectionDate || new Date(Date.now() + 7 * 86400000).toISOString().substring(0, 10),
    status: 'UNDER_REVIEW',
    statutoryFee: feeInfo.totalFee,
    paymentStatus: 'PAID',
    paymentTransactionRef: `BHARATKOSH-TXN-${Date.now().toString().slice(-8)}`,
    assignedOfficerId: matchedOfficer.id,
    assignedOfficerName: matchedOfficer.name,
    scheduledDateTime: b.scheduledDateTime || null,
    notes: b.notes || 'Submitted via e-Maap Online Verification Portal'
  };

  db.applications.unshift(newApp);

  // If instrument exists, set status to PENDING_INSPECTION
  if (b.instrumentId) {
    const inst = db.instruments.find(i => i.id === b.instrumentId);
    if (inst) inst.status = 'PENDING_INSPECTION';
  }

  addAuditLog({
    actorRole: 'MERCHANT',
    actorName: newApp.merchantName,
    action: 'VERIFICATION_APPLICATION_SUBMITTED',
    target: newApp.id,
    details: `Application for ${newApp.instrumentCategory} (S/N: ${newApp.serialNumber}). Statutory fee ₹${newApp.statutoryFee} paid.`
  });

  res.status(201).json(newApp);
});

// Update application (e.g., schedule slot)
app.put('/api/applications/:id', (req, res) => {
  const appIndex = db.applications.findIndex(a => a.id === req.params.id);
  if (appIndex === -1) return res.status(404).json({ error: 'Application not found' });

  const updated = { ...db.applications[appIndex], ...req.body };
  db.applications[appIndex] = updated;

  addAuditLog({
    actorRole: 'OFFICER',
    actorName: updated.assignedOfficerName || 'Legal Metrology Officer',
    action: 'APPLICATION_STATUS_UPDATED',
    target: updated.id,
    details: `Application status changed to ${updated.status}. Slot: ${updated.scheduledDateTime || 'N/A'}`
  });

  res.json(updated);
});

// On-site inspection completion and Certificate Issuance
app.post('/api/applications/:id/inspect', (req, res) => {
  const application = db.applications.find(a => a.id === req.params.id);
  if (!application) return res.status(404).json({ error: 'Application not found' });

  const {
    officerId,
    officerName,
    visualInspectionPassed,
    repeatabilityPassed,
    eccentricityPassed,
    testLoads, // array of { load, observed, permissible }
    passedAllTests,
    leadSealNo,
    hologramNo,
    remarks
  } = req.body;

  if (!passedAllTests) {
    // Record rejection
    application.status = 'REJECTED';
    application.notes = `Rejected during on-site inspection. Remarks: ${remarks || 'Failed Maximum Permissible Error tolerance test.'}`;

    addAuditLog({
      actorRole: 'LMO_OFFICER',
      actorName: officerName || 'LMO Inspector',
      action: 'INSPECTION_REJECTED_NON_COMPLIANT',
      target: application.id,
      details: `Instrument ${application.serialNumber} failed statutory verification. Reason: ${remarks}`
    });

    return res.json({
      verdict: 'FAILED',
      message: 'Verification failed. Rectification notice issued to merchant under Section 24 of Legal Metrology Act, 2009.',
      application
    });
  }

  // Generate Certificate
  const stateCode = application.state === 'Maharashtra' ? 'MH' :
                    application.state === 'Karnataka' ? 'KA' :
                    application.state === 'Delhi' ? 'DL' :
                    application.state === 'Gujarat' ? 'GJ' :
                    application.state === 'Uttar Pradesh' ? 'UP' : 'GOI';
  
  const currentYear = new Date().getFullYear();
  const certNumber = `${stateCode}/LM/${currentYear}/${Math.floor(10000 + Math.random() * 90000)}`;
  const todayStr = new Date().toISOString().substring(0, 10);
  
  // Validity: 1 year (or 2 years for non-electronic weights)
  const validUntilDateObj = new Date();
  validUntilDateObj.setFullYear(validUntilDateObj.getFullYear() + 1);
  validUntilDateObj.setDate(validUntilDateObj.getDate() - 1);
  const validUntilStr = validUntilDateObj.toISOString().substring(0, 10);

  const finalLeadSeal = leadSealNo || `${stateCode}-LMO-SEAL-${Math.floor(100000 + Math.random() * 900000)}`;
  const finalHologram = hologramNo || `HOL-GOI-${currentYear}-${Math.floor(100000 + Math.random() * 900000)}`;

  // Find merchant
  const merchant = db.merchants.find(m => m.id === application.merchantId) || {
    tradeName: application.merchantName,
    gstin: '27AABCO1234F1Z8',
    ownerName: 'Authorized Trader',
    address: `${application.district}, ${application.state}`
  };

  // Generate SHA-256 Cryptographic Signature Hash
  const cryptoHash = generateCertificateHash({
    certNumber,
    serialNumber: application.serialNumber,
    stampingDate: todayStr,
    officerId: officerId || 'LMO-OFFICER',
    leadSealNo: finalLeadSeal,
    hologramNo: finalHologram
  });

  const certificate = {
    certificateNumber: certNumber,
    scheduleForm: 'Schedule VIII / Form B (Rule 24)',
    applicationId: application.id,
    instrumentId: application.instrumentId,
    serialNumber: application.serialNumber,
    instrumentCategory: application.instrumentCategory,
    brand: application.brand,
    model: application.model,
    modelApprovalNumber: application.modelApprovalNumber || 'IND/09/2023/512',
    accuracyClass: application.accuracyClass || 'Class III (Medium Accuracy)',
    maxCapacityKg: application.maxCapacityKg,
    minCapacityGrams: application.minCapacityGrams || 50,
    verificationInterval_e: application.verificationInterval_e || 2,
    stampingDate: todayStr,
    validUntilDate: validUntilStr,
    validityPeriod: '12 Months (1 Year)',
    merchantName: merchant.tradeName,
    gstin: merchant.gstin,
    ownerName: merchant.ownerName,
    premiseAddress: merchant.address,
    district: application.district,
    state: application.state,
    officerId: officerId || 'lmo-01',
    officerName: officerName || 'Shri Rajesh K. Sharma',
    officerDesignation: 'Legal Metrology Officer',
    leadSealNo: finalLeadSeal,
    hologramNo: finalHologram,
    statutoryFeePaid: application.statutoryFee || 300,
    feeReceiptNumber: `${stateCode}-TR-${currentYear}-${Math.floor(10000 + Math.random() * 90000)}`,
    cryptographicHash: cryptoHash,
    inspectionObservations: {
      visualInspection: visualInspectionPassed ? 'Passed (Enclosure intact, leveling centered, scale clean)' : 'Failed',
      repeatabilityTest: repeatabilityPassed ? 'Passed (Zero variance in 3 consecutive cycles)' : 'Failed',
      eccentricityTest: eccentricityPassed ? 'Passed (Off-center load test within statutory tolerance)' : 'N/A',
      testLoadObservations: testLoads || [
        { testWeightKg: application.maxCapacityKg * 0.1, observedKg: application.maxCapacityKg * 0.1, result: 'PASSED' },
        { testWeightKg: application.maxCapacityKg * 0.5, observedKg: application.maxCapacityKg * 0.5, result: 'PASSED' },
        { testWeightKg: application.maxCapacityKg, observedKg: application.maxCapacityKg, result: 'PASSED' }
      ],
      overallVerdict: 'STAMPED & VERIFIED'
    }
  };

  db.certificates.unshift(certificate);

  // Update application
  application.status = 'VERIFIED_STAMPED';
  application.certificateNumber = certNumber;

  // Update instrument
  let targetInstrument = db.instruments.find(i => i.id === application.instrumentId || i.serialNumber === application.serialNumber);
  if (targetInstrument) {
    targetInstrument.status = 'VERIFIED';
    targetInstrument.lastVerificationDate = todayStr;
    targetInstrument.validUntilDate = validUntilStr;
    targetInstrument.certificateNumber = certNumber;
    targetInstrument.officerId = officerId;
    targetInstrument.officerName = officerName;
    targetInstrument.leadSealNo = finalLeadSeal;
    targetInstrument.hologramNo = finalHologram;
  } else {
    // Add new instrument if it was initial registration
    targetInstrument = {
      id: `inst-${Date.now()}`,
      merchantId: application.merchantId,
      merchantName: application.merchantName,
      category: application.instrumentCategory,
      brand: application.brand,
      model: application.model,
      serialNumber: application.serialNumber,
      modelApprovalNumber: certificate.modelApprovalNumber,
      accuracyClass: application.accuracyClass,
      maxCapacityKg: application.maxCapacityKg,
      minCapacityGrams: application.minCapacityGrams || 50,
      verificationInterval_e: application.verificationInterval_e,
      verificationPeriodMonths: 12,
      status: 'VERIFIED',
      lastVerificationDate: todayStr,
      validUntilDate: validUntilStr,
      certificateNumber: certNumber,
      officerId: officerId,
      officerName: officerName,
      leadSealNo: finalLeadSeal,
      hologramNo: finalHologram,
      district: application.district,
      state: application.state,
      locationAddress: merchant.address,
      geoLocation: { lat: 19.0760, lng: 72.8777 }
    };
    db.instruments.unshift(targetInstrument);
  }

  // Immutable Audit Log
  addAuditLog({
    actorRole: 'LMO_OFFICER',
    actorName: officerName || 'Legal Metrology Officer',
    action: 'INSPECTION_COMPLETED_AND_CERTIFIED',
    target: certNumber,
    details: `Stamping completed for ${application.serialNumber} at ${merchant.tradeName}. Seal ${finalLeadSeal} affixed. Cryptographic Hash: ${cryptoHash.substring(0, 16)}...`
  });

  res.json({
    verdict: 'PASSED',
    message: 'Verification tests successfully passed! Digital certificate and stamping record issued.',
    certificate,
    application,
    instrument: targetInstrument
  });
});

// Certificates
app.get('/api/certificates', (req, res) => res.json(db.certificates));

app.get('/api/certificates/:certNumber', (req, res) => {
  const certNumber = decodeURIComponent(req.params.certNumber).trim();
  const cert = db.certificates.find(c => 
    c.certificateNumber.toLowerCase() === certNumber.toLowerCase() ||
    c.serialNumber.toLowerCase() === certNumber.toLowerCase()
  );

  if (!cert) {
    return res.status(404).json({
      valid: false,
      message: 'No active legal verification certificate found matching this identifier in the National Metrology Registry.'
    });
  }

  // Check validity
  const validUntil = new Date(cert.validUntilDate);
  const today = new Date();
  const isExpired = today > validUntil;
  const daysRemaining = Math.ceil((validUntil - today) / (1000 * 60 * 60 * 24));

  res.json({
    valid: !isExpired,
    statusText: isExpired ? 'EXPIRED' : (daysRemaining <= 30 ? 'EXPIRING_SOON' : 'VALID_AND_ACTIVE'),
    daysRemaining,
    certificate: cert
  });
});

// QR Code Verification
app.post('/api/certificates/verify-qr', (req, res) => {
  const { qrPayload } = req.body;
  if (!qrPayload) return res.status(400).json({ error: 'Empty QR code payload' });

  // qrPayload can be certNumber, URL, or JSON string
  let targetCertNumber = qrPayload;
  try {
    if (qrPayload.includes('{')) {
      const parsed = JSON.parse(qrPayload);
      targetCertNumber = parsed.certNumber || parsed.certificateNumber || parsed.serialNumber;
    } else if (qrPayload.includes('cert=')) {
      const urlParams = new URLSearchParams(qrPayload.split('?')[1]);
      targetCertNumber = urlParams.get('cert');
    }
  } catch (e) {
    targetCertNumber = qrPayload;
  }

  const cert = db.certificates.find(c => 
    c.certificateNumber.toLowerCase() === targetCertNumber?.toLowerCase() ||
    c.serialNumber.toLowerCase() === targetCertNumber?.toLowerCase() ||
    c.leadSealNo.toLowerCase() === targetCertNumber?.toLowerCase() ||
    c.hologramNo.toLowerCase() === targetCertNumber?.toLowerCase()
  );

  if (!cert) {
    return res.status(404).json({
      verified: false,
      alert: 'UNREGISTERED_INSTRUMENT_OR_COUNTERFEIT_SEAL',
      message: 'Warning: This QR seal does not match any official Legal Metrology Department record! Potential violation under Legal Metrology Act, 2009.'
    });
  }

  const validUntil = new Date(cert.validUntilDate);
  const isExpired = new Date() > validUntil;

  res.json({
    verified: true,
    certificate: cert,
    isExpired,
    integrityVerified: true,
    message: isExpired ? 'Notice: This instrument verification validity has EXPIRED.' : 'Authentic Government of India Legal Metrology Stamped Instrument.'
  });
});

// Consumer Grievances ("Jago Grahak Jago")
app.get('/api/grievances', (req, res) => res.json(db.grievances));

app.post('/api/grievances', (req, res) => {
  const b = req.body;
  const grvId = `GRV-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  // Find nearest LMO
  const matchedOfficer = db.officers.find(o => o.jurisdictionDistrict?.toLowerCase() === b.district?.toLowerCase()) || db.officers[0];

  const newGrievance = {
    id: grvId,
    complainantName: b.complainantName || 'Anonymous Consumer',
    complainantPhone: b.complainantPhone || 'Confidential',
    merchantName: b.merchantName,
    merchantAddress: b.merchantAddress || `${b.district}, ${b.state}`,
    district: b.district || 'Mumbai Suburban',
    state: b.state || 'Maharashtra',
    instrumentSerialOrDetails: b.instrumentSerialOrDetails || 'Scale at premise',
    complaintType: b.complaintType || 'Short Measure / Underweight',
    description: b.description,
    evidencePhotoUrl: b.evidencePhotoUrl || null,
    submittedAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
    status: 'INSPECTOR_ASSIGNED',
    assignedOfficerId: matchedOfficer.id,
    assignedOfficerName: matchedOfficer.name,
    officerRemarks: 'Grievance assigned automatically. Inspection order initiated.'
  };

  db.grievances.unshift(newGrievance);

  addAuditLog({
    actorRole: 'CITIZEN_PUBLIC',
    actorName: newGrievance.complainantName,
    action: 'CONSUMER_GRIEVANCE_LODGED',
    target: newGrievance.id,
    details: `Filed complaint against ${newGrievance.merchantName} (${newGrievance.complaintType}) in ${newGrievance.district}.`
  });

  res.status(201).json(newGrievance);
});

app.put('/api/grievances/:id', (req, res) => {
  const grvIndex = db.grievances.findIndex(g => g.id === req.params.id);
  if (grvIndex === -1) return res.status(404).json({ error: 'Grievance not found' });

  const updated = { ...db.grievances[grvIndex], ...req.body };
  db.grievances[grvIndex] = updated;

  addAuditLog({
    actorRole: 'LMO_OFFICER',
    actorName: updated.assignedOfficerName || 'LMO Inspector',
    action: 'GRIEVANCE_STATUS_UPDATED',
    target: updated.id,
    details: `Status updated to ${updated.status}. Action: ${updated.officerRemarks || 'Updated'}`
  });

  res.json(updated);
});

// Audit Logs
app.get('/api/audit-logs', (req, res) => res.json(db.auditLogs));

// Fee calculation engine
app.post('/api/calculate-fee', (req, res) => {
  const fee = calculateStatutoryFee(req.body);
  res.json(fee);
});

// MPE tolerance testing engine
app.post('/api/calculate-mpe', (req, res) => {
  const { accuracyClass, verificationInterval_e, testLoad, observedReading, verificationType } = req.body;
  
  if (observedReading !== undefined) {
    const testResult = evaluateLoadTest({
      accuracyClass,
      verificationInterval_e,
      testLoad,
      observedReading,
      verificationType
    });
    return res.json(testResult);
  }

  const mpeInfo = calculateMPE({ accuracyClass, verificationInterval_e, testLoad, verificationType });
  res.json(mpeInfo);
});

// Regulator Dashboard & Cross-Jurisdiction Analytics
app.get('/api/stats/regulator', (req, res) => {
  const totalInstruments = db.instruments.length;
  const verifiedInstruments = db.instruments.filter(i => i.status === 'VERIFIED').length;
  const expiringSoon = db.instruments.filter(i => i.status === 'EXPIRING_SOON').length;
  const expired = db.instruments.filter(i => i.status === 'EXPIRED').length;
  const pending = db.instruments.filter(i => i.status === 'PENDING_INSPECTION').length;

  const totalFeeCollected = db.applications
    .filter(a => a.paymentStatus === 'PAID')
    .reduce((sum, a) => sum + (Number(a.statutoryFee) || 0), 0);

  const complianceRate = Math.round((verifiedInstruments / (totalInstruments || 1)) * 100);

  // Group by State
  const stateBreakdown = db.jurisdictions.map(j => {
    const stateInstruments = db.instruments.filter(i => i.state.toLowerCase() === j.state.toLowerCase());
    const stateVerified = stateInstruments.filter(i => i.status === 'VERIFIED').length;
    const stateDefaulters = stateInstruments.filter(i => i.status === 'EXPIRED').length;
    return {
      state: j.state,
      totalInstruments: stateInstruments.length,
      verified: stateVerified,
      defaulters: stateDefaulters,
      complianceRate: stateInstruments.length > 0 ? Math.round((stateVerified / stateInstruments.length) * 100) : 100
    };
  });

  // Grievances resolution
  const totalGrievances = db.grievances.length;
  const resolvedGrievances = db.grievances.filter(g => g.status === 'RESOLVED').length;

  res.json({
    kpis: {
      totalInstruments,
      verifiedInstruments,
      expiringSoon,
      expired,
      pending,
      complianceRate,
      totalFeeCollected,
      totalGrievances,
      resolvedGrievances,
      activeOfficersCount: db.officers.length,
      gatcCentersCount: db.gatcCenters.length
    },
    stateBreakdown,
    recentCertificates: db.certificates.slice(0, 5),
    recentApplications: db.applications.slice(0, 5),
    recentGrievances: db.grievances.slice(0, 5)
  });
});

app.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(` National Legal Metrology Online Verification System (NLMVS) API `);
  console.log(` Governed by: Legal Metrology Act, 2009 & General Rules, 2011   `);
  console.log(` Server active on: http://localhost:${PORT}                      `);
  console.log(`================================================================`);
});
