const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'db.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper to read DB state
function readState() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      // Default state fallback if db.json was deleted
      const defaultState = {
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
      fs.writeFileSync(DB_PATH, JSON.stringify(defaultState, null, 2), 'utf8');
    }
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading database:", error);
    return {};
  }
}

// Helper to write DB state
function writeState(state) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(state, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error("Error writing database:", error);
    return false;
  }
}

// API Routes
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'abdalla' && password === '2000') {
    res.json({ status: "success", token: "auth-token-timemaster-2000" });
  } else {
    res.status(401).json({ status: "error", message: "Invalid credentials" });
  }
});

app.get('/api/state', (req, res) => {
  res.json(readState());
});

app.post('/api/state', (req, res) => {
  const success = writeState(req.body);
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
