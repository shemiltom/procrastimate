import { randomInt } from 'node:crypto';

// Formats a dispatch reference for labels and collection sheets.
export function formatReference(ref) {
  return 'Procrastimate reference: ' + String(ref).trim().toUpperCase();
}

// Money is held in cents; this renders the same amount for the screen.
export function formatCents(cents) {
  return (Number(cents) / 100).toFixed(2) + ' EUR';
}

// A readable booking slot, for example "05/10/2026 to 07/10/2026".
export function formatDates(startDate, endDate) {
  const show = (value) => {
    const parts = String(value).split('-');
    return parts.length === 3 ? parts[2] + '/' + parts[1] + '/' + parts[0] : String(value);
  };
  return show(startDate) + ' to ' + show(endDate);
}
