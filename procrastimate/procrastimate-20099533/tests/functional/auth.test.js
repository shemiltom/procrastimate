import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import request from 'supertest';
import { ACCOUNTS, formKeyFor, openTestApp, signIn } from '../helpers/app.js';

let context;

before(() => {
  context = openTestApp();
});

after(() => {
  context.close();
});

test('the sign-in page is public and shows a one-line description', async () => {
  const response = await request(context.app).get('/login');
  assert.equal(response.status, 200);
  assert.match(response.text, /data-session="guest"/);
  assert.match(response.text, /Equipment booking and dispatch/);
  assert.doesNotMatch(response.text, /href="\/reservations"/);
});

test('the root path sends a signed-out visitor to the sign-in page', async () => {
  const response = await request(context.app).get('/');
  assert.equal(response.status, 302);
  assert.equal(response.headers.location, '/login');
});

test('every seeded account can sign in and read its own dashboard', async () => {
  for (const account of Object.values(ACCOUNTS)) {
    const agent = request.agent(context.app);
    const signin = await signIn(agent, account);
    assert.equal(signin.status, 302);
    assert.equal(signin.headers.location, '/dashboard');

    const dashboard = await agent.get('/dashboard');
    assert.equal(dashboard.status, 200);
    assert.match(dashboard.text, /data-session="active"/);
    assert.match(dashboard.text, new RegExp(account.displayName));
  }
});

test('a wrong password and an unknown account give the same answer', async () => {
  const wrongPassword = await request(context.app).post('/login').type('form')
    .send({ username: 'maya', password: 'not-the-password' });
  const unknownAccount = await request(context.app).post('/login').type('form')
    .send({ username: 'nobody', password: 'not-the-password' });

  assert.equal(wrongPassword.status, 200);
  assert.equal(unknownAccount.status, 200);
  assert.match(wrongPassword.text, /incorrect/i);
  assert.match(unknownAccount.text, /incorrect/i);
});

test('business pages and the booking record need a signed-in session', async () => {
  const page = await request(context.app).get('/dashboard');
  assert.equal(page.status, 302);
  assert.equal(page.headers.location, '/login');

  const record = await request(context.app).get('/api/reservations/101');
  assert.equal(record.status, 401);
  assert.equal(record.body.error, 'Sign in required');
});

test('a sign-in form posted from another site is refused', async () => {
  const foreign = await request(context.app).post('/login')
    .set('Host', '127.0.0.1:9091')
    .set('Origin', 'https://elsewhere.invalid')
    .type('form')
    .send({ username: 'maya', password: ACCOUNTS.maya.password });
  assert.equal(foreign.status, 403);

  const local = await request(context.app).post('/login')
    .set('Host', '127.0.0.1:9091')
    .set('Origin', 'http://127.0.0.1:9091')
    .type('form')
    .send({ username: 'maya', password: ACCOUNTS.maya.password });
  assert.equal(local.status, 302);
  assert.equal(local.headers.location, '/dashboard');
});

test('signing out ends the session', async () => {
  const agent = request.agent(context.app);
  await signIn(agent, ACCOUNTS.maya);

  const formKey = await formKeyFor(agent, '/dashboard');
  const logout = await agent.post('/logout').type('form').send({ formKey });
  assert.equal(logout.status, 302);
  assert.equal(logout.headers.location, '/login');

  const afterwards = await agent.get('/dashboard');
  assert.equal(afterwards.status, 302);
  assert.equal(afterwards.headers.location, '/login');
});

test('signing in again starts a new session', async () => {
  const agent = request.agent(context.app);
  const first = await signIn(agent, ACCOUNTS.maya);
  const second = await signIn(agent, ACCOUNTS.maya);

  assert.ok(first.headers['set-cookie'], 'signing in should set a session cookie');
  assert.ok(second.headers['set-cookie'], 'signing in again should set a session cookie');
  assert.notDeepEqual(second.headers['set-cookie'], first.headers['set-cookie']);
});

test('signing out needs the form key', async () => {
  const agent = request.agent(context.app);
  await signIn(agent, ACCOUNTS.maya);

  const withoutKey = await agent.post('/logout').type('form').send({});
  assert.equal(withoutKey.status, 403);
});

test('repeated failures for one account are held back, then allowed again later', async () => {
  let now = Date.UTC(2026, 8, 22, 9, 0, 0);
  const clocked = openTestApp({ clock: () => now });

  try {
    const agent = request.agent(clocked.app);
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await agent.post('/login').type('form')
        .send({ username: 'maya', password: 'not-the-password' });
      assert.equal(response.status, 200);
    }

    const blocked = await agent.post('/login').type('form')
      .send({ username: 'maya', password: ACCOUNTS.maya.password });
    assert.equal(blocked.status, 429);
    assert.equal(blocked.headers['retry-after'], '900');
    assert.match(blocked.text, /Try again in 15 minutes\./);

    now += 16 * 60 * 1000;
    const allowed = await agent.post('/login').type('form')
      .send({ username: 'maya', password: ACCOUNTS.maya.password });
    assert.equal(allowed.status, 302);
  } finally {
    clocked.close();
  }
});
