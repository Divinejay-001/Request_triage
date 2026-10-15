const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { validateCsv, parseDate } = require('../src/services/validateCsv');

const HEADER = 'external_id,received_at,requester,subject,description,priority\n';

test('messy sample: expected valid and rejected rows with row numbers', () => {
  const csv = fs.readFileSync(path.join(__dirname, 'sample-messy.csv'), 'utf8');
  const { valid, rejected } = validateCsv(csv);
  assert.deepEqual(valid.map((v) => v.doc.external_id), ['REQ-1', 'REQ-2', 'REQ-9', 'REQ-10']);
  assert.deepEqual(rejected.map((r) => r.row), [4, 5, 6, 7, 8, 9]);
  assert.match(rejected[0].reason, /external_id/);
  assert.match(rejected[1].reason, /requester/);
  assert.match(rejected[2].reason, /subject/);
  assert.match(rejected[3].reason, /Invalid received_at/);
  assert.match(rejected[4].reason, /Duplicate external_id.*row 2/);
  assert.match(rejected[5].reason, /Invalid received_at/); // 2026-02-31
});

test('real fixture: 10 valid rows, 4 rejected with expected rows and reasons', () => {
  const csv = fs.readFileSync(path.join(__dirname, '..', '..', 'fixtures', 'requests.csv'), 'utf8');
  const { valid, rejected, warnings } = validateCsv(csv);
  assert.equal(valid.length, 10);
  assert.equal(warnings.length, 0);
  assert.deepEqual(rejected.map((r) => r.row), [11, 12, 13, 15]);
  assert.match(rejected[0].reason, /Duplicate external_id "REQ-1003".*row 4/);
  assert.match(rejected[1].reason, /external_id/);
  assert.match(rejected[2].reason, /subject/);
  assert.match(rejected[3].reason, /Invalid received_at/);
  // REQ-1011 has an empty description and must still be imported
  const r1011 = valid.find((v) => v.doc.external_id === 'REQ-1011');
  assert.equal(r1011.doc.description, '');
  // Quoted comma in REQ-1003 description is preserved, and the FIRST REQ-1003 row is the one kept
  const r1003 = valid.find((v) => v.doc.external_id === 'REQ-1003');
  assert.equal(r1003.doc.subject, 'Invoice question');
  assert.match(r1003.doc.description, /Lagos, but delivery was to Uyo/);
});

test('empty description is allowed', () => {
  const { valid, rejected } = validateCsv(HEADER + 'A1,2026-10-10T09:00:00Z,Jane,Hi,,high\n');
  assert.equal(rejected.length, 0);
  assert.equal(valid[0].doc.description, '');
});

test('unknown priority defaults to normal with a warning; empty priority defaults silently', () => {
  const { valid, warnings } = validateCsv(
    HEADER + 'A1,2026-10-10T09:00:00Z,Jane,Hi,x,SUPER\nA2,2026-10-10T09:00:00Z,Jane,Hi,x,\n'
  );
  assert.equal(valid[0].doc.priority, 'normal');
  assert.equal(valid[1].doc.priority, 'normal');
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].row, 2);
});

test('priority and whitespace are normalised; BOM is tolerated', () => {
  const { valid } = validateCsv('﻿' + HEADER + ' A1 ,2026-10-10T09:00:00Z, Jane ,Hi,x, HIGH \n');
  assert.equal(valid[0].doc.external_id, 'A1');
  assert.equal(valid[0].doc.requester, 'Jane');
  assert.equal(valid[0].doc.priority, 'high');
});

test('missing required column fails the whole file with 400', () => {
  assert.throws(() => validateCsv('external_id,subject\nA1,Hi\n'), (e) => e.status === 400 && /requester/.test(e.message));
});

test('parseDate accepts ISO and space-separated, rejects junk and rollovers', () => {
  assert.ok(parseDate('2026-10-10T09:30:00Z'));
  assert.ok(parseDate('2026-10-10 09:30:00'));
  assert.equal(parseDate('yesterday'), null);
  assert.equal(parseDate('2026-02-31T00:00:00Z'), null);
  assert.equal(parseDate('12345'), null);
  assert.equal(parseDate(''), null);
});
