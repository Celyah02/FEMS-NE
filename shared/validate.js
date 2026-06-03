/**
 * Tiny dependency-free validation helpers + a request-body validator.
 * Throws ApiError(400) with field-level details on failure.
 */
const { ApiError } = require('./http');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Names: letters with optional separators (space, hyphen, apostrophe) between parts.
const NAME_RE = /^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/;
// Serial/code: allow alnum + hyphen, must start with alnum.
const SERIAL_RE = /^[A-Za-z0-9][A-Za-z0-9-]{0,63}$/;
// hh:mm or hh:mm:ss (24h)
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
// Disallow ASCII control chars in free text.
const NO_CONTROL_CHARS_RE = /^[^\x00-\x08\x0B\x0C\x0E-\x1F]*$/;

const isEmail = (v) => typeof v === 'string' && EMAIL_RE.test(v);
const isNonEmpty = (v) => typeof v === 'string' && v.trim().length > 0;
const isUuid = (v) =>
  typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const isDate = (v) => typeof v === 'string' && !Number.isNaN(Date.parse(v));

/** Password policy: min 8 chars, uppercase, lowercase, number, special, no spaces. */
const isStrongPassword = (v) =>
  typeof v === 'string'
  && v.length >= 8
  && /[a-z]/.test(v)
  && /[A-Z]/.test(v)
  && /\d/.test(v)
  && /[^A-Za-z0-9]/.test(v)
  && !/\s/.test(v);

const isName = (v) => typeof v === 'string' && NAME_RE.test(v);
const isTime = (v) => typeof v === 'string' && TIME_RE.test(v);
const isSerial = (v) => typeof v === 'string' && SERIAL_RE.test(v);
const isSafeText = (v) => typeof v === 'string' && NO_CONTROL_CHARS_RE.test(v);

function asInt(v) {
  if (typeof v === 'number' && Number.isInteger(v)) return v;
  if (typeof v !== 'string') return NaN;
  if (!/^-?\d+$/.test(v.trim())) return NaN;
  return Number.parseInt(v.trim(), 10);
}

function asNumber(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v !== 'string') return NaN;
  const n = Number.parseFloat(v.trim());
  return Number.isFinite(n) ? n : NaN;
}

function asBoolean(v) {
  if (typeof v === 'boolean') return v;
  if (typeof v !== 'string') return null;
  const s = v.trim().toLowerCase();
  if (s === 'true') return true;
  if (s === 'false') return false;
  return null;
}

/**
 * Validate `body` against a schema map: { field: { required, type, enum, custom } }.
 * Returns the cleaned object or throws ApiError(400) with a `details` map.
 */
function validateBody(body, schema) {
  const errors = {};
  const cleaned = {};
  for (const [field, rule] of Object.entries(schema)) {
    const value = body ? body[field] : undefined;
    const present = value !== undefined && value !== null && value !== '';

    if (rule.required && !present) {
      errors[field] = 'is required';
      continue;
    }
    if (!present) continue;

    if (rule.enum && !rule.enum.includes(value)) {
      errors[field] = `must be one of: ${rule.enum.join(', ')}`;
      continue;
    }

    let out = value;
    if (rule.type === 'int') {
      const n = asInt(value);
      if (!Number.isFinite(n)) errors[field] = 'must be a valid integer';
      else out = n;
    } else if (rule.type === 'number') {
      const n = asNumber(value);
      if (!Number.isFinite(n)) errors[field] = 'must be a valid number';
      else out = n;
    } else if (rule.type === 'boolean') {
      const b = asBoolean(value);
      if (b === null) errors[field] = 'must be a boolean';
      else out = b;
    } else if (rule.type === 'email' && !isEmail(value)) errors[field] = 'must be a valid email';
    else if (rule.type === 'date' && !isDate(value)) errors[field] = 'must be a valid date';
    else if (rule.type === 'uuid' && !isUuid(value)) errors[field] = 'must be a valid UUID';
    else if (rule.type === 'name' && !isName(value)) errors[field] = "must contain letters only (spaces / hyphens / apostrophes allowed)";
    else if (rule.type === 'serial' && !isSerial(value)) errors[field] = 'must contain only letters, numbers, and hyphens';
    else if (rule.type === 'time' && !isTime(value)) errors[field] = 'must be a valid time (HH:MM)';
    else if (rule.type === 'password' && !isStrongPassword(value))
      errors[field] = 'must be at least 8 characters and include uppercase, lowercase, a number, and a special character';
    else if (rule.type === 'text' && !isSafeText(value))
      errors[field] = 'contains invalid characters';
    else if (rule.custom && !rule.custom(value)) errors[field] = rule.message || 'is invalid';

    // Length checks (strings only)
    if (!errors[field] && typeof value === 'string') {
      const s = rule.type === 'password' ? value : value.trim();
      if (rule.minLen && s.length < rule.minLen) errors[field] = `must be at least ${rule.minLen} characters`;
      if (rule.maxLen && s.length > rule.maxLen) errors[field] = `must be at most ${rule.maxLen} characters`;
      if (rule.pattern && !rule.pattern.test(s)) errors[field] = rule.message || 'is invalid';
      if (!errors[field]) out = s;
    }

    if (!errors[field]) {
      if (rule.lowercase && typeof out === 'string') out = out.toLowerCase();
      cleaned[field] = out;
    }
  }
  if (Object.keys(errors).length) {
    throw ApiError.badRequest('Validation failed', errors);
  }
  return cleaned;
}

function validateQuery(query, schema) {
  // Query values are always strings; reuse validateBody rules.
  return validateBody(query || {}, schema);
}

module.exports = {
  isEmail,
  isNonEmpty,
  isUuid,
  isDate,
  isStrongPassword,
  validateBody,
  validateQuery,
};
