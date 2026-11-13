import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, test } from 'node:test';
import request from 'supertest';
import { ACCOUNTS, formKeyFor, openTestApp, signIn } from '../helpers/app.js';

let context;
let maya;
let ruth;

before(async () => {
  context = openTestApp();
  maya = request.agent(context.app);
  ruth = request.agent(context.app);
  await signIn(maya, ACCOUNTS.maya);
  await signIn(ruth, ACCOUNTS.ruth);
});

after(() => {
  context.close();
});

// Coordinator rows carry the export reference, its title and the access code.
function exportRows(html) {
  return [...String(html).matchAll(/<td>(\d+)<\/td>\s*<td>([^<]*)<\/td>[\s\S]*?data-export="(\d+)">([^<]+)</g)]
    .map((match) => ({ id: match[1], title: match[2], codeRow: match[3], code: match[4] }));
}

async function publish(title, payload) {
  const formKey = await formKeyFor(ruth, '/settlements');
  const published = await ruth.post('/settlements').type('form').send({ formKey, title, payload });
  assert.equal(published.status, 302);
  assert.equal(published.headers.location, '/settlements');

  const index = await ruth.get('/settlements');
  const row = exportRows(index.text)
    .filter((entry) => entry.title === title && entry.id === entry.codeRow)
    .at(-1);
  assert.ok(row, 'the published export should be listed with its access code');
  return { id: row.id, code: row.code, payload };
}

test('a requester sees the export reference and title only', async () => {
  const page = await maya.get('/settlements');
  assert.equal(page.status, 200);
  assert.match(page.text, /September supplier settlement/);
  assert.match(page.text, /<td>301<\/td>/);
  assert.doesNotMatch(page.text, /data-export=/);
  assert.doesNotMatch(page.text, /SETTLEMENT-ONLY-4821/);
  assert.doesNotMatch(page.text, /DEMO-ACCT-4821/);
  assert.doesNotMatch(page.text, /Publish an export/);
});

test('a coordinator can publish an export, read its code and download it', async () => {
  const published = await publish('October sample', 'reference,account,amount\nEXPORT-7781,ACCT-7781,120.00\n');

  const download = await ruth.post('/settlements/retrieve').type('form')
    .send({ formKey: await formKeyFor(ruth, '/settlements'), id: published.id, code: published.code });
  assert.equal(download.status, 200);
  assert.match(download.headers['content-disposition'], new RegExp('settlement-' + published.id + '\\.csv'));
  assert.match(download.text, /EXPORT-7781/);

  const copy = fs.readFileSync(
    path.join(context.dataDir, 'settlements', 'settlement-' + published.id + '.csv'), 'utf8'
  );
  assert.equal(copy, published.payload);
});

test('a requester can download an export when the code is shared with them', async () => {
  const published = await publish('October sharing sample', 'reference,account,amount\nSHARED-9021,ACCT-9021,55.00\n');

  const download = await maya.post('/settlements/retrieve').type('form')
    .send({ formKey: await formKeyFor(maya, '/settlements'), id: published.id, code: published.code });
  assert.equal(download.status, 200);
  assert.match(download.text, /SHARED-9021/);
});

test('a download with the wrong code is refused', async () => {
  const published = await publish('October refused sample', 'reference,account,amount\nREFUSED-1,ACCT-1,1.00\n');

  const refused = await maya.post('/settlements/retrieve').type('form')
    .send({ formKey: await formKeyFor(maya, '/settlements'), id: published.id, code: 'not-the-code' });
  assert.equal(refused.status, 403);
  assert.match(refused.text, /Export unavailable/);
});

test('a download needs the form key', async () => {
  const withoutKey = await maya.post('/settlements/retrieve').type('form')
    .send({ id: '301', code: '0427' });
  assert.equal(withoutKey.status, 403);
});

test('a download needs both an export reference and a code', async () => {
  const formKey = await formKeyFor(maya, '/settlements');
  const missingCode = await maya.post('/settlements/retrieve').type('form')
    .send({ formKey, id: '301', code: '' });
  assert.equal(missingCode.status, 400);

  const missingId = await maya.post('/settlements/retrieve').type('form')
    .send({ formKey, id: '', code: '0427' });
  assert.equal(missingId.status, 400);
});

test('a requester cannot publish an export', async () => {
  const formKey = await formKeyFor(maya, '/settlements');
  const refused = await maya.post('/settlements').type('form')
    .send({ formKey, title: 'Not allowed', payload: 'reference,account,amount\nX,1,2.00\n' });
  assert.equal(refused.status, 403);

  const page = await maya.get('/settlements');
  assert.doesNotMatch(page.text, /Not allowed/);
});

test('publishing an empty export is refused', async () => {
  const formKey = await formKeyFor(ruth, '/settlements');
  const refused = await ruth.post('/settlements').type('form').send({ formKey, title: '', payload: '' });
  assert.equal(refused.status, 400);
  assert.match(refused.text, /Enter a title and the export contents/);
});
