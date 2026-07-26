/**
 * TimeMaster Router Controller Module
 * Maps HTTP REST API resource requests directly to logical module services.
 * Implements strict security authorization guards for task state transfers.
 */

const express = require('express');
const router = express.Router();
const authModule = require('../modules/auth');
const dbModule = require('../modules/db');
const ipModule = require('../modules/ip');
const config = require('../config/server.config');

/**
 * POST /api/register
 * Enrolls a new user account partition.
 */
router.post('/register', (req, res) => {
  const { username, password } = req.body || {};
  const result = authModule.registerUser(username, password);
  if (result.status === 'success') {
    res.json(result);
  } else {
    res.status(result.code || 400).json(result);
  }
});

/**
 * POST /api/login
 * Validates user credentials and issues session tokens.
 */
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const result = authModule.loginUser(username, password);
  if (result.status === 'success') {
    res.json(result);
  } else {
    res.status(result.code || 401).json(result);
  }
});

/**
 * GET /api/state
 * Retrieves the state document of the authorized session user.
 */
router.get('/state', (req, res) => {
  const username = authModule.getSessionUser(req);
  if (!username) {
    return res.status(401).json({ status: "error", message: "Unauthorized session token" });
  }
  res.json(dbModule.getUserState(username));
});

/**
 * POST /api/state
 * Persists changes to the user's workspace dashboard state.
 */
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

/**
 * GET /api/ip
 * Exposes the active local server IPv4 address and port to build client sync QR targets.
 * Evaluates dynamically on every request to account for network card transitions.
 */
router.get('/ip', (req, res) => {
  try {
    const localIp = ipModule.getLocalIpAddress();
    res.json({ 
      ip: localIp, 
      port: config.PORT, 
      url: `http://${localIp}:${config.PORT}` 
    });
  } catch (error) {
    console.error("Failed to fetch IP details dynamically:", error);
    res.status(500).json({ status: "error", message: "Failed to query system network adapters" });
  }
});

module.exports = router;
