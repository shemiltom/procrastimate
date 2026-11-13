import session from 'express-session';

// Session handling for Procrastimate. Sessions live in the process, so stopping the
// application signs everybody out.
export function configureSessions(app, sessionStore) {
  app.use(session({
    name: 'procrastimate.sid',
    secret: 'procrastimate-local-session-key-2026',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: { path: '/', httpOnly: true, sameSite: 'lax', secure: false, maxAge: 3600000 }
  }));
}
