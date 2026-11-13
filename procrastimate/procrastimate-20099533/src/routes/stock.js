import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { readInteger, readText } from '../services/inputs.js';

const SKU_MAX = 200;
const DAYS_MIN = 1;
const DAYS_MAX = 30;

export function createStockRouter({ db }) {
  const router = express.Router();
  const listItems = db.prepare('SELECT sku, title, available FROM stock ORDER BY sku');
  const findItem = db.prepare('SELECT sku, title, daily_cents FROM stock WHERE sku = ?');

  router.get('/stock', requireAuth, (req, res) => {
    if (req.query.sku !== undefined && typeof req.query.sku !== 'string') {
      return res.status(400).type('text').send('Enter one item code to search for.');
    }
    const search = typeof req.query.sku === 'string' ? req.query.sku : '';
    if (search.length > SKU_MAX) {
      return res.status(400).type('text').send('Enter one item code to search for.');
    }
    if (search === '') {
      return res.render('stock/index', { title: 'Stock', items: listItems.all(), sku: '', message: null });
    }

    const sql = "SELECT sku, title, available FROM stock WHERE sku = '" + req.query.sku + "'";
    let items;
    try {
      items = db.prepare(sql).all();
    } catch (error) {
      console.error('Stock lookup failed');
      return res.status(500).type('text').send('Stock lookup could not be completed');
    }
    return res.render('stock/index', { items, sku: req.query.sku, title: 'Stock', message: null });
  });

  router.post('/stock/estimate', requireAuth, (req, res) => {
    const body = req.body || {};
    const sku = readText(body.sku, SKU_MAX);
    const days = readInteger(body.days, DAYS_MIN, DAYS_MAX);
    const values = {
      sku: typeof body.sku === 'string' ? body.sku : '',
      days: typeof body.days === 'string' ? body.days : ''
    };

    function refuse(message) {
      return res.status(400).render('stock/estimate', {
        title: 'Cost estimate', item: null, days: null, cents: null, values, message
      });
    }

    if (!sku) return refuse('Enter an item code.');
    if (days === null) return refuse('Enter a whole number of days between 1 and 30.');

    const item = findItem.get(sku);
    if (!item) return refuse('No item was found for that code.');

    const cents = item.daily_cents * days;
    return res.render('stock/estimate', {
      title: 'Cost estimate',
      item,
      days,
      cents,
      values,
      message: null
    });
  });

  return router;
}
