/**
 * Calculate the expiry date based on starting date and membership type.
 */
export const calculateExpiryDate = (startDateStr, type) => {
  if (!startDateStr) return null;
  const start = new Date(startDateStr);
  if (isNaN(start.getTime())) return null;

  const expiry = new Date(start);
  if (type === 'monthly') {
    expiry.setMonth(expiry.getMonth() + 1);
  } else if (type === 'quarterly') {
    expiry.setMonth(expiry.getMonth() + 3);
  } else if (type === 'annual') {
    expiry.setFullYear(expiry.getFullYear() + 1);
  }
  return expiry;
};

/**
 * Format date string to Italian standard: DD/MM/YYYY
 */
export const formatDate = (dateInput) => {
  if (!dateInput) return '-';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '-';
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Format date string to HTML Input standard: YYYY-MM-DD
 */
export const formatDateForInput = (dateInput) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${year}-${month}-${day}`;
};

/**
 * Check if a given date is strictly in the past
 */
export const isExpired = (dateInput) => {
  if (!dateInput) return false;
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  return compareDate < today;
};

/**
 * Check if a date falls within the next 7 days (including today)
 */
export const isExpiringSoon = (dateInput) => {
  if (!dateInput) return false;
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  return compareDate >= today && compareDate <= sevenDaysFromNow;
};

/**
 * Aggregates client status information based on the active membership
 * (returned by the API as `client.active_membership`) and the medical certificate.
 *
 * Membership can be:
 *  - null               -> no active membership (treated as not active)
 *  - type 'time'        -> expired when today is past `end_date`
 *  - type 'count'       -> expired when `remaining_checkins` reaches 0
 */
export const getClientStatusFlags = (client) => {
  const m = client.active_membership || null;

  let expiryDate = null;
  let remainingCheckins = null;
  let isMembershipExpired;
  let isMembershipExpiringSoon;

  if (!m) {
    isMembershipExpired = true;
    isMembershipExpiringSoon = false;
  } else if (m.type === 'time') {
    expiryDate = m.end_date ? new Date(m.end_date) : null;
    isMembershipExpired = m.status === 'expired' || isExpired(expiryDate);
    isMembershipExpiringSoon = !isMembershipExpired && isExpiringSoon(expiryDate);
  } else {
    // count plan
    remainingCheckins = m.remaining_checkins;
    isMembershipExpired = m.status === 'expired' || remainingCheckins <= 0;
    // "in scadenza" per i carnet: 2 o meno ingressi residui
    isMembershipExpiringSoon = !isMembershipExpired && remainingCheckins <= 2;
  }

  const isCertificateExpired = isExpired(client.medical_certificate_expiry);
  const isCertificateExpiringSoon = !isCertificateExpired && isExpiringSoon(client.medical_certificate_expiry);

  return {
    membership: m,
    expiryDate,
    remainingCheckins,
    isMembershipExpired,
    isMembershipExpiringSoon,
    isCertificateExpired,
    isCertificateExpiringSoon
  };
};
