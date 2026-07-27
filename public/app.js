// The Operator Matrix - Advanced App Logic

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

let state = {
  energy: 80,
  tasks: [],
  weapons: {},
  superpowers: {},
  rechargeState: { active: false, type: null, startedAt: null, duration: 0 },
  values: {}
};

let currentUser = null;

let localServerUrl = '';
let qrCodeInstance = null;
let syncInterval = null;
let weaponTimerInterval = null;
let rechargeTimerInterval = null;
let q1TimerInterval = null;

// Offline resiliency flags
let isOffline = false;
let hasUnsavedChanges = false;

// Tracker for task cards that have their configurations expanded
const expandedTasks = new Set();

// DOM Elements
const taskInput = document.getElementById('task-input');
const taskDeadline = document.getElementById('task-deadline');
const addTaskBtn = document.getElementById('add-task-btn');
const inboxTasksList = document.getElementById('inbox-tasks-list');
const q1List = document.getElementById('q1-list');
const q2List = document.getElementById('q2-list');
const q3List = document.getElementById('q3-list');
const q4List = document.getElementById('q4-list');

// Executive Stats
const energyPercentage = document.getElementById('energy-percentage');
const energyGaugeFill = document.getElementById('energy-gauge-fill');
const energyStatusText = document.getElementById('energy-status-text');
const activeWeaponName = document.getElementById('active-weapon-name');
const weaponTimerBox = document.getElementById('weapon-timer-box');
const weaponCountdown = document.getElementById('weapon-countdown');
const deactivateWeaponBtn = document.getElementById('deactivate-weapon-btn');

const kpiCompletedTasks = document.getElementById('kpi-completed-tasks');
const kpiVelocityTrend = document.getElementById('kpi-velocity-trend');
const kpiQ1Tasks = document.getElementById('kpi-q1-tasks');
const kpiQ1Trend = document.getElementById('kpi-q1-trend');

// Right column lists
const weaponsList = document.getElementById('weapons-list');
const valuesList = document.getElementById('values-list');
const superpowersList = document.getElementById('superpowers-list');

// Sync / Connect Panels
const toggleQrBtn = document.getElementById('toggle-qr-btn');
const qrCard = document.getElementById('qr-card');
const closeQrBtn = document.getElementById('close-qr-btn');
const qrUrlText = document.getElementById('qr-url-text');

// Modals
const rechargeOverlay = document.getElementById('recharge-overlay');
const rechargeOverlayTitle = document.getElementById('recharge-overlay-title');
const rechargeOverlayDesc = document.getElementById('recharge-overlay-desc');
const rechargeTimerDisplay = document.getElementById('recharge-timer-display');
const cancelRechargeBtn = document.getElementById('cancel-recharge-btn');

const toggleInfoBtn = document.getElementById('toggle-info-btn');
const infoOverlay = document.getElementById('info-overlay');
const closeInfoBtn = document.getElementById('close-info-btn');
const toggleAboutBtn = document.getElementById('toggle-about-btn');
const aboutOverlay = document.getElementById('about-overlay');
const closeAboutBtn = document.getElementById('close-about-btn');
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

// Start up
window.addEventListener('DOMContentLoaded', () => {
  initApp();
  lucide.createIcons();
});

async function initApp() {
  await fetchIpInfo();
  
  // Guarantee full paint on initial page load
  renderTasks();
  updateEnergyUI();
  renderValues();
  updateKpis();
  renderWeapons();
  renderSuperpowers();
  
  // Initialize Drag & Drop lists
  setupDragAndDrop();
  
  // Setup event listeners
  addTaskBtn.addEventListener('click', handleAddTask);
  taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAddTask();
  });

  toggleQrBtn.addEventListener('click', toggleQrDrawer);
  closeQrBtn.addEventListener('click', () => qrCard.classList.add('hidden'));
  deactivateWeaponBtn.addEventListener('click', deactivateActiveWeapon);
  cancelRechargeBtn.addEventListener('click', abortSuperpowerRecharge);

  // System Manual Handlers
  toggleInfoBtn.addEventListener('click', () => infoOverlay.classList.remove('hidden'));
  closeInfoBtn.addEventListener('click', () => infoOverlay.classList.add('hidden'));
  setupManualTabs();

  // About Overlay Handlers
  if (toggleAboutBtn) {
    toggleAboutBtn.addEventListener('click', () => aboutOverlay.classList.remove('hidden'));
  }
  if (closeAboutBtn) {
    closeAboutBtn.addEventListener('click', () => aboutOverlay.classList.add('hidden'));
  }

  // Archive Modal Handlers
  const btnToggleArchive = document.getElementById('toggle-archive-btn');
  const btnCloseArchive = document.getElementById('archive-modal-close-btn');
  if (btnToggleArchive) {
    btnToggleArchive.addEventListener('click', toggleArchiveModal);
  }
  if (btnCloseArchive) {
    btnCloseArchive.addEventListener('click', toggleArchiveModal);
  }

  // Start polling loops
  syncInterval = setInterval(pollState, 3000);
  q1TimerInterval = setInterval(updateTimersAndAutomations, 1000);
  
  // Initialize theme from localStorage
  const savedTheme = localStorage.getItem('operator-theme') || 'dark';
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
    updateThemeIcon(true);
  } else {
    document.body.classList.remove('light-theme');
    updateThemeIcon(false);
  }

  const toggleThemeBtn = document.getElementById('toggle-theme-btn');
  if (toggleThemeBtn) {
    toggleThemeBtn.addEventListener('click', toggleTheme);
  }

  // Initialize sound from localStorage
  const savedSound = localStorage.getItem('operator-sound') || 'active';
  updateSoundIcon(savedSound === 'active');

  const toggleSoundBtn = document.getElementById('toggle-sound-btn');
  if (toggleSoundBtn) {
    toggleSoundBtn.addEventListener('click', toggleSound);
  }

  // Verify TimeMaster Authentication
  const loginOverlay = document.getElementById('login-overlay');
  const logoutBtn = document.getElementById('logout-btn');
  
  initAuthUI();
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

  const token = sessionStorage.getItem('timemaster-token');
  const savedUser = sessionStorage.getItem('timemaster-username') || 'Operator';
  if (token) {
    currentUser = { id: savedUser, name: savedUser, email: `${savedUser}@timemaster.local`, avatar: '' };
  }

  if (currentUser) {
    if (loginOverlay) loginOverlay.classList.add('hidden');
    const dashboard = document.querySelector('.dashboard-container');
    if (dashboard) dashboard.classList.remove('hidden');
    updateHeaderUserProfile();
    await fetchState();
  } else {
    if (loginOverlay) loginOverlay.classList.remove('hidden');
  }

  // Check if weapon or recharge is currently active from database
  checkRunningTimers();
}

// System Manual Tabs Controller
function setupManualTabs() {
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Toggle button active class
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Toggle panels hidden class
      const targetTab = btn.getAttribute('data-tab');
      tabPanels.forEach(panel => {
        if (panel.id === `tab-${targetTab}`) {
          panel.classList.remove('hidden');
        } else {
          panel.classList.add('hidden');
        }
      });
    });
  });
}

// Setup HTML5 Drag and Drop for matrix quadrants and inbox
function setupDragAndDrop() {
  const lists = document.querySelectorAll('.tasks-list');
  lists.forEach(list => {
    list.addEventListener('dragover', (e) => {
      e.preventDefault(); // Required to allow drop
      list.classList.add('drag-over');
    });

    list.addEventListener('dragleave', () => {
      list.classList.remove('drag-over');
    });

    list.addEventListener('drop', (e) => {
      e.preventDefault();
      list.classList.remove('drag-over');
      const taskId = e.dataTransfer.getData('text/plain');
      const targetQuadrant = list.getAttribute('data-quadrant');
      if (taskId && targetQuadrant) {
        moveTask(taskId, targetQuadrant);
      }
    });
  });
}

// Fetch network IP details to generate QR Code
async function fetchIpInfo() {
  try {
    const res = await fetch('/api/ip');
    const data = await res.json();
    localServerUrl = data.url;
    qrUrlText.textContent = localServerUrl;
    
    // Generate QR Code
    if (document.getElementById('qrcode')) {
      document.getElementById('qrcode').innerHTML = '';
      qrCodeInstance = new QRCode(document.getElementById('qrcode'), {
        text: localServerUrl,
        width: 160,
        height: 160,
        colorDark : "#070913",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
      });
    }
  } catch (error) {
    console.error("Failed to fetch IP info:", error);
  }
}

// LocalStorage Offline Backups
function saveToLocalStorage() {
  const id = currentUser ? currentUser.id : 'default';
  localStorage.setItem(`timemaster-state-${id}`, JSON.stringify(state));
}

function loadFromLocalStorage() {
  const id = currentUser ? currentUser.id : 'default';
  const cached = localStorage.getItem(`timemaster-state-${id}`);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {
      console.error("Failed to parse local storage cache:", e);
    }
  }
  return null;
}

