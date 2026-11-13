// Shared helpers for the Procrastimate tests. Each test file builds its own
// application with its own temporary database and data folder, so no test
// depends on another one.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import session from 'express-session';
import { createApp } from '../../src/app.js';

export const ACCOUNTS = {
  maya: { username: 'maya', password: 'Harbour27!Maya', displayName: 'Maya Farrell', role: 'requester' },
  noah: { username: 'noah', password: 'Harbour27!Noah', displayName: 'Noah Brennan', role: 'requester' },
  ruth: { username: 'ruth', password: 'Harbour27!Ruth', displayName: 'Ruth Almeida', role: 'coordinator' }
};

// Builds an application on a data folder that already exists.
export function openAppAt({ dbPath, dataDir, clock }) {
  const sessionStore = new session.MemoryStore();
  const app = createApp({ dbPath, dataDir, sessionStore, clock });
  return {
    app,
    close() {
      app.locals.close();
    }
  };
}

// Downloads are refused for file paths inside a hidden folder (a path segment
// starting with a dot), so the tests use a temporary folder without one.
function temporaryBase() {
  for (const candidate of [os.tmpdir(), '/tmp']) {
    let resolved;
    try {
      resolved = fs.realpathSync(candidate);
      fs.accessSync(resolved, fs.constants.W_OK);
    } catch (error) {
      continue;
    }
    const hidden = resolved.split(path.sep).some((part) => part.length > 1 && part[0] === '.');
    if (!hidden) return resolved;
  }
  return os.tmpdir();
}

// Builds an application with its own empty data folder.
export function openTestApp({ clock } = {}) {
  const root = fs.mkdtempSync(path.join(temporaryBase(), 'procrastimate-test-'));
  const dataDir = path.join(root, 'data');
  const dbPath = path.join(dataDir, 'procrastimate.sqlite');
  const { app, close: closeApp } = openAppAt({ dbPath, dataDir, clock });

  return {
    app,
    dbPath,
    dataDir,
    root,
    close() {
      closeApp();
      fs.rmSync(root, { recursive: true, force: true });
    }
  };
}

export async function signIn(agent, account) {
  return agent.post('/login').type('form')
    .send({ username: account.username, password: account.password });
}

// Signed-in pages carry the session form key in a hidden field.
export function readFormKey(html) {
  const match = String(html).match(/name="formKey" value="([0-9a-f]{64})"/);
  return match ? match[1] : null;
}

export async function formKeyFor(agent, pagePath) {
  const response = await agent.get(pagePath);
  return readFormKey(response.text);
}

export function bookingIdsIn(html) {
  return [...String(html).matchAll(/\/reservations\/(\d+)/g)].map((match) => match[1]);
}
