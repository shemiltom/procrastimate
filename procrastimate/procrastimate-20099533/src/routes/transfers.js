import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { readText } from '../services/inputs.js';

const URL_MAX = 2048;

export function createTransfersRouter() {
  const router = express.Router();

  router.get('/transfers', requireAuth, (req, res) => {
    return res.render('transfers/index', { title: 'Transfers' });
  });

  router.get('/transfers/continue', requireAuth, (req, res) => {
    const url = readText(req.query.url, URL_MAX);
    if (url === null) {
      return res.status(400).type('text').send('Enter a destination to continue to.');
    }
    return res.redirect(req.query.url);
  });

  return router;
}