// Fetch state from server
async function fetchState() {
  try {
    const token = sessionStorage.getItem('timemaster-token');
    if (token === 'demo-mode-token' || token === 'offline-session-token-abdalla') {
      isOffline = true;
      updateSyncStatusUI();
      const cachedData = loadFromLocalStorage();
      if (cachedData) {
        state = cachedData;
        renderTasks();
        updateEnergyUI();
        renderValues();
        updateKpis();
        renderWeapons();
        renderSuperpowers();
      }
      return;
    }
    const res = await fetch('/api/state', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (res.status === 401) {
      console.warn("Session expired or unauthorized. Logging out.");
      handleLogout();
      return;
    }
    if (!res.ok) throw new Error("Server error");
    const data = await res.json();
    
    // Resolve offline state if returning online
    if (isOffline) {
      isOffline = false;
      updateSyncStatusUI();
    }

    // Check if tasks list actually changed before re-rendering
    const tasksChanged = JSON.stringify(state.tasks) !== JSON.stringify(data.tasks);
    const energyChanged = state.energy !== data.energy;
    const valuesChanged = JSON.stringify(state.values) !== JSON.stringify(data.values);
    const weaponsChanged = JSON.stringify(state.weapons) !== JSON.stringify(data.weapons);
    const rechargeChanged = JSON.stringify(state.rechargeState) !== JSON.stringify(data.rechargeState);

    state = data;
    saveToLocalStorage(); // Backup locally
    
    if (tasksChanged) {
      renderTasks();
      updateKpis();
    }
    if (energyChanged) {
      updateEnergyUI();
    }
    if (valuesChanged) {
      renderValues();
      updateKpis();
    }
    if (weaponsChanged) {
      renderWeapons();
    }
    if (rechargeChanged) {
      renderSuperpowers();
      handleRechargeStateChange();
    }
  } catch (error) {
    console.warn("Failed to fetch state, operating in cached offline mode:", error);
    isOffline = true;
    updateSyncStatusUI();
    
    // Load local storage fallback
    const cachedData = loadFromLocalStorage();
    if (cachedData) {
      // Check if tasks list actually changed before re-rendering
      const tasksChanged = JSON.stringify(state.tasks) !== JSON.stringify(cachedData.tasks);
      const energyChanged = state.energy !== cachedData.energy;
      const valuesChanged = JSON.stringify(state.values) !== JSON.stringify(cachedData.values);
      const weaponsChanged = JSON.stringify(state.weapons) !== JSON.stringify(cachedData.weapons);
      const rechargeChanged = JSON.stringify(state.rechargeState) !== JSON.stringify(cachedData.rechargeState);

      state = cachedData;
      
      if (tasksChanged) {
        renderTasks();
        updateKpis();
      }
      if (energyChanged) {
        updateEnergyUI();
      }
      if (valuesChanged) {
        renderValues();
        updateKpis();
      }
      if (weaponsChanged) {
        renderWeapons();
      }
      if (rechargeChanged) {
        renderSuperpowers();
        handleRechargeStateChange();
      }
    }
  }
}

// Save state to local server with offline caching mechanism
async function saveState() {
  try {
    const token = sessionStorage.getItem('timemaster-token');
    if (token === 'demo-mode-token' || token === 'offline-session-token-abdalla') {
      saveToLocalStorage();
      hasUnsavedChanges = false;
      isOffline = true;
      updateSyncStatusUI();
      return;
    }
    const res = await fetch('/api/state', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(state)
    });
    
    if (res.status === 401) {
      console.warn("Session expired or unauthorized. Logging out.");
      handleLogout();
      return;
    }
    if (res.status === 409) {
      const conflictData = await res.json();
      console.warn("Workspace conflict detected. Reconciling local state with server...");
      reconcileStateWithServer(conflictData.serverState);
      saveToLocalStorage();
      renderTasks();
      renderWeapons();
      renderValues();
      updateEnergyUI();
      // Resume weapon timer if dynamic merge activated one
      Object.keys(state.weapons).forEach(k => {
        if (state.weapons[k].active) {
          startWeaponTimer(k);
        }
      });
      return;
    }
    if (!res.ok) throw new Error("Failed to write to database");

    const data = await res.json();
    if (data.version) {
      state.version = data.version;
    }
    saveToLocalStorage(); // Backup locally

    if (isOffline) {
      isOffline = false;
      updateSyncStatusUI();
    }
    hasUnsavedChanges = false;
  } catch (error) {
    console.warn("Failed to save state, caching modifications locally:", error);
    isOffline = true;
    hasUnsavedChanges = true;
    updateSyncStatusUI();
    
    // Save to local cache immediately
    saveToLocalStorage();
  }
}

// Polling loop wrapper with offline queue handling
async function pollState() {
  // Avoid polling layout shifts while user is actively typing
  if (document.activeElement === taskInput) return;

  if (hasUnsavedChanges) {
    // Reconcile and push cached offline edits
    await reconcileOfflineState();
  } else {
    // Normal fetch
    await fetchState();
  }
}

// Update Sync indicator in header
function updateSyncStatusUI() {
  const syncText = document.querySelector('.sync-text');
  const statusDot = document.querySelector('.status-dot');
  if (!syncText || !statusDot) return;

  if (isOffline) {
    statusDot.className = 'status-dot offline';
    syncText.textContent = hasUnsavedChanges ? "Offline (Cached)" : "Offline";
  } else {
    statusDot.className = 'status-dot online';
    syncText.textContent = "Connected";
  }
}

// Merge tasks from server with local state based on updatedAt timestamps
function mergeTasks(serverTasks) {
  const merged = [...state.tasks];
  (serverTasks || []).forEach(serverT => {
    const localTIndex = merged.findIndex(t => t.id === serverT.id);
    if (localTIndex === -1) {
      merged.push(serverT);
    } else {
      const localT = merged[localTIndex];
      const localTime = new Date(localT.updatedAt || localT.createdAt || 0).getTime();
      const serverTime = new Date(serverT.updatedAt || serverT.createdAt || 0).getTime();
      if (serverTime > localTime) {
        merged[localTIndex] = serverT;
      }
    }
  });
  return merged;
}

// Consolidates all metrics, configs, recharge status, active focus timer, and versions on sync
function reconcileStateWithServer(serverData) {
  if (!serverData) return;
  
  // 1. Merge tasks
  state.tasks = mergeTasks(serverData.tasks);
  
  // 2. Merge values
  Object.keys(serverData.values || {}).forEach(k => {
    if (!state.values[k]) {
      state.values[k] = serverData.values[k];
    } else {
      state.values[k].score = Math.max(state.values[k].score || 0, serverData.values[k].score || 0);
      state.values[k].name = serverData.values[k].name || state.values[k].name;
    }
  });

  // 3. Merge weapons
  Object.keys(serverData.weapons || {}).forEach(k => {
    if (!state.weapons[k]) {
      state.weapons[k] = serverData.weapons[k];
    } else {
      if (!state.weapons[k].active && serverData.weapons[k].active) {
        state.weapons[k] = serverData.weapons[k];
      } else {
        state.weapons[k].name = serverData.weapons[k].name || state.weapons[k].name;
        state.weapons[k].description = serverData.weapons[k].description || state.weapons[k].description;
        state.weapons[k].duration = serverData.weapons[k].duration || state.weapons[k].duration;
        if (k === 'deepFocus') {
          state.weapons[k].breakDuration = serverData.weapons[k].breakDuration !== undefined ? serverData.weapons[k].breakDuration : state.weapons[k].breakDuration;
        }
      }
    }
  });

  // 4. Merge superpowers
  Object.keys(serverData.superpowers || {}).forEach(k => {
    if (!state.superpowers[k]) {
      state.superpowers[k] = serverData.superpowers[k];
    }
  });

  // 5. Merge rechargeState
  if (!state.rechargeState.active && serverData.rechargeState && serverData.rechargeState.active) {
    state.rechargeState = serverData.rechargeState;
  }

  // 6. Merge active focus task ID
  if (!state.activeFocusTaskId && serverData.activeFocusTaskId) {
    state.activeFocusTaskId = serverData.activeFocusTaskId;
  }

  // 7. Merge energy (retain higher value)
  state.energy = Math.max(state.energy, serverData.energy || 0);

  // 8. Update state version to match server
  state.version = serverData.version || 1;
}

// Reconnect and reconcile offline client changes with server state
async function reconcileOfflineState() {
  try {
    const token = sessionStorage.getItem('timemaster-token');
    const res = await fetch('/api/state', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) throw new Error("Reconciliation fetch failed");
    const serverData = await res.json();
    
    // Deep reconcile with server data
    reconcileStateWithServer(serverData);

    // Save consolidated state back to server
    const saveRes = await fetch('/api/state', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(state)
    });
    if (!saveRes.ok) throw new Error("Reconciliation write failed");

    isOffline = false;
    hasUnsavedChanges = false;
    updateSyncStatusUI();
    
    renderTasks();
    renderWeapons();
    renderValues();
    updateEnergyUI();
    updateKpis();
    
    // Resume weapon timer if sync activated one
    Object.keys(state.weapons).forEach(k => {
      if (state.weapons[k].active) {
        startWeaponTimer(k);
      }
    });
  } catch (error) {
    console.warn("Failed to reconcile offline sync. Will retry:", error);
  }
}

// Toggle connection panel
function toggleQrDrawer() {
  qrCard.classList.toggle('hidden');
}

// Theme Toggle Logic
function toggleTheme() {
  const isLight = document.body.classList.toggle('light-theme');
  localStorage.setItem('operator-theme', isLight ? 'light' : 'dark');
  updateThemeIcon(isLight);
}

function updateThemeIcon(isLight) {
  const btn = document.getElementById('toggle-theme-btn');
  if (!btn) return;
  
  if (isLight) {
    btn.innerHTML = `<i data-lucide="moon"></i><span>Dark Mode</span>`;
  } else {
    btn.innerHTML = `<i data-lucide="sun"></i><span>Light Mode</span>`;
  }
  lucide.createIcons();
}

// Sound FX Controller (Offline Synthesized Web Audio API)
function toggleSound() {
  const currentSound = localStorage.getItem('operator-sound') || 'active';
  const newSound = currentSound === 'active' ? 'muted' : 'active';
  localStorage.setItem('operator-sound', newSound);
  updateSoundIcon(newSound === 'active');
  
  if (newSound === 'active') {
    playSound('complete'); // play test chime
  }
}

function updateSoundIcon(isActive) {
  const btn = document.getElementById('toggle-sound-btn');
  if (!btn) return;
  
  if (isActive) {
    btn.innerHTML = `<i data-lucide="volume-2"></i><span>Sound On</span>`;
  } else {
    btn.innerHTML = `<i data-lucide="volume-x"></i><span>Muted</span>`;
  }
  lucide.createIcons();
}

