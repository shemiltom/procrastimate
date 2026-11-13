import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SALT_BYTES = 16;
const KEY_BYTES = 64;
const MARKER = 'scrypt';

// Passwords are stored as scrypt$salt$key, with a new random salt each time.
export function hashPassword(password) {
  const salt = randomBytes(SALT_BYTES);
  const key = scryptSync(password, salt, KEY_BYTES);
  return [MARKER, salt.toString('hex'), key.toString('hex')].join('$');
}

export function verifyPassword(password, stored) {
  if (typeof password !== 'string' || typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== MARKER) return false;
  const salt = Buffer.from(parts[1], 'hex');
  const expected = Buffer.from(parts[2], 'hex');
  if (salt.length !== SALT_BYTES || expected.length !== KEY_BYTES) return false;
  const actual = scryptSync(password, salt, KEY_BYTES);
  return timingSafeEqual(actual, expected);
}
