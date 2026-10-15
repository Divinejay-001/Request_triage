const mongoose = require('mongoose');
const { STATUSES, PRIORITIES } = require('../constants');

const requestSchema = new mongoose.Schema(
  {
    // Fields that originate from the CSV
    external_id: { type: String, required: true, unique: true, trim: true },
    received_at: { type: Date, required: true },
    requester: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    priority: { type: String, enum: PRIORITIES, default: 'normal' },

    // Fields owned by the triage application
    status: { type: String, enum: STATUSES, default: 'open' },
    owner: { type: String, default: '' }, // '' = Unassigned
  },
  { timestamps: true }
);

module.exports = mongoose.model('Request', requestSchema);
