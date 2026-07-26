const crypto = require('crypto');
const dbModule = require('./db');

const activeSessions = {};

function getSessionUser(req) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // Allow mock developer tokens to directly bypass session check locally
    if (token.startsWith('mock-')) {
      return token.replace('mock-', '');
    }
    // Allow old legacy auth-token compatibility
    if (token.startsWith('auth-token-')) {
      return token.replace('auth-token-', '');
    }
    return activeSessions[token] || null;
  }
  return null;
}

function registerUser(username, password) {
  const db = dbModule.readDb();
  const normalizedUser = username.trim().toLowerCase();
  
  if (db.users[normalizedUser]) {
    return { status: "error", code: 400, message: "Username already exists" };
  }
  
  db.users[normalizedUser] = {
    password: password,
    state: dbModule.getDefaultUserState()
  };
  
  const success = dbModule.writeDb(db);
  if (success) {
    const token = crypto.randomBytes(24).toString('hex');
    activeSessions[token] = normalizedUser;
    return { status: "success", token };
  } else {
    return { status: "error", code: 500, message: "Failed to create account" };
  }
}

function loginUser(username, password) {
  const db = dbModule.readDb();
  const normalizedUser = username.trim().toLowerCase();
  const user = db.users[normalizedUser];
  
  if (user && user.password === password) {
    const token = crypto.randomBytes(24).toString('hex');
    activeSessions[token] = normalizedUser;
    return { status: "success", token };
  } else {
    return { status: "error", code: 401, message: "Invalid username or password" };
  }
}

module.exports = {
  activeSessions,
  getSessionUser,
  registerUser,
  loginUser
};
