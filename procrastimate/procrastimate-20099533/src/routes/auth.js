import express from 'express';
import { hashPassword, verifyPassword } from '../auth/passwords.js';
import { createLoginLimiter, requireAuth } from '../middleware/auth.js';
import { checkSignInOrigin, requireFormKey } from '../middleware/forms.js';
import { readText } from '../services/inputs.js';

const USERNAME_MAX = 200;
const PASSWORD_MAX = 200;

// A hash is verified even when the account does not exist, so both kinds of
// failure take the same work.
const placeholderHash = hashPassword('procrastimate-placeholder');

export function createAuthRouter({ db, clock }) {
  const router = express.Router();
  const limiter = createLoginLimiter({ clock });

  const findAccount = db.prepare('SELECT id, password_hash FROM users WHERE username = ?');

  router.get('/login', (req, res) => {
    if (req.user) return res.redirect(302, '/dashboard');
    return res.render('auth/login', {
      title: 'Sign in',
      message: null,
      username: ''
    });
  });

  router.post('/login', checkSignInOrigin, (req, res) => {
    const username = readText(req.body ? req.body.username : undefined, USERNAME_MAX);
    const password = readText(req.body ? req.body.password : undefined, PASSWORD_MAX);

    if (!username || !password) {
      return res.status(400).render('auth/login', {
        title: 'Sign in',
        message: 'Enter your username and password.',
        username: username || ''
      });
    }

    if (limiter.blocked(username)) {
      const seconds = limiter.retryAfterSeconds(username);
      const minutes = Math.ceil(seconds / 60);
      res.set('Retry-After', String(seconds));
      return res.status(429).render('auth/login', {
        title: 'Sign in',
        message: 'Too many sign-in attempts for this account. Try again in ' +
          minutes + ' minute' + (minutes === 1 ? '' : 's') + '.',
        username
      });
    }

    const account = findAccount.get(username);
    const passwordMatches = account
      ? verifyPassword(password, account.password_hash)
      : verifyPassword(password, placeholderHash);

    if (!account || !passwordMatches) {
      limiter.recordFailure(username);
      return res.status(200).render('auth/login', {
        title: 'Sign in',
        message: 'Your username or password is incorrect.',
        username
      });
    }

    limiter.clear(username);
    const userId = account.id;

    return req.session.regenerate((error) => {
      if (error) {
        return res.status(500).render('errors/500', { title: 'Something went wrong' });
      }
      req.session.userId = userId;
      return req.session.save(() => res.redirect(302, '/dashboard'));
    });
  });

  router.post('/logout', requireAuth, requireFormKey, (req, res) => {
    const storing = req.session;
    return storing.destroy(() => res.redirect(302, '/login'));
  });

  return router;
}
