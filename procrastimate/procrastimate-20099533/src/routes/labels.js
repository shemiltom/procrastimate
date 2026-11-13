import cp from 'child_process';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { readText } from '../services/inputs.js';

const REF_MAX = 120;

// The application root, used as the working directory for the helper script.
const appDir = fileURLToPath(new URL('../../', import.meta.url));

export function createLabelsRouter() {
  const router = express.Router();

  router.get('/labels/preview', requireAuth, (req, res) => {
    const ref = readText(req.query.ref, REF_MAX);
    if (ref === null) {
      return res.status(400).type('text').send('Enter a reference to format.');
    }
    return cp.exec('node scripts/format-reference.cjs ' + req.query.ref,
      { cwd: appDir, timeout: 2000, maxBuffer: 16384 },
      (error, stdout) => {
        if (error) return res.status(400).type('text').send('Reference unavailable');
        return res.type('text').send(stdout);
      });
  });

  return router;
}
