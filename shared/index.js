require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

/** Barrel export for the shared FEMS library. */
module.exports = {
  ...require('./db'),
  ...require('./http'),
  ...require('./auth'),
  ...require('./validate'),
  ...require('./createApp'),
};