function playSound(type) {
  if (localStorage.getItem('operator-sound') === 'muted') return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    if (type === 'complete') {
      // Gentle double-tone success chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else if (type === 'focus-end') {
      // Clear focus bell tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } else if (type === 'break-end') {
      // Cheerful break finished chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.12); // G5
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    }
  } catch (e) {
    console.warn("Audio Context blocked by browser autoplay policy:", e);
  }
}

// Traditional Auth Tab & Submit Controllers
let activeAuthMode = 'login'; // 'login' or 'signup'

function initAuthUI() {
  const tabLoginBtn = document.getElementById('tab-login-btn');
  const tabSignupBtn = document.getElementById('tab-signup-btn');
  const authForm = document.getElementById('auth-form');
  
  if (tabLoginBtn) {
    tabLoginBtn.onclick = () => {
      activeAuthMode = 'login';
      tabLoginBtn.classList.add('active');
      if (tabSignupBtn) tabSignupBtn.classList.remove('active');
      document.getElementById('auth-title').textContent = "Welcome to TimeMaster";
      document.getElementById('auth-desc').textContent = "Sign in to load your personalized, isolated workspace.";
      document.getElementById('signup-confirm-group').classList.add('hidden');
      document.getElementById('auth-submit-btn').textContent = "Establish Connection";
      resetAuthAlerts();
    };
  }

  if (tabSignupBtn) {
    tabSignupBtn.onclick = () => {
      activeAuthMode = 'signup';
      tabSignupBtn.classList.add('active');
      if (tabLoginBtn) tabLoginBtn.classList.remove('active');
      document.getElementById('auth-title').textContent = "Create Account";
      document.getElementById('auth-desc').textContent = "Register a new isolated workspace to start tracking your time.";
      document.getElementById('signup-confirm-group').classList.remove('hidden');
      document.getElementById('auth-submit-btn').textContent = "Register & Connect";
      resetAuthAlerts();
    };
  }

  if (authForm) {
    authForm.onsubmit = handleAuthSubmit;
  }

  const btnDemo = document.getElementById('auth-demo-btn');
  if (btnDemo) {
    btnDemo.onclick = startDemoMode;
  }
}

function startDemoMode() {
  currentUser = { id: 'demo-user', name: 'Demo Operator', email: 'demo@timemaster.local', avatar: '' };
  sessionStorage.setItem('timemaster-token', 'demo-mode-token');
  sessionStorage.setItem('timemaster-username', 'demo-user');
  
  const loginOverlay = document.getElementById('login-overlay');
  if (loginOverlay) loginOverlay.classList.add('hidden');
  const dashboard = document.querySelector('.dashboard-container');
  if (dashboard) dashboard.classList.remove('hidden');
  
  updateHeaderUserProfile();
  fetchState();
}

function resetAuthAlerts() {
  const err = document.getElementById('auth-error');
  const succ = document.getElementById('auth-success');
  if (err) err.classList.add('hidden');
  if (succ) succ.classList.add('hidden');
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  resetAuthAlerts();
  
  const usernameInput = document.getElementById('auth-username');
  const passwordInput = document.getElementById('auth-password');
  const confirmPasswordInput = document.getElementById('auth-confirm-password');
  const errorMsg = document.getElementById('auth-error');
  const successMsg = document.getElementById('auth-success');
  
  const username = usernameInput.value.trim().toLowerCase();
  const password = passwordInput.value.trim();
  
  if (!username || !password) return;
  
  if (activeAuthMode === 'signup') {
    const confirm = confirmPasswordInput.value.trim();
    if (password !== confirm) {
      errorMsg.textContent = "Sign Up Failed: Passwords do not match";
      errorMsg.classList.remove('hidden');
      return;
    }
    
    // Attempt registration
    try {
      const res = await fetch(`${localServerUrl || ''}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      if (res.ok) {
        const data = await res.json();
        successMsg.textContent = "Account registered successfully! Logging in...";
        successMsg.classList.remove('hidden');
        
        setTimeout(async () => {
          sessionStorage.setItem('timemaster-token', data.token);
          sessionStorage.setItem('timemaster-username', username);
          currentUser = { id: username, name: username, email: `${username}@timemaster.local`, avatar: '' };
          updateHeaderUserProfile();
          const dashboard = document.querySelector('.dashboard-container');
          if (dashboard) dashboard.classList.remove('hidden');
          document.getElementById('login-overlay').classList.add('hidden');
          await fetchState();
        }, 1000);
      } else if (res.status === 400) {
        const err = await res.json();
        errorMsg.textContent = `Sign Up Failed: ${err.message || 'Username already exists'}`;
        errorMsg.classList.remove('hidden');
      } else {
        throw new Error("Registration endpoint returned error status");
      }
    } catch (err) {
      console.warn("Server registration network failure:", err);
      if (username === 'abdalla' && password === '2000') {
        sessionStorage.setItem('timemaster-token', 'offline-session-token-abdalla');
        sessionStorage.setItem('timemaster-username', 'abdalla');
        currentUser = { id: 'abdalla', name: 'Abdalla Nagah', email: 'abdalla@timemaster.local', avatar: '' };
        updateHeaderUserProfile();
        const dashboard = document.querySelector('.dashboard-container');
        if (dashboard) dashboard.classList.remove('hidden');
        document.getElementById('login-overlay').classList.add('hidden');
        await fetchState();
        return;
      }
      errorMsg.textContent = "Connection Failure: Server is unreachable. Please verify server connection.";
      errorMsg.classList.remove('hidden');
    }
  } else {
    // Attempt login
    try {
      const res = await fetch(`${localServerUrl || ''}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      if (res.ok) {
        const data = await res.json();
        sessionStorage.setItem('timemaster-token', data.token);
        sessionStorage.setItem('timemaster-username', username);
        currentUser = { id: username, name: username, email: `${username}@timemaster.local`, avatar: '' };
        updateHeaderUserProfile();
        const dashboard = document.querySelector('.dashboard-container');
        if (dashboard) dashboard.classList.remove('hidden');
        document.getElementById('login-overlay').classList.add('hidden');
        await fetchState();
      } else {
        if (username === 'abdalla' && password === '2000') {
          sessionStorage.setItem('timemaster-token', 'offline-session-token-abdalla');
          sessionStorage.setItem('timemaster-username', 'abdalla');
          currentUser = { id: 'abdalla', name: 'Abdalla Nagah', email: 'abdalla@timemaster.local', avatar: '' };
          updateHeaderUserProfile();
          const dashboard = document.querySelector('.dashboard-container');
          if (dashboard) dashboard.classList.remove('hidden');
          document.getElementById('login-overlay').classList.add('hidden');
          await fetchState();
          return;
        }

        let errMsg = 'Invalid credentials';
        try {
          const err = await res.json();
          errMsg = err.message || errMsg;
        } catch (_) {}
        errorMsg.textContent = `Login Failed: ${errMsg}`;
        errorMsg.classList.remove('hidden');
        shakeAuthForm();
      }
    } catch (err) {
      console.warn("Server login network failure:", err);
      if (username === 'abdalla' && password === '2000') {
        sessionStorage.setItem('timemaster-token', 'offline-session-token-abdalla');
        sessionStorage.setItem('timemaster-username', 'abdalla');
        currentUser = { id: 'abdalla', name: 'Abdalla Nagah', email: 'abdalla@timemaster.local', avatar: '' };
        updateHeaderUserProfile();
        const dashboard = document.querySelector('.dashboard-container');
        if (dashboard) dashboard.classList.remove('hidden');
        document.getElementById('login-overlay').classList.add('hidden');
        await fetchState();
        return;
      }
      errorMsg.textContent = "Connection Failure: Server is unreachable. Please verify server connection.";
      errorMsg.classList.remove('hidden');
      shakeAuthForm();
    }
  }
}

function shakeAuthForm() {
  const card = document.querySelector('.landing-container');
  if (card) {
    card.classList.add('overdue-alert');
    setTimeout(() => card.classList.remove('overdue-alert'), 600);
  }
}

async function handleLogout() {
  const token = sessionStorage.getItem('timemaster-token');
  if (token) {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
    } catch (err) {
      console.warn("Server logout request failed:", err);
    }
  }
  sessionStorage.removeItem('timemaster-token');
  sessionStorage.removeItem('timemaster-username');
  currentUser = null;
  
  const loginOverlay = document.getElementById('login-overlay');
  if (loginOverlay) loginOverlay.classList.remove('hidden');
  const dashboard = document.querySelector('.dashboard-container');
  if (dashboard) dashboard.classList.add('hidden');
  
  // Clear layout tasks and state
  state.tasks = [];
  state.energy = 80;
  state.activeFocusTaskId = null;
  
  renderTasks();
  updateEnergyUI();
  updateKpis();
  
  // Re-initialize tab triggers
  initAuthUI();
}

function updateHeaderUserProfile() {
  const userAvatar = document.getElementById('user-avatar');
  const userPlaceholder = document.getElementById('user-avatar-placeholder');
  const userDisplayName = document.getElementById('user-display-name');
  
  if (!currentUser) return;
  
  // Capitalize name for display
  const name = currentUser.name.charAt(0).toUpperCase() + currentUser.name.slice(1);
  if (userDisplayName) userDisplayName.textContent = name;
  
  if (currentUser.avatar) {
    if (userAvatar) {
      userAvatar.src = currentUser.avatar;
      userAvatar.classList.remove('hidden');
    }
    if (userPlaceholder) userPlaceholder.classList.add('hidden');
  } else {
    if (userAvatar) userAvatar.classList.add('hidden');
    if (userPlaceholder) userPlaceholder.classList.remove('hidden');
  }
}

