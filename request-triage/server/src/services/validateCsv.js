const { parse } = require('csv-parse/sync');
const { PRIORITIES } = require('../constants');

const REQUIRED_HEADERS = ['external_id', 'received_at', 'requester', 'subject'];

/**
 * Parse a date string. Returns a Date or null.
 * Accepts ISO-8601 and "YYYY-MM-DD HH:mm[:ss]" style values.
 * Rejects pure numbers (ambiguous) and anything JS cannot parse.
 */
function parseDate(value) {
  if (!value) return null;
  const s = value.trim();
  if (!s || /^\d+$/.test(s)) return null;
  const normalised = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s) ? s.replace(' ', 'T') : s;
  const d = new Date(normalised);
  if (Number.isNaN(d.getTime())) return null;
  // Guard against JS silently rolling over e.g. 2026-02-31 to March.
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) {
    const check = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    if (check.getUTCMonth() !== +m[2] - 1 || check.getUTCDate() !== +m[3]) return null;
  }
  return d;
}

/**
 * Pure function: no database access.
 * Returns { valid: [{row, doc}], rejected: [{row, external_id, reason}], warnings: [{row, message}] }
 * Row numbers: header is row 1, first data record is row 2 (blank lines are ignored).
 * Throws an Error with .status = 400 when the file is unusable as a whole.
 */
function validateCsv(input) {
  let records;
  try {
    records = parse(input, {
      columns: (header) => header.map((h) => h.trim().toLowerCase()),
      bom: true,
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
    });
  } catch (err) {
    const e = new Error(`Could not parse CSV: ${err.message}`);
    e.status = 400;
    throw e;
  }

  const valid = [];
  const rejected = [];
  const warnings = [];
  const seen = new Map(); // external_id -> row

  if (records.length === 0) {
    const e = new Error('CSV contains no data rows.');
    e.status = 400;
    throw e;
  }

  const headers = Object.keys(records[0]);
  const missingHeaders = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missingHeaders.length) {
    const e = new Error(`CSV is missing required column(s): ${missingHeaders.join(', ')}`);
    e.status = 400;
    throw e;
  }

  records.forEach((rec, i) => {
    const row = i + 2;
    const externalId = (rec.external_id || '').trim();
    const requester = (rec.requester || '').trim();
    const subject = (rec.subject || '').trim();
    const reject = (reason) => rejected.push({ row, external_id: externalId || null, reason });

    const missing = [];
    if (!externalId) missing.push('external_id');
    if (!requester) missing.push('requester');
    if (!subject) missing.push('subject');
    if (missing.length) return reject(`Missing required field(s): ${missing.join(', ')}`);

    const receivedAt = parseDate(rec.received_at);
    if (!receivedAt) {
      return reject(
        rec.received_at
          ? `Invalid received_at timestamp: "${rec.received_at}"`
          : 'Missing received_at timestamp'
      );
    }

    if (seen.has(externalId)) {
      return reject(`Duplicate external_id "${externalId}" within file (first seen at row ${seen.get(externalId)})`);
    }
    seen.set(externalId, row);

    let priority = (rec.priority || '').trim().toLowerCase();
    if (!priority) {
      priority = 'normal';
    } else if (!PRIORITIES.includes(priority)) {
      warnings.push({ row, message: `Unrecognised priority "${rec.priority}" — stored as "normal"` });
      priority = 'normal';
    }

    valid.push({
      row,
      doc: {
        external_id: externalId,
        received_at: receivedAt,
        requester,
        subject,
        description: (rec.description || '').trim(),
        priority,
      },
    });
  });

  return { valid, rejected, warnings };
}

module.exports = { validateCsv, parseDate };
