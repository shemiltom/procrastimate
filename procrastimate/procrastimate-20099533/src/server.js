import path from 'node:path';
import { fileURLToPath } from 'node:url';
import session from 'express-session';
import { createApp } from './app.js';
import { choosePort, isUsablePort } from './config/local-settings.js';

const appDir = fileURLToPath(new URL('../', import.meta.url));
const dataDir = process.env.PROCRASTIMATE_DATA_DIR || path.join(appDir, 'data');
const dbPath = process.env.PROCRASTIMATE_DB || path.join(dataDir, 'procrastimate.sqlite');
const { port, warning } = choosePort(appDir);
const host = '127.0.0.1';

if (warning) console.warn(warning);
if (!isUsablePort(port)) {
  console.error('The port must be a whole number from 1024 to 65535. Check PORT in .env.');
  process.exit(1);
}

let app;
try {
  app = createApp({
    dbPath,
    dataDir,
    sessionStore: new session.MemoryStore(),
    clock: () => Date.now()
  });
} catch (error) {
  console.error('Procrastimate could not open its data:', error.message);
  process.exit(1);
}

const server = app.listen(port, host, () => {
  console.log('Procrastimate is running at http://' + host + ':' + port);
  console.log('Press Ctrl and C together to stop it.');
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error('Port ' + port + ' is already in use. Stop the other program, or set ' +
      'another port in .env (PORT=<number>).');
  } else {
    console.error('Procrastimate could not start:', error.message);
  }
  process.exit(1);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => {
      app.locals.close();
      process.exit(0);
    });
  });
}
