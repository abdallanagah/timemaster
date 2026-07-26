---
title: TimeMaster
emoji: ⏱️
colorFrom: indigo
colorTo: purple
sdk: static
pinned: false
---

# TimeMaster (Executive Productivity Dashboard)

TimeMaster is a high-contrast glassmorphic command deck designed to help you manage your focus, reclaim control of your tasks, and recharge your energy using reactive Pomodoro workflows.

---

## 🔒 Security & Credentials

TimeMaster features a secure login panel:
- **Default Username:** `abdalla`
- **Default Password:** `2000`

Once logged in, credentials are saved locally in the browser session context, ensuring you don't have to re-enter them constantly during active work.

---

## 🚀 Key Features

1. **Reclaim Focus (Customizable Pomodoro):** Configure focus intervals (default 25m) and break intervals (default 5m). When focus ends, your **Operator Energy restores by +15%**.
2. **Linked Focus Task Tracking:** Select a task to focus on. While Deep Focus runs, TimeMaster ticks up and records the exact time consumed on that specific task (e.g. `⏱️ 45m 12s spent`).
3. **Clean Task View:** Tasks collapse advanced dropdown selectors by default under a chevron settings panel, hiding visual noise so you can prioritize your focus checklist.
4. **Auto-Escalation:** Approaching deadlines (under 2 hours) trigger a physical alarm shake, sound chime, and auto-funnel the task straight to Q1 (Firefight).
5. **Mobile Sync:** Generate a local QR code connection to run and check your TimeMaster task progress from your phone.

---

## 🛠️ Hugging Face & Docker Deployment

This repository is optimized for deployment to **Hugging Face Spaces** using the Docker SDK:

1. Create a new **Hugging Face Space**.
2. Select **Docker** as the SDK.
3. Select **Blank** or **Node** templates.
4. Push your files to the Hugging Face git remote, or upload them directly.
5. Hugging Face will automatically detect the `Dockerfile` and compile the app to run on port `7860`.

---

## 💻 GitHub Upload Guide

To upload this system to your GitHub account, run these commands inside your project directory:

```bash
# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "feat: TimeMaster launch with login, Pomodoro task tracking, and clean UI"

# Rename branch to main
git branch -M main

# Add your GitHub repository as remote (Replace with your actual URL)
git remote add origin https://github.com/your-username/timemaster.git

# Push code to GitHub
git push -u origin main
```
