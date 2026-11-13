import { randomInt } from 'node:crypto';

// The access code a coordinator shares with the people who need an export.
export function makeAccessCode() {
  return randomInt(0, 10000).toString().padStart(4, '0');
}
