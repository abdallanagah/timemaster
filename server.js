const express = require('express');
const cors = require('cors');
const config = require('./config/server.config');
const apiRouter = require('./routes/api.routes');
const ipModule = require('./modules/ip');
const dbModule = require('./modules/db');

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const isLocalIp = /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin);
    const isHfSpace = /^https:\/\/.*\.hf\.space$/.test(origin);
    if (allowedOrigins.indexOf(origin) !== -1 || isLocalIp || isHfSpace) {
      return callback(null, true);
    }
    return callback(new Error('CORS policy violation'), false);
  },
  credentials: true
}));
app.use(express.json());
app.use(express.static(config.STATIC_DIR));

// Setup main API router
app.use('/api', apiRouter);

// Initialize database schema migrations
dbModule.readDb();

const localIp = ipModule.getLocalIpAddress();

app.listen(config.PORT, () => {
  console.log(`=========================================`);
  console.log(`OPERATOR MATRIX RUNNING`);
  console.log(`Local Access: http://localhost:${config.PORT}`);
  console.log(`Mobile Access: http://${localIp}:${config.PORT}`);
  console.log(`Make sure phone is connected to same Wi-Fi!`);
  console.log(`=========================================`);
});
