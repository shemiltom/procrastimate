import express from 'express';
import { requireAuth, requireCoordinator } from '../middleware/auth.js';
import { requireFormKey } from '../middleware/forms.js';
import { makeAccessCode } from '../services/access-codes.js';
import { writeSettlementCopy } from '../db/documents.js';
import { readId, readText } from '../services/inputs.js';

const TITLE_MAX = 200;
const PAYLOAD_MAX = 8192;
const CODE_MIN = 1;
const CODE_MAX = 64;

export function createSettlementsRouter({ db, dataDir }) {
  const router = express.Router();

  const listForRequesters = db.prepare('SELECT id, title FROM settlements ORDER BY id');
  const listForCoordinators = db.prepare('SELECT id, title, access_code FROM settlements ORDER BY id');
  const createSettlement = db.prepare(
    'INSERT INTO settlements (title, access_code, payload, created_by) VALUES (?, ?, ?, ?)'
  );

  router.get('/settlements', requireAuth, (req, res) => {
    const coordinator = req.user.role === 'coordinator';
    const rows = coordinator ? listForCoordinators.all() : listForRequesters.all();
    return res.render('settlements/index', {
      title: 'Settlements',
      rows,
      coordinator,
      message: null
    });
  });

  router.post('/settlements', requireAuth, requireCoordinator, requireFormKey, (req, res) => {
    const body = req.body || {};
    const title = readText(body.title, TITLE_MAX);
    const payload = readText(body.payload, PAYLOAD_MAX);

    if (!title || !payload) {
      const rows = listForCoordinators.all();
      return res.status(400).render('settlements/index', {
        title: 'Settlements',
        rows,
        coordinator: true,
        message: 'Enter a title and the export contents.'
      });
    }

    const code = makeAccessCode();
    const result = createSettlement.run(title, code, payload, req.user.id);
    writeSettlementCopy(dataDir, result.lastInsertRowid, payload);
    return res.redirect(302, '/settlements');
  });

  router.post('/settlements/retrieve', requireAuth, requireFormKey, (req, res) => {
    const body = req.body || {};
    const id = readId(body.id);
    const code = readText(body.code, CODE_MAX);

    if (id === null || code === null || code.length < CODE_MIN) {
      return res.status(400).type('text').send('Enter an export reference and its access code.');
    }

    const row = db.prepare('SELECT payload FROM settlements WHERE id = ? AND access_code = ?')
      .get(id, req.body.code);
    if (!row) return res.status(403).type('text').send('Export unavailable');
    return res.attachment('settlement-' + id + '.csv').type('text/csv').send(row.payload);
  });

  return router;
}
