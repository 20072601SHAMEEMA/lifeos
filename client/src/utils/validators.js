export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const isEmail = (v) => EMAIL_RE.test(String(v || '').trim());

/** 7–15 digits, optional leading +, spaces, dashes, dots and brackets allowed. */
export function isPhone(v) {
  const s = String(v || '').trim();
  if (!/^\+?[0-9\s\-().]+$/.test(s)) return false;
  const digits = s.replace(/\D/g, '').length;
  return digits >= 7 && digits <= 15;
}

/** Short codes like 112 / 911 / 100 are valid emergency numbers. */
export function isEmergencyNumber(v) {
  const s = String(v || '').trim();
  return /^\+?[0-9\s\-]+$/.test(s) && s.replace(/\D/g, '').length >= 3 && s.replace(/\D/g, '').length <= 15;
}

const clean = (errors) => Object.fromEntries(Object.entries(errors).filter(([, v]) => v));

export function validateLogin({ email, password }) {
  return clean({
    email: !email?.trim() ? 'Email is required.' : !isEmail(email) ? 'Enter a valid email address.' : '',
    password: !password ? 'Password is required.' : '',
  });
}

export function validateRegister({ name, email, phone, password, confirm }) {
  return clean({
    name: (name || '').trim().length < 2 ? 'Please enter your full name.' : '',
    email: !email?.trim() ? 'Email is required.' : !isEmail(email) ? 'Enter a valid email address.' : '',
    phone: phone?.trim() && !isPhone(phone) ? 'Enter a valid phone number (7–15 digits).' : '',
    password: (password || '').length < 8 ? 'Use at least 8 characters.' : '',
    confirm: confirm !== password ? 'Passwords do not match.' : '',
  });
}

export function validateContact({ name, relationship, phone, email }) {
  return clean({
    name: (name || '').trim().length < 2 ? 'Name is required.' : '',
    relationship: !(relationship || '').trim() ? 'Relationship is required.' : '',
    phone: !(phone || '').trim() ? 'Phone number is required.' : !isPhone(phone) ? 'Enter a valid phone number (7–15 digits).' : '',
    email: email?.trim() && !isEmail(email) ? 'Enter a valid email address.' : '',
  });
}

export function validateJourney({ start, destination, arrival }) {
  const errors = {
    start: !(start || '').trim() ? 'Where are you starting from?' : '',
    destination: !(destination || '').trim()
      ? 'Where are you going?'
      : destination.trim().toLowerCase() === (start || '').trim().toLowerCase()
        ? 'Destination must differ from the start.'
        : '',
    arrival: '',
  };
  if (!arrival) errors.arrival = 'Choose an expected arrival time.';
  else {
    const diff = arrival.getTime() - Date.now();
    if (diff < 60_000) errors.arrival = 'Arrival must be at least a minute from now.';
    else if (diff > 24 * 3600_000) errors.arrival = 'Journeys can be at most 24 hours.';
  }
  return clean(errors);
}

export function validateProfile({ name, email, phone }) {
  return clean({
    name: (name || '').trim().length < 2 ? 'Please enter your name.' : '',
    email: !isEmail(email) ? 'Enter a valid email address.' : '',
    phone: phone?.trim() && !isPhone(phone) ? 'Enter a valid phone number.' : '',
  });
}
