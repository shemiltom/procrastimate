import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
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

test('the packing sheet downloads as plain text', async () => {
  const response = await agent.get('/manifests/download?f=manifest-101.txt');
  assert.equal(response.status, 200);
  assert.match(response.headers['content-type'], /text\/plain/);
  assert.match(response.text, /Collection packing sheet/);
  assert.match(response.text, /Camera kit/);
});

test('a packing sheet that does not exist is reported as unavailable', async () => {
  const response = await agent.get('/manifests/download?f=manifest-999.txt');
  assert.equal(response.status, 404);
});

test('a packing sheet name that is not supplied is refused', async () => {
  const response = await agent.get('/manifests/download');
  assert.equal(response.status, 400);
});

test('both guides download, and the checksum matches the file on disk', async () => {
  const page = await agent.get('/guides');
  assert.equal(page.status, 200);
  assert.match(page.text, /File checksum \(for copy checks\)/);

  for (const name of ['collection.txt', 'returns.txt']) {
    const download = await agent.get('/guides/download?f=' + name);
    assert.equal(download.status, 200);
    assert.match(download.headers['content-type'], /text\/plain/);

    const bytes = fs.readFileSync(path.join(context.dataDir, 'guides', name));
    const digest = createHash('md5').update(bytes).digest('hex');
    assert.match(page.text, new RegExp(digest), 'the guides page should show the checksum');
  }
});

test('a guide that is not on the list is refused', async () => {
  for (const name of ['notes.txt', '', 'guide.txt']) {
    const response = await agent.get('/guides/download').query({ f: name });
    assert.equal(response.status, 400, 'name=' + name);
  }
});

test('the data folder and the source are not served as web content', async () => {
  for (const url of ['/data/procrastimate.sqlite', '/data/guides/collection.txt', '/src/app.js', '/package.json']) {
    const response = await agent.get(url);
    assert.equal(response.status, 404, url);
  }
});

test('the packing preview and collection note serve their ordinary purposes', async () => {
  const preview = await agent.get('/packing/preview?name=Camera%20kit');
  assert.equal(preview.status, 200);
  assert.match(preview.headers['content-type'], /text\/html/);
  assert.match(preview.text, /Hello Camera kit/);

  const note = await agent.get('/guides/collection-note?name=Maya%20Farrell');
  assert.equal(note.status, 200);
  assert.match(note.headers['content-type'], /text\/html/);
  assert.match(note.text, /Collection note for Maya Farrell/);
  const guides = await agent.get('/guides');
  assert.match(guides.text, /href="\/guides\/collection-note\?name=Maya%20Farrell"/);
});

test('a packing name that is not supplied is refused', async () => {
  assert.equal((await agent.get('/packing/preview')).status, 400);
  assert.equal((await agent.get('/guides/collection-note')).status, 400);
});

test('a reference is formatted for the application label', async () => {
  const response = await agent.get('/labels/preview?ref=AV-104');
  assert.equal(response.status, 200);
  assert.match(response.text, /Procrastimate reference: AV-104/);
});

test('an empty reference is refused', async () => {
  assert.equal((await agent.get('/labels/preview?ref=')).status, 400);
  assert.equal((await agent.get('/labels/preview')).status, 400);
});

test('the reservation return links use the two known destinations', async () => {
  const toStock = await agent.get('/reservations/return?url=/stock');
  assert.equal(toStock.status, 302);
  assert.equal(toStock.headers.location, '/stock');

  const toBookings = await agent.get('/reservations/return?url=/reservations');
  assert.equal(toBookings.status, 302);
  assert.equal(toBookings.headers.location, '/reservations');

  const other = await agent.get('/reservations/return?url=/service');
  assert.equal(other.status, 400);

  const forward = await agent.get('/transfers/continue?url=%2Fstock');
  assert.equal(forward.status, 302);
  assert.equal(forward.headers.location, '/stock');
});

test('the transfers page links to continuation and reservations links back to stock', async () => {
  const response = await agent.get('/transfers');
  assert.equal(response.status, 200);
  assert.match(response.text, /href="\/transfers\/continue\?url=%2Fstock"/);
  assert.doesNotMatch(response.text, /\/transfers\/back/);
  const reservations = await agent.get('/reservations');
  assert.match(reservations.text, /href="\/reservations\/return\?url=%2Fstock"/);
});
