import crypto from 'crypto';

/**
 * Generate SHA-256 Tamper-Proof Signature Hash for Legal Metrology Verification Certificate
 */
export function generateCertificateHash({ certNumber, serialNumber, stampingDate, officerId, leadSealNo, hologramNo }) {
  const payload = `${certNumber}|${serialNumber}|${stampingDate}|${officerId}|${leadSealNo}|${hologramNo}|GOI_LEGAL_METROLOGY_ACT_2009`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Verify integrity of certificate data against hash
 */
export function verifyCertificateIntegrity({ certNumber, serialNumber, stampingDate, officerId, leadSealNo, hologramNo, expectedHash }) {
  const recalculated = generateCertificateHash({ certNumber, serialNumber, stampingDate, officerId, leadSealNo, hologramNo });
  return recalculated === expectedHash;
}
