import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { packingSheetFor } from './reservations.js';

export function createHomeRouter({ db }) {
  const router = express.Router();

  const ownBookings = db.prepare(
    'SELECT r.id, r.sku, r.start_date, r.end_date, r.status, s.title ' +
    'FROM reservations r JOIN stock s ON s.sku = r.sku ' +
    'WHERE r.owner_id = ? ORDER BY r.start_date, r.id'
  );

  router.get('/', (req, res) => {
    if (req.user) return res.redirect(302, '/dashboard');
    return res.redirect(302, '/login');
  });

  router.get('/dashboard', requireAuth, (req, res) => {
    const bookings = ownBookings.all(req.user.id);
    const next = bookings.find((booking) => booking.status === 'booked') || null;
    return res.render('dashboard', {
      title: 'Dashboard', bookings, next,
      sheet: next ? packingSheetFor(next.id) : null
    });
  });

  return router;
}