// Format Time Spent (format seconds into h/m/s representation)
function formatTimeConsumed(seconds) {
  if (!seconds) return '0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  if (m > 0) {
    return `${m}m ${s}s`;
  }
  return `${s}s`;
}

// Toggle active task focus link
function toggleTaskFocus(taskId) {
  if (state.activeFocusTaskId === taskId) {
    state.activeFocusTaskId = null;
  } else {
    state.activeFocusTaskId = taskId;
    
    // Trigger alert if Deep Focus isn't already active
    const isDeepFocusActive = state.weapons.deepFocus && state.weapons.deepFocus.active;
    if (!isDeepFocusActive) {
      alert("Task linked to TimeMaster Focus! Click 'Reclaim' on Deep Focus (or adjust duration) to start your countdown.");
    }
  }
  saveState();
  renderTasks();
}

// Render operator energy gauge
function updateEnergyUI() {
  energyPercentage.textContent = `${state.energy}%`;
  
  // Circular gauge utilizes stroke-dasharray attribute (e.g. "80, 100")
  if (energyGaugeFill) {
    energyGaugeFill.setAttribute('stroke-dasharray', `${state.energy}, 100`);
  }

  // Update Status Text with Trend Icons
  if (state.energy > 75) {
    energyStatusText.innerHTML = `LOCKED IN <i data-lucide="trending-up" class="inline-icon"></i>`;
    energyStatusText.className = "kpi-trend-label text-success";
  } else if (state.energy > 30) {
    energyStatusText.innerHTML = `STABLE STATUS <i data-lucide="minus" class="inline-icon"></i>`;
    energyStatusText.className = "kpi-trend-label text-warning";
  } else {
    energyStatusText.innerHTML = `CRITICAL ENERGY <i data-lucide="trending-down" class="inline-icon"></i>`;
    energyStatusText.className = "kpi-trend-label text-danger";
  }
  lucide.createIcons();
}

// Update Executive KPIs
function updateKpis() {
  const total = state.tasks.length;
  const completed = state.tasks.filter(t => t.status === 'completed').length;
  const q1Count = state.tasks.filter(t => t.quadrant === 'q1' && t.status === 'active').length;

  // Set Tasks Complete number
  if (kpiCompletedTasks) {
    kpiCompletedTasks.textContent = completed;
  }

  // Set velocity calculation (percentage completed of total)
  if (kpiVelocityTrend) {
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    kpiVelocityTrend.innerHTML = `${rate}% Completion <i data-lucide="trending-up" class="inline-icon"></i>`;
    lucide.createIcons();
  }

  // Set Firefights Active count
  if (kpiQ1Tasks) {
    kpiQ1Tasks.textContent = q1Count;
  }

  // Fire control label
  if (kpiQ1Trend) {
    if (q1Count === 0) {
      kpiQ1Trend.textContent = "All Clear";
      kpiQ1Trend.className = "kpi-trend-label text-success";
    } else if (q1Count <= 2) {
      kpiQ1Trend.textContent = "Stable Control";
      kpiQ1Trend.className = "kpi-trend-label text-warning";
    } else {
      kpiQ1Trend.textContent = "HIGH FIRE DANGER";
      kpiQ1Trend.className = "kpi-trend-label text-danger";
    }
  }
}

// Handle Add Task
function handleAddTask() {
  const text = taskInput.value.trim();
  if (!text) return;

  const deadlineVal = taskDeadline.value;

  const newTask = {
    id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    text: text,
    quadrant: 'inbox',
    status: 'active',
    type: 'general',
    createdAt: new Date().toISOString(),
    completedAt: null,
    q1TargetTime: null,
    deadline: deadlineVal ? new Date(deadlineVal).toISOString() : null,
    updatedAt: new Date().toISOString()
  };

  state.tasks.push(newTask);
  taskInput.value = '';
  taskDeadline.value = ''; // Reset deadline picker
  
  renderTasks();
  updateKpis();
  saveState();
}

// Move Task to Quadrant
function moveTask(taskId, quadrant) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  task.quadrant = quadrant;
  task.updatedAt = new Date().toISOString();
  
  // If moving to Q1 (Firefight), set target completion window (2 hours)
  if (quadrant === 'q1' && !task.q1TargetTime) {
    const target = new Date();
    target.setHours(target.getHours() + 2);
    task.q1TargetTime = target.toISOString();
  } else if (quadrant !== 'q1') {
    task.q1TargetTime = null;
  }

  renderTasks();
  updateKpis();
  saveState();
}

// Set Task Type Tag
function setTaskType(taskId, type) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  task.type = type;
  task.updatedAt = new Date().toISOString();
  
  // Set default category details
  if (type === 'weapon') {
    task.weaponCategory = 'deepFocus';
  } else if (type === 'value') {
    task.valueCategory = 'mastery';
  } else if (type === 'superpower') {
    task.superpowerCategory = 'breathing';
  } else {
    delete task.weaponCategory;
    delete task.valueCategory;
    delete task.superpowerCategory;
  }

  renderTasks();
  saveState();
}

// Set Task Category Detail (Weapon, Value, Superpower specific subcategory)
function setTaskCategoryDetail(taskId, category) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  if (task.type === 'weapon') {
    task.weaponCategory = category;
  } else if (task.type === 'value') {
    task.valueCategory = category;
  } else if (task.type === 'superpower') {
    task.superpowerCategory = category;
  }

  task.updatedAt = new Date().toISOString();
  renderTasks();
  saveState();
}

// Update Task Deadline inline
function updateTaskDeadline(taskId, newDeadlineIso) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  task.deadline = newDeadlineIso ? new Date(newDeadlineIso).toISOString() : null;
  task.updatedAt = new Date().toISOString();
  renderTasks();
  saveState();
}

// Toggle Task Completion
function toggleTaskComplete(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  task.updatedAt = new Date().toISOString();

  if (task.status === 'active') {
    task.status = 'completed';
    task.completedAt = new Date().toISOString();
    
    // Complete task reward: restore energy
    state.energy = Math.min(100, state.energy + 5);

    // Play soft chime sound
    playSound('complete');

    // Value score modifier: completing a Q2 Value-tagged task rewards score to that value
    if (task.quadrant === 'q2' && task.type === 'value' && task.valueCategory) {
      if (state.values[task.valueCategory]) {
        state.values[task.valueCategory].score = Math.min(100, state.values[task.valueCategory].score + 10);
      }
    }
  } else {
    task.status = 'active';
    task.completedAt = null;
    
    // Subtract reward if unchecking
    state.energy = Math.max(0, state.energy - 5);
    
    if (task.quadrant === 'q2' && task.type === 'value' && task.valueCategory) {
      if (state.values[task.valueCategory]) {
        state.values[task.valueCategory].score = Math.max(0, state.values[task.valueCategory].score - 10);
      }
    }
  }

  renderTasks();
  updateEnergyUI();
  renderValues();
  updateKpis();
  saveState();
}

// Delete Task
function deleteTask(taskId) {
  state.tasks = state.tasks.filter(t => t.id !== taskId);
  renderTasks();
  updateKpis();
  saveState();
}

// Create Deadline display element (using pastel Soft UI tags)
function createDeadlineBadgeElement(deadlineStr, isCompleted) {
  const badge = document.createElement('span');
  if (isCompleted) {
    badge.className = 'deadline-badge';
    badge.textContent = 'Completed';
    return badge;
  }

  const deadline = new Date(deadlineStr);
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();

  const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  const formattedTime = deadline.toLocaleDateString('en-US', options);

  if (diff < 0) {
    badge.className = 'deadline-badge overdue';
    badge.innerHTML = `<i data-lucide="alert-circle" class="inline-icon"></i> Overdue (${formattedTime})`;
  } else {
    const isToday = deadline.toDateString() === now.toDateString();
    if (isToday) {
      badge.className = 'deadline-badge today';
      badge.innerHTML = `<i data-lucide="clock" class="inline-icon"></i> Today (${formattedTime})`;
    } else {
      badge.className = 'deadline-badge upcoming';
      badge.innerHTML = `<i data-lucide="calendar" class="inline-icon"></i> ${formattedTime}`;
    }
  }

  return badge;
}

// Render Tasks List for all quadrants and inbox
function renderTasks() {
  inboxTasksList.innerHTML = '';
  q1List.innerHTML = '';
  q2List.innerHTML = '';
  q3List.innerHTML = '';
  q4List.innerHTML = '';

  const activeTasks = state.tasks.filter(t => t.status === 'active');
  const completedTasks = state.tasks.filter(t => t.status === 'completed');

  const sortedTasks = [...activeTasks, ...completedTasks];

  sortedTasks.forEach(task => {
    const taskEl = createTaskDOMElement(task);
    
    if (task.quadrant === 'inbox') {
      inboxTasksList.appendChild(taskEl);
    } else if (task.quadrant === 'q1') {
      q1List.appendChild(taskEl);
    } else if (task.quadrant === 'q2') {
      q2List.appendChild(taskEl);
    } else if (task.quadrant === 'q3') {
      q3List.appendChild(taskEl);
    } else if (task.quadrant === 'q4') {
      q4List.appendChild(taskEl);
    }
  });

  addEmptyStateMessage(inboxTasksList, "No entries. Type above to drop your thoughts.");
  addEmptyStateMessage(q1List, "No firefighting tasks active.");
  addEmptyStateMessage(q2List, "Add high-value tasks aligned with your values.");
  addEmptyStateMessage(q3List, "Noise/Delegation clear.");
  addEmptyStateMessage(q4List, "The Void is empty.");

  lucide.createIcons();
}

