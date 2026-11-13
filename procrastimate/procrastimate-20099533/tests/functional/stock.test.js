import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import request from 'supertest';
import { ACCOUNTS, openTestApp, signIn } from '../helpers/app.js';

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

function codeCells(html) {
  return (String(html).match(/<td>AV-\d{3}<\/td>/g) || []).length;
}

test('the stock list shows the twelve shared items', async () => {
  const response = await agent.get('/stock');
  assert.equal(response.status, 200);
  assert.equal(codeCells(response.text), 12);
  assert.match(response.text, /Camera kit/);
  assert.match(response.text, /Conference speaker/);
});

test('an item code returns that one item', async () => {
  const response = await agent.get('/stock?sku=AV-104');
  assert.equal(response.status, 200);
  assert.equal(codeCells(response.text), 1);
  assert.match(response.text, /Camera kit/);
  assert.doesNotMatch(response.text, /Projector/);
});

test('an item code that does not exist returns no match', async () => {
  const response = await agent.get('/stock?sku=AV-999');
  assert.equal(response.status, 200);
  assert.match(response.text, /No items matched/);
  assert.equal(codeCells(response.text), 0);
});

test('the cost estimate multiplies the daily rate by the days', async () => {
  const response = await agent.post('/stock/estimate').type('form')
    .send({ sku: 'AV-104', days: '3' });
  assert.equal(response.status, 200);
  assert.match(response.text, /Camera kit/);
  assert.match(response.text, /7500/);
});

test('the cost estimate refuses a duration outside 1 to 30 days', async () => {
  for (const days of ['0', '31', 'ten', '-2']) {
    const response = await agent.post('/stock/estimate').type('form')
      .send({ sku: 'AV-104', days });
    assert.equal(response.status, 400, 'days=' + days + ' should be refused');
    assert.match(response.text, /whole number of days/);
  }
});

test('the cost estimate refuses an item code that does not exist', async () => {
  const response = await agent.post('/stock/estimate').type('form')
    .send({ sku: 'AV-999', days: '2' });
  assert.equal(response.status, 400);
  assert.match(response.text, /No item was found/);
});

test('the cost estimate changes nothing', async () => {
  const before = await agent.get('/reservations');
  await agent.post('/stock/estimate').type('form').send({ sku: 'AV-104', days: '3' });
  const after = await agent.get('/reservations');
  assert.equal(after.text, before.text);
});
