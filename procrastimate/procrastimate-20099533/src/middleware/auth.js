import { sendClientError } from './errors.js';

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_FAILURE_LIMIT = 10;

// Reads the signed-in account from the database on every request, so the role
// always comes from the stored record rather than from the session.
export function loadCurrentUser(db) {
  const findUser = db.prepare('SELECT id, username, display_name, role FROM users WHERE id = ?');
  return (req, res, next) => {
    req.user = null;
    if (req.session && req.session.userId) {
      const row = findUser.get(req.session.userId);
      if (row) {
        req.user = {
          id: row.id,
          username: row.username,
          displayName: row.display_name,
          role: row.role
        };
      }
    }
    res.locals.user = req.user;
    res.locals.sessionState = req.user ? 'active' : 'guest';
    next();
  };
}

export function requireAuth(req, res, next) {
  if (req.user) return next();
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Sign in required' });
  }
  return res.redirect(302, '/login');
}

export function requireCoordinator(req, res, next) {
  if (!req.user) return requireAuth(req, res, next);
  if (req.user.role !== 'coordinator') {
    return sendClientError(req, res, 403, 'Coordinator access is required for this action.');
  }
  return next();
}

// The booking page and the cancellation action are both limited to the person
// who made the booking, or to a coordinator.
export function requireOwnerOrCoordinator(db) {
  const findBooking = db.prepare('SELECT id, owner_id FROM reservations WHERE id = ?');
  return (req, res, next) => {
    const booking = findBooking.get(req.params.id);
    if (!booking) {
      return sendClientError(req, res, 404, 'That booking was not found.');
    }
    if (booking.owner_id !== req.user.id && req.user.role !== 'coordinator') {
      return sendClientError(req, res, 403, 'You do not have access to that booking.');
    }
    return next();
  };
}

// Ten failed sign-in attempts for the same account inside fifteen minutes are
// enough; further attempts wait for the window to pass.
export function createLoginLimiter({ clock = () => Date.now() } = {}) {
  const failures = new Map();

  function recentFailures(username) {
    const now = clock();
    const kept = (failures.get(username) || []).filter((time) => now - time < LOGIN_WINDOW_MS);
    if (kept.length === 0) failures.delete(username);
    else failures.set(username, kept);
    return kept;
  }

  return {
    blocked(username) {
      return recentFailures(username).length >= LOGIN_FAILURE_LIMIT;
    },
    retryAfterSeconds(username) {
      const kept = recentFailures(username);
      if (kept.length < LOGIN_FAILURE_LIMIT) return 0;
      return Math.max(1, Math.ceil((kept[0] + LOGIN_WINDOW_MS - clock()) / 1000));
    },
    recordFailure(username) {
      const kept = recentFailures(username);
      kept.push(clock());
      failures.set(username, kept);
    },
    clear(username) {
      failures.delete(username);
    }
  };
}
