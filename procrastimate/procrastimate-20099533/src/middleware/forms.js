import { randomBytes, timingSafeEqual } from 'node:crypto';

const FORM_KEY_BYTES = 32;
const FORM_KEY_PATTERN = /^[0-9a-f]{64}$/;

// Every session gets one form key, created the first time a signed-in page is
// displayed. Forms that change data carry it in a hidden field.
export function ensureFormKey(req, res, next) {
  if (req.session && req.session.userId) {
    if (typeof req.session.formKey !== 'string' || !FORM_KEY_PATTERN.test(req.session.formKey)) {
      req.session.formKey = randomBytes(FORM_KEY_BYTES).toString('hex');
    }
    res.locals.formKey = req.session.formKey;
  }
  next();
}

function rejectForm(req, res) {
  return res.status(403).type('text')
    .send('The form check failed. Reload the page and send the form again.');
}

export function requireFormKey(req, res, next) {
  const supplied = req.body ? req.body.formKey : undefined;
  const expected = req.session ? req.session.formKey : undefined;
  if (typeof supplied !== 'string' || typeof expected !== 'string') return rejectForm(req, res);
  if (!FORM_KEY_PATTERN.test(supplied) || !FORM_KEY_PATTERN.test(expected)) return rejectForm(req, res);
  const suppliedBytes = Buffer.from(supplied, 'hex');
  const expectedBytes = Buffer.from(expected, 'hex');
  if (!timingSafeEqual(suppliedBytes, expectedBytes)) return rejectForm(req, res);
  return next();
}

// A browser sending a sign-in form from another site includes an Origin or
// Referer header that does not match this application. Clients that send
// neither header are accepted.
export function checkSignInOrigin(req, res, next) {
  const source = req.get('origin') || req.get('referer');
  if (!source) return next();

  let sourceHost;
  try {
    sourceHost = new URL(source).host;
  } catch (error) {
    sourceHost = null;
  }
  if (!sourceHost || sourceHost !== req.get('host')) {
    return res.status(403).type('text').send('The sign-in request was refused.');
  }
  return next();
}
