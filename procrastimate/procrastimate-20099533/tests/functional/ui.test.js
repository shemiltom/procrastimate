import assert from 'node:assert/strict';
import fs from 'node:fs';
import { after, before, test } from 'node:test';
import request from 'supertest';
import { ACCOUNTS, formKeyFor, openTestApp, signIn } from '../helpers/app.js';

let context;
let agent;

before(async () => {
  context = openTestApp();
  agent = request.agent(context.app);
  await signIn(agent, ACCOUNTS.maya);
});

after(() => {
  context.close();
});

test('every signed-in page is marked as signed in and offers the navigation', async () => {
  const pages = ['/dashboard', '/stock', '/reservations', '/guides', '/transfers', '/settlements', '/service'];

  for (const page of pages) {
    const response = await agent.get(page);
    assert.equal(response.status, 200, page);
    assert.match(response.text, /data-session="active"/, page);
    for (const link of ['/dashboard', '/stock', '/reservations', '/guides', '/transfers', '/settlements', '/service']) {
      assert.match(response.text, new RegExp('href="' + link + '"'), page + ' should link to ' + link);
    }
  }
});

test('the sign-in page is marked as a guest page and has labelled fields', async () => {
  const response = await request(context.app).get('/login');
  assert.equal(response.status, 200);
  assert.match(response.text, /data-session="guest"/);
  assert.match(response.text, /for="username"/);
  assert.match(response.text, /for="password"/);
  assert.match(response.text, /<button[^>]*type="submit"/);
});

test('pages ask for a viewport width, so they work at 360px and above', async () => {
  const pages = [['/login', request(context.app)], ['/dashboard', agent], ['/reservations/new', agent]];
  for (const [page, caller] of pages) {
    const response = await caller.get(page);
    assert.equal(response.status, 200, page);
    assert.match(response.text, /<meta name="viewport" content="width=device-width, initial-scale=1">/, page);
  }

  const css = fs.readFileSync(new URL('../../public/css/app.css', import.meta.url), 'utf8');
  assert.match(css, /@media \(max-width: 620px\)/);
  assert.match(css, /a:focus|input:focus/);
});

test('pages use no remote files', async () => {
  for (const page of ['/login', '/dashboard', '/guides', '/service']) {
    const response = await agent.get(page);
    assert.doesNotMatch(response.text, /https?:\/\//, page + ' should not fetch anything remote');
  }

  const css = fs.readFileSync(new URL('../../public/css/app.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /url\(/, 'the stylesheet should not pull in remote files');
});

test('tables have proper headings', async () => {
  const stock = await agent.get('/stock');
  assert.match(stock.text, /<th>Code<\/th>/);
  assert.match(stock.text, /<th>Item<\/th>/);
  assert.match(stock.text, /<th>Available<\/th>/);

  const bookings = await agent.get('/reservations');
  assert.match(bookings.text, /<th>Booking<\/th>/);
  assert.match(bookings.text, /<th>Dates<\/th>/);
  assert.match(bookings.text, /<th>Status<\/th>/);

  const guides = await agent.get('/guides');
  assert.match(guides.text, /<th>Guide<\/th>/);
  assert.match(guides.text, /<th>File checksum \(for copy checks\)<\/th>/);
});

test('the booking form is labelled and can be filled in from the keyboard', async () => {
  const response = await agent.get('/reservations/new');
  assert.equal(response.status, 200);
  for (const field of ['sku', 'startDate', 'endDate', 'deliveryNote']) {
    assert.match(response.text, new RegExp('for="' + field + '"'), field);
    assert.match(response.text, new RegExp('id="' + field + '"'), field);
  }
  assert.match(response.text, /<select id="sku"/);
  assert.match(response.text, /<textarea id="deliveryNote"/);
  assert.match(response.text, /<button[^>]*type="submit"/);
});

test('a form problem is explained on the form itself', async () => {
  const response = await agent.post('/reservations').type('form').send({
    formKey: await formKeyFor(agent, '/reservations/new'),
    sku: '',
    startDate: '',
    endDate: '',
    deliveryNote: ''
  });
  assert.equal(response.status, 400);
  assert.match(response.text, /Choose an item to book\./);
  assert.match(response.text, /<form class="panel"/);
});

test('an unknown path gives a not-found page without internal detail', async () => {
  const response = await request(context.app).get('/not-a-page');
  assert.equal(response.status, 404);
  assert.match(response.text, /Page not found/);
  assert.doesNotMatch(response.text, /node_modules|\.js:\d+|SELECT |sqlite/i);
});

test('the stylesheet is served by the application itself', async () => {
  const response = await agent.get('/css/app.css');
  assert.equal(response.status, 200);
  assert.match(response.headers['content-type'], /text\/css/);
});

test('each requester dashboard points to its own first open booking sheet', async () => {
  for (const [account, booking, sheet] of [
    [ACCOUNTS.maya, '101', 'manifest-101.txt'],
    [ACCOUNTS.noah, '201', 'manifest-201.txt']
  ]) {
    const caller = request.agent(context.app);
    await signIn(caller, account);
    const response = await caller.get('/dashboard');
    assert.equal(response.status, 200);
    assert.match(response.text, /First open booking/);
    assert.match(response.text, new RegExp('Booking <a href="/reservations/' + booking));
    assert.match(response.text, new RegExp('/manifests/download\\?f=' + sheet));
  }
});
