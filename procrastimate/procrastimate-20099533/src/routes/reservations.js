import express from 'express';
import { requireAuth, requireOwnerOrCoordinator } from '../middleware/auth.js';
import { sendClientError } from '../middleware/errors.js';
import { requireFormKey } from '../middleware/forms.js';
import { readDate, readId, readText } from '../services/inputs.js';

const SKU_MAX = 200;
const NOTE_MAX = 500;

// The store keeps one packing sheet per collection group. Bookings recorded in
// the second group use the second sheet; later bookings use the first sheet.
const SHEET_BY_BOOKING = { 201: 'manifest-201.txt', 202: 'manifest-201.txt' };
const DEFAULT_SHEET = 'manifest-101.txt';

export function packingSheetFor(id) {
  return SHEET_BY_BOOKING[id] || DEFAULT_SHEET;
}

// Booking references are whole numbers. Anything else is not a booking.
function requireBookingId(req, res, next) {
  if (readId(req.params.id) === null) {
    return sendClientError(req, res, 400, 'That booking reference is not valid.');
  }
  return next();
}

export function createReservationsRouter({ db }) {
  const router = express.Router();

  const bookingColumns =
    'SELECT r.id, r.owner_id, r.sku, r.start_date, r.end_date, r.status, r.delivery_note, ' +
    's.title, u.display_name FROM reservations r ' +
    'JOIN stock s ON s.sku = r.sku JOIN users u ON u.id = r.owner_id ';

  const ownBookings = db.prepare(bookingColumns + 'WHERE r.owner_id = ? ORDER BY r.start_date, r.id');
  const allBookings = db.prepare(bookingColumns + 'ORDER BY r.start_date, r.id');
  const findBooking = db.prepare(
    'SELECT r.id, r.owner_id, r.sku, r.start_date, r.end_date, r.status, r.delivery_note, ' +
    's.title, u.display_name FROM reservations r JOIN stock s ON s.sku = r.sku ' +
    'JOIN users u ON u.id = r.owner_id WHERE r.id = ?'
  );
  const findItem = db.prepare('SELECT sku FROM stock WHERE sku = ?');
  const availableItems = db.prepare('SELECT sku, title FROM stock ORDER BY sku');
  const createBooking = db.prepare(
    'INSERT INTO reservations (owner_id, sku, start_date, end_date, status, delivery_note) ' +
    "VALUES (?, ?, ?, ?, 'booked', ?)"
  );

  router.get('/reservations', requireAuth, (req, res) => {
    const coordinator = req.user.role === 'coordinator';
    const bookings = coordinator ? allBookings.all() : ownBookings.all(req.user.id);
    return res.render('reservations/index', { title: 'Reservations', bookings, coordinator });
  });

  router.get('/reservations/new', requireAuth, (req, res) => {
    return res.render('reservations/new', {
      title: 'New booking',
      items: availableItems.all(),
      values: { sku: '', startDate: '', endDate: '', deliveryNote: '' },
      message: null
    });
  });

  router.get('/reservations/return', requireAuth, (req, res) => {
    const url = readText(req.query.url, 2048);
    if (url === null) {
      return res.status(400).type('text').send('Choose a page to return to.');
    }
    if (!new Set(['/stock', '/reservations']).has(req.query.url)) {
      return res.status(400).send('Unknown destination');
    }
    return res.redirect(req.query.url);
  });

  router.post('/reservations', requireAuth, requireFormKey, (req, res) => {
    const body = req.body || {};
    const values = {
      sku: typeof body.sku === 'string' ? body.sku : '',
      startDate: typeof body.startDate === 'string' ? body.startDate : '',
      endDate: typeof body.endDate === 'string' ? body.endDate : '',
      deliveryNote: typeof body.deliveryNote === 'string' ? body.deliveryNote : ''
    };
    const sku = readText(body.sku, SKU_MAX);
    const startDate = readDate(body.startDate);
    const endDate = readDate(body.endDate);
    const deliveryNote = readText(body.deliveryNote, NOTE_MAX);

    function refuse(message) {
      return res.status(400).render('reservations/new', {
        title: 'New booking', items: availableItems.all(), values, message
      });
    }

    if (!sku) return refuse('Choose an item to book.');
    if (!startDate || !endDate) return refuse('Enter both dates as YYYY-MM-DD.');
    if (endDate < startDate) return refuse('The end date cannot be before the start date.');
    if (!deliveryNote) return refuse('Add a short delivery note.');
    if (!findItem.get(sku)) return refuse('No item was found for that code.');

    const result = createBooking.run(req.user.id, sku, startDate, endDate, deliveryNote);
    return res.redirect(302, '/reservations/' + result.lastInsertRowid);
  });

  router.get('/reservations/:id', requireAuth, requireBookingId, requireOwnerOrCoordinator(db),
    (req, res) => {
      const booking = findBooking.get(req.params.id);
      if (!booking) return sendClientError(req, res, 404, 'That booking was not found.');
      return res.render('reservations/show', {
        title: 'Booking ' + booking.id,
        booking,
        sheet: packingSheetFor(booking.id)
      });
    });

  router.post('/reservations/:id/cancel', requireAuth, requireBookingId, requireOwnerOrCoordinator(db),
    (req, res) => {
      db.prepare("UPDATE reservations SET status = 'cancelled' WHERE id = ?").run(req.params.id);
      return res.redirect('/reservations/' + req.params.id);
    });

  router.get('/api/reservations/:id', requireAuth, (req, res) => {
    if (readId(req.params.id) === null) return res.status(400).json({ error: 'Not found' });
    const row = db.prepare('SELECT id, owner_id, sku, start_date, end_date, status, delivery_note FROM reservations WHERE id = ?')
      .get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    return res.json({ id: row.id, ownerId: row.owner_id, sku: row.sku,
      startDate: row.start_date, endDate: row.end_date, status: row.status,
      deliveryNote: row.delivery_note });
  });

  return router;
}