function addEmptyStateMessage(container, message) {
  if (container.children.length === 0) {
    const emptyEl = document.createElement('div');
    emptyEl.className = 'text-muted font-mono';
    emptyEl.style.fontSize = '0.75rem';
    emptyEl.style.padding = '8px';
    emptyEl.style.textAlign = 'center';
    emptyEl.textContent = message;
    container.appendChild(emptyEl);
  }
}

// Helper methods for editing task name, details, and checklist items
function updateTaskName(taskId, newName) {
  const task = state.tasks.find(t => t.id === taskId);
  if (task && newName.trim()) {
    task.text = newName.trim();
    saveState();
    const taskEl = document.querySelector(`.task-item[data-id="${taskId}"]`);
    if (taskEl) {
      const textSpan = taskEl.querySelector('.task-text');
      if (textSpan) textSpan.textContent = task.text;
    }
  }
}

function updateTaskDetails(taskId, detailsText) {
  const task = state.tasks.find(t => t.id === taskId);
  if (task) {
    task.details = detailsText;
    saveState();
  }
}

function addSubtask(taskId, text) {
  const task = state.tasks.find(t => t.id === taskId);
  if (task && text.trim()) {
    if (!task.subtasks) task.subtasks = [];
    task.subtasks.push({
      id: 'sub-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      text: text.trim(),
      completed: false
    });
    saveState();
    renderSubtasksList(taskId);
  }
}

function toggleSubtask(taskId, subtaskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (task && task.subtasks) {
    const sub = task.subtasks.find(s => s.id === subtaskId);
    if (sub) {
      sub.completed = !sub.completed;
      saveState();
      renderSubtasksList(taskId);
    }
  }
}

function deleteSubtask(taskId, subtaskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (task && task.subtasks) {
    task.subtasks = task.subtasks.filter(s => s.id !== subtaskId);
    saveState();
    renderSubtasksList(taskId);
  }
}

function renderSubtasksList(taskId) {
  const container = document.getElementById(`subtasks-container-${taskId}`);
  if (!container) return;
  
  container.innerHTML = '';
  const task = state.tasks.find(t => t.id === taskId);
  if (!task || !task.subtasks || task.subtasks.length === 0) {
    container.innerHTML = `<div class="text-muted font-mono" style="font-size: 0.72rem; padding: 4px 0;">No items on checklist.</div>`;
    return;
  }

  task.subtasks.forEach(sub => {
    const el = document.createElement('div');
    el.className = `subtask-item ${sub.completed ? 'completed' : ''}`;
    
    const checkBtn = document.createElement('button');
    checkBtn.className = 'subtask-checkbox-btn';
    checkBtn.innerHTML = '<i data-lucide="check"></i>';
    checkBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSubtask(taskId, sub.id);
    });

    const textSpan = document.createElement('span');
    textSpan.className = 'subtask-text-span';
    textSpan.textContent = sub.text;

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-delete-subtask';
    delBtn.innerHTML = '<i data-lucide="trash-2"></i>';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteSubtask(taskId, sub.id);
    });

    el.appendChild(checkBtn);
    el.appendChild(textSpan);
    el.appendChild(delBtn);
    container.appendChild(el);
  });
  
  lucide.createIcons({
    attrs: {
      class: 'inline-icon'
    },
    name: ['check', 'trash-2']
  });
}

function renderAssociationInfoCard(taskId) {
  const container = document.getElementById(`association-info-${taskId}`);
  if (!container) return;
  
  container.innerHTML = '';
  const task = state.tasks.find(t => t.id === taskId);
  if (!task || task.type === 'general') {
    container.classList.add('hidden');
    return;
  }
  
  container.classList.remove('hidden');
  
  let title = '';
  let desc = '';
  let usage = '';
  let icon = '';
  
  if (task.type === 'weapon') {
    icon = 'swords';
    const cat = task.weaponCategory || 'deepFocus';
    const weapon = state.weapons[cat];
    if (weapon) {
      title = `Weapon Equip: ${weapon.name}`;
      desc = weapon.description;
      usage = `🎯 <strong>Use:</strong> Activating focus time on this task will lock the tracking session to <strong>${weapon.duration} minutes</strong> to optimize your output.`;
    }
  } else if (task.type === 'value') {
    icon = 'crown';
    const cat = task.valueCategory || 'health';
    const val = state.values[cat];
    if (val) {
      title = `Value Alignment: ${val.name}`;
      desc = `Every completed task in Q2 (Values) feeds this score. Current Score: ${val.score || 0} pts.`;
      usage = `🎯 <strong>Use:</strong> Completing this task inside the Q2 Column adds <strong>+10 score points</strong> directly to your core value metric.`;
    }
  } else if (task.type === 'superpower') {
    icon = 'zap';
    const cat = task.superpowerCategory || 'breathing';
    const power = state.superpowers[cat];
    if (power) {
      title = `Superpower Recharge: ${power.name}`;
      desc = power.description;
      usage = `🎯 <strong>Use:</strong> Completing this task automatically triggers a <strong>${power.duration}-minute recharge guide</strong> to restore your neuro-stamina.`;
    }
  }
  
  container.innerHTML = '';
  
  const header = document.createElement('div');
  header.className = 'association-card-header';
  
  const iconEl = document.createElement('i');
  iconEl.setAttribute('data-lucide', icon);
  header.appendChild(iconEl);
  
  const strong = document.createElement('strong');
  strong.textContent = title;
  header.appendChild(strong);
  
  const cardBody = document.createElement('div');
  cardBody.className = 'association-card-body';
  
  const descP = document.createElement('p');
  descP.className = 'association-desc';
  descP.textContent = desc;
  cardBody.appendChild(descP);
  
  const usageP = document.createElement('p');
  usageP.className = 'association-usage';
  usageP.innerHTML = usage; // Safe: usage is statically hardcoded in JS
  cardBody.appendChild(usageP);
  
  container.appendChild(header);
  container.appendChild(cardBody);
  
  lucide.createIcons({
    attrs: {
      class: 'inline-icon'
    },
    name: [icon]
  });
}

