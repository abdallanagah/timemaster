# TimeMaster: Product Requirements Document (MVP)

This document outlines the core functional requirements and step-by-step user flows for the Minimum Viable Product (MVP) of **TimeMaster**.

---

## 🎯 Core Product Features

### 1. Tabbed Traditional Authentication
* **Purpose:** Multi-tenant workspace separation and user data privacy.
* **Requirements:**
  * Clean, overlay interface featuring alternating "Login" and "Sign Up" tabs.
  * Form inputs validating Username and Password.
  * Checks preventing duplicated registration and credentials mismatch.
  * Returns secure session tokens persisted in browser session buffers.

### 2. Branding & Features Landing Overview
* **Purpose:** Introduce first-time visitors to the TimeMaster methodology.
* **Requirements:**
  * Rendered as an adjacent column to the authentication form on the landing overlay.
  * Explains the three core matrix components:
    * **Reclaim Weapons:** Tactical states (such as Deep Focus blocks) to maximize execution.
    * **Recognize Values:** Life alignment scorecard progress indicators.
    * **Recharge Superpowers:** Guided neural battery restoration routines.

### 3. Eisenhower 4-Quadrant Matrix Board
* **Purpose:** Visual prioritization of tasks based on Urgency and Importance.
* **Requirements:**
  * **Inbox Drawer:** Staging ground for fresh, unclassified tasks.
  * **Quadrant 1 (Firefighting):** Important and Urgent tasks.
  * **Quadrant 2 (Values Alignment):** Important but Not Urgent tasks.
  * **Quadrant 3 (Distractions):** Urgent but Not Important tasks.
  * **Quadrant 4 (Waste):** Not Important and Not Urgent tasks.
  * **Interactivity:** HTML5 Drag & Drop enabled to drag tasks between boards.

### 4. Reclaim Weapons sidebar panel
* **Purpose:** Focus-time tracker modules with customizable Pomodoro timers.
* **Requirements:**
  * Configures **Deep Focus** intervals (Focus / Break durations), **Inbox Zero Speedrun** (15m block), and **Off-grid Mode** (120m detox block).
  * Equips a countdown focus clock overlay once triggered.
  * Prevents starting multiple concurrent focus sessions.

### 5. Recognize Values panel
* **Purpose:** Track alignment scores across life anchors.
* **Requirements:**
  * Scorecard gauges for Health, Skill Mastery, Creative Output, Freedom, and Relationships.
  * Increments scores by **+10 points** when a linked Q2 task is checked off as completed.

### 6. Recharge Superpowers panel
* **Purpose:** Guided recovery routines to restore energy levels.
* **Requirements:**
  * Guided breathing pacemakers (4s inhale / 4s hold / 4s exhale / 4s hold box breathing) and neuro-nap countdown timers.
  * Ticking active superpower state recovers the main stamina battery level.

### 7. Task chevron customization dropdown
* **Purpose:** Deconstruct tasks, add notes, and adjust parameters.
* **Requirements:**
  * **Task Name Editor:** Inline text input to modify titles.
  * **Notes Box:** Textarea to write descriptions.
  * **Checklist Todo List:** Subtasks creator allowing users to add, check off, and delete sub-items.
  * **Task Type Mappings:** Set task link type (General, Weapon, Value, Superpower) and subcategory. Shows a dynamic explanation info card based on the selection.

### 8. Mobile QR Synchronization
* **Purpose:** Enable local network sync so users can view the dashboard on mobile devices.
* **Requirements:**
  * Fetches the local server IP and port, rendering a QR code containing the URL.

---

## 🔄 Step-by-Step User Flows

### Flow 1: Registration and Sign-in
1. User visits the landing page. The application detects no session token and displays the Landing Portal Overlay.
2. User views system benefits and clicks the **Sign Up** tab.
3. User enters username `developer` and password `matrix`. Click **Register**.
4. The backend registers the user, seeds default tasks, issues a token, and the dashboard transitions into view.

### Flow 2: Task Customization & Checklist Creation
1. User clicks **+ Add Task** inside the Inbox board. A blank task card is created.
2. User clicks the task's **chevron expand arrow** to reveal options.
3. User edits the task name to `"Deploy server refactoring"` in the name input field.
4. User writes `"Restructure routes/ and modules/"` inside the Notes box.
5. User types `"Verify with npm test"` inside the checklist input field and presses Enter (or clicks `+`). A subtask checklist item is appended.
6. User clicks the **Task Type** select dropdown, selects **Value**, and selects **Skill Mastery** in the subcategory select. A card displays:
   > 👑 Value Alignment: Skill Mastery
   > Current Score: 0 pts. Use: Completing this task inside the Q2 Column adds +10 score points directly to your core value metric.

### Flow 3: Task Prioritization & Execution
1. User drags `"Deploy server refactoring"` from the Inbox and drops it inside the **Q2 (Values)** quadrant board.
2. User clicks the task's checkbox button to mark it as **Completed**.
3. The system adds **+10 points** to the **Skill Mastery** value scorecard in the sidebar.
4. The task text strikes through, and the details collapse.
