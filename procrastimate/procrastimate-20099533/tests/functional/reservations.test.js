import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import request from 'supertest';
import { ACCOUNTS, bookingIdsIn, formKeyFor, openTestApp, signIn } from '../helpers/app.js';

let context;

before(() => {
  context = openTestApp();
});

after(() => {
  context.close();
});

async function signedIn(account) {
  const agent = request.agent(context.app);
  await signIn(agent, account);
  return agent;
}

test('a requester sees only their own bookings', async () => {
  const maya = await signedIn(ACCOUNTS.maya);
  const ids = bookingIdsIn((await maya.get('/reservations')).text);
  assert.ok(ids.includes('101'));
  assert.ok(ids.includes('102'));
  assert.ok(!ids.includes('201'));
  assert.ok(!ids.includes('202'));

  const noah = await signedIn(ACCOUNTS.noah);
  const noahIds = bookingIdsIn((await noah.get('/reservations')).text);
  assert.ok(noahIds.includes('201'));
  assert.ok(noahIds.includes('202'));
  assert.ok(!noahIds.includes('101'));
});

test('a coordinator sees every booking', async () => {
  const ruth = await signedIn(ACCOUNTS.ruth);
  const ids = bookingIdsIn((await ruth.get('/reservations')).text);
  for (const id of ['101', '102', '201', '202']) {
    assert.ok(ids.includes(id), 'the coordinator should see booking ' + id);
  }
});

test('a booking can be created and shows up on the detail page', async () => {
  const maya = await signedIn(ACCOUNTS.maya);
  const formKey = await formKeyFor(maya, '/reservations/new');

  const created = await maya.post('/reservations').type('form').send({
    formKey,
    sku: 'AV-105',
    startDate: '2026-11-02',
    endDate: '2026-11-04',
    deliveryNote: 'Leave at the store desk.'
  });
  assert.equal(created.status, 302);
  assert.match(created.headers.location, /^\/reservations\/\d+$/);

  const detail = await maya.get(created.headers.location);
  assert.equal(detail.status, 200);
  assert.match(detail.text, /Leave at the store desk\./);
  assert.match(detail.text, /Tripod/);

  const record = await maya.get('/api' + created.headers.location);
  assert.equal(record.status, 200);
  assert.equal(record.body.ownerId, 1);
  assert.equal(record.body.sku, 'AV-105');
  assert.equal(record.body.status, 'booked');
});

test('creating a booking needs the form key', async () => {
  const maya = await signedIn(ACCOUNTS.maya);
  const before = bookingIdsIn((await maya.get('/reservations')).text).length;

  const withoutKey = await maya.post('/reservations').type('form').send({
    sku: 'AV-105', startDate: '2026-11-02', endDate: '2026-11-04', deliveryNote: 'No key.'
  });
  assert.equal(withoutKey.status, 403);

  const wrongKey = await maya.post('/reservations').type('form').send({
    formKey: 'a'.repeat(64), sku: 'AV-105', startDate: '2026-11-02',
    endDate: '2026-11-04', deliveryNote: 'Wrong key.'
  });
  assert.equal(wrongKey.status, 403);

  const otherSession = await signedIn(ACCOUNTS.noah);
  const borrowedKey = await formKeyFor(otherSession, '/reservations/new');
  const borrowed = await maya.post('/reservations').type('form').send({
    formKey: borrowedKey, sku: 'AV-105', startDate: '2026-11-02',
    endDate: '2026-11-04', deliveryNote: 'Borrowed key.'
  });
  assert.equal(borrowed.status, 403);

  const after = bookingIdsIn((await maya.get('/reservations')).text).length;
  assert.equal(after, before);
});

test('the booking form refuses dates and item codes it cannot use', async () => {
  const maya = await signedIn(ACCOUNTS.maya);
  const formKey = await formKeyFor(maya, '/reservations/new');

  const backwards = await maya.post('/reservations').type('form').send({
    formKey, sku: 'AV-105', startDate: '2026-11-04', endDate: '2026-11-02', deliveryNote: 'Backwards.'
  });
  assert.equal(backwards.status, 400);
  assert.match(backwards.text, /end date cannot be before the start date/);

  const unknownItem = await maya.post('/reservations').type('form').send({
    formKey, sku: 'AV-999', startDate: '2026-11-02', endDate: '2026-11-04', deliveryNote: 'Unknown item.'
  });
  assert.equal(unknownItem.status, 400);
  assert.match(unknownItem.text, /No item was found/);

  const noNote = await maya.post('/reservations').type('form').send({
    formKey, sku: 'AV-105', startDate: '2026-11-02', endDate: '2026-11-04', deliveryNote: ''
  });
  assert.equal(noNote.status, 400);
  assert.match(noNote.text, /delivery note/);
});

test('an unknown booking is not found', async () => {
  const maya = await signedIn(ACCOUNTS.maya);
  assert.equal((await maya.get('/reservations/999999')).status, 404);
  assert.equal((await maya.get('/api/reservations/999999')).status, 404);
  assert.equal((await maya.get('/reservations/not-a-number')).status, 400);
});

test('another account cannot open or cancel a booking it does not own', async () => {
  const maya = await signedIn(ACCOUNTS.maya);
  const noah = await signedIn(ACCOUNTS.noah);
  const noahKey = await formKeyFor(noah, '/reservations/new');

  assert.equal((await noah.get('/reservations/101')).status, 403);

  const cancel = await noah.post('/reservations/101/cancel').type('form').send({ formKey: noahKey });
  assert.equal(cancel.status, 403);

  const ownerView = await maya.get('/reservations/101');
  assert.match(ownerView.text, /booked/);
});

test('the booking record carries the documented fields', async () => {
  const maya = await signedIn(ACCOUNTS.maya);
  const response = await maya.get('/api/reservations/101');
  assert.equal(response.status, 200);
  assert.deepEqual(
    Object.keys(response.body).sort(),
    ['deliveryNote', 'endDate', 'id', 'ownerId', 'sku', 'startDate', 'status']
  );
  assert.equal(response.body.id, 101);
  assert.equal(response.body.ownerId, 1);
  assert.equal(response.body.sku, 'AV-104');
  assert.equal(response.body.startDate, '2026-10-05');
  assert.equal(response.body.endDate, '2026-10-07');
  assert.equal(response.body.status, 'booked');
});

test('an owner can cancel a booking, and cancelling again is harmless', async () => {
  const maya = await signedIn(ACCOUNTS.maya);
  const formKey = await formKeyFor(maya, '/reservations/new');

  const first = await maya.post('/reservations/102/cancel').type('form').send({ formKey });
  assert.equal(first.status, 302);
  assert.match((await maya.get('/reservations/102')).text, /cancelled/);

  const second = await maya.post('/reservations/102/cancel').type('form').send({ formKey });
  assert.equal(second.status, 302);
  assert.match((await maya.get('/reservations/102')).text, /cancelled/);
});
