import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { readText } from '../services/inputs.js';

const NAME_MAX = 200;

export function createPackingRouter() {
  const router = express.Router();

  router.get('/packing/preview', requireAuth, (req, res) => {
    const name = readText(req.query.name, NAME_MAX);
    if (name === null) {
      return res.status(400).type('text').send('Enter a name for the packing preview.');
    }
    return res.type('html').send('<h1>Hello ' + req.query.name + '</h1>');
  });

  return router;
}
