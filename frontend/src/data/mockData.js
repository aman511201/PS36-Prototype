/**
 * Mock Seed Data for Legal Metrology Online Verification System (SIH PS 26036)
 */

export const jurisdictions = [
  { state: 'Maharashtra', districts: ['Mumbai Suburban', 'Mumbai City', 'Pune', 'Nagpur', 'Nashik', 'Thane'] },
  { state: 'Karnataka', districts: ['Bengaluru Urban', 'Bengaluru Rural', 'Mysuru', 'Hubballi-Dharwad', 'Mangaluru'] },
  { state: 'Delhi', districts: ['Central Delhi', 'South Delhi', 'New Delhi', 'North Delhi', 'West Delhi'] },
  { state: 'Gujarat', districts: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar'] },
  { state: 'Uttar Pradesh', districts: ['Lucknow', 'Kanpur Nagar', 'Varanasi', 'Noida (Gautam Buddha Nagar)', 'Agra'] },
  { state: 'Tamil Nadu', districts: ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem'] }
];

export const regulators = [
  {
    id: 'reg-01',
    name: 'Dr. Suresh Chandra (Directorate Super Admin)',
    designation: 'Controller General of Legal Metrology',
    identifier: 'GOI-ADM-001',
    email: 'suresh.chandra@legalmetrology.gov.in',
    department: 'Department of Consumer Affairs, New Delhi',
    role: 'regulator',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
  }
];

export const officers = [
  {
    id: 'lmo-01',
    name: 'Shri Rajesh K. Sharma',
    designation: 'Senior Legal Metrology Officer (Class-I)',
    badgeNumber: 'LMO-MH-042',
    jurisdictionDistrict: 'Mumbai Suburban',
    jurisdictionState: 'Maharashtra',
    email: 'rajesh.sharma@legalmetrology.gov.in',
    phone: '+91 98201 44552',
    activeInspectionsToday: 4,
    completedTotal: 342,
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'lmo-02',
    name: 'Dr. Ananya Sundaram',
    designation: 'Legal Metrology Officer (Precision & Bullion)',
    badgeNumber: 'LMO-KA-118',
    jurisdictionDistrict: 'Bengaluru Urban',
    jurisdictionState: 'Karnataka',
    email: 'ananya.sundaram@legalmetrology.gov.in',
    phone: '+91 94481 22334',
    activeInspectionsToday: 2,
    completedTotal: 289,
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'lmo-03',
    name: 'Shri Vikram Singh Verma',
    designation: 'Assistant Controller of Legal Metrology',
    badgeNumber: 'LMO-DL-027',
    jurisdictionDistrict: 'South Delhi',
    jurisdictionState: 'Delhi',
    email: 'vikram.verma@legalmetrology.gov.in',
    phone: '+91 98110 99887',
    activeInspectionsToday: 5,
    completedTotal: 512,
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'lmo-04',
    name: 'Smt. Meena Patel',
    designation: 'Legal Metrology Inspector (Industrial & Weighbridges)',
    badgeNumber: 'LMO-GJ-085',
    jurisdictionDistrict: 'Ahmedabad',
    jurisdictionState: 'Gujarat',
    email: 'meena.patel@legalmetrology.gov.in',
    phone: '+91 98250 11223',
    activeInspectionsToday: 3,
    completedTotal: 198,
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80'
  }
];

export const gatcCenters = [
  {
    id: 'gatc-01',
    name: 'Apex Metrology & Heavy Calibration Lab (GATC-MH-01)',
    recognitionNumber: 'GOI-GATC-W-2021-009',
    accreditedScopes: ['Weighbridges up to 100T', 'Bulk Flow Meters', 'Storage Tanks'],
    city: 'Navi Mumbai',
    state: 'Maharashtra',
    inCharge: 'Er. Sandeep Deshmukh',
    phone: '+91 22 2789 4411',
    standardWeightsAvailableTonnes: 60,
    validUntil: '2027-12-31'
  },
  {
    id: 'gatc-02',
    name: 'National Precision Testing & Flow Facility (GATC-DL-04)',
    recognitionNumber: 'GOI-GATC-F-2023-018',
    accreditedScopes: ['Fuel Dispensers', 'LPG Metering Units', 'High Precision Balances'],
    city: 'Okhla, New Delhi',
    state: 'Delhi',
    inCharge: 'Dr. R. K. Bhattacharya',
    phone: '+91 11 2681 9022',
    standardWeightsAvailableTonnes: 20,
    validUntil: '2028-05-15'
  }
];

export const merchants = [
  {
    id: 'm-01',
    tradeName: 'Om Sai Supermarket & Provision Stores',
    ownerName: 'Sunil Ramesh Gupta',
    gstin: '27AABCO1234F1Z8',
    licenseNumber: 'LM-EST-MH-2018-9921',
    businessType: 'Retail Grocery & FMCG',
    address: 'Shop 4-6, Silver Arch Complex, Linking Road, Bandra West',
    district: 'Mumbai Suburban',
    state: 'Maharashtra',
    pincode: '400050',
    contactPhone: '+91 98200 12345',
    contactEmail: 'contact@omsaimart.com',
    instrumentsCount: 4
  },
  {
    id: 'm-02',
    tradeName: 'Kalyan Jewellers & Bullion Works',
    ownerName: 'Venkatesh Rao',
    gstin: '29AAACK5521M1Z4',
    licenseNumber: 'LM-EST-KA-2019-3318',
    businessType: 'Gold, Silver & Diamond Jewelry',
    address: '42, Commercial Street, Tasker Town',
    district: 'Bengaluru Urban',
    state: 'Karnataka',
    pincode: '560001',
    contactPhone: '+91 94480 67890',
    contactEmail: 'bengaluru.store@kalyanjewels.in',
    instrumentsCount: 3
  },
  {
    id: 'm-03',
    tradeName: 'Bharat Petroleum Highway Outpost (BPCL)',
    ownerName: 'Alok Nath Trivedi (Dealer In-charge)',
    gstin: '07AABCB2201L1Z9',
    licenseNumber: 'LM-EST-DL-2015-7744',
    businessType: 'Petroleum Retail Outlet',
    address: 'Plot 12, Ring Road, Lajpat Nagar-IV',
    district: 'South Delhi',
    state: 'Delhi',
    pincode: '110024',
    contactPhone: '+91 98112 34567',
    contactEmail: 'dealer.lajpat@bpclretail.in',
    instrumentsCount: 6
  },
  {
    id: 'm-04',
    tradeName: 'Shree Ganesh Agro Weighbridge & Logistics',
    ownerName: 'Bhavesh Chhaganlal Patel',
    gstin: '24AAGCS9982H1Z1',
    licenseNumber: 'LM-EST-GJ-2020-5509',
    businessType: 'Public Commercial Weighbridge',
    address: 'Survey No. 89, Sarkhej-Bawla Highway, Sanand',
    district: 'Ahmedabad',
    state: 'Gujarat',
    pincode: '382110',
    contactPhone: '+91 98251 77665',
    contactEmail: 'ganesh.weighbridge@gmail.com',
    instrumentsCount: 2
  }
];

export const initialInstruments = [
  {
    id: 'inst-001',
    merchantId: 'm-01',
    merchantName: 'Om Sai Supermarket & Provision Stores',
    category: 'Electronic Weighing Scale (Counter/Tabletop)',
    brand: 'Essae-Teraoka',
    model: 'DS-252 Electronic Counter Scale',
    serialNumber: 'ES-2023-99841',
    modelApprovalNumber: 'IND/09/2021/412',
    accuracyClass: 'Class III',
    maxCapacityKg: 30,
    minCapacityGrams: 100,
    verificationInterval_e: 5, // 5 grams
    verificationPeriodMonths: 12,
    status: 'VERIFIED', // VERIFIED, EXPIRING_SOON, EXPIRED, PENDING_INSPECTION
    lastVerificationDate: '2025-10-15',
    validUntilDate: '2026-10-14',
    certificateNumber: 'MH/LM/2025/08492',
    officerId: 'lmo-01',
    officerName: 'Shri Rajesh K. Sharma',
    leadSealNo: 'MH-LMO42-LS-8921',
    hologramNo: 'HOL-GOI-2025-783921',
    district: 'Mumbai Suburban',
    state: 'Maharashtra',
    locationAddress: 'Billing Counter #1, Om Sai Supermarket, Bandra West, Mumbai',
    geoLocation: { lat: 19.0596, lng: 72.8295 }
  },
  {
    id: 'inst-002',
    merchantId: 'm-01',
    merchantName: 'Om Sai Supermarket & Provision Stores',
    category: 'Electronic Weighing Scale (Counter/Tabletop)',
    brand: 'Avery Weigh-Tronix',
    model: 'Berkel FX-120 Retail Scale',
    serialNumber: 'AV-2022-44109',
    modelApprovalNumber: 'IND/09/2020/219',
    accuracyClass: 'Class III',
    maxCapacityKg: 15,
    minCapacityGrams: 40,
    verificationInterval_e: 2, // 2 grams
    verificationPeriodMonths: 12,
    status: 'EXPIRING_SOON', // Due in 19 days
    lastVerificationDate: '2025-10-14',
    validUntilDate: '2026-10-13',
    certificateNumber: 'MH/LM/2025/08493',
    officerId: 'lmo-01',
    officerName: 'Shri Rajesh K. Sharma',
    leadSealNo: 'MH-LMO42-LS-8922',
    hologramNo: 'HOL-GOI-2025-783922',
    district: 'Mumbai Suburban',
    state: 'Maharashtra',
    locationAddress: 'Vegetable & Fruit Section, Om Sai Supermarket, Bandra West',
    geoLocation: { lat: 19.0597, lng: 72.8296 }
  },
  {
    id: 'inst-003',
    merchantId: 'm-01',
    merchantName: 'Om Sai Supermarket & Provision Stores',
    category: 'Platform Scale / Heavy Bench Scale',
    brand: 'Phoenix',
    model: 'HeavyDuty-300 Platform',
    serialNumber: 'PHX-2021-12009',
    modelApprovalNumber: 'IND/09/2019/180',
    accuracyClass: 'Class III',
    maxCapacityKg: 300,
    minCapacityGrams: 1000,
    verificationInterval_e: 50, // 50 grams
    verificationPeriodMonths: 12,
    status: 'EXPIRED', // Expired on 2026-08-30!
    lastVerificationDate: '2025-08-30',
    validUntilDate: '2026-08-29',
    certificateNumber: 'MH/LM/2025/06311',
    officerId: 'lmo-01',
    officerName: 'Shri Rajesh K. Sharma',
    leadSealNo: 'MH-LMO42-LS-6110',
    hologramNo: 'HOL-GOI-2025-551902',
    district: 'Mumbai Suburban',
    state: 'Maharashtra',
    locationAddress: 'Warehouse Bulk Goods Receiving Bay, Bandra West',
    geoLocation: { lat: 19.0599, lng: 72.8298 }
  },
  {
    id: 'inst-004',
    merchantId: 'm-02',
    merchantName: 'Kalyan Jewellers & Bullion Works',
    category: 'Precision Analytical Balance (Jeweler/Lab)',
    brand: 'Mettler Toledo',
    model: 'ME204T Analytical Precision Balance',
    serialNumber: 'MT-2024-88310',
    modelApprovalNumber: 'IND/09/2023/008',
    accuracyClass: 'Class I',
    maxCapacityKg: 0.22, // 220 grams
    minCapacityGrams: 0.01,
    verificationInterval_e: 0.001, // 1 mg (0.001g)
    verificationPeriodMonths: 12,
    status: 'VERIFIED',
    lastVerificationDate: '2026-02-10',
    validUntilDate: '2027-02-09',
    certificateNumber: 'KA/LM/2026/01290',
    officerId: 'lmo-02',
    officerName: 'Dr. Ananya Sundaram',
    leadSealNo: 'KA-LMO118-LS-3391',
    hologramNo: 'HOL-GOI-2026-118944',
    district: 'Bengaluru Urban',
    state: 'Karnataka',
    locationAddress: 'High-Value Diamond & Gold Appraisal Counter, Commercial Street',
    geoLocation: { lat: 12.9822, lng: 77.6083 }
  },
  {
    id: 'inst-005',
    merchantId: 'm-02',
    merchantName: 'Kalyan Jewellers & Bullion Works',
    category: 'Precision Analytical Balance (Jeweler/Lab)',
    brand: 'Sartorius',
    model: 'Entris II Precision Balance',
    serialNumber: 'SAR-2023-55912',
    modelApprovalNumber: 'IND/09/2022/604',
    accuracyClass: 'Class II',
    maxCapacityKg: 6.2, // 6200 grams
    minCapacityGrams: 0.5,
    verificationInterval_e: 0.01, // 0.01g
    verificationPeriodMonths: 12,
    status: 'VERIFIED',
    lastVerificationDate: '2026-01-20',
    validUntilDate: '2027-01-19',
    certificateNumber: 'KA/LM/2026/00914',
    officerId: 'lmo-02',
    officerName: 'Dr. Ananya Sundaram',
    leadSealNo: 'KA-LMO118-LS-3112',
    hologramNo: 'HOL-GOI-2026-117822',
    district: 'Bengaluru Urban',
    state: 'Karnataka',
    locationAddress: 'Silver Article & Bullion Weighing Counter, Commercial Street',
    geoLocation: { lat: 12.9824, lng: 77.6085 }
  },
  {
    id: 'inst-006',
    merchantId: 'm-03',
    merchantName: 'Bharat Petroleum Highway Outpost (BPCL)',
    category: 'Fuel Dispensing Unit (Petrol/Diesel)',
    brand: 'Tokheim / Gilbarco Veeder-Root',
    model: 'Frontier MPD High-Flow Dispenser Dual Nozzle',
    serialNumber: 'GVR-2023-09418',
    modelApprovalNumber: 'IND/09/2021/788',
    accuracyClass: 'Class III', // liquid metering unit
    maxCapacityKg: 50, // 50 Litres/min delivery
    minCapacityGrams: 2000, // 2 Litres minimum delivery
    verificationInterval_e: 10, // 10 ml
    verificationPeriodMonths: 12,
    status: 'VERIFIED',
    lastVerificationDate: '2026-05-18',
    validUntilDate: '2027-05-17',
    certificateNumber: 'DL/LM/2026/04419',
    officerId: 'lmo-03',
    officerName: 'Shri Vikram Singh Verma',
    leadSealNo: 'DL-LMO27-LS-9912',
    hologramNo: 'HOL-GOI-2026-902341',
    district: 'South Delhi',
    state: 'Delhi',
    locationAddress: 'Dispensing Island #2 (Motor Spirit / Petrol), Ring Road Outpost',
    geoLocation: { lat: 28.5677, lng: 77.2433 }
  },
  {
    id: 'inst-007',
    merchantId: 'm-04',
    merchantName: 'Shree Ganesh Agro Weighbridge & Logistics',
    category: 'Weighbridge (Lorry/Truck)',
    brand: 'Essae Heavy Systems',
    model: 'Pitless Electronic Lorry Weighbridge 60T',
    serialNumber: 'ESH-2022-00412',
    modelApprovalNumber: 'IND/09/2020/541',
    accuracyClass: 'Class III',
    maxCapacityKg: 60000, // 60 Tonnes
    minCapacityGrams: 200000, // 200 kg
    verificationInterval_e: 10000, // 10 kg
    verificationPeriodMonths: 12,
    status: 'VERIFIED',
    lastVerificationDate: '2025-11-04',
    validUntilDate: '2026-11-03',
    certificateNumber: 'GJ/LM/2025/11094',
    officerId: 'lmo-04',
    officerName: 'Smt. Meena Patel',
    leadSealNo: 'GJ-LMO85-LS-7741',
    hologramNo: 'HOL-GOI-2025-449102',
    district: 'Ahmedabad',
    state: 'Gujarat',
    locationAddress: 'Sanand Industrial Corridor Entry Gate, Ahmedabad',
    geoLocation: { lat: 22.9868, lng: 72.3789 }
  }
];

export const initialApplications = [
  {
    id: 'APP-2026-0901',
    instrumentId: 'inst-002',
    merchantId: 'm-01',
    merchantName: 'Om Sai Supermarket & Provision Stores',
    applicationType: 'Periodic Renewal Verification',
    instrumentCategory: 'Electronic Weighing Scale (Counter/Tabletop)',
    brand: 'Avery Weigh-Tronix',
    model: 'Berkel FX-120 Retail Scale',
    serialNumber: 'AV-2022-44109',
    accuracyClass: 'Class III',
    maxCapacityKg: 15,
    verificationInterval_e: 2,
    district: 'Mumbai Suburban',
    state: 'Maharashtra',
    submissionDate: '2026-09-22',
    preferredInspectionDate: '2026-09-28',
    status: 'UNDER_REVIEW', // SUBMITTED, UNDER_REVIEW, INSPECTION_SCHEDULED, VERIFIED_STAMPED, REJECTED
    statutoryFee: 300,
    paymentStatus: 'PAID',
    paymentTransactionRef: 'BHARATKOSH-TXN-20260922-8812',
    assignedOfficerId: 'lmo-01',
    assignedOfficerName: 'Shri Rajesh K. Sharma',
    notes: 'Renewal application submitted well before expiry.'
  },
  {
    id: 'APP-2026-0899',
    instrumentId: 'inst-003',
    merchantId: 'm-01',
    merchantName: 'Om Sai Supermarket & Provision Stores',
    applicationType: 'Overdue Periodic Verification (Post Expiry)',
    instrumentCategory: 'Platform Scale / Heavy Bench Scale',
    brand: 'Phoenix',
    model: 'HeavyDuty-300 Platform',
    serialNumber: 'PHX-2021-12009',
    accuracyClass: 'Class III',
    maxCapacityKg: 300,
    verificationInterval_e: 50,
    district: 'Mumbai Suburban',
    state: 'Maharashtra',
    submissionDate: '2026-09-23',
    preferredInspectionDate: '2026-09-26',
    status: 'INSPECTION_SCHEDULED',
    statutoryFee: 600, // Includes 100% late fee surcharge
    paymentStatus: 'PAID',
    paymentTransactionRef: 'UPI-REF-993821004812',
    assignedOfficerId: 'lmo-01',
    assignedOfficerName: 'Shri Rajesh K. Sharma',
    scheduledDateTime: '2026-09-26 11:30 AM',
    notes: 'Late fee surcharge applied. Priority inspection booked.'
  },
  {
    id: 'APP-2026-0850',
    instrumentId: 'inst-001',
    merchantId: 'm-01',
    merchantName: 'Om Sai Supermarket & Provision Stores',
    applicationType: 'Periodic Renewal Verification',
    instrumentCategory: 'Electronic Weighing Scale (Counter/Tabletop)',
    brand: 'Essae-Teraoka',
    model: 'DS-252 Electronic Counter Scale',
    serialNumber: 'ES-2023-99841',
    accuracyClass: 'Class III',
    maxCapacityKg: 30,
    verificationInterval_e: 5,
    district: 'Mumbai Suburban',
    state: 'Maharashtra',
    submissionDate: '2026-09-15',
    preferredInspectionDate: '2026-09-18',
    status: 'REJECTED',
    statutoryFee: 300,
    paymentStatus: 'PAID',
    paymentTransactionRef: 'BHARATKOSH-TXN-20260915-1102',
    assignedOfficerId: 'lmo-01',
    assignedOfficerName: 'Shri Rajesh K. Sharma',
    scheduledDateTime: '2026-09-18 10:30 AM',
    notes: 'Rejected during on-site inspection. Repeatability variance exceeded statutory tolerance limits.',
    reVerificationEligible: true,
    failedParameters: [
      {
        parameter: 'Repeatability (Δm across 3 cycles at 15kg load)',
        observedValue: '0.450 g error difference',
        statutoryLimit: '±0.150 g (Statutory MPE under Rule 24)',
        reason: 'Maximum difference between consecutive weighings exceeded statutory tolerance limit (Rule 24, Legal Metrology Rules 2011).',
        evidence: 'Observed readings: [15.000 kg, 15.004 kg, 15.000 kg] - Δm = 4.0g > permissible limit.'
      },
      {
        parameter: 'Visual Inspection: Spirit Level Bubble Centering',
        observedValue: 'Off-center leveling foot mechanism',
        statutoryLimit: 'Centered spirit level bubble (Rule 24)',
        reason: 'Leveling feet damaged, scale rocking under load.',
        evidence: 'Inspected on-site by LMO Shri Rajesh K. Sharma.'
      }
    ],
    timeline: [
      {
        id: 'evt-0850-1',
        status: 'SUBMITTED',
        title: 'Application Submitted',
        timestamp: '2026-09-15 09:30',
        actor: 'Om Sai Supermarket & Provision Stores',
        actorRole: 'MERCHANT',
        description: 'Periodic verification application filed for DS-252 (S/N: ES-2023-99841).'
      },
      {
        id: 'evt-0850-2',
        status: 'PAYMENT_CONFIRMED',
        title: 'Statutory Fee Confirmed',
        timestamp: '2026-09-15 09:35',
        actor: 'BharatKosh / Statutory Treasury',
        actorRole: 'SYSTEM',
        description: 'Statutory verification fee of ₹300 confirmed (Ref: BHARATKOSH-TXN-20260915-1102).'
      },
      {
        id: 'evt-0850-3',
        status: 'OFFICER_ASSIGNED',
        title: 'Legal Metrology Officer Assigned',
        timestamp: '2026-09-15 11:00',
        actor: 'Shri Rajesh K. Sharma',
        actorRole: 'INSPECTOR',
        description: 'Assigned to Shri Rajesh K. Sharma for Mumbai Suburban jurisdiction.'
      },
      {
        id: 'evt-0850-4',
        status: 'INSPECTION_SCHEDULED',
        title: 'Inspection Appointment Scheduled',
        timestamp: '2026-09-15 14:00',
        actor: 'Shri Rajesh K. Sharma',
        actorRole: 'INSPECTOR',
        description: 'On-site verification scheduled for 2026-09-18 10:30 AM.'
      },
      {
        id: 'evt-0850-5',
        status: 'VERIFICATION_FAILED',
        title: 'On-Site Verification Non-Compliant',
        timestamp: '2026-09-18 11:15',
        actor: 'Shri Rajesh K. Sharma',
        actorRole: 'INSPECTOR',
        description: 'Verification failed. Repeatability variance exceeded MPE tolerance. Rectification notice issued under Section 24.'
      }
    ]
  },
  {
    id: 'APP-2026-0905',
    instrumentId: null, // New instrument registration & initial verification
    merchantId: 'm-02',
    merchantName: 'Kalyan Jewellers & Bullion Works',
    applicationType: 'Initial Verification of New Instrument',
    instrumentCategory: 'Precision Analytical Balance (Jeweler/Lab)',
    brand: 'Shimadzu',
    model: 'AP225W Analytical Balance',
    serialNumber: 'SHM-2026-00319',
    accuracyClass: 'Class I',
    maxCapacityKg: 0.22,
    verificationInterval_e: 0.0001,
    district: 'Bengaluru Urban',
    state: 'Karnataka',
    submissionDate: '2026-09-24',
    preferredInspectionDate: '2026-09-29',
    status: 'SUBMITTED',
    statutoryFee: 1500,
    paymentStatus: 'PAID',
    paymentTransactionRef: 'NETBANK-HDFC-994821',
    assignedOfficerId: 'lmo-02',
    assignedOfficerName: 'Dr. Ananya Sundaram',
    notes: 'New jeweler balance imported with central model approval certificate IND/09/2025/904.'
  }
];

export const initialCertificates = [
  {
    certificateNumber: 'MH/LM/2025/08492',
    scheduleForm: 'Schedule VIII / Form B (Rule 24)',
    instrumentId: 'inst-001',
    serialNumber: 'ES-2023-99841',
    instrumentCategory: 'Electronic Weighing Scale (Counter/Tabletop)',
    brand: 'Essae-Teraoka',
    model: 'DS-252 Electronic Counter Scale',
    modelApprovalNumber: 'IND/09/2021/412',
    accuracyClass: 'Class III (Medium Accuracy)',
    maxCapacityKg: 30,
    minCapacityGrams: 100,
    verificationInterval_e: 5,
    stampingDate: '2025-10-15',
    validUntilDate: '2026-10-14',
    validityPeriod: '12 Months (1 Year)',
    merchantName: 'Om Sai Supermarket & Provision Stores',
    gstin: '27AABCO1234F1Z8',
    ownerName: 'Sunil Ramesh Gupta',
    premiseAddress: 'Shop 4-6, Silver Arch Complex, Linking Road, Bandra West, Mumbai 400050',
    district: 'Mumbai Suburban',
    state: 'Maharashtra',
    officerId: 'lmo-01',
    officerName: 'Shri Rajesh K. Sharma',
    officerDesignation: 'Senior Legal Metrology Officer (Class-I)',
    leadSealNo: 'MH-LMO42-LS-8921',
    hologramNo: 'HOL-GOI-2025-783921',
    statutoryFeePaid: 300,
    feeReceiptNumber: 'MH-TR-2025-09941',
    cryptographicHash: 'a7b89d4f2c1e88390bbf4892c90e54117823abce1287410948acb6791240df5b',
    inspectionObservations: {
      visualInspection: 'Passed (No mechanical defect, leveling bubble centered)',
      repeatabilityTest: 'Passed (Zero variation over 3 cycles of 15kg load)',
      eccentricityTest: 'Passed (Corners test within ±2.5g)',
      maxPermissibleErrorObserved: '0.8g (Permissible ±5.0g)',
      overallVerdict: 'STAMPED & VERIFIED'
    }
  },
  {
    certificateNumber: 'KA/LM/2026/01290',
    scheduleForm: 'Schedule VIII / Form B (Rule 24)',
    instrumentId: 'inst-004',
    serialNumber: 'MT-2024-88310',
    instrumentCategory: 'Precision Analytical Balance (Jeweler/Lab)',
    brand: 'Mettler Toledo',
    model: 'ME204T Analytical Precision Balance',
    modelApprovalNumber: 'IND/09/2023/008',
    accuracyClass: 'Class I (Special Precision)',
    maxCapacityKg: 0.22,
    minCapacityGrams: 0.01,
    verificationInterval_e: 0.001,
    stampingDate: '2026-02-10',
    validUntilDate: '2027-02-09',
    validityPeriod: '12 Months (1 Year)',
    merchantName: 'Kalyan Jewellers & Bullion Works',
    gstin: '29AAACK5521M1Z4',
    ownerName: 'Venkatesh Rao',
    premiseAddress: '42, Commercial Street, Tasker Town, Bengaluru 560001',
    district: 'Bengaluru Urban',
    state: 'Karnataka',
    officerId: 'lmo-02',
    officerName: 'Dr. Ananya Sundaram',
    officerDesignation: 'Legal Metrology Officer (Precision & Bullion)',
    leadSealNo: 'KA-LMO118-LS-3391',
    hologramNo: 'HOL-GOI-2026-118944',
    statutoryFeePaid: 1500,
    feeReceiptNumber: 'KA-TR-2026-03118',
    cryptographicHash: 'fe48a91c7849e0b1d39281aef982c7304b7719283f66a9b4009218dbe7491290',
    inspectionObservations: {
      visualInspection: 'Passed (Draft shield intact, calibrated standard masses used)',
      repeatabilityTest: 'Passed (Difference < 0.5mg at 200g)',
      eccentricityTest: 'Passed (Corner loading error < 0.8mg)',
      maxPermissibleErrorObserved: '0.4mg (Permissible ±1.0mg)',
      overallVerdict: 'STAMPED & VERIFIED'
    }
  },
  {
    certificateNumber: 'DL/LM/2026/04419',
    scheduleForm: 'Schedule VIII / Form B (Rule 24)',
    instrumentId: 'inst-006',
    serialNumber: 'GVR-2023-09418',
    instrumentCategory: 'Fuel Dispensing Unit (Petrol/Diesel)',
    brand: 'Tokheim / Gilbarco Veeder-Root',
    model: 'Frontier MPD High-Flow Dispenser Dual Nozzle',
    modelApprovalNumber: 'IND/09/2021/788',
    accuracyClass: 'Class III (Liquid Metering Unit)',
    maxCapacityKg: 50,
    minCapacityGrams: 2000,
    verificationInterval_e: 10,
    stampingDate: '2026-05-18',
    validUntilDate: '2027-05-17',
    validityPeriod: '12 Months (1 Year)',
    merchantName: 'Bharat Petroleum Highway Outpost (BPCL)',
    gstin: '07AABCB2201L1Z9',
    ownerName: 'Alok Nath Trivedi',
    premiseAddress: 'Plot 12, Ring Road, Lajpat Nagar-IV, South Delhi 110024',
    district: 'South Delhi',
    state: 'Delhi',
    officerId: 'lmo-03',
    officerName: 'Shri Vikram Singh Verma',
    officerDesignation: 'Assistant Controller of Legal Metrology',
    leadSealNo: 'DL-LMO27-LS-9912',
    hologramNo: 'HOL-GOI-2026-902341',
    statutoryFeePaid: 2000,
    feeReceiptNumber: 'DL-TR-2026-04419',
    cryptographicHash: '98d1a4e5f7823901bca764839210e74921603598acdb441928014872910fae12',
    inspectionObservations: {
      visualInspection: 'Passed (Pulsar seal intact, totalizer verified)',
      repeatabilityTest: 'Passed (5L conical measure: error +3ml, 20L measure: error +12ml)',
      eccentricityTest: 'N/A (Liquid meter)',
      maxPermissibleErrorObserved: '+12ml (Permissible ±25ml on 20L check)',
      overallVerdict: 'STAMPED & VERIFIED'
    }
  }
];

export const initialGrievances = [
  {
    id: 'GRV-2026-0312',
    complainantName: 'Rohan Deshpande',
    complainantPhone: '+91 98330 11982',
    merchantName: 'Om Sai Supermarket & Provision Stores',
    merchantAddress: 'Linking Road, Bandra West, Mumbai',
    district: 'Mumbai Suburban',
    state: 'Maharashtra',
    instrumentSerialOrDetails: 'PHX-2021-12009 (Platform Scale)',
    complaintType: 'Expired Verification Stamp / Overdue Scale in Use',
    description: 'The platform scale used for weighing rice and atta sacks has a verification stamp that expired in August 2026. The shopkeeper refused to weigh on the digital counter scale when asked.',
    evidencePhotoUrl: 'https://images.unsplash.com/photo-1584483766114-2cea6facdf57?w=500&auto=format&fit=crop&q=80',
    submittedAt: '2026-09-24 14:15',
    status: 'INSPECTOR_ASSIGNED', // SUBMITTED, INSPECTOR_ASSIGNED, INVESTIGATED, PENALTY_ISSUED, RESOLVED
    assignedOfficerId: 'lmo-01',
    assignedOfficerName: 'Shri Rajesh K. Sharma',
    officerRemarks: 'Notice under Section 24 of Legal Metrology Act 2009 prepared. Spot inspection scheduled.'
  },
  {
    id: 'GRV-2026-0298',
    complainantName: 'Priya Narayanan',
    complainantPhone: '+91 94490 88210',
    merchantName: 'City Center Vegetable Bazaar',
    merchantAddress: 'Russell Market, Shivajinagar, Bengaluru',
    district: 'Bengaluru Urban',
    state: 'Karnataka',
    instrumentSerialOrDetails: 'Unbranded mechanical dial scale',
    complaintType: 'Short Measure / Tampered Weights',
    description: 'Bought 2 kg apples, weighed at home on certified scale was only 1.78 kg. Vendor scale dial pointer was offset +200g at rest.',
    evidencePhotoUrl: null,
    submittedAt: '2026-09-20 18:30',
    status: 'RESOLVED',
    assignedOfficerId: 'lmo-02',
    assignedOfficerName: 'Dr. Ananya Sundaram',
    officerRemarks: 'Surprise raid conducted on 2026-09-21. Non-standard unverified scale seized under Section 15. Compound fee of ₹5,000 levied on vendor.'
  }
];

export const initialAuditLogs = [
  {
    id: 'aud-001',
    timestamp: '2026-09-25 02:40:12',
    actorRole: 'LMO_OFFICER',
    actorName: 'Shri Rajesh K. Sharma (LMO-MH-042)',
    action: 'INSPECTION_COMPLETED_AND_CERTIFIED',
    target: 'Instrument ES-2023-99841',
    details: 'MPE test passed at 5kg, 15kg, 30kg. Lead seal MH-LMO42-LS-8921 affixed. Certificate MH/LM/2025/08492 digitally signed.',
    ipAddress: '10.14.88.22',
    signatureHash: 'a7b89d4f2c1e88390bbf4892c90e54117823abce1287410948acb6791240df5b'
  },
  {
    id: 'aud-002',
    timestamp: '2026-09-24 16:10:05',
    actorRole: 'MERCHANT',
    actorName: 'Om Sai Supermarket & Provision Stores',
    action: 'VERIFICATION_APPLICATION_SUBMITTED',
    target: 'Application APP-2026-0901',
    details: 'Periodic renewal submitted for Berkel FX-120. Statutory fee of ₹300 paid via BharatKosh.',
    ipAddress: '152.57.19.102',
    signatureHash: 'e10adc3949ba59abbe56e057f20f883e'
  },
  {
    id: 'aud-003',
    timestamp: '2026-09-24 14:15:30',
    actorRole: 'CITIZEN_PUBLIC',
    actorName: 'Rohan Deshpande',
    action: 'CONSUMER_GRIEVANCE_LODGED',
    target: 'Grievance GRV-2026-0312',
    details: 'Short weight & expired stamp reported on platform scale at Bandra West.',
    ipAddress: '49.37.112.44',
    signatureHash: 'c4ca4238a0b923820dcc509a6f75849b'
  },
  {
    id: 'aud-004',
    timestamp: '2026-09-23 11:20:19',
    actorRole: 'REGULATOR_SUPERADMIN',
    actorName: 'Directorate of Legal Metrology (HQ)',
    action: 'CROSS_JURISDICTION_AUDIT_QUERY',
    target: 'District Mumbai Suburban & South Delhi',
    details: 'Inter-district compliance review executed. Flagged 12 overdue fuel dispensing units and 8 weighbridges.',
    ipAddress: '10.0.1.5',
    signatureHash: 'eccbc87e4b5ce2fe28308fd9f2a7baf3'
  }
];
