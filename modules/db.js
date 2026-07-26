const fs = require('fs');
const config = require('../config/server.config');

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
    if (!fs.existsSync(config.DB_PATH)) {
      const initialDb = { 
        users: { 
          default: {
            password: "2000",
            state: getDefaultUserState()
          }
        } 
      };
      fs.writeFileSync(config.DB_PATH, JSON.stringify(initialDb, null, 2), 'utf8');
    }
    const data = fs.readFileSync(config.DB_PATH, 'utf8');
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
      fs.writeFileSync(config.DB_PATH, JSON.stringify(db, null, 2), 'utf8');
    } else {
      // Check if default user is flat and migrate it
      if (db.users.default && !db.users.default.state) {
        db.users.default = {
          password: "2000",
          state: db.users.default
        };
        fs.writeFileSync(config.DB_PATH, JSON.stringify(db, null, 2), 'utf8');
      }
    }
    return db;
  } catch (error) {
    console.error("Critical error reading database file:", error);
    throw error; // Propagate critical database read failures
  }
}

// Helper to write DB atomically using temporary replacement files
function writeDb(db) {
  const tempPath = config.DB_PATH + '.tmp';
  try {
    fs.writeFileSync(tempPath, JSON.stringify(db, null, 2), 'utf8');
    fs.renameSync(tempPath, config.DB_PATH);
    return true;
  } catch (error) {
    console.error("Error writing database atomically:", error);
    // Cleanup temporary buffer if it was created
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    } catch (_) {}
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

module.exports = {
  getDefaultUserState,
  readDb,
  writeDb,
  getUserState,
  saveUserState
};
