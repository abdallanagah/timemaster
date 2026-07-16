const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const activeSessions = {};

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'db.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Default User State Generator
function getDefaultUserState() {
  return {
    energy: 80,
    activeFocusTaskId: null,
    tasks: [],
    weapons: {
      deepFocus: { name: "Deep Focus", description: "Custom concentration block & break", active: false, startedAt: null, duration: 25, breakDuration: 5, sessionType: "focus", breakStartedAt: null },
      inboxZero: { name: "Inbox Zero Speedrun", description: "15-minute aggressive email/task processing", active: false, startedAt: null, duration: 15 },
      digitalDetox: { name: "Off-grid Mode", description: "120 minutes of offline system operation", active: false, startedAt: null, duration: 120 }
    },
    superpowers: {
      breathing: { name: "Tactical Breathing", description: "5-minute paced breathing for neural reset", duration: 5 },
      powerNap: { name: "Neuro-Nap", description: "20-minute rapid physical & mental recharge", duration: 20 },
      hydration: { name: "Hydration Surge", description: "2-minute physical hydration recharge", duration: 2 },
      reading: { name: "Insight Feed", description: "15-minute tactical reading or skill intake", duration: 15 }
    },
    rechargeState: { active: false, type: null, startedAt: null, duration: 0 },
    values: {
      health: { name: "Health & Vitality", score: 0 },
      mastery: { name: "Skill Mastery", score: 0 },
      creation: { name: "Creative Output", score: 0 },
      freedom: { name: "Freedom & Autonomy", score: 0 },
      family: { name: "Relationships & Family", score: 0 }
    }
  };
}

// Helper to read DB
function readDb() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const initialDb = { users: { default: getDefaultUserState() } };
      fs.writeFileSync(DB_PATH, JSON.stringify(initialDb, null, 2), 'utf8');
    }
    const data = fs.readFileSync(DB_PATH, 'utf8');
    let db = JSON.parse(data);
    
    // Migrate flat root database if it exists
    if (!db.users) {
      db = {
        users: {
          default: {
            password: "2000",
            state: {
              energy: db.energy !== undefined ? db.energy : 80,
              activeFocusTaskId: db.activeFocusTaskId || null,
              tasks: db.tasks || [],
              weapons: db.weapons || getDefaultUserState().weapons,
              superpowers: db.superpowers || getDefaultUserState().superpowers,
              rechargeState: db.rechargeState || getDefaultUserState().rechargeState,
              values: db.values || getDefaultUserState().values
            }
          }
        }
      };
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
    } else {
      // Check if default user is flat and migrate it
      if (db.users.default && !db.users.default.state) {
        db.users.default = {
          password: "2000",
          state: db.users.default
        };
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
      }
    }
    return db;
  } catch (error) {
    console.error("Error reading database:", error);
    return { users: {} };
  }
}

// Helper to write DB
function writeDb(db) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error("Error writing database:", error);
    return false;
  }
}

function getUserState(userId) {
  const db = readDb();
  const id = userId || 'default';
  if (!db.users[id]) {
    db.users[id] = {
      password: '',
      state: getDefaultUserState()
    };
    writeDb(db);
  }
  return db.users[id].state;
}

function saveUserState(userId, userState) {
  const db = readDb();
  const id = userId || 'default';
  if (!db.users[id]) {
    db.users[id] = {
      password: '',
      state: userState
    };
  } else {
    db.users[id].state = userState;
  }
  return writeDb(db);
}

// Helper to extract session username from request
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
    return activeSessions[token];
  }
  return null;
}

// API Routes
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ status: "error", message: "Username and password are required" });
  }
  
  const db = readDb();
  const normalizedUser = username.trim().toLowerCase();
  
  if (db.users[normalizedUser]) {
    return res.status(400).json({ status: "error", message: "Username already exists" });
  }
  
  db.users[normalizedUser] = {
    password: password,
    state: getDefaultUserState()
  };
  
  const success = writeDb(db);
  if (success) {
    const token = crypto.randomBytes(24).toString('hex');
    activeSessions[token] = normalizedUser;
    res.json({ status: "success", token: token });
  } else {
    res.status(500).json({ status: "error", message: "Failed to create account" });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ status: "error", message: "Username and password are required" });
  }
  
  const db = readDb();
  const normalizedUser = username.trim().toLowerCase();
  const user = db.users[normalizedUser];
  
  if (user && user.password === password) {
    const token = crypto.randomBytes(24).toString('hex');
    activeSessions[token] = normalizedUser;
    res.json({ status: "success", token: token });
  } else {
    res.status(401).json({ status: "error", message: "Invalid username or password" });
  }
});

app.get('/api/state', (req, res) => {
  const username = getSessionUser(req);
  if (!username) {
    return res.status(401).json({ status: "error", message: "Unauthorized session token" });
  }
  res.json(getUserState(username));
});

app.post('/api/state', (req, res) => {
  const username = getSessionUser(req);
  if (!username) {
    return res.status(401).json({ status: "error", message: "Unauthorized session token" });
  }
  const success = saveUserState(username, req.body);
  if (success) {
    res.json({ status: "success", message: "State saved successfully" });
  } else {
    res.status(500).json({ status: "error", message: "Failed to write data" });
  }
});

// Expose local IP address for mobile sync
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIp = getLocalIpAddress();

// API endpoint for UI to know its own local server address (to build mobile QR codes)
app.get('/api/ip', (req, res) => {
  res.json({ ip: localIp, port: PORT, url: `http://${localIp}:${PORT}` });
});

app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`OPERATOR MATRIX RUNNING`);
  console.log(`Local Access: http://localhost:${PORT}`);
  console.log(`Mobile Access: http://${localIp}:${PORT}`);
  console.log(`Make sure phone is connected to same Wi-Fi!`);
  console.log(`=========================================`);
});
