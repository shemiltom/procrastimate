import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { choosePort, isUsablePort } from '../../src/config/local-settings.js';

function folderWithEnv(bytes) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'procrastimate-settings-'));
  if (bytes !== null) fs.writeFileSync(path.join(dir, '.env'), bytes);
  return dir;
}

test('without a .env file the application uses port 9091', () => {
  const choice = choosePort(folderWithEnv(null), {});
  assert.equal(choice.port, 9091);
  assert.equal(choice.warning, null);
});

test('a .env file sets the port, however the editor saved it', () => {
  const saved = {
    'plain text': Buffer.from('PORT=14321\n'),
    'Windows line endings': Buffer.from('PORT=14321\r\n'),
    'UTF-8 with a byte order mark': Buffer.from('﻿PORT=14321\r\n', 'utf8'),
    'UTF-16 from PowerShell': Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('PORT=14321\r\n', 'utf16le')]),
    'quoted value': Buffer.from('PORT="14321"\n')
  };
  for (const [label, bytes] of Object.entries(saved)) {
    const choice = choosePort(folderWithEnv(bytes), {});
    assert.equal(choice.port, 14321, label);
    assert.equal(choice.source, '.env', label);
  }
});

test('a PORT environment variable overrides .env', () => {
  const choice = choosePort(folderWithEnv(Buffer.from('PORT=14321\n')), { PORT: '9200' });
  assert.equal(choice.port, 9200);
});

test('a .env file without a port falls back to 9091 and says so', () => {
  const choice = choosePort(folderWithEnv(Buffer.from('PORTS 14321\n')), {});
  assert.equal(choice.port, 9091);
  assert.match(choice.warning, /no PORT=<number> line/);
});

test('only ports from 1024 to 65535 are accepted', () => {
  assert.equal(isUsablePort(14321), true);
  assert.equal(isUsablePort(80), false);
  assert.equal(isUsablePort(70000), false);
  assert.equal(isUsablePort(Number('abc')), false);
});
