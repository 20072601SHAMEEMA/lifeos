export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (message, details) => new HttpError(400, message, details);
export const notFound = (message = 'Not found') => new HttpError(404, message);

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isEmail(v) {
  return typeof v === 'string' && EMAIL_RE.test(v.trim());
}

/** Accepts international formats like +91 98765 43210, (555) 123-4567. 7–15 digits. */
export function isPhone(v) {
  if (typeof v !== 'string') return false;
  const s = v.trim();
  if (!/^\+?[0-9\s\-().]+$/.test(s)) return false;
  const digits = s.replace(/\D/g, '');
  return digits.length >= 3 && digits.length <= 15;
}

export function isFullPhone(v) {
  return isPhone(v) && v.replace(/\D/g, '').length >= 7;
}

export function str(v, max = 200) {
  if (v === undefined || v === null) return '';
  return String(v).trim().slice(0, max);
}

export function optStr(v, max = 200) {
  const s = str(v, max);
  return s.length ? s : null;
}

export function num(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function lat(v) {
  const n = num(v);
  return n !== null && n >= -90 && n <= 90 ? n : null;
}

export function lng(v) {
  const n = num(v);
  return n !== null && n >= -180 && n <= 180 ? n : null;
}

export function isoDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