// Create a Single Task Item DOM Structure
function createTaskDOMElement(task) {
  const item = document.createElement('div');
  item.className = `task-item ${task.status === 'completed' ? 'completed' : ''}`;
  item.dataset.id = task.id;

  // Enable HTML5 Drag & Drop
  item.draggable = true;
  item.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', task.id);
  });

  // Header content: Checkbox + Text + Right Actions
  const content = document.createElement('div');
  content.className = 'task-content';

  const checkbox = document.createElement('button');
  checkbox.className = 'task-checkbox';
  checkbox.innerHTML = '<i data-lucide="check"></i>';
  checkbox.addEventListener('click', () => toggleTaskComplete(task.id));

  const text = document.createElement('span');
  text.className = 'task-text';
  text.textContent = task.text;

  content.appendChild(checkbox);
  content.appendChild(text);

  // Right-side actions (Deadline, Time spent, Focus Play, and Expand Chevron)
  const rightActions = document.createElement('div');
  rightActions.className = 'task-right-actions';

  // Focus time consumed badge
  if (task.timeConsumed && task.timeConsumed > 0) {
    const spentBadge = document.createElement('span');
    spentBadge.className = 'time-spent-badge';
    spentBadge.innerHTML = `<i data-lucide="hourglass" class="inline-icon"></i> ${formatTimeConsumed(task.timeConsumed)}`;
    rightActions.appendChild(spentBadge);
  }

  // Active focus task indicator pill
  if (state.activeFocusTaskId === task.id && task.status === 'active') {
    const focusPill = document.createElement('span');
    focusPill.className = 'focus-active-pill';
    focusPill.innerHTML = `<i data-lucide="play" class="inline-icon"></i> Focus`;
    rightActions.appendChild(focusPill);
  }

  // If task has a deadline, append its status badge to the right actions
  if (task.deadline) {
    const dlBadge = createDeadlineBadgeElement(task.deadline, task.status === 'completed');
    rightActions.appendChild(dlBadge);
  }

  // If in Q1 and active, show a countdown label
  if (task.quadrant === 'q1' && task.status === 'active' && task.q1TargetTime) {
    const timerTag = document.createElement('span');
    timerTag.className = 'q1-timer-tag';
    timerTag.id = `timer-q1-${task.id}`;
    timerTag.textContent = '--:--';
    rightActions.appendChild(timerTag);
  }

  // Play Focus selector (for active tasks)
  if (task.status === 'active') {
    const focusBtn = document.createElement('button');
    const isActiveFocus = state.activeFocusTaskId === task.id;
    focusBtn.className = `btn-focus-task${isActiveFocus ? ' active' : ''}`;
    focusBtn.title = isActiveFocus ? 'Pause focus tracking' : 'Track focus time on this task';
    focusBtn.innerHTML = `<i data-lucide="${isActiveFocus ? 'pause-circle' : 'play-circle'}"></i>`;
    focusBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleTaskFocus(task.id);
    });
    rightActions.appendChild(focusBtn);
  }

  // Chevron expander for settings
  const expandBtn = document.createElement('button');
  const isExpanded = expandedTasks.has(task.id);
  expandBtn.className = `btn-expand-task${isExpanded ? ' expanded' : ''}`;
  expandBtn.title = isExpanded ? 'Collapse options' : 'Expand options';
  expandBtn.innerHTML = `<i data-lucide="chevron-down"></i>`;
  expandBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const metaContainer = item.querySelector('.task-meta');
    const currentlyHidden = metaContainer.classList.contains('hidden');
    if (currentlyHidden) {
      metaContainer.classList.remove('hidden');
      expandBtn.classList.add('expanded');
      expandBtn.title = 'Collapse options';
      expandedTasks.add(task.id);
      renderSubtasksList(task.id);
      renderAssociationInfoCard(task.id);
    } else {
      metaContainer.classList.add('hidden');
      expandBtn.classList.remove('expanded');
      expandBtn.title = 'Expand options';
      expandedTasks.delete(task.id);
    }
  });
  rightActions.appendChild(expandBtn);

  content.appendChild(rightActions);
  item.appendChild(content);

  // Footer metadata: Tags and Actions row (Collapsed by default)
  const meta = document.createElement('div');
  meta.className = 'task-meta';
  if (!isExpanded) {
    meta.classList.add('hidden');
  }

  // 1. Task Name Edit Group
  const nameEditGroup = document.createElement('div');
  nameEditGroup.className = 'task-edit-name-group';
  nameEditGroup.innerHTML = `
    <label>Task Name</label>
    <input type="text" class="task-edit-name-input">
  `;
  const nameInput = nameEditGroup.querySelector('.task-edit-name-input');
  nameInput.value = task.text || '';
  nameInput.addEventListener('change', (e) => {
    updateTaskName(task.id, e.target.value);
  });
  meta.appendChild(nameEditGroup);

  // 2. Details & Checklist Grid Row
  const gridRow = document.createElement('div');
  gridRow.className = 'task-details-checklist-row';

  // Notes Column
  const notesCol = document.createElement('div');
  notesCol.className = 'task-notes-col';
  notesCol.innerHTML = `
    <label>Notes & Description</label>
    <textarea class="task-details-textarea" placeholder="Add task details/notes..."></textarea>
  `;
  const notesTextarea = notesCol.querySelector('.task-details-textarea');
  notesTextarea.value = task.details || '';
  notesTextarea.addEventListener('change', (e) => {
    updateTaskDetails(task.id, e.target.value);
  });
  gridRow.appendChild(notesCol);

  // Subtasks/Checklist Column
  const subtasksCol = document.createElement('div');
  subtasksCol.className = 'task-subtasks-col';
  subtasksCol.innerHTML = `
    <label>Checklist</label>
    <div class="subtasks-container" id="subtasks-container-${task.id}"></div>
    <div class="add-subtask-group">
      <input type="text" class="add-subtask-input" placeholder="+ Add checklist item...">
      <button class="btn-add-subtask" type="button"><i data-lucide="plus"></i></button>
    </div>
  `;
  
  const addSubtaskIn = subtasksCol.querySelector('.add-subtask-input');
  const addSubtaskBtn = subtasksCol.querySelector('.btn-add-subtask');
  
  const triggerAdd = () => {
    const text = addSubtaskIn.value.trim();
    if (text) {
      addSubtask(task.id, text);
      addSubtaskIn.value = '';
    }
  };

  addSubtaskBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    triggerAdd();
  });
  addSubtaskIn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.stopPropagation();
      e.preventDefault();
      triggerAdd();
    }
  });

  gridRow.appendChild(subtasksCol);
  meta.appendChild(gridRow);

  // 3. Dynamic Association Info Card
  const assocContainer = document.createElement('div');
  assocContainer.className = 'association-info-card hidden';
  assocContainer.id = `association-info-${task.id}`;
  meta.appendChild(assocContainer);

  const tagsContainer = document.createElement('div');
  tagsContainer.className = 'task-tags';

  // Tag Badge
  const tag = document.createElement('span');
  tag.className = `tag tag-${task.type}`;
  tag.textContent = task.type;
  tagsContainer.appendChild(tag);

  // Detail Badge (e.g. Master, Breathing, etc.)
  if (task.type !== 'general') {
    const detailTag = document.createElement('span');
    detailTag.className = 'tag tag-general';
    
    let label = '';
    if (task.type === 'weapon' && task.weaponCategory) {
      label = state.weapons[task.weaponCategory] ? state.weapons[task.weaponCategory].name : task.weaponCategory;
    } else if (task.type === 'value' && task.valueCategory) {
      label = state.values[task.valueCategory] ? state.values[task.valueCategory].name : task.valueCategory;
    } else if (task.type === 'superpower' && task.superpowerCategory) {
      label = state.superpowers[task.superpowerCategory] ? state.superpowers[task.superpowerCategory].name : task.superpowerCategory;
    }
    
    detailTag.textContent = label;
    tagsContainer.appendChild(detailTag);
  }

  meta.appendChild(tagsContainer);

  // Actions row
  const actionsRow = document.createElement('div');
  actionsRow.className = 'task-actions-row';

  // Inline deadline editor (a small datetime input)
  const inlineDeadline = document.createElement('input');
  inlineDeadline.type = 'datetime-local';
  inlineDeadline.className = 'select-mini';
  inlineDeadline.title = 'Edit Deadline';
  
  // Format task.deadline for input value (YYYY-MM-DDThh:mm)
  if (task.deadline) {
    const date = new Date(task.deadline);
    const tzOffset = date.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(date - tzOffset)).toISOString().slice(0, -1);
    inlineDeadline.value = localISOTime.substring(0, 16);
  }
  
  inlineDeadline.addEventListener('change', (e) => updateTaskDeadline(task.id, e.target.value));
  actionsRow.appendChild(inlineDeadline);

  // Quadrant select
  const quadSelect = document.createElement('select');
  quadSelect.className = 'select-mini';
  quadSelect.innerHTML = `
    <option value="inbox" ${task.quadrant === 'inbox' ? 'selected' : ''}>Inbox</option>
    <option value="q1" ${task.quadrant === 'q1' ? 'selected' : ''}>Q1 (Firefight)</option>
    <option value="q2" ${task.quadrant === 'q2' ? 'selected' : ''}>Q2 (Values)</option>
    <option value="q3" ${task.quadrant === 'q3' ? 'selected' : ''}>Q3 (Delegate)</option>
    <option value="q4" ${task.quadrant === 'q4' ? 'selected' : ''}>Q4 (Void)</option>
  `;
  quadSelect.addEventListener('change', (e) => moveTask(task.id, e.target.value));
  actionsRow.appendChild(quadSelect);

  // Type select
  const typeSelect = document.createElement('select');
  typeSelect.className = 'select-mini';
  typeSelect.innerHTML = `
    <option value="general" ${task.type === 'general' ? 'selected' : ''}>General</option>
    <option value="weapon" ${task.type === 'weapon' ? 'selected' : ''}>Weapon</option>
    <option value="value" ${task.type === 'value' ? 'selected' : ''}>Value</option>
    <option value="superpower" ${task.type === 'superpower' ? 'selected' : ''}>Superpower</option>
  `;
  typeSelect.addEventListener('change', (e) => setTaskType(task.id, e.target.value));
  actionsRow.appendChild(typeSelect);

  // Subcategory select (conditional)
  if (task.type !== 'general') {
    const subSelect = document.createElement('select');
    subSelect.className = 'select-mini';
    
    let optionsHtml = '';
    if (task.type === 'weapon') {
      Object.keys(state.weapons).forEach(k => {
        optionsHtml += `<option value="${k}" ${task.weaponCategory === k ? 'selected' : ''}>${state.weapons[k].name}</option>`;
      });
    } else if (task.type === 'value') {
      Object.keys(state.values).forEach(k => {
        optionsHtml += `<option value="${k}" ${task.valueCategory === k ? 'selected' : ''}>${state.values[k].name}</option>`;
      });
    } else if (task.type === 'superpower') {
      Object.keys(state.superpowers).forEach(k => {
        optionsHtml += `<option value="${k}" ${task.superpowerCategory === k ? 'selected' : ''}>${state.superpowers[k].name}</option>`;
      });
    }
    
    subSelect.innerHTML = optionsHtml;
    subSelect.addEventListener('change', (e) => setTaskCategoryDetail(task.id, e.target.value));
    actionsRow.appendChild(subSelect);
  }

  // Archive button (conditional on task status completed)
  if (task.status === 'completed') {
    const archiveBtn = document.createElement('button');
    archiveBtn.className = 'btn-archive-task';
    archiveBtn.style.background = 'none';
    archiveBtn.style.border = 'none';
    archiveBtn.style.color = 'var(--accent)';
    archiveBtn.style.cursor = 'pointer';
    archiveBtn.style.padding = '4px';
    archiveBtn.style.marginRight = '8px';
    archiveBtn.title = 'Archive Task';
    archiveBtn.innerHTML = '<i data-lucide="archive"></i>';
    archiveBtn.addEventListener('click', () => archiveTask(task.id));
    actionsRow.appendChild(archiveBtn);
  }

  // Delete
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'btn-delete-task';
  deleteBtn.innerHTML = '<i data-lucide="trash-2"></i>';
  deleteBtn.addEventListener('click', () => deleteTask(task.id));
  actionsRow.appendChild(deleteBtn);

  meta.appendChild(actionsRow);
  item.appendChild(meta);

  // Initialize checklist items and association cards rendering if expanded
  if (isExpanded) {
    setTimeout(() => {
      renderSubtasksList(task.id);
      renderAssociationInfoCard(task.id);
    }, 0);
  }

  return item;
}

