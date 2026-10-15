require('dotenv').config();
const mongoose = require('mongoose');
const { createApp } = require('./app');
const Request = require('./models/Request');

const PORT = process.env.PORT || 4000;
const { MONGODB_URI } = process.env;

async function main() {
  if (!MONGODB_URI) {
    console.error('MONGODB_URI is not set. Copy .env.example to .env and fill it in.');
    process.exit(1);
  }
  await mongoose.connect(MONGODB_URI);
  await Request.init(); // make sure the unique index on external_id exists
  createApp().listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
}

main().catch((err) => {
  console.error('Failed to start:', err.message);
  process.exit(1);
});
