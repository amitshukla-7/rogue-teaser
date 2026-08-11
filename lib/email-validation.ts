/**
 * Configuration for email domain restriction.
 * Under NO condition are personal emails (Gmail, Yahoo, Outlook, Hotmail, iCloud, etc.) allowed.
 * Only verified college/institutional email addresses (.ac.in, .edu, .edu.in, mits.ac.in) are permitted.
 */

export function isInstitutionalEmail(email: string): boolean {
  if (!email || !email.includes('@')) return false;

  const parts = email.toLowerCase().trim().split('@');
  if (parts.length !== 2) return false;

  const domain = parts[1];
  if (!domain) return false;

  // Explicitly blocked personal email provider domains
  const blockedDomains = [
    'gmail.com',
    'googlemail.com',
    'yahoo.com',
    'yahoo.co.in',
    'yahoo.co.uk',
    'ymail.com',
    'hotmail.com',
    'outlook.com',
    'live.com',
    'msn.com',
    'icloud.com',
    'me.com',
    'mac.com',
    'aol.com',
    'protonmail.com',
    'proton.me',
    'zoho.com',
    'gmx.com',
    'gmx.net',
    'mail.com',
    'yandex.com',
    'rediffmail.com',
    'inbox.com',
    'fastmail.com'
  ];

  if (blockedDomains.includes(domain)) {
    return false;
  }

  // Must match institutional/academic email patterns:
  // 1. mits.ac.in or subdomains like student.mits.ac.in
  // 2. Any Indian academic domain (.ac.in or .edu.in)
  // 3. Any global educational domain (.edu)
  return (
    domain === 'mits.ac.in' ||
    domain.endsWith('.mits.ac.in') ||
    domain.endsWith('.ac.in') ||
    domain.endsWith('.edu.in') ||
    domain.endsWith('.edu')
  );
}