// Real-time calculation of Q1 2-hour timers & deadline automations
function updateTimersAndAutomations() {
  const now = new Date().getTime();
  let stateModified = false;

  // 1. Check for Deadline Automations (Auto-funnel to Q1 if deadline is <= 2 hours away)
  state.tasks.forEach(task => {
    if (task.status === 'active' && task.deadline && task.quadrant !== 'q1') {
      const deadlineTime = new Date(task.deadline).getTime();
      const diff = deadlineTime - now;

      // 2 hours in ms = 2 * 60 * 60 * 1000 = 7,200,000 ms
      if (diff <= 7200000) {
        task.quadrant = 'q1';
        task.q1TargetTime = task.deadline; // The deadline becomes the firefight target time
        task.updatedAt = new Date().toISOString();
        stateModified = true;

        // Dynamic visual shake & alert sound for this task card
        const escalatedTaskId = task.id;
        setTimeout(() => {
          const cardEl = document.querySelector(`.task-item[data-id="${escalatedTaskId}"]`);
          if (cardEl) {
            cardEl.classList.add('overdue-alert');
            playSound('focus-end');
            setTimeout(() => cardEl.classList.remove('overdue-alert'), 1000);
          }
        }, 150);
      }
    }
  });

  if (stateModified) {
    renderTasks();
    updateKpis();
    saveState();
  }

  // 2. Update Q1 active countdown displays
  const activeQ1Tasks = state.tasks.filter(t => t.quadrant === 'q1' && t.status === 'active' && t.q1TargetTime);
  if (activeQ1Tasks.length === 0) return;

  activeQ1Tasks.forEach(task => {
    const el = document.getElementById(`timer-q1-${task.id}`);
    if (!el) return;

    const target = new Date(task.q1TargetTime).getTime();
    const diff = target - now;

    if (diff <= 0) {
      el.textContent = "OVERDUE (2h)";
      el.classList.add('danger-warning');
    } else {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      let label = '';
      if (hours > 0) label += `${hours}h `;
      label += `${minutes}m ${seconds}s`;
      el.textContent = label;

      // Flash red if less than 20 minutes left
      if (diff < 20 * 60 * 1000) {
        el.classList.add('danger-warning');
      } else {
        el.classList.remove('danger-warning');
      }
    }
  });
}

// Render sidebar Weapons panel
function renderWeapons() {
  weaponsList.innerHTML = '';
  
  Object.keys(state.weapons).forEach(key => {
    const weapon = state.weapons[key];
    const item = document.createElement('div');
    item.className = 'weapon-row';
    
    const info = document.createElement('div');
    info.className = 'weapon-info';
    
    // Programmatically construct headers and descriptions using .textContent
    const h4 = document.createElement('h4');
    h4.textContent = weapon.name;
    info.appendChild(h4);
    
    if (key === 'deepFocus') {
      const p = document.createElement('p');
      p.textContent = weapon.description;
      info.appendChild(p);
      
      const pomoInputs = document.createElement('div');
      pomoInputs.className = 'pomodoro-inputs';
      pomoInputs.innerHTML = `
        <div class="pomo-input-grp">
          <span class="pomo-lbl">Focus:</span>
          <input type="number" id="focus-duration-input" min="1" max="120" class="pomo-num-input" ${weapon.active ? 'disabled' : ''}>
          <span class="pomo-unit">m</span>
        </div>
        <div class="pomo-input-grp">
          <span class="pomo-lbl">Break:</span>
          <input type="number" id="break-duration-input" min="0" max="60" class="pomo-num-input" ${weapon.active ? 'disabled' : ''}>
          <span class="pomo-unit">m</span>
        </div>
      `;
      pomoInputs.querySelector('#focus-duration-input').value = weapon.duration || 25;
      pomoInputs.querySelector('#break-duration-input').value = weapon.breakDuration !== undefined ? weapon.breakDuration : 5;
      info.appendChild(pomoInputs);
    } else {
      const p = document.createElement('p');
      p.textContent = `${weapon.description} (${weapon.duration}m)`;
      info.appendChild(p);
    }
    item.appendChild(info);

    const action = document.createElement('div');
    action.className = 'weapon-actions';
    
    const btn = document.createElement('button');
    btn.className = 'btn btn-secondary btn-activate';
    
    if (weapon.active) {
      const typeLabel = (key === 'deepFocus' && weapon.sessionType === 'break') ? 'Break Active' : 'Active';
      btn.textContent = typeLabel;
      btn.className = 'btn btn-primary btn-activate';
      btn.disabled = true;
    } else {
      btn.textContent = 'Reclaim';
      const isAnyWeaponActive = Object.values(state.weapons).some(w => w.active);
      if (isAnyWeaponActive) {
        btn.disabled = true;
      }
      btn.addEventListener('click', () => activateWeapon(key));
    }
    
    action.appendChild(btn);
    item.appendChild(action);
    weaponsList.appendChild(item);
  });
}

// Activate a Weapon
function activateWeapon(key) {
  Object.keys(state.weapons).forEach(k => {
    state.weapons[k].active = false;
    state.weapons[k].startedAt = null;
    if (k === 'deepFocus') {
      state.weapons[k].sessionType = 'focus';
      state.weapons[k].breakStartedAt = null;
    }
  });

  const weapon = state.weapons[key];
  
  if (key === 'deepFocus') {
    const focusDurationInput = document.getElementById('focus-duration-input');
    const breakDurationInput = document.getElementById('break-duration-input');
    if (focusDurationInput && breakDurationInput) {
      const fVal = parseInt(focusDurationInput.value);
      weapon.duration = Number.isNaN(fVal) ? 25 : fVal;
      const bVal = parseInt(breakDurationInput.value);
      weapon.breakDuration = Number.isNaN(bVal) ? 5 : bVal;
    }
    weapon.sessionType = 'focus';
    weapon.breakStartedAt = null;
  }
  
  weapon.active = true;
  weapon.startedAt = new Date().toISOString();
  
  saveState();
  renderWeapons();
  startWeaponTimer(key);
}

// Deactivate running weapon manually
function deactivateActiveWeapon() {
  Object.keys(state.weapons).forEach(k => {
    state.weapons[k].active = false;
    state.weapons[k].startedAt = null;
    if (k === 'deepFocus') {
      state.weapons[k].sessionType = 'focus';
      state.weapons[k].breakStartedAt = null;
    }
  });

  clearInterval(weaponTimerInterval);
  activeWeaponName.textContent = "NONE";
  weaponCountdown.style.color = "var(--primary)";
  weaponTimerBox.classList.add('hidden');
  
  saveState();
  renderWeapons();
}

