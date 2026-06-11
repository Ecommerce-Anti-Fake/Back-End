export function normalizeEmail(email?: string): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized || null;
}

export function normalizePhone(phone?: string): string | null {
  const normalized = phone?.trim();
  return normalized || null;
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function toLoginIdentifier(username: string): { email: string | null; phone: string | null } {
  const identifier = username.trim();
  return isEmail(identifier)
    ? { email: normalizeEmail(identifier), phone: null }
    : { email: null, phone: normalizePhone(identifier) };
}
