import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, test } from 'node:test';
import request from 'supertest';
import Database from 'better-sqlite3';
import { resetDatabase } from '../../src/db/reset.js';
import { ACCOUNTS, bookingIdsIn, formKeyFor, openAppAt, openTestApp, signIn } from '../helpers/app.js';

let context;

before(() => {
  context = openTestApp();
});

after(() => {
  context.close();
});

function generatedFiles(dataDir) {
  const names = [
    'guides/collection.txt',
    'guides/returns.txt',
    'manifests/manifest-101.txt',
    'manifests/manifest-201.txt',
    'settlements/settlement-301.csv'
  ];
  return Object.fromEntries(names.map((name) => [name, fs.readFileSync(path.join(dataDir, name), 'utf8')]));
}

function countRows(dbPath, table) {
  const db = new Database(dbPath, { readonly: true });
  try {
    return db.prepare('SELECT COUNT(*) AS total FROM ' + table).get().total;
  } finally {
    db.close();
  }
}

async function createBookingFor(target, sku, note) {
  const agent = request.agent(target.app);
  await signIn(agent, ACCOUNTS.maya);
  const formKey = await formKeyFor(agent, '/reservations/new');
  const response = await agent.post('/reservations').type('form').send({
    formKey, sku, startDate: '2026-12-10', endDate: '2026-12-11', deliveryNote: note
  });
  return response.status;
}

test('resetting twice restores the same records and the same documents', async () => {
  const paths = { dbPath: context.dbPath, dataDir: context.dataDir };

  resetDatabase(paths);
  const firstRun = generatedFiles(context.dataDir);

  resetDatabase(paths);
  const secondRun = generatedFiles(context.dataDir);

  assert.equal(countRows(context.dbPath, 'users'), 3);
  assert.equal(countRows(context.dbPath, 'stock'), 12);
  assert.equal(countRows(context.dbPath, 'reservations'), 4);
  assert.equal(countRows(context.dbPath, 'settlements'), 1);
  assert.deepEqual(secondRun, firstRun, 'the generated documents should be byte for byte the same');

  const maya = request.agent(context.app);
  await signIn(maya, ACCOUNTS.maya);
  assert.deepEqual(bookingIdsIn((await maya.get('/reservations')).text).sort(), ['101', '102']);
});

test('resetting leaves files it does not own alone', async () => {
  const unrelated = [
    path.join(context.dataDir, 'notes.txt'),
    path.join(context.dataDir, 'settings.json'),
    path.join(context.dataDir, 'manifests', 'notes-2019.txt')
  ];
  for (const file of unrelated) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, 'keep me: ' + path.basename(file) + '\n');
  }

  const sourceFile = new URL('../../src/app.js', import.meta.url);
  const sourceDigest = createHash('sha256').update(fs.readFileSync(sourceFile)).digest('hex');

  resetDatabase({ dbPath: context.dbPath, dataDir: context.dataDir });

  for (const file of unrelated) {
    assert.equal(fs.readFileSync(file, 'utf8'), 'keep me: ' + path.basename(file) + '\n');
  }
  assert.equal(
    createHash('sha256').update(fs.readFileSync(sourceFile)).digest('hex'),
    sourceDigest,
    'resetting the data should not touch the source'
  );
});

test('an existing database is not reseeded when the application starts again', async () => {
  const paths = { dbPath: context.dbPath, dataDir: context.dataDir };
  resetDatabase(paths);

  const maya = request.agent(context.app);
  await signIn(maya, ACCOUNTS.maya);
  const created = await createBookingFor(context, 'AV-110', 'Kept across a restart.');
  assert.equal(created, 302);
  await maya.post('/reservations/101/cancel').type('form')
    .send({ formKey: await formKeyFor(maya, '/reservations/new') });

  // Starting again on the same data folder must keep what is already there.
  const restarted = openAppAt(paths);
  try {
    const agent = request.agent(restarted.app);
    await signIn(agent, ACCOUNTS.maya);
    const ids = bookingIdsIn((await agent.get('/reservations')).text).map(Number).sort((left, right) => left - right);
    assert.equal(ids.length, 3, 'the new booking should still be listed');
    assert.match((await agent.get('/reservations/' + ids.at(-1))).text, /Kept across a restart\./);
    assert.match((await agent.get('/reservations/101')).text, /cancelled/);
    assert.equal(countRows(paths.dbPath, 'reservations'), 5);
  } finally {
    restarted.close();
  }
});

test('two applications keep separate data and separate sessions', async () => {
  const first = openTestApp();
  const second = openTestApp();

  try {
    assert.notEqual(first.dbPath, second.dbPath);
    assert.equal(await createBookingFor(first, 'AV-111', 'Only in the first application.'), 302);

    const secondAgent = request.agent(second.app);
    await signIn(secondAgent, ACCOUNTS.maya);
    assert.doesNotMatch((await secondAgent.get('/reservations')).text, /Only in the first application\./);

    // A session cookie from the first application means nothing to the second.
    const firstAgent = request.agent(first.app);
    const signin = await signIn(firstAgent, ACCOUNTS.maya);
    const cookie = signin.headers['set-cookie'][0].split(';')[0];
    const carriedOver = await request(second.app).get('/dashboard').set('Cookie', cookie);
    assert.equal(carriedOver.status, 302);
    assert.equal(carriedOver.headers.location, '/login');
  } finally {
    first.close();
    second.close();
  }
});

test('closing an application releases its files', async () => {
  const closing = openTestApp();

  closing.app.locals.close();
  closing.app.locals.close();

  const db = new Database(closing.dbPath);
  try {
    assert.equal(db.prepare('SELECT COUNT(*) AS total FROM stock').get().total, 12);
  } finally {
    db.close();
  }

  fs.rmSync(closing.root, { recursive: true, force: true });
  assert.equal(fs.existsSync(closing.root), false);
});
