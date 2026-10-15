const Request = require('../models/Request');
const { validateCsv } = require('./validateCsv');

/**
 * Validate the CSV, skip rows whose external_id already exists in MongoDB
 * (existing records are never overwritten), insert the rest, and return a report.
 */
async function importRequests(buffer) {
  const { valid, rejected, warnings } = validateCsv(buffer.toString('utf8'));
  const totalRows = valid.length + rejected.length;

  // Duplicate policy: keep the existing record, reject the incoming row.
  const ids = valid.map((v) => v.doc.external_id);
  const existing = await Request.find({ external_id: { $in: ids } }, 'external_id').lean();
  const existingIds = new Set(existing.map((e) => e.external_id));

  const toInsert = [];
  for (const v of valid) {
    if (existingIds.has(v.doc.external_id)) {
      rejected.push({
        row: v.row,
        external_id: v.doc.external_id,
        reason: `external_id "${v.doc.external_id}" already exists in the database (existing record kept)`,
      });
    } else {
      toInsert.push(v);
    }
  }

  let imported = 0;
  if (toInsert.length) {
    try {
      const res = await Request.insertMany(
        toInsert.map((v) => v.doc),
        { ordered: false }
      );
      imported = res.length;
    } catch (err) {
      // Race condition safety net: unique index fired for some rows.
      if (err.writeErrors && err.writeErrors.length) {
        const failedIdx = new Set(err.writeErrors.map((w) => w.index));
        failedIdx.forEach((idx) => {
          const v = toInsert[idx];
          rejected.push({
            row: v.row,
            external_id: v.doc.external_id,
            reason: `external_id "${v.doc.external_id}" already exists in the database (existing record kept)`,
          });
        });
        imported = toInsert.length - failedIdx.size;
      } else {
        throw err;
      }
    }
  }

  rejected.sort((a, b) => a.row - b.row);
  return { totalRows, imported, rejectedCount: rejected.length, rejected, warnings };
}

module.exports = { importRequests };
