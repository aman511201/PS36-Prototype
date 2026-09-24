/**
 * Legal Metrology (General) Rules, 2011 - Maximum Permissible Error (MPE) Calculation Engine
 * Reference: Schedule VI & Table 2 & 3 for Non-Automatic Weighing Instruments
 */

export function calculateMPE({ accuracyClass = 'Class III', verificationInterval_e = 5, testLoad = 5000, verificationType = 'periodic' }) {
  // e in grams
  const e = Number(verificationInterval_e) || 1;
  const load = Number(testLoad) || 0;
  const n = load / e; // number of verification scale intervals
  
  let mpeInE = 1.0;

  if (accuracyClass === 'Class I') {
    // Special Accuracy
    if (n <= 50000) mpeInE = 0.5;
    else if (n <= 200000) mpeInE = 1.0;
    else mpeInE = 1.5;
  } else if (accuracyClass === 'Class II') {
    // High Accuracy
    if (n <= 5000) mpeInE = 0.5;
    else if (n <= 20000) mpeInE = 1.0;
    else mpeInE = 1.5;
  } else if (accuracyClass === 'Class III') {
    // Medium Accuracy (Grocery, Platform scales, Weighbridges)
    if (n <= 500) mpeInE = 0.5;
    else if (n <= 2000) mpeInE = 1.0;
    else mpeInE = 1.5;
  } else {
    // Class IIII (Ordinary Accuracy)
    if (n <= 50) mpeInE = 0.5;
    else if (n <= 200) mpeInE = 1.0;
    else mpeInE = 1.5;
  }

  // Under Legal Metrology General Rules, MPE on service/periodic verification is equal to 2x initial verification MPE (or as specified in Table 2)
  const multiplier = verificationType === 'initial' ? 1.0 : 2.0;
  const permissibleErrorGrams = mpeInE * e * multiplier;

  return {
    verificationInterval_e: e,
    testLoadGrams: load,
    scaleIntervalCount_n: n,
    permissibleErrorUnits: mpeInE * multiplier,
    maxPermissibleErrorGrams: permissibleErrorGrams,
    permissibleRange: {
      min: load - permissibleErrorGrams,
      max: load + permissibleErrorGrams
    }
  };
}

export function evaluateLoadTest({ accuracyClass, verificationInterval_e, testLoad, observedReading, verificationType = 'periodic' }) {
  const mpeInfo = calculateMPE({ accuracyClass, verificationInterval_e, testLoad, verificationType });
  const error = Number(observedReading) - Number(testLoad);
  const absError = Math.abs(error);
  const passed = absError <= mpeInfo.maxPermissibleErrorGrams;

  return {
    testLoad,
    observedReading,
    error,
    absError,
    maxPermissibleErrorGrams: mpeInfo.maxPermissibleErrorGrams,
    passed,
    statusText: passed 
      ? `Within Tolerance (±${mpeInfo.maxPermissibleErrorGrams}g)` 
      : `Exceeds Tolerance by ${(absError - mpeInfo.maxPermissibleErrorGrams).toFixed(2)}g`
  };
}
