import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { fileChecksum } from '../services/checksums.js';
import { escapeHtml } from '../services/html.js';
import { readText } from '../services/inputs.js';

const GUIDE_NAMES = ['collection.txt', 'returns.txt'];
const GUIDE_LABELS = {
  'collection.txt': 'Collection guide',
  'returns.txt': 'Return guide'
};

export function createGuidesRouter({ guideDir }) {
  const router = express.Router();

  router.get('/guides', requireAuth, (req, res) => {
    const guides = GUIDE_NAMES.map((name) => {
      const bytes = fs.readFileSync(path.join(guideDir, name));
      return {
        name,
        label: GUIDE_LABELS[name],
        size: bytes.length,
        checksum: fileChecksum(bytes)
      };
    });
    return res.render('guides/index', { title: 'Guides', guides });
  });

  router.get('/guides/download', requireAuth, (req, res) => {
    const allowed = new Set(['collection.txt', 'returns.txt']);
    if (typeof req.query.f !== 'string' || !allowed.has(req.query.f)) {
      return res.status(400).send('Unknown guide');
    }
    return res.sendFile(guideDir + req.query.f);
  });

  router.get('/guides/collection-note', requireAuth, (req, res) => {
    const name = readText(req.query.name, 200);
    if (name === null) {
      return res.status(400).type('text').send('Enter a name for the collection note.');
    }
    return res.type('html').send('<h1>Collection note for ' + escapeHtml(req.query.name) +
      '</h1><p>Bring your booking reference and check the collection guide at the store cupboard.</p>');
  });

  return router;
}
