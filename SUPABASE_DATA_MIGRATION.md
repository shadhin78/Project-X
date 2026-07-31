# Supabase Data Migration & Persistence Architecture (STEP 7)

> **Project:** Project X - Dynamic Multi-Track Execution & Tracking Dashboard  
> **Phase:** Step 7 — Workspace Data Persistence Migration to Supabase  
> **Date:** July 31, 2026  

---

## 1. Executive Summary

In Step 7, the application's workspace state persistence is migrated from `FirebaseService` in-memory/mock layer to **Supabase PostgreSQL database** (`public.user_workspaces` table).

All application entities remain structured inside a single monolithic JSONB column (`state_data`), preserving 100% of existing application state schemas without breaking data references or requiring relational schema modifications.

---

## 2. Data Flow Comparison

```
ONLINE DATA FLOW (Target STEP 7 Architecture):

     User Interaction / Timer Event
                   │
                   ▼
         window.AppState (Memory)
                   │
                   ▼
         safeStorage (LocalStorage Cache)
                   │
                   ▼
    window.SupabaseService.saveToCloud()
                   │
                   ▼
  Supabase user_workspaces.upsert() [JSONB]
```

```
OFFLINE / NETWORK FAILURE DATA FLOW:

     User Interaction / Timer Event
                   │
                   ▼
         window.AppState (Memory)
                   │
                   ▼
         safeStorage (LocalStorage Cache)
```

---

## 3. Exact `AppState` → `user_workspaces.state_data` Schema Mapping

The single JSONB payload written to `user_workspaces.state_data` contains the exact 28 fields serialized from `window.AppState`:

```json
{
  "tasks": [],
  "tracks": [],
  "customSyllabus": {},
  "customPrograms": {},
  "customActions": [],
  "paceGoals": [],
  "passedItems": { "programs": [], "subjects": [] },
  "revisionData": { "active": [], "progress": {} },
  "programVisibility": {},
  "subjectTimeLinks": {},
  "successResults": [],
  "timerLogs": [],
  "dailyFocusHoursTarget": 4.0,
  "dailyFocusHoursTargetDate": "",
  "dailyFocusHoursTargetHistory": [],
  "timerAnalyticsRange": 180,
  "timerAnalyticsGrouping": "daily",
  "timerAnalyticsChartStyle": "combo",
  "subjectFocusTargets": {},
  "dashboardConfig": {
    "topTag": "",
    "mainTitle": "2026 Study Master",
    "subTitle": "",
    "trendStartDate": "",
    "trendEndDate": "",
    "showDaysRemaining": false,
    "independentPaces": { "tracks": {}, "programs": {}, "subjects": {} }
  },
  "weeklyTargetsDatabase": {},
  "dailyTargetsDatabase": {},
  "scheduleBlocks": [],
  "scheduleBlocks2": [],
  "scheduleGroups": [],
  "fiscalLedger": { "transactions": [], "budgets": [], "vaults": [] },
  "examSessions": [],
  "examRoutine": [],
  "selectedCountdownExamId": "auto"
}
```

---

## 4. Database Operations Specification

### Table Target: `public.user_workspaces`
* `user_id`: Authenticated Supabase user UUID (`user.id`)
* `state_data`: JSONB payload
* `updated_at`: `new Date().toISOString()`

### A. `saveToCloud(immediate = false)`
1. Checks `window.dataHydrationComplete`. If `false`, save is blocked to prevent overwriting cloud state during boot.
2. Checks authenticated user (`SupabaseService.getCurrentUser()`). If unauthenticated, skips cloud write and saves locally to `safeStorage`.
3. Serializes `AppState` payload and caches it in `safeStorage.setItem('cached_fullAppState', JSON.stringify(payload))`.
4. Executes Supabase upsert:
   ```javascript
   await supabaseClient.from('user_workspaces').upsert({
       user_id: user.id,
       state_data: payload,
       updated_at: new Date().toISOString()
   }, { onConflict: 'user_id' });
   ```
5. Updates DOM status badge via `showSync('saving' | 'saved' | 'error')`.

### B. `loadFromCloud()`
1. Checks authenticated user (`SupabaseService.getCurrentUser()`).
2. Queries `supabaseClient.from('user_workspaces').select('state_data').eq('user_id', user.id).maybeSingle()`.
3. If cloud row exists: restores state via `window.applyFullAppState(row.state_data)` and updates `safeStorage`.
4. If no cloud row exists (first login): loads cached local state from `safeStorage` (if present) or default state, and triggers initial `saveToCloud()` to populate the user's initial row in Supabase.
5. If query fails (offline): falls back safely to `safeStorage` without wiping local state.
6. Sets `window.dataHydrationComplete = true`.

### C. `saveTimerToCloud()`
1. Invokes `window.TimerService.saveActiveStateToStore()`.
2. Invokes `saveToCloud(true)` to persist timer logs and state.

### D. `wipeCloudWorkspace()`
1. Authenticates current user.
2. Executes `supabaseClient.from('user_workspaces').delete().eq('user_id', user.id)`.
3. Removes `cached_fullAppState` from `safeStorage`.

---

## 5. Startup Data Hydration & Safety Guard

To guarantee zero accidental overwrites of existing cloud workspace data by default initial states:
* `window.dataHydrationComplete` defaults to `false`.
* `saveToCloud()` aborts if `window.dataHydrationComplete === false`.
* `loadFromCloud()` completes cloud/local hydration first, sets `window.dataHydrationComplete = true`, and then unlocks normal save operations.

---

## 6. Firebase Database Bypassing Status

* **Firestore Reads:** 0 active calls.
* **Firestore Writes:** 0 active calls.
* **Firestore Listeners:** 0 active calls.
* **Compatibility Layer:** `FirebaseService.saveToCloud()`, `loadFromCloud()`, `saveTimerToCloud()`, `wipeCloudWorkspace()` in `js/firebase.js` delegate directly to `SupabaseService`.
* **Firebase SDK:** Scripts remain included in HTML head strictly until final cleanup phase.
