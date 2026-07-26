const fs = require('fs');
const crypto = require('crypto');
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
      const salt1 = crypto.randomBytes(16).toString('hex');
      const hash1 = crypto.scryptSync("2000", salt1, 64).toString('hex');
      const salt2 = crypto.randomBytes(16).toString('hex');
      const hash2 = crypto.scryptSync("2000", salt2, 64).toString('hex');

      const initialDb = { 
        users: { 
          default: {
            password: `${salt1}:${hash1}`,
            state: getDefaultUserState()
          },
          abdalla: {
            password: `${salt2}:${hash2}`,
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

function validateStateSchema(state) {
  if (!state || typeof state !== 'object') return false;

  const requiredKeys = ['energy', 'activeFocusTaskId', 'tasks', 'weapons', 'superpowers', 'rechargeState', 'values'];
  const stateKeys = Object.keys(state);

  // Check that no unknown keys exist at the root
  for (const key of stateKeys) {
    if (!requiredKeys.includes(key)) return false;
  }

  // Check that all required keys are present
  for (const key of requiredKeys) {
    if (!stateKeys.includes(key)) return false;
  }

  // Type checks
  if (typeof state.energy !== 'number' || state.energy < 0 || state.energy > 100) return false;
  if (state.activeFocusTaskId !== null && typeof state.activeFocusTaskId !== 'string') return false;
  if (!Array.isArray(state.tasks)) return false;
  if (state.tasks.length > 1000) return false; // Anti DoS limit

  // Validate tasks
  for (const task of state.tasks) {
    if (!task || typeof task !== 'object') return false;
    if (typeof task.id !== 'string' || !task.id) return false;
    if (typeof task.text !== 'string' || task.text.length > 500) return false;
    if (!['inbox', 'q1', 'q2', 'q3', 'q4'].includes(task.quadrant)) return false;
    if (!['active', 'completed'].includes(task.status)) return false;
    if (!['general', 'weapon', 'value', 'superpower'].includes(task.type)) return false;
    
    // Optional details
    if (task.details !== undefined && (task.details !== null && typeof task.details !== 'string')) return false;
    
    // Optional subtasks array
    if (task.subtasks !== undefined) {
      if (!Array.isArray(task.subtasks)) return false;
      if (task.subtasks.length > 100) return false;
      for (const sub of task.subtasks) {
        if (!sub || typeof sub !== 'object') return false;
        if (typeof sub.id !== 'string' || !sub.id) return false;
        if (typeof sub.text !== 'string' || sub.text.length > 200) return false;
        if (typeof sub.completed !== 'boolean') return false;
      }
    }
  }

  // Validate weapons configuration map
  if (!state.weapons || typeof state.weapons !== 'object') return false;
  for (const k of Object.keys(state.weapons)) {
    const w = state.weapons[k];
    if (!w || typeof w !== 'object') return false;
    if (typeof w.name !== 'string' || w.name.length > 100) return false;
    if (typeof w.description !== 'string' || w.description.length > 300) return false;
    if (typeof w.active !== 'boolean') return false;
    if (typeof w.duration !== 'number') return false;
  }

  // Validate values scorecard map
  if (!state.values || typeof state.values !== 'object') return false;
  for (const k of Object.keys(state.values)) {
    const v = state.values[k];
    if (!v || typeof v !== 'object') return false;
    if (typeof v.name !== 'string' || v.name.length > 100) return false;
    if (typeof v.score !== 'number') return false;
  }

  // Validate superpowers map
  if (!state.superpowers || typeof state.superpowers !== 'object') return false;
  for (const k of Object.keys(state.superpowers)) {
    const p = state.superpowers[k];
    if (!p || typeof p !== 'object') return false;
    if (typeof p.name !== 'string') return false;
    if (typeof p.description !== 'string') return false;
    if (typeof p.duration !== 'number') return false;
  }

  // Validate recharge state
  if (!state.rechargeState || typeof state.rechargeState !== 'object') return false;
  if (typeof state.rechargeState.active !== 'boolean') return false;

  return true;
}

module.exports = {
  getDefaultUserState,
  readDb,
  writeDb,
  getUserState,
  saveUserState,
  validateStateSchema
};
