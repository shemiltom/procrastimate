#!/usr/bin/env node
// Checks the local setup for Procrastimate. It reads the project and writes only
// inside the data folder.

import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { choosePort, isUsablePort } from '../src/config/local-settings.js';

const appDir = fileURLToPath(new URL('../', import.meta.url));
const dataDir = process.env.PROCRASTIMATE_DATA_DIR || path.join(appDir, 'data');
const { port, source, warning } = choosePort(appDir);
const results = [];

function report(label, ok, detail) {
  results.push(ok);
  console.log((ok ? 'ok   ' : 'FAIL ') + label + (detail ? ' - ' + detail : ''));
}

const [major, minor] = process.versions.node.split('.').map(Number);
const supportedNode = (major === 22 && minor >= 12) || major === 24;
report('Node version', supportedNode,
  'found v' + process.versions.node + ', Procrastimate needs Node 22 (22.12 or later) or Node 24');

try {
  const { default: Database } = await import('better-sqlite3');
  const db = new Database(':memory:');
  db.prepare('SELECT 1 AS value').get();
  db.close();
  report('SQLite library', true, 'better-sqlite3 loaded and ran a query');
} catch (error) {
  report('SQLite library', false, error.message);
}

try {
  fs.mkdirSync(dataDir, { recursive: true });
  const probe = path.join(dataDir, 'doctor-write-check.tmp');
  fs.writeFileSync(probe, 'check');
  fs.rmSync(probe);
  report('Data folder', true, dataDir + ' is writable');
} catch (error) {
  report('Data folder', false, error.message);
}

if (warning) console.log('note ' + warning);
const portFree = !isUsablePort(port) ? false : await new Promise((resolve) => {
  const server = net.createServer();
  server.once('error', (error) => resolve(error.code === 'EADDRINUSE' ? false : true));
  server.once('listening', () => server.close(() => resolve(true)));
  server.listen(port, '127.0.0.1');
});
report('Port ' + port + ' (from ' + source + ')', portFree,
  !isUsablePort(port) ? 'use a whole number from 1024 to 65535'
    : portFree ? 'free to use; open http://127.0.0.1:' + port
      : 'already in use; set another port in .env (PORT=<number>)');

if (results.every(Boolean)) {
  console.log('Everything Procrastimate needs is in place.');
} else {
  console.log('Fix the items marked FAIL, then run this check again.');
  process.exit(1);
}
