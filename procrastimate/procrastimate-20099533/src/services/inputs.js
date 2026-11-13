// Small checks shared by the form handlers. Each helper returns a clean value,
// or null when the value cannot be used.
//
// Values arrive from forms and query strings, so every helper rejects lists,
// objects and values that are longer than the field allows.

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const INTEGER_PATTERN = /^\d+$/;

export function readText(value, maxLength) {
  if (typeof value !== 'string') return null;
  if (value.length === 0 || value.length > maxLength) return null;
  return value;
}

export function readOptionalText(value, maxLength) {
  if (value === undefined || value === '') return '';
  return readText(value, maxLength);
}

export function readInteger(value, minimum, maximum) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value);
  if (!INTEGER_PATTERN.test(text)) return null;
  const number = Number(text);
  if (!Number.isSafeInteger(number)) return null;
  if (number < minimum || number > maximum) return null;
  return number;
}

export function readId(value) {
  return readInteger(value, 1, Number.MAX_SAFE_INTEGER);
}

// Calendar dates are written as YYYY-MM-DD.
export function readDate(value) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return null;
  const moment = new Date(value + 'T00:00:00Z');
  if (Number.isNaN(moment.getTime())) return null;
  if (moment.toISOString().slice(0, 10) !== value) return null;
  return value;
}
