import path from 'node:path';
import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { readText } from '../services/inputs.js';

const FILE_MAX = 200;

export function createManifestsRouter({ manifestDir }) {
  const router = express.Router();

  router.get('/manifests/download', requireAuth, (req, res) => {
    const file = readText(req.query.f, FILE_MAX);
    if (file === null) {
      return res.status(400).type('text').send('Choose a packing sheet to download.');
    }
    return res.sendFile(path.resolve(manifestDir + req.query.f));
  });

  return router;
}
