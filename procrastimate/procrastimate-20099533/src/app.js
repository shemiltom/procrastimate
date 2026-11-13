import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { configureSessions } from './config/session.js';
import { openDatabase } from './db/connection.js';
import { loadCurrentUser } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import { ensureFormKey } from './middleware/forms.js';
import { formatCents, formatDates, formatReference } from './services/references.js';
import { createAuthRouter } from './routes/auth.js';
import { createGuidesRouter } from './routes/guides.js';
import { createHomeRouter } from './routes/home.js';
import { createLabelsRouter } from './routes/labels.js';
import { createManifestsRouter } from './routes/manifests.js';
import { createPackingRouter } from './routes/packing.js';
import { createReservationsRouter } from './routes/reservations.js';
import { createServiceRouter } from './routes/service.js';
import { createSettlementsRouter } from './routes/settlements.js';
import { createStockRouter } from './routes/stock.js';
import { createTransfersRouter } from './routes/transfers.js';

const appDir = fileURLToPath(new URL('../', import.meta.url));

// Builds the Procrastimate application. It never starts a listener: src/server.js
// does that. Tests pass their own database, data folder, session store and
// clock, so two applications never share state.
export function createApp({ dbPath, dataDir, sessionStore, clock = () => Date.now() } = {}) {
  if (!dbPath || !dataDir || !sessionStore) {
    throw new Error('createApp needs a database path, a data folder and a session store.');
  }

  const db = openDatabase({ dbPath, dataDir });
  const manifestDir = path.resolve(dataDir, 'manifests') + path.sep;
  const guideDir = path.resolve(dataDir, 'guides') + path.sep;

  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', path.join(appDir, 'views'));
  app.locals.appName = 'Procrastimate';
  app.locals.formatCents = formatCents;
  app.locals.formatDates = formatDates;
  app.locals.formatReference = formatReference;

  app.use(express.static(path.join(appDir, 'public')));
  app.use(express.urlencoded({ extended: false, limit: '16kb' }));
  app.use(express.json({ limit: '16kb' }));
  app.use((req, res, next) => {
    res.locals.title = 'Procrastimate';
    res.set('Cache-Control', 'no-store');
    next();
  });

  configureSessions(app, sessionStore);
  app.use(loadCurrentUser(db));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) return next();
    return ensureFormKey(req, res, next);
  });

  app.use(createHomeRouter({ db }));
  app.use(createAuthRouter({ db, clock }));
  app.use(createStockRouter({ db }));
  app.use(createReservationsRouter({ db }));
  app.use(createPackingRouter());
  app.use(createLabelsRouter());
  app.use(createManifestsRouter({ manifestDir }));
  app.use(createGuidesRouter({ guideDir }));
  app.use(createTransfersRouter());
  app.use(createSettlementsRouter({ db, dataDir }));
  app.use(createServiceRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  let closed = false;
  app.locals.close = () => {
    if (closed) return;
    closed = true;
    if (typeof sessionStore.close === 'function') sessionStore.close();
    db.close();
  };

  return app;
}
