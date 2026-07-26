const express = require('express');
const router = express.Router();
const authModule = require('../modules/auth');
const dbModule = require('../modules/db');
const ipModule = require('../modules/ip');
const config = require('../config/server.config');

// Authentication routes
router.post('/register', (req, res) => {
  const { username, password } = req.body;
  const result = authModule.registerUser(username, password);
  if (result.status === 'success') {
    res.json(result);
  } else {
    res.status(result.code).json(result);
  }
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const result = authModule.loginUser(username, password);
  if (result.status === 'success') {
    res.json(result);
  } else {
    res.status(result.code).json(result);
  }
});

// User State sync routes
router.get('/state', (req, res) => {
  const username = authModule.getSessionUser(req);
  if (!username) {
    return res.status(401).json({ status: "error", message: "Unauthorized session token" });
  }
  res.json(dbModule.getUserState(username));
});

router.post('/state', (req, res) => {
  const username = authModule.getSessionUser(req);
  if (!username) {
    return res.status(401).json({ status: "error", message: "Unauthorized session token" });
  }
  const success = dbModule.saveUserState(username, req.body);
  if (success) {
    res.json({ status: "success", message: "State saved successfully" });
  } else {
    res.status(500).json({ status: "error", message: "Failed to write data" });
  }
});

// Network Sync route
const localIp = ipModule.getLocalIpAddress();
router.get('/ip', (req, res) => {
  res.json({ ip: localIp, port: config.PORT, url: `http://${localIp}:${config.PORT}` });
});

module.exports = router;
