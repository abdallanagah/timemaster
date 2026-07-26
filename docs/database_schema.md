# TimeMaster: Database Schema

TimeMaster manages user data partitions using a hybrid model:
1. **Node.js Local Server Persistence:** Structured inside `db.json` on the disk.
2. **Client-side Browser Persistence:** Structured inside `localStorage` keys.

---

## 🗄️ Backend Schema (`db.json`)

The server-side database stores user passwords and isolated state data grouped under their unique lowercase username keys.

```json
{
  "users": {
    "<username>": {
      "password": "passwordString",
      "state": {
        "energy": 80,
        "activeFocusTaskId": "task_1784018559536_ew27l",
        "tasks": [
          {
            "id": "task_1784018559536_ew27l",
            "text": "Task Title/Description",
            "quadrant": "q2",
            "status": "active",
            "type": "value",
            "createdAt": "2026-07-14T08:42:39.536Z",
            "completedAt": null,
            "q1TargetTime": null,
            "deadline": "2026-07-21T13:00:00.000Z",
            "updatedAt": "2026-07-15T10:08:07.744Z",
            "valueCategory": "creation",
            "details": "Custom task details/notes",
            "subtasks": [
              {
                "id": "sub-1784018559536-ax34p",
                "text": "Subtask checklist item",
                "completed": false
              }
            ],
            "timeConsumed": 1500
          }
        ],
        "weapons": {
          "deepFocus": {
            "name": "Deep Focus",
            "description": "Custom concentration block & break",
            "active": false,
            "startedAt": null,
            "duration": 25,
            "breakDuration": 5,
            "sessionType": "focus",
            "breakStartedAt": null
          },
          "inboxZero": {
            "name": "Inbox Zero Speedrun",
            "description": "15-minute aggressive email/task processing",
            "active": false,
            "startedAt": null,
            "duration": 15
          },
          "digitalDetox": {
            "name": "Off-grid Mode",
            "description": "120 minutes of offline system operation",
            "active": false,
            "startedAt": null,
            "duration": 120
          }
        },
        "superpowers": {
          "breathing": {
            "name": "Tactical Breathing",
            "description": "5-minute paced breathing for neural reset",
            "duration": 5
          },
          "powerNap": {
            "name": "Neuro-Nap",
            "description": "20-minute rapid physical & mental recharge",
            "duration": 20
          },
          "hydration": {
            "name": "Hydration Surge",
            "description": "2-minute physical hydration recharge",
            "duration": 2
          },
          "reading": {
            "name": "Insight Feed",
            "description": "15-minute tactical reading or skill intake",
            "duration": 15
          }
        },
        "rechargeState": {
          "active": false,
          "type": null,
          "startedAt": null,
          "duration": 0
        },
        "values": {
          "health": { "name": "Health & Vitality", "score": 10 },
          "mastery": { "name": "Skill Mastery", "score": 20 },
          "creation": { "name": "Creative Output", "score": 0 },
          "freedom": { "name": "Freedom & Autonomy", "score": 0 },
          "family": { "name": "Relationships & Family", "score": 0 }
        }
      }
    }
  }
}
```

---

## 📇 Field Definitions

### 1. Task Entity
* `id` (String): Unique timestamp-based task identifier.
* `text` (String): Main title/label of the task.
* `quadrant` (String): Eisenhower matrix designation: `inbox` | `q1` | `q2` | `q3` | `q4`.
* `status` (String): Task execution state: `active` | `completed`.
* `type` (String): Cognitive link type: `general` | `weapon` | `value` | `superpower`.
* `weaponCategory` (String, Optional): Equips Pomodoro variables: `deepFocus` | `inboxZero` | `digitalDetox`.
* `valueCategory` (String, Optional): Aligns value scoring: `health` | `mastery` | `creation` | `freedom` | `family`.
* `superpowerCategory` (String, Optional): Assigns recharging modules: `breathing` | `powerNap` | `hydration` | `reading`.
* `q1TargetTime` (String, ISO 8601): Funnel target timestamp.
* `deadline` (String, ISO 8601): Target deadline.
* `details` (String): Explanatory notes.
* `subtasks` (Array): Collection of subtask objects containing `id`, `text`, and `completed` boolean flag.
* `timeConsumed` (Number, Optional): Total focus seconds tracked on this task.

### 2. Weapons & Superpowers
* `active` (Boolean): Flag indicating if the specific focus timer or recovery Nap/Breathing sequence is running.
* `startedAt` (String, ISO 8601): Start timestamp of the timer.
* `duration` (Number): Session duration in minutes.
* `score` (Number): Value alignment progress score (increments by **+10** for each completed Q2 value-aligned task).

---

## 🌐 Client-side Browser Storage Keys

When running statically, the client replicates the backend relational schemas using standard Web API Storage interfaces:

| Key | Storage | Content Structure |
| :--- | :--- | :--- |
| `timemaster-local-accounts` | `localStorage` | Dict mapping `{ username: passwordString }` to verify logins. |
| `timemaster-state-<username>` | `localStorage` | Stores the complete user `state` JSON payload. |
| `timemaster-token` | `sessionStorage` | Session key (`auth-token-<username>` or server hex token). |
