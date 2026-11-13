import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_PORT = 9091;

// Reads the optional .env file beside package.json. Only PORT is used. Files
// saved by Windows editors (UTF-16, or UTF-8 with a byte order mark, with CRLF
// line endings) are read as well as plain text.
export function readLocalSettings(appDir) {
  const file = path.join(appDir, '.env');
  if (!fs.existsSync(file)) return { found: false, port: null };

  const bytes = fs.readFileSync(file);
  let text;
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    text = bytes.subarray(2).toString('utf16le');
  } else if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    const body = Buffer.from(bytes.subarray(2, 2 + ((bytes.length - 2) & ~1)));
    text = body.swap16().toString('utf16le');
  } else {
    text = bytes.toString('utf8').replace(/^﻿/, '');
  }

  return { found: true, port: portIn(text) };
}

// The number on a line such as PORT=14321 or PORT="14321", or null.
function portIn(text) {
  for (const line of text.split(/\r?\n/)) {
    const separator = line.indexOf('=');
    if (separator === -1 || line.slice(0, separator).trim() !== 'PORT') continue;
    const value = line.slice(separator + 1).trim().replace(/^["']/, '').replace(/["']$/, '');
    if (/^\d+$/.test(value)) return Number(value);
  }
  return null;
}

// The port to listen on: a PORT environment variable first, then .env, then 9091.
export function choosePort(appDir, env = process.env) {
  if (env.PORT) {
    return { port: Number(env.PORT), source: 'PORT environment variable', warning: null };
  }
  const settings = readLocalSettings(appDir);
  if (settings.port !== null) {
    return { port: settings.port, source: '.env', warning: null };
  }
  return {
    port: DEFAULT_PORT,
    source: 'default',
    warning: settings.found ? 'Found .env but no PORT=<number> line in it, so using port ' + DEFAULT_PORT + '.' : null
  };
}

export function isUsablePort(port) {
  return Number.isInteger(port) && port >= 1024 && port <= 65535;
}
