/**
 * TimeMaster Customize Console Component
 * Isolated module handling customization of Pomodoros, Focus durations, and dynamic Values scorecard targets.
 */
(function() {
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
      -webkit-backdrop-filter: blur(12px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      transition: opacity 0.25s ease;
    }
    .customizer-overlay.hidden {
      opacity: 0;
      pointer-events: none;
    }
    .customizer-modal {
      width: 92%;
      max-width: 800px;
      max-height: 85vh;
      background: rgba(30, 41, 59, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4);
      display: flex;
      flex-direction: column;
      color: #fff;
      overflow: hidden;
      animation: customizerFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes customizerFadeIn {
      from { transform: translateY(15px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .customizer-header {
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(15, 23, 42, 0.3);
    }
    .customizer-header h2 {
      font-size: 1.15rem;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #818cf8;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .customizer-close-btn {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 1.5rem;
      cursor: pointer;
      line-height: 1;
      padding: 4px;
      transition: color 0.15s;
    }
    .customizer-close-btn:hover {
      color: #f1f5f9;
    }
    .customizer-body {
      padding: 20px;
      overflow-y: auto;
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 20px;
    }
    @media (max-width: 768px) {
      .customizer-body {
        grid-template-columns: 1fr;
      }
    }
    .customizer-section {
      display: flex;
      flex-direction: column;
    }
    .customizer-section h3 {
      font-size: 0.9rem;
      font-weight: 600;
      color: #f1f5f9;
      margin: 0 0 12px 0;
      padding-bottom: 6px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .customizer-row-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .customizer-item-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .customizer-form-grp {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .customizer-form-grp label {
      font-size: 0.68rem;
      color: #94a3b8;
      font-weight: 500;
    }
    .customizer-txt-in {
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 4px;
      padding: 5px 8px;
      color: #fff;
      font-size: 0.76rem;
      outline: none;
      transition: border-color 0.15s;
    }
    .customizer-txt-in:focus {
      border-color: #818cf8;
    }
    .customizer-num-in {
      width: 54px;
      text-align: center;
    }
    .customizer-flex-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .customizer-flex-row .customizer-txt-in {
      flex: 1;
    }
    .customizer-btn-del {
      background: transparent;
      border: none;
      color: #ef4444;
      cursor: pointer;
      padding: 6px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s;
    }
    .customizer-btn-del:hover {
      background: rgba(239, 68, 68, 0.15);
    }
    .customizer-btn-add-val {
      margin-top: 8px;
      width: 100%;
      padding: 7px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px dashed rgba(255, 255, 255, 0.15);
      border-radius: 6px;
      color: #94a3b8;
      font-size: 0.76rem;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.15s;
    }
    .customizer-btn-add-val:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: #818cf8;
      color: #fff;
    }
    .customizer-footer {
      padding: 12px 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      background: rgba(15, 23, 42, 0.3);
    }
    
    /* Light Theme Overrides */
    body.light-theme .customizer-overlay {
      background: rgba(241, 245, 249, 0.85);
    }
    body.light-theme .customizer-modal {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.05);
      color: #0f172a;
    }
    body.light-theme .customizer-header {
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
    }
    body.light-theme .customizer-header h2 {
      color: #4f46e5;
    }
    body.light-theme .customizer-close-btn {
      color: #64748b;
    }
    body.light-theme .customizer-close-btn:hover {
      color: #0f172a;
    }
    body.light-theme .customizer-section h3 {
      color: #0f172a;
      border-bottom: 1px solid #e2e8f0;
    }
    body.light-theme .customizer-item-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
    }
    body.light-theme .customizer-form-grp label {
      color: #64748b;
    }
    body.light-theme .customizer-txt-in {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #0f172a;
    }
    body.light-theme .customizer-txt-in:focus {
      border-color: #4f46e5;
    }
    body.light-theme .customizer-btn-add-val {
      background: #f1f5f9;
      border: 1px dashed #cbd5e1;
      color: #64748b;
    }
    body.light-theme .customizer-btn-add-val:hover {
      background: #e2e8f0;
      border-color: #4f46e5;
      color: #0f172a;
    }
    body.light-theme .customizer-footer {
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
    }
  `;

  // Inject Styles
  const styleEl = document.createElement('style');
  styleEl.innerHTML = styles;
  document.head.appendChild(styleEl);

  // 2. Local State Variables & Elements Reference
  let activeOverlay = null;

  // 3. Initialize UI Hooks
  function init() {
    // Append customization button into header actions
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions) return;

    // Remove any existing toggle-customizer-btn to avoid duplicate rendering
    const existingBtn = document.getElementById('toggle-customizer-btn');
    if (existingBtn) existingBtn.remove();

    const customBtn = document.createElement('button');
    customBtn.id = 'toggle-customizer-btn';
    customBtn.className = 'btn btn-icon';
    customBtn.title = 'Customize Console Configurations';
    customBtn.innerHTML = `
      <i data-lucide="sliders"></i>
      <span>Customize</span>
    `;
    
    // Insert customizer button right before sync phone button or manual button
    const qrBtn = document.getElementById('toggle-qr-btn');
    if (qrBtn) {
      headerActions.insertBefore(customBtn, qrBtn);
    } else {
      headerActions.appendChild(customBtn);
    }

    // Build the Modal Overlay DOM element
    let overlay = document.getElementById('customizer-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'customizer-overlay';
      overlay.className = 'customizer-overlay hidden';
      document.body.appendChild(overlay);
    }
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

  // 4. Open Customizer Modal Panel
  function openCustomizer() {
    if (typeof state === 'undefined') {
      console.error("State object is unavailable.");
      return;
    }
    renderModalContent();
    activeOverlay.classList.remove('hidden');
  }

  // 5. Close Customizer Modal Panel
  function closeCustomizer() {
    activeOverlay.classList.add('hidden');
    activeOverlay.innerHTML = '';
  }

  // 6. Draw Modal Form Components
  function renderModalContent() {
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

    Object.keys(state.weapons).forEach(key => {
      const weapon = state.weapons[key];
      const card = document.createElement('div');
      card.className = 'customizer-item-card';
      card.dataset.key = key;

      card.innerHTML = `
        <div class="customizer-form-grp">
          <label>Weapon Name</label>
          <input type="text" class="customizer-txt-in weapon-name-in" value="${weapon.name.replace(/"/g, '&quot;')}">
        </div>
        <div class="customizer-form-grp">
          <label>Description</label>
          <input type="text" class="customizer-txt-in weapon-desc-in" value="${weapon.description.replace(/"/g, '&quot;')}">
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

    Object.keys(state.values).forEach(key => {
      const value = state.values[key];
      const row = document.createElement('div');
      row.className = 'customizer-item-card';
      row.dataset.key = key;

      row.innerHTML = `
        <div class="customizer-flex-row">
          <div class="customizer-form-grp" style="flex: 1;">
            <label>Value Identifier / Name</label>
            <input type="text" class="customizer-txt-in value-name-in" value="${value.name.replace(/"/g, '&quot;')}">
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

  // 7. Add Custom Value Row
  function addNewValue() {
    try {
      const timestamp = Date.now();
      const newKey = `val_${timestamp}`;
      
      // Update state object
      state.values[newKey] = {
        name: "New Custom Value",
        score: 0
      };
      
      // Re-render modal form layout
      renderModalContent();
    } catch (err) {
      console.error("Error adding value:", err);
    }
  }

  // 8. Delete Value Row
  function deleteValueItem(key) {
    try {
      delete state.values[key];
      renderModalContent();
    } catch (err) {
      console.error("Error deleting value:", err);
    }
  }

  // 9. Reset Defaults Form
  function resetDefaults() {
    if (!confirm("Are you sure you want to restore default weapons and values? This will override custom settings.")) return;
    try {
      // Revert weapons to standard
      state.weapons = {
        deepFocus: { name: "Deep Focus", description: "Custom concentration block & break", active: false, startedAt: null, duration: 25, breakDuration: 5, sessionType: "focus", breakStartedAt: null },
        inboxZero: { name: "Inbox Zero Speedrun", description: "15-minute aggressive email/task processing", active: false, startedAt: null, duration: 15 },
        digitalDetox: { name: "Off-grid Mode", description: "120 minutes of offline system operation", active: false, startedAt: null, duration: 120 }
      };

      // Revert values to standard
      state.values = {
        health: { name: "Health & Vitality", score: 0 },
        mastery: { name: "Skill Mastery", score: 0 },
        creation: { name: "Creative Output", score: 0 },
        freedom: { name: "Freedom & Autonomy", score: 0 },
        family: { name: "Relationships & Family", score: 0 }
      };

      // Clean up orphaned tasks references
      cleanOrphanedTasks();

      // Trigger sync saves
      if (typeof saveState !== 'undefined') saveState();
      if (typeof renderWeapons !== 'undefined') renderWeapons();
      if (typeof renderValues !== 'undefined') renderValues();
      if (typeof renderTasks !== 'undefined') renderTasks();

      closeCustomizer();
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

  // 11. Save customized values & durations back to persistence state
  function saveCustomizations() {
    try {
      // Process Weapon Cards Inputs
      const weaponCards = activeOverlay.querySelectorAll('.customizer-body div:first-child .customizer-item-card');
      weaponCards.forEach(card => {
        const key = card.dataset.key;
        const nameIn = card.querySelector('.weapon-name-in');
        const descIn = card.querySelector('.weapon-desc-in');
        const durIn = card.querySelector('.weapon-dur-in');
        
        if (state.weapons[key]) {
          state.weapons[key].name = nameIn.value.trim() || state.weapons[key].name;
          state.weapons[key].description = descIn.value.trim() || state.weapons[key].description;
          state.weapons[key].duration = parseInt(durIn.value) || 25;
          
          if (key === 'deepFocus') {
            const breakIn = card.querySelector('.weapon-break-in');
            if (breakIn) {
              state.weapons[key].breakDuration = parseInt(breakIn.value) || 5;
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

      // Apply to State
      state.values = updatedValues;

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
    const customBtn = document.getElementById('toggle-customizer-btn');
    const dashboardContainer = document.querySelector('.dashboard-container');
    if (dashboardContainer && !dashboardContainer.classList.contains('hidden') && !customBtn) {
      init();
    }
  }, 1000);

})();
