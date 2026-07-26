const express = require('express');
const cors = require('cors');
const config = require('./config/server.config');
const apiRouter = require('./routes/api.routes');
const ipModule = require('./modules/ip');
const dbModule = require('./modules/db');

const app = express();

app.use(cors());
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
