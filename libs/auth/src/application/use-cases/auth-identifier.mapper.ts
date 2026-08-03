export function normalizeEmail(email?: string): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized || null;
}

export function normalizePhone(phone?: string): string | null {
  const normalized = phone?.trim().replace(/[\s.-]/g, '');
  if (!normalized) return null;
  if (/^\+84\d{9}$/.test(normalized)) return `0${normalized.slice(3)}`;
  if (/^84\d{9}$/.test(normalized)) return `0${normalized.slice(2)}`;
  return normalized;
}

export function normalizePhoneE164(phone?: string): string | null {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  if (/^0\d{9}$/.test(normalized)) return `+84${normalized.slice(1)}`;
  if (/^\+84\d{9}$/.test(normalized)) return normalized;
  return null;
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function toLoginIdentifier(username: string): {
  email: string | null;
  phone: string | null;
} {
  const identifier = username.trim();
  return isEmail(identifier)
    ? { email: normalizeEmail(identifier), phone: null }
    : { email: null, phone: normalizePhone(identifier) };
}