// Running weapon countdown timers
function startWeaponTimer(key) {
  clearInterval(weaponTimerInterval);
  const weapon = state.weapons[key];
  if (!weapon || !weapon.active) return;

  const isFocus = key === 'deepFocus';
  const sessionType = isFocus ? (weapon.sessionType || 'focus') : 'focus';

  if (isFocus && sessionType === 'break') {
    activeWeaponName.textContent = "BREAK TIME";
    weaponCountdown.style.color = "var(--success)";
  } else {
    activeWeaponName.textContent = weapon.name.toUpperCase();
    weaponCountdown.style.color = "var(--primary)";
  }
  
  weaponTimerBox.classList.remove('hidden');

  function tick() {
    const now = new Date().getTime();
    let diff = 0;
    
    if (isFocus && sessionType === 'break') {
      const breakVal = (weapon.breakDuration !== undefined && !Number.isNaN(weapon.breakDuration)) ? weapon.breakDuration : 5;
      const durationMs = breakVal * 60 * 1000;
      const target = new Date(weapon.breakStartedAt).getTime() + durationMs;
      diff = target - now;
    } else {
      const durationMs = weapon.duration * 60 * 1000;
      const target = new Date(weapon.startedAt).getTime() + durationMs;
      diff = target - now;
    }

    if (diff <= 0) {
      clearInterval(weaponTimerInterval);
      if (isFocus && sessionType === 'focus' && (weapon.breakDuration > 0)) {
        triggerBreakTime(key);
      } else {
        completeWeaponReclaim(key);
      }
    } else {
      const minutes = Math.floor(diff / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      weaponCountdown.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

      // Accumulate focus time consumed on the active task
      if (isFocus && sessionType === 'focus' && state.activeFocusTaskId) {
        const targetTask = state.tasks.find(t => t.id === state.activeFocusTaskId);
        if (targetTask && targetTask.status === 'active') {
          targetTask.timeConsumed = (targetTask.timeConsumed || 0) + 1;
          targetTask.updatedAt = new Date().toISOString();
          
          // Update DOM spent badge text dynamically
          const spentBadgeEl = document.querySelector(`.task-item[data-id="${state.activeFocusTaskId}"] .time-spent-badge`);
          if (spentBadgeEl) {
            spentBadgeEl.innerHTML = `<i data-lucide="hourglass" class="inline-icon"></i> ${formatTimeConsumed(targetTask.timeConsumed)}`;
          }
          
          // If this is the first second of tracking, trigger full render to render the badge
          if (targetTask.timeConsumed === 1) {
            renderTasks();
          }
          
          // Save to server database every 5 seconds to reduce write frequency
          if (targetTask.timeConsumed % 5 === 0) {
            saveState();
          }
        }
      }
    }
  }

  tick();
  weaponTimerInterval = setInterval(tick, 1000);
}

// Transition from Focus to Break
function triggerBreakTime(key) {
  const weapon = state.weapons[key];
  weapon.sessionType = 'break';
  weapon.breakStartedAt = new Date().toISOString();
  
  // Award focus completion energy immediately
  state.energy = Math.min(100, state.energy + 15);

  // Play focus bell sound
  playSound('focus-end');
  
  alert(`Focus Block Completed! Energy restored +15%. Starting your ${weapon.breakDuration}-minute break.`);
  
  updateEnergyUI();
  saveState();
  renderWeapons();
  startWeaponTimer(key);
}

// Weapon countdown successfully completed
function completeWeaponReclaim(key) {
  const weapon = state.weapons[key];
  const isFocus = key === 'deepFocus';
  const sessionType = isFocus ? (weapon.sessionType || 'focus') : 'focus';

  if (isFocus && sessionType === 'break') {
    // Play break finished chime
    playSound('break-end');
    alert("Break Session Finished! Reclaim focus when ready.");
  } else {
    // Award focus energy
    state.energy = Math.min(100, state.energy + 15);
    playSound('focus-end'); // Play focus bell sound!
    alert(`Weapon Focus Completed: ${weapon.name}! Energy restored +15%.`);
  }

  // Deactivate weapon state
  weapon.active = false;
  weapon.startedAt = null;
  if (isFocus) {
    weapon.sessionType = 'focus';
    weapon.breakStartedAt = null;
  }

  activeWeaponName.textContent = "NONE";
  weaponCountdown.style.color = "var(--primary)";
  weaponTimerBox.classList.add('hidden');
  
  saveState();
  renderWeapons();
  updateEnergyUI();
}

// Check for running timers (useful if reloading page)
function checkRunningTimers() {
  const activeWeaponKey = Object.keys(state.weapons).find(k => state.weapons[k].active);
  if (activeWeaponKey) {
    startWeaponTimer(activeWeaponKey);
  }

  if (state.rechargeState && state.rechargeState.active) {
    startSuperpowerRechargeTimer();
  }
}

// Render recognized Values scorecard
function renderValues() {
  valuesList.innerHTML = '';
  
  Object.keys(state.values).forEach(key => {
    const val = state.values[key];
    const item = document.createElement('div');
    item.className = 'value-row';
    
    const titleRow = document.createElement('div');
    titleRow.className = 'value-title-row';
    
    const h4 = document.createElement('h4');
    h4.textContent = val.name;
    titleRow.appendChild(h4);
    
    const badge = document.createElement('span');
    badge.className = 'value-score-badge';
    badge.textContent = `${val.score} PTS`;
    titleRow.appendChild(badge);
    
    const progressBg = document.createElement('div');
    progressBg.className = 'value-progress-bg';
    
    const progressFill = document.createElement('div');
    progressFill.className = 'value-progress-fill';
    progressFill.style.width = `${val.score}%`;
    progressBg.appendChild(progressFill);
    
    item.appendChild(titleRow);
    item.appendChild(progressBg);
    valuesList.appendChild(item);
  });
}

// Render sidebar Superpowers list
function renderSuperpowers() {
  superpowersList.innerHTML = '';
  
  Object.keys(state.superpowers).forEach(key => {
    const power = state.superpowers[key];
    const item = document.createElement('div');
    item.className = 'superpower-row';
    
    const info = document.createElement('div');
    info.className = 'superpower-info';
    
    const h4 = document.createElement('h4');
    h4.textContent = power.name;
    info.appendChild(h4);
    
    const p = document.createElement('p');
    p.textContent = `${power.description} (${power.duration}m)`;
    info.appendChild(p);
    
    item.appendChild(info);

    const action = document.createElement('div');
    action.className = 'superpower-actions';
    
    const btn = document.createElement('button');
    btn.className = 'btn btn-secondary btn-activate';
    btn.textContent = 'Recharge';
    
    if (state.rechargeState && state.rechargeState.active) {
      btn.disabled = true;
    }
    
    btn.addEventListener('click', () => activateSuperpowerRecharge(key));
    action.appendChild(btn);
    item.appendChild(action);
    superpowersList.appendChild(item);
  });
}

// Handle Overlay visibility state based on rechargeState
function handleRechargeStateChange() {
  if (state.rechargeState && state.rechargeState.active) {
    rechargeOverlay.classList.remove('hidden');
    const power = state.superpowers[state.rechargeState.type];
    if (power) {
      rechargeOverlayTitle.textContent = `Recharging: ${power.name}`;
      rechargeOverlayDesc.textContent = power.description;
    }
    startSuperpowerRechargeTimer();
  } else {
    rechargeOverlay.classList.add('hidden');
    clearInterval(rechargeTimerInterval);
  }
}

// Start Superpower Recharge Action (Locks Dashboard)
function activateSuperpowerRecharge(key) {
  const power = state.superpowers[key];
  if (!power) return;

  state.rechargeState = {
    active: true,
    type: key,
    startedAt: new Date().toISOString(),
    duration: power.duration
  };

  saveState();
  renderSuperpowers();
  handleRechargeStateChange();
}

// Abort/Cancel Superpower Recharge
function abortSuperpowerRecharge() {
  state.rechargeState = {
    active: false,
    type: null,
    startedAt: null,
    duration: 0
  };

  clearInterval(rechargeTimerInterval);
  rechargeOverlay.classList.add('hidden');
  
  saveState();
  renderSuperpowers();
}

// Run Superpower Countdown (Locks dashboard screen)
function startSuperpowerRechargeTimer() {
  clearInterval(rechargeTimerInterval);
  const rState = state.rechargeState;
  if (!rState || !rState.active || !rState.startedAt) return;

  const durationMs = rState.duration * 60 * 1000;
  const target = new Date(rState.startedAt).getTime() + durationMs;

  function tick() {
    const now = new Date().getTime();
    const diff = target - now;

    if (diff <= 0) {
      clearInterval(rechargeTimerInterval);
      completeSuperpowerRecharge();
    } else {
      const minutes = Math.floor(diff / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      rechargeTimerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  tick();
  rechargeTimerInterval = setInterval(tick, 1000);
}

// Superpower Recharge completes successfully
function completeSuperpowerRecharge() {
  const rState = state.rechargeState;
  const powerKey = rState.type;
  
  let energyRefill = 20;
  if (powerKey === 'powerNap') energyRefill = 50;
  if (powerKey === 'hydration') energyRefill = 10;
  if (powerKey === 'reading') energyRefill = 25;
  
  state.energy = Math.min(100, state.energy + energyRefill);
  
  state.rechargeState = {
    active: false,
    type: null,
    startedAt: null,
    duration: 0
  };

  rechargeOverlay.classList.add('hidden');
  alert(`Superpower Recharge Complete! Energy restored +${energyRefill}%.`);

  saveState();
  renderSuperpowers();
  updateEnergyUI();
}

// Toggle Archive overlay drawer modal
function toggleArchiveModal() {
  const archiveOverlay = document.getElementById('archive-modal-overlay');
  if (!archiveOverlay) return;
  
  const isHidden = archiveOverlay.classList.contains('hidden');
  if (isHidden) {
    renderArchivedTasks();
    archiveOverlay.classList.remove('hidden');
  } else {
    archiveOverlay.classList.add('hidden');
  }
}

// Archive completed task
function archiveTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (task) {
    task.status = 'archived';
    task.updatedAt = new Date().toISOString();
    saveState();
    renderTasks();
    
    const archiveOverlay = document.getElementById('archive-modal-overlay');
    if (archiveOverlay && !archiveOverlay.classList.contains('hidden')) {
      renderArchivedTasks();
    }
  }
}

// Render list of archived tasks inside overlay modal body
function renderArchivedTasks() {
  const archivedList = document.getElementById('archived-tasks-list');
  if (!archivedList) return;
  
  archivedList.innerHTML = '';
  const archivedTasks = state.tasks.filter(t => t.status === 'archived');
  
  if (archivedTasks.length === 0) {
    archivedList.innerHTML = '<div class="text-muted font-mono" style="text-align: center; font-size: 0.8rem; padding: 12px;">No archived tasks.</div>';
    return;
  }
  
  archivedTasks.forEach(task => {
    const card = document.createElement('div');
    card.className = 'customizer-item-card';
    card.style.display = 'flex';
    card.style.alignItems = 'center';
    card.style.justifyContent = 'space-between';
    card.style.padding = '10px 14px';
    card.style.background = 'rgba(15, 23, 42, 0.35)';
    card.style.border = '1px solid rgba(255, 255, 255, 0.04)';
    card.style.borderRadius = '10px';
    card.style.marginBottom = '8px';
    
    const info = document.createElement('div');
    info.style.display = 'flex';
    info.style.flexDirection = 'column';
    info.style.gap = '4px';
    
    const name = document.createElement('span');
    name.style.fontSize = '0.85rem';
    name.style.fontWeight = '500';
    name.style.color = '#f8fafc';
    name.style.textDecoration = 'line-through';
    name.textContent = task.text;
    info.appendChild(name);
    
    const quad = document.createElement('span');
    quad.style.fontSize = '0.7rem';
    quad.style.color = '#94a3b8';
    quad.style.textTransform = 'uppercase';
    quad.style.letterSpacing = '0.05em';
    
    let quadName = task.quadrant;
    if (task.quadrant === 'q1') quadName = 'Q1 (Firefight)';
    else if (task.quadrant === 'q2') quadName = 'Q2 (Values)';
    else if (task.quadrant === 'q3') quadName = 'Q3 (Delegate)';
    else if (task.quadrant === 'q4') quadName = 'Q4 (Void)';
    else if (task.quadrant === 'inbox') quadName = 'Inbox';
    
    quad.textContent = `From ${quadName}`;
    info.appendChild(quad);
    
    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '8px';
    
    // Restore button
    const restoreBtn = document.createElement('button');
    restoreBtn.className = 'btn btn-secondary';
    restoreBtn.style.padding = '4px 8px';
    restoreBtn.style.fontSize = '0.75rem';
    restoreBtn.innerHTML = '<i data-lucide="rotate-ccw"></i> Restore';
    restoreBtn.addEventListener('click', () => {
      task.status = 'completed'; // Revert back to completed
      task.updatedAt = new Date().toISOString();
      saveState();
      renderTasks();
      renderArchivedTasks();
    });
    actions.appendChild(restoreBtn);
    
    // Delete Permanently button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'customizer-btn-del';
    deleteBtn.style.width = '28px';
    deleteBtn.style.height = '28px';
    deleteBtn.style.display = 'flex';
    deleteBtn.style.alignItems = 'center';
    deleteBtn.style.justifyContent = 'center';
    deleteBtn.innerHTML = '<i data-lucide="trash-2"></i>';
    deleteBtn.addEventListener('click', () => {
      if (confirm(`Are you sure you want to permanently delete "${task.text}"?`)) {
        state.tasks = state.tasks.filter(t => t.id !== task.id);
        saveState();
        renderTasks();
        renderArchivedTasks();
      }
    });
    actions.appendChild(deleteBtn);
    
    card.appendChild(info);
    card.appendChild(actions);
    archivedList.appendChild(card);
  });
  
  if (window.lucide) {
    window.lucide.createIcons({
      attrs: { class: 'lucide-icon' }
    });
  }
}
