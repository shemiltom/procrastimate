#!/usr/bin/env node
// Rebuilds the local Procrastimate data. Run it while the application is stopped.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resetDatabase } from '../src/db/reset.js';

const appDir = fileURLToPath(new URL('../', import.meta.url));
const dataDir = process.env.PROCRASTIMATE_DATA_DIR || path.join(appDir, 'data');
const dbPath = process.env.PROCRASTIMATE_DB || path.join(dataDir, 'procrastimate.sqlite');

try {
  const summary = resetDatabase({ dbPath, dataDir });
  console.log('Procrastimate data rebuilt.');
  console.log('  database: ' + dbPath);
  console.log('  records:  ' + summary.users + ' accounts, ' + summary.stock + ' stock items, ' +
    summary.reservations + ' bookings, ' + summary.settlements + ' settlement export');
  console.log('  files:    ' + summary.documents + ' generated documents in ' + dataDir);
  console.log('Start the application with: npm start');
} catch (error) {
  console.error('The data could not be rebuilt: ' + error.message);
  process.exit(1);
}
