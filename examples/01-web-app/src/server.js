'use strict';

const { createApp } = require('./app');
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}
createApp().listen(port, () => console.log(`Training API listening on port ${port}`));
