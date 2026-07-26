/**
 * TimeMaster Customize Console Component
 * Isolated module handling customization of Pomodoros, Focus durations, and dynamic Values scorecard targets.
 * Operates on a isolated transactional draft state that commits to global state only on Save.
 */
(function() {
  // Transactional draft state
  let draftState = null;

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // 1. Inject Stylesheets
  const styles = `
    .customizer-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(12px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .customizer-overlay.hidden {
      display: none !important;
    }
    .customizer-modal {
      background: rgba(30, 41, 59, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      width: 100%;
      max-width: 800px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4);
      overflow: hidden;
      animation: customizerFade 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    @keyframes customizerFade {
      from { opacity: 0; transform: scale(0.96) translateY(10px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    .customizer-header {
      padding: 18px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .customizer-header h2 {
      font-size: 1.15rem;
      font-weight: 600;
      color: #f8fafc;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: 'Outfit', sans-serif;
    }
    .customizer-close-btn {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 4px;
      transition: color 0.15s;
    }
    .customizer-close-btn:hover {
      color: #f1f5f9;
    }
    .customizer-body {
      padding: 24px;
      overflow-y: auto;
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }
    @media (max-width: 768px) {
      .customizer-body {
        grid-template-columns: 1fr;
      }
    }
    .customizer-section h3 {
      font-size: 0.95rem;
      font-weight: 600;
      color: #cbd5e1;
      margin: 0 0 16px 0;
      font-family: 'Outfit', sans-serif;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .customizer-row-list {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .customizer-item-card {
      background: rgba(15, 23, 42, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 10px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .customizer-form-grp {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .customizer-form-grp label {
      font-size: 0.72rem;
      font-weight: 500;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .customizer-txt-in {
      background: rgba(15, 23, 42, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      padding: 8px 12px;
      color: #f8fafc;
      font-size: 0.82rem;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .customizer-txt-in:focus {
      outline: none;
      border-color: rgba(129, 140, 248, 0.5);
      box-shadow: 0 0 0 2px rgba(129, 140, 248, 0.2);
    }
    .customizer-flex-row {
      display: flex;
      gap: 12px;
      align-items: flex-end;
    }
    .customizer-num-in {
      width: 75px;
      text-align: center;
    }
    .customizer-btn-del {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.2);
      color: #f87171;
      border-radius: 6px;
      width: 34px;
      height: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }
    .customizer-btn-del:hover {
      background: rgba(239, 68, 68, 0.25);
      color: #ef4444;
    }
    .customizer-btn-add-val {
      background: none;
      border: 1px dashed rgba(255, 255, 255, 0.12);
      border-radius: 10px;
      color: #94a3b8;
      font-size: 0.8rem;
      font-weight: 500;
      padding: 12px;
      cursor: pointer;
      transition: border-color 0.15s, color 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      margin-top: 14px;
    }
    .customizer-btn-add-val:hover {
      border-color: rgba(129, 140, 248, 0.4);
      color: #cbd5e1;
    }
    .customizer-footer {
      padding: 16px 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(15, 23, 42, 0.2);
    }
    
    /* Sliders customizer icon button inject */
    .customizer-trigger-btn {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.06);
      color: #cbd5e1;
      border-radius: 8px;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.2s, border-color 0.2s, color 0.2s;
    }
    .customizer-trigger-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(255, 255, 255, 0.15);
      color: #f8fafc;
    }
  `;

  // 2. Component Bootstrapping
  function init() {
    injectStylesheet();
    injectHeaderTrigger();
    createModalContainer();
  }

  function injectStylesheet() {
    const styleEl = document.createElement('style');
    styleEl.innerHTML = styles;
    document.head.appendChild(styleEl);
  }

  function injectHeaderTrigger() {
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions) return;
    
    // Guard against duplicates
    if (document.getElementById('customizer-trigger')) return;

    const customBtn = document.createElement('button');
    customBtn.id = 'customizer-trigger';
    customBtn.className = 'customizer-trigger-btn';
    customBtn.title = 'Customize Parameters';
    
    customBtn.innerHTML = `
      <i data-lucide="sliders"></i>
    `;

    // Place it right before the sound toggle or logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      headerActions.insertBefore(customBtn, logoutBtn);
    } else {
      headerActions.appendChild(customBtn);
    }
  }

  function createModalContainer() {
    if (document.getElementById('customizer-modal-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'customizer-modal-overlay';
    overlay.className = 'customizer-overlay hidden';
    document.body.appendChild(overlay);

    const customBtn = document.getElementById('customizer-trigger');
    if (!customBtn) return;

    activeOverlay = overlay;

    // Attach click triggers
    customBtn.addEventListener('click', openCustomizer);
    
    // Redraw icon vectors
    if (window.lucide) {
      window.lucide.createIcons({
        attrs: { class: 'lucide-icon' },
        name: ['sliders']
      });
    }
  }

  // 4. Open Customizer Modal Panel (Clones state into transactional draftState)
  function openCustomizer() {
    if (typeof state === 'undefined') {
      console.error("State object is unavailable.");
      return;
    }

    // Capture dynamic deep clone of active settings
    draftState = {
      weapons: JSON.parse(JSON.stringify(state.weapons || {})),
      values: JSON.parse(JSON.stringify(state.values || {}))
    };

    renderModalContent();
    activeOverlay.classList.remove('hidden');
  }

  // 5. Close Customizer Modal Panel (Discards draftState)
  function closeCustomizer() {
    activeOverlay.classList.add('hidden');
    activeOverlay.innerHTML = '';
    draftState = null;
  }

  // 6. Draw Modal Form Components
  function renderModalContent() {
    if (!draftState) return;
    activeOverlay.innerHTML = '';

    const modal = document.createElement('div');
    modal.className = 'customizer-modal';

    // Header
    modal.innerHTML = `
      <div class="customizer-header">
        <h2><i data-lucide="sliders"></i> Customize Console</h2>
        <button class="customizer-close-btn" id="customizer-close-trigger">&times;</button>
      </div>
    `;

    const body = document.createElement('div');
    body.className = 'customizer-body';

    // Weapons Column
    const weaponsCol = document.createElement('div');
    weaponsCol.className = 'customizer-section';
    weaponsCol.innerHTML = `<h3><i data-lucide="swords"></i> Enhance Weapons</h3>`;

    const weaponsList = document.createElement('div');
    weaponsList.className = 'customizer-row-list';

    Object.keys(draftState.weapons).forEach(key => {
      const weapon = draftState.weapons[key];
      const card = document.createElement('div');
      card.className = 'customizer-item-card';
      card.dataset.key = key;

      card.innerHTML = `
        <div class="customizer-form-grp">
          <label>Weapon Name</label>
          <input type="text" class="customizer-txt-in weapon-name-in" value="${escapeHtml(weapon.name)}">
        </div>
        <div class="customizer-form-grp">
          <label>Description</label>
          <input type="text" class="customizer-txt-in weapon-desc-in" value="${escapeHtml(weapon.description)}">
        </div>
        <div class="customizer-flex-row">
          <div class="customizer-form-grp">
            <label>Focus Duration (m)</label>
            <input type="number" class="customizer-txt-in customizer-num-in weapon-dur-in" min="1" max="180" value="${weapon.duration || 25}">
          </div>
          ${key === 'deepFocus' ? `
            <div class="customizer-form-grp">
              <label>Break Duration (m)</label>
              <input type="number" class="customizer-txt-in customizer-num-in weapon-break-in" min="0" max="60" value="${weapon.breakDuration !== undefined ? weapon.breakDuration : 5}">
            </div>
          ` : ''}
        </div>
      `;
      weaponsList.appendChild(card);
    });
    weaponsCol.appendChild(weaponsList);

    // Values Column
    const valuesCol = document.createElement('div');
    valuesCol.className = 'customizer-section';
    valuesCol.innerHTML = `<h3><i data-lucide="crown"></i> Customize Values</h3>`;

    const valuesList = document.createElement('div');
    valuesList.className = 'customizer-row-list';

    Object.keys(draftState.values).forEach(key => {
      const value = draftState.values[key];
      const row = document.createElement('div');
      row.className = 'customizer-item-card';
      row.dataset.key = key;

      row.innerHTML = `
        <div class="customizer-flex-row">
          <div class="customizer-form-grp" style="flex: 1;">
            <label>Value Identifier / Name</label>
            <input type="text" class="customizer-txt-in value-name-in" value="${escapeHtml(value.name)}">
          </div>
          <div class="customizer-form-grp">
            <label>Score (pts)</label>
            <input type="number" class="customizer-txt-in customizer-num-in value-score-in" min="0" max="500" value="${value.score || 0}">
          </div>
          <button class="customizer-btn-del" title="Delete Value" data-key="${key}">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      `;
      valuesList.appendChild(row);
    });
    valuesCol.appendChild(valuesList);

    // Add Value Button
    const addValBtn = document.createElement('button');
    addValBtn.className = 'customizer-btn-add-val';
    addValBtn.innerHTML = `<i data-lucide="plus"></i> Add Custom Value`;
    addValBtn.type = 'button';
    addValBtn.addEventListener('click', addNewValue);
    valuesCol.appendChild(addValBtn);

    body.appendChild(weaponsCol);
    body.appendChild(valuesCol);
    modal.appendChild(body);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'customizer-footer';
    
    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn btn-secondary';
    resetBtn.textContent = 'Reset Defaults';
    resetBtn.addEventListener('click', resetDefaults);

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary';
    saveBtn.textContent = 'Save Customizations';
    saveBtn.addEventListener('click', saveCustomizations);

    footer.appendChild(resetBtn);
    footer.appendChild(saveBtn);
    modal.appendChild(footer);

    activeOverlay.appendChild(modal);

    // Attach headers close click trigger
    document.getElementById('customizer-close-trigger').addEventListener('click', closeCustomizer);

    // Attach click events to delete buttons
    modal.querySelectorAll('.customizer-btn-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const key = btn.dataset.key;
        deleteValueItem(key);
      });
    });

    // Redraw SVGs
    if (window.lucide) {
      window.lucide.createIcons({
        attrs: { class: 'lucide-icon' }
      });
    }
  }

  // 7. Add Custom Value Row (Mutates draftState)
  function addNewValue() {
    if (!draftState) return;
    try {
      const timestamp = Date.now();
      const newKey = `val_${timestamp}`;
      
      draftState.values[newKey] = {
        name: "New Custom Value",
        score: 0
      };
      
      renderModalContent();
    } catch (err) {
      console.error("Error adding value:", err);
    }
  }

  // 8. Delete Value Row (Mutates draftState)
  function deleteValueItem(key) {
    if (!draftState) return;
    try {
      delete draftState.values[key];
      renderModalContent();
    } catch (err) {
      console.error("Error deleting value:", err);
    }
  }

  // 9. Reset Defaults Form (Mutates draftState without global sync saving)
  function resetDefaults() {
    if (!draftState) return;
    if (!confirm("Are you sure you want to restore default weapons and values? This will override custom settings.")) return;
    try {
      // Revert weapons to standard
      draftState.weapons = {
        deepFocus: { name: "Deep Focus", description: "Custom concentration block & break", active: false, startedAt: null, duration: 25, breakDuration: 5, sessionType: "focus", breakStartedAt: null },
        inboxZero: { name: "Inbox Zero Speedrun", description: "15-minute aggressive email/task processing", active: false, startedAt: null, duration: 15 },
        digitalDetox: { name: "Off-grid Mode", description: "120 minutes of offline system operation", active: false, startedAt: null, duration: 120 }
      };

      // Revert values to standard
      draftState.values = {
        health: { name: "Health & Vitality", score: 0 },
        mastery: { name: "Skill Mastery", score: 0 },
        creation: { name: "Creative Output", score: 0 },
        freedom: { name: "Freedom & Autonomy", score: 0 },
        family: { name: "Relationships & Family", score: 0 }
      };

      renderModalContent();
    } catch (err) {
      console.error("Error resetting defaults:", err);
    }
  }

  // 10. Scan and Clean tasks holding deleted categories
  function cleanOrphanedTasks() {
    if (!state.tasks) return;
    state.tasks.forEach(task => {
      if (task.type === 'value' && !state.values[task.valueCategory]) {
        task.type = 'general';
        delete task.valueCategory;
      }
      if (task.type === 'weapon' && !state.weapons[task.weaponCategory]) {
        task.type = 'general';
        delete task.weaponCategory;
      }
    });
  }

  // 11. Commits draftState modifications to global state and saves
  function saveCustomizations() {
    if (!draftState) return;
    try {
      // Process Weapon Cards Inputs
      const weaponCards = activeOverlay.querySelectorAll('.customizer-body div:first-child .customizer-item-card');
      weaponCards.forEach(card => {
        const key = card.dataset.key;
        const nameIn = card.querySelector('.weapon-name-in');
        const descIn = card.querySelector('.weapon-desc-in');
        const durIn = card.querySelector('.weapon-dur-in');
        
        if (draftState.weapons[key]) {
          draftState.weapons[key].name = nameIn.value.trim() || draftState.weapons[key].name;
          draftState.weapons[key].description = descIn.value.trim() || draftState.weapons[key].description;
          draftState.weapons[key].duration = parseInt(durIn.value) || 25;
          
          if (key === 'deepFocus') {
            const breakIn = card.querySelector('.weapon-break-in');
            if (breakIn) {
              const breakVal = parseInt(breakIn.value);
              draftState.weapons[key].breakDuration = Number.isNaN(breakVal) ? 5 : breakVal;
            }
          }
        }
      });

      // Process Value Cards Inputs
      const valueCards = activeOverlay.querySelectorAll('.customizer-body div:last-child .customizer-item-card');
      
      // Build a fresh dictionary map of values
      const updatedValues = {};
      valueCards.forEach(card => {
        const key = card.dataset.key;
        const nameIn = card.querySelector('.value-name-in');
        const scoreIn = card.querySelector('.value-score-in');
        
        updatedValues[key] = {
          name: nameIn.value.trim() || "Custom Value",
          score: parseInt(scoreIn.value) || 0
        };
      });

      draftState.values = updatedValues;

      // Commit draft variables to main application state
      state.weapons = draftState.weapons;
      state.values = draftState.values;

      // Clean up any tasks associated with deleted values
      cleanOrphanedTasks();

      // Trigger sync persistence and render updates
      if (typeof saveState !== 'undefined') saveState();
      if (typeof renderWeapons !== 'undefined') renderWeapons();
      if (typeof renderValues !== 'undefined') renderValues();
      if (typeof renderTasks !== 'undefined') renderTasks();

      closeCustomizer();
    } catch (err) {
      console.error("Error saving customizations:", err);
      alert("Failed to save configurations. Please verify inputs.");
    }
  }

  // 12. Run Initialization when DOM is fully loaded or active
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Periodically check if dashboard has unhidden and re-inject controls if header reset
  setInterval(() => {
    const customBtn = document.getElementById('customizer-trigger');
    if (!customBtn) {
      injectHeaderTrigger();
      createModalContainer();
    }
  }, 1000);

})();
