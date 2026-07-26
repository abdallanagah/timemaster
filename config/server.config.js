const path = require('path');

module.exports = {
  PORT: process.env.PORT || 3000,
  DB_PATH: path.join(__dirname, '..', 'db.json'),
  STATIC_DIR: path.join(__dirname, '..', 'public')
};
