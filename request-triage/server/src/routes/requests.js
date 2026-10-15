const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const Request = require('../models/Request');
const { importRequests } = require('../services/importService');
const { STATUSES, OWNERS } = require('../constants');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Lets the UI render dropdowns from the same source of truth as the API.
router.get('/meta', (req, res) => res.json({ statuses: STATUSES, owners: OWNERS }));

router.post('/import', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded (expected form field "file").' });
    const report = await importRequests(req.file.buffer);
    res.json(report);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    const { status, q } = req.query;
    if (status) {
      if (!STATUSES.includes(status)) return res.status(400).json({ error: `Invalid status "${status}"` });
      filter.status = status;
    }
    if (q && q.trim()) {
      const rx = new RegExp(escapeRegex(q.trim()), 'i');
      filter.$or = [{ external_id: rx }, { requester: rx }, { subject: rx }, { description: rx }];
    }
    const items = await Request.find(filter).sort({ received_at: -1 }).lean();
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Request not found' });
    const item = await Request.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ error: 'Request not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Request not found' });
    const update = {};
    const { status, owner } = req.body || {};
    if (status !== undefined) {
      if (!STATUSES.includes(status)) return res.status(400).json({ error: `Invalid status "${status}"` });
      update.status = status;
    }
    if (owner !== undefined) {
      if (owner !== '' && !OWNERS.includes(owner)) return res.status(400).json({ error: `Invalid owner "${owner}"` });
      update.owner = owner;
    }
    if (!Object.keys(update).length) return res.status(400).json({ error: 'Provide status and/or owner.' });
    const item = await Request.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
    if (!item) return res.status(404).json({ error: 'Request not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
