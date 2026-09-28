/**
 * Statutory Verification Fee Calculator per Schedule XII of Legal Metrology (General) Rules, 2011
 */

export function calculateStatutoryFee({ category, capacityKg = 10, accuracyClass = 'Class III', isLate = false, lateDays = 0 }) {
  let baseFee = 200; // in INR
  let description = 'Standard Non-Automatic Weighing Instrument';

  const cap = Number(capacityKg) || 10;

  switch (category) {
    case 'Electronic Weighing Scale (Counter/Tabletop)':
      if (cap <= 10) {
        baseFee = 200;
        description = 'Electronic scale capacity up to 10 kg';
      } else if (cap <= 50) {
        baseFee = 300;
        description = 'Electronic scale capacity 10 kg to 50 kg';
      } else {
        baseFee = 400;
        description = 'Electronic scale capacity above 50 kg';
      }
      break;

    case 'Platform Scale / Heavy Bench Scale':
      if (cap <= 100) {
        baseFee = 400;
        description = 'Platform scale up to 100 kg';
      } else if (cap <= 500) {
        baseFee = 600;
        description = 'Platform scale 100 kg to 500 kg';
      } else {
        baseFee = 1000;
        description = 'Platform scale above 500 kg';
      }
      break;

    case 'Precision Analytical Balance (Jeweler/Lab)':
      if (accuracyClass === 'Class I') {
        baseFee = 1500;
        description = 'Precision Class I Special Accuracy Balance';
      } else {
        baseFee = 1000;
        description = 'Precision Class II High Accuracy Balance';
      }
      break;

    case 'Weighbridge (Lorry/Truck)':
      if (cap <= 50000) {
        baseFee = 3000;
        description = 'Weighbridge capacity up to 50 Tonnes';
      } else {
        baseFee = 5000;
        description = 'Weighbridge capacity above 50 Tonnes';
      }
      break;

    case 'Fuel Dispensing Unit (Petrol/Diesel)':
      baseFee = 1000;
      description = 'Fuel Dispenser Metering Unit (per nozzle)';
      break;

    case 'Flow Meter / Bulk Liquid Measure':
      baseFee = 2500;
      description = 'Bulk flow meter / tanker compartment';
      break;

    default:
      baseFee = 250;
      description = 'General commercial weighing instrument';
      break;
  }

  // Statutory Late Fee: 100% additional surcharge if past expiration date
  let penalty = 0;
  if (isLate || lateDays > 0) {
    penalty = baseFee; // 100% penalty per enforcement provisions
  }

  const userFee = baseFee + penalty;
  const gst = 0; // Statutory government fees under Legal Metrology are exempt from GST under Indian Law

  return {
    category,
    capacityKg: cap,
    accuracyClass,
    baseFee,
    description,
    penalty,
    totalFee: userFee + gst,
    isLatePenaltyApplied: penalty > 0,
    statutoryRuleRef: 'Schedule XII, Legal Metrology (General) Rules, 2011'
  };
}
