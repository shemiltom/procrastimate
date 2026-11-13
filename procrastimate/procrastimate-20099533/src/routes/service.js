import cp from 'child_process';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { exampleInvoice } from '../data/billing-example.js';

// The application root, used as the working directory for the version command.
const appDir = fileURLToPath(new URL('../../', import.meta.url));

export function createServiceRouter() {
  const router = express.Router();

  router.get('/service', requireAuth, (req, res) => {
    return cp.exec('node --version', { cwd: appDir, timeout: 2000, maxBuffer: 1024 }, (error, stdout) => {
      const version = error ? null : String(stdout).trim();
      return res.render('service/index', {
        title: 'Service information',
        version,
        invoice: exampleInvoice
      });
    });
  });

  return router;
}
