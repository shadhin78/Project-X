# Firebase → Supabase Migration Audit Report

> **Project:** Project X - Dynamic Multi-Track Execution & Tracking Dashboard  
> **Audit Type:** Audit & Analysis Only (Non-destructive)  
> **Date:** July 31, 2026  

---

## 1. Executive Summary

This document presents a complete audit of all Firebase dependencies, SDK integrations, authentication flows, data structures, persistence mechanisms, error handling logic, and module dependencies across the **Project X** web application.

Currently, the application operates on a **Memory-First / Local-First** architecture where cloud sync methods in `js/firebase.js` manage `window.appState` in memory and persist state to `localStorage` (`safeStorage`), while maintaining Firebase Auth compatibility and script inclusion for authentication.

---

## 2. Detailed Technical Analysis (Items 1 – 20)

### 1. Firebase SDK Imports and Initialization
* **CDN Scripts Included:**
  * `index.html`:
    * `https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js`
    * `https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js`
    * `https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js`
  * `login.html`:
    * `https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js`
    * `https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js`
* **Initialization Function:**
  * Defined in `FirebaseService.init(config)` within `js/firebase.js`.
  * Instantiates `firebase.initializeApp(config)`.
  * Obtains Firestore instance via `AppState.db = firebase.firestore()`.
  * Configures Firestore settings: `AppState.db.settings({ experimentalAutoDetectLongPolling: true })`.

### 2. Firebase Authentication
* **Auth Method:** Email & Password (`firebase.auth().signInWithEmailAndPassword(cleanEmail, password)`).
* **Persistence Setting:** `firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)`.
* **Logout Method:** `firebase.auth().signOut()`.
* **Current User Reference:** `firebase.auth().currentUser`.

### 3. Google/Gmail Authentication
* **Status:** **NOT IMPLEMENTED / ABSENT**.
* **Details:** The codebase does not use `GoogleAuthProvider`, `signInWithPopup`, or `signInWithRedirect`. Google Fonts are loaded via HTML link tags, but no Google OAuth SDK or sign-in flow exists.

### 4. Firestore Initialization
* **Status:** Initialized in `FirebaseService.init()` as `AppState.db = firebase.firestore()`.
* **Configuration:** Long polling auto-detection set via `experimentalAutoDetectLongPolling: true`.

### 5. Firestore Collections and Document Structures
* **Status:** **ABSTRACTED / IN-MEMORY MONOLITHIC PAYLOAD**.
* **Structure:** Rather than using multiple separate Firestore collections, the application serializes its entire workspace state into a single monolithic JSON document structure.
* **Document Key:** User document identified by user `uid` (`mock-local-user-id` or Firebase Auth UID).

### 6. Every Firestore Read Operation
* **Status:** **DEPRECATED / STUBBED IN FAVOR OF MEMORY STATE**.
* **Code Reference:** `FirebaseService.loadFromCloud()` in `js/firebase.js` initializes default workspace structures and recalculates totals directly in memory. Active network read operations are disabled.

### 7. Every Firestore Write / Update / Delete Operation
* **Status:** **DEPRECATED / STUBBED IN FAVOR OF MEMORY STATE**.
* **Code Reference:** `FirebaseService.saveToCloud()` in `js/firebase.js` constructs the monolithic payload in memory and updates `window.appState`. Active network write calls to Firestore (`setDoc`, `updateDoc`, `deleteDoc`) are bypassed.

### 8. Realtime Listeners (`onSnapshot`)
* **Status:** **STUBBED**.
* **Code Reference:** `FirebaseService.startSnapshotListener(uid, onData, onError)` returns a dummy `function unsubscribe() {}`.

### 9. Firebase Offline Persistence / Cache
* **Firestore SDK Persistence:** Managed automatically by `firebase-firestore-compat.js`.
* **Application Offline Cache:** Managed via `safeStorage` (`localStorage` wrapper) for `firebaseConfig` and `local_auth_user`.

### 10. Firebase Auth State Listeners
* **Code Reference:** `FirebaseService.onAuthStateChanged(callback)` in `js/firebase.js`.
* **Implementation:** Wraps `firebase.auth().onAuthStateChanged(user)` and maintains an internal array `_authListeners` to notify callbacks during manual fallback logins/logouts.

### 11. Firebase Configuration & Environment Variables
* **Environment Variables:**
  * `NEXT_PUBLIC_FIREBASE_API_KEY`
  * `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
  * `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
  * `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
  * `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
  * `NEXT_PUBLIC_FIREBASE_APP_ID`
* **Resolution Pipeline:**
  1. `/api/config` server endpoint (`api/config.js` or `js/dev-server.js`).
  2. Fallback parse of `/.env` static file.
  3. Fallback read from `localStorage` (`safeStorage.getItem('firebaseConfig')`).
  4. Hardcoded fallback config object for `project-x-29`.

### 12. LocalStorage Usage Related to Firebase
* `firebaseConfig`: Cached JSON configuration object.
* `local_auth_user`: Cached mock user object for offline / `file://` fallback auth (`{ email, uid, displayName }`).
* `cached_fullAppState`: Legacy full state backup.

### 13. IndexedDB Usage Related to Firebase / Offline Sync
* **Custom Code Usage:** **NONE**.
* **SDK Internal Usage:** Used internally by the FirebaseCompat SDK for Firestore offline cache.

### 14. Synchronization Queue or Retry Mechanism
* **Status:** UI status function `showSync(state)` handles visual state (`saving`, `saved`, `error`). No active network background sync queue is executing.

### 15. Code Depending on Firebase UID
* `FirebaseService.onAuthStateChanged` passes user object containing `uid`.
* Fallback auth user uses `uid: "mock-local-user-id"`.
* `window.currentUser.uid` is referenced when identifying active workspace owner.

### 16. Code Assuming Firebase Document IDs
* **Status:** None. User state is serialized as a single payload object.

### 17. Security-Rule-Dependent Behavior
* **Client-Side Admin Enforcement:**
  * In `js/script.js` line 17562: `if (user.email !== 'ris2k29@gmail.com') { FirebaseService.logout()... }`.
  * In `js/script.js` line 17704: Form login validates user email against `ris2k29@gmail.com`.

### 18. Firebase-Specific Error Handling
* In `login.html` submit handler (`js/script.js` lines 17712–17722):
  * `auth/wrong-password`, `auth/user-not-found`, `auth/invalid-credential` → "Invalid email or password."
  * `auth/invalid-email` → "Invalid email address format."
  * `auth/user-disabled` → "This user account has been disabled."

### 19. Services / Modules Directly Depending on Firebase
* `js/firebase.js` (declares `window.FirebaseService`).
* `api/config.js` (serves Firebase env variables).
* `js/dev-server.js` (serves `/api/config` for local node server).

### 20. UI Components Calling Firebase Directly
* `login.html`: `login-form` submit listener calls `FirebaseService.login()`.
* `index.html`: Logout button calls `FirebaseService.logout()`.
* `index.html`: Header profile displays user email (`profile-email`) and initial (`profile-avatar`).
* `index.html`: `sync-status` badge updated via `showSync()`.
* `js/timer.js`: Timer stop/reset calls `FirebaseService.saveTimerToCloud()` and `FirebaseService.saveToCloud()`.
* `js/script.js`: Data modifications trigger `FirebaseService.saveToCloud()`.

---

## 3. Application Architecture Analysis

```
+-----------------------------------------------------------------------+
|                              USER INTERFACE                           |
|       index.html | login.html | Navigation | Modals | Timers          |
+-----------------------------------+-----------------------------------+
                                    |
                                    v
+-----------------------------------------------------------------------+
|                           APPLICATION STATE                           |
|      window.AppState (js/state.js) & transparent window getters       |
+-----------------------------------+-----------------------------------+
                                    |
                                    v
+-----------------------------------------------------------------------+
|                            SERVICE WRAPPER                            |
|             window.FirebaseService (js/firebase.js)                  |
|    - Auth (login / logout / onAuthStateChanged)                       |
|    - Cloud Wrappers (saveToCloud / loadFromCloud / showSync)          |
+-----------------------------------+-----------------------------------+
                                    |
         +--------------------------+--------------------------+
         |                                                     |
         v                                                     v
+----------------------------------+         +----------------------------------+
|          LOCAL STORAGE           |         |        FIREBASE SDK (CDN)        |
|    safeStorage (js/utils.js)     |         |  firebase-app / auth / firestore |
|  - firebaseConfig                |         |  (Configured via /api/config)    |
|  - local_auth_user               |         +----------------------------------+
+----------------------------------+
```

* **State Management:** Single source of truth in `window.AppState` ([js/state.js](file:///d:/TEST/Project%20X%20-%20Copy/js/state.js)). Global properties on `window` transparently alias `AppState` via `Object.defineProperty`.
* **Data Persistence:** In-memory workspace payload stored in `window.appState`, backed by `safeStorage` (`localStorage`).
* **Authentication Flow:** Single-admin access restricted strictly to `ris2k29@gmail.com`.
* **Sync Flow:** Actions invoke `FirebaseService.saveToCloud()`, which updates `window.appState` and triggers `showSync('saving' | 'saved')`.
* **Offline Behavior:** Works completely offline or under `file://` protocol using fallback local authentication (`local_auth_user`).

---

## 4. Migration Audit Sections (A – N)

### A. Firebase Files / Modules
| File Path | Current Role | Migration Action Required |
| :--- | :--- | :--- |
| [js/firebase.js](file:///d:/TEST/Project%20X%20-%20Copy/js/firebase.js) | Main Firebase service module | Replace with `js/supabase.js` or update wrapper |
| [api/config.js](file:///d:/TEST/Project%20X%20-%20Copy/api/config.js) | API handler serving Firebase env config | Update to serve Supabase URL & Anon Key |
| [js/dev-server.js](file:///d:/TEST/Project%20X%20-%20Copy/js/dev-server.js) | Local dev HTTP server serving `/api/config` | Update `/api/config` response keys |
| [.env](file:///d:/TEST/Project%20X%20-%20Copy/.env) | Environment variables | Replace with Supabase credentials |
| [.env.example](file:///d:/TEST/Project%20X%20-%20Copy/.env.example) | Environment template | Replace with Supabase keys template |
| [index.html](file:///d:/TEST/Project%20X%20-%20Copy/index.html) | CDN script imports & script tag | Swap Firebase CDN for Supabase CDN |
| [login.html](file:///d:/TEST/Project%20X%20-%20Copy/login.html) | CDN script imports & login form | Swap Firebase CDN for Supabase CDN |
| [js/script.js](file:///d:/TEST/Project%20X%20-%20Copy/js/script.js) | Auth route guard & app saves | Update service calls / preserve aliases |
| [js/timer.js](file:///d:/TEST/Project%20X%20-%20Copy/js/timer.js) | Timer save triggers | Update service calls / preserve aliases |

---

### B. Firebase Imports

#### index.html & login.html CDN Imports:
```html
<!-- CURRENT (Firebase) -->
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js"></script>
```

---

### C. Authentication Flow Comparison

| Feature | Firebase (Current) | Supabase (Target) |
| :--- | :--- | :--- |
| **SDK Method** | `firebase.auth().signInWithEmailAndPassword(email, password)` | `supabase.auth.signInWithPassword({ email, password })` |
| **Sign Out** | `firebase.auth().signOut()` | `supabase.auth.signOut()` |
| **State Listener** | `firebase.auth().onAuthStateChanged(cb)` | `supabase.auth.onAuthStateChange((event, session) => cb(session?.user))` |
| **Current User** | `firebase.auth().currentUser` | `supabase.auth.getUser()` or `supabase.auth.getSession()` |
| **Admin Check** | `user.email === 'ris2k29@gmail.com'` | `user.email === 'ris2k29@gmail.com'` (Maintained) |
| **Google/Gmail Auth**| None | None |

---

### D. Firestore Collections / Documents

* **Collection Name:** `workspaces` or `users` (Historical)
* **Document ID:** User `uid`
* **Current Operational Model:** Monolithic JSON document containing all 24 state entities.

---

### E. Database Read / Write Operations

| Operation | Current Code Reference | Firebase Method | Supabase Equivalent |
| :--- | :--- | :--- | :--- |
| **Config Fetch** | `FirebaseService.fetchConfig()` | `fetch('/api/config')` | `fetch('/api/config')` |
| **Auth Login** | `FirebaseService.login()` | `signInWithEmailAndPassword` | `supabase.auth.signInWithPassword` |
| **Auth Logout** | `FirebaseService.logout()` | `signOut` | `supabase.auth.signOut` |
| **Data Save** | `FirebaseService.saveToCloud()` | In-memory payload update | `supabase.from('user_workspaces').upsert(...)` |
| **Data Load** | `FirebaseService.loadFromCloud()` | Local in-memory load | `supabase.from('user_workspaces').select(...)` |

---

### F. Data Structures Currently Stored

Below is an exact JSON example of the full application payload currently passed to `saveToCloud()`:

```json
{
  "tasks": [
    {
      "id": "task-1722420000000",
      "text": "Complete Chapter 3 Exercises",
      "completed": false,
      "priority": "high",
      "subject": "Physics"
    }
  ],
  "tracks": [
    {
      "id": "track-1",
      "name": "Core Curriculum",
      "color": "indigo"
    }
  ],
  "customSyllabus": {
    "Physics": {
      "chapters": ["Mechanics", "Thermodynamics"]
    }
  },
  "customPrograms": {},
  "customActions": [],
  "paceGoals": [],
  "passedItems": {
    "programs": [],
    "subjects": []
  },
  "revisionData": {
    "active": [],
    "progress": {}
  },
  "programVisibility": {},
  "subjectTimeLinks": {},
  "successResults": [],
  "timerLogs": [
    {
      "id": "log-1",
      "subject": "Physics",
      "duration": 3600,
      "timestamp": 1722420000000
    }
  ],
  "dailyFocusHoursTarget": 4.0,
  "dailyFocusHoursTargetDate": "2026-07-31",
  "dailyFocusHoursTargetHistory": [],
  "timerAnalyticsRange": 180,
  "timerAnalyticsGrouping": "daily",
  "timerAnalyticsChartStyle": "combo",
  "subjectFocusTargets": {},
  "dashboardConfig": {
    "topTag": "Project X",
    "mainTitle": "2026 Study Master",
    "subTitle": "Dynamic Multi-Track Execution & Tracking Dashboard",
    "trendStartDate": "",
    "trendEndDate": "",
    "showDaysRemaining": false,
    "independentPaces": {
      "tracks": {},
      "programs": {},
      "subjects": {}
    }
  },
  "weeklyTargetsDatabase": {},
  "dailyTargetsDatabase": {},
  "scheduleBlocks": [],
  "scheduleBlocks2": [],
  "scheduleGroups": [],
  "fiscalLedger": {
    "transactions": [],
    "budgets": [],
    "vaults": []
  },
  "examSessions": [],
  "examRoutine": [],
  "selectedCountdownExamId": "auto"
}
```

---

### G. Offline / Local Persistence Behavior

* **LocalStorage Keys:**
  1. `firebaseConfig`: Cached Firebase configuration object.
  2. `local_auth_user`: Cached mock user object (`{ email: "ris2k29@gmail.com", uid: "mock-local-user-id", displayName: "ris2k29" }`).
  3. `cached_fullAppState`: Application state backup.
* **IndexedDB Usage:** None in user code.

---

### H. Firebase UID Usage

* Referenced in `FirebaseService.onAuthStateChanged`, `getCurrentUser()`, and fallback user object (`mock-local-user-id`).
* In Supabase, `user.id` (UUID format e.g. `123e4567-e89b-12d3-a456-426614174000`) replaces Firebase UID.

---

### I. Security Assumptions

* Single-user admin model restricted strictly to email `ris2k29@gmail.com`.
* Client-side route guards enforce email equality before granting workspace access.

---

### J. Dependencies Between Modules

```
[index.html / login.html]
       │
       ├──> [api/config.js / dev-server.js]  (Fetches config credentials)
       │
       ├──> [js/firebase.js]  (Defines window.FirebaseService & window.showSync)
       │         │
       │         ├──> [js/state.js]   (Updates window.AppState)
       │         └──> [js/utils.js]   (Uses safeStorage for fallback caching)
       │
       ├──> [js/script.js]    (Calls FirebaseService.login/logout/saveToCloud)
       └──> [js/timer.js]     (Calls FirebaseService.saveTimerToCloud)
```

---

### K. Recommended Supabase Replacements

1. **Authentication:**
   * Replace `firebase-auth-compat.js` with `@supabase/supabase-js` bundle via CDN (`https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`).
   * Replace `firebase.auth().signInWithEmailAndPassword` with `supabase.auth.signInWithPassword`.
2. **Database:**
   * Create a PostgreSQL table in Supabase named `user_workspaces`:
     ```sql
     CREATE TABLE user_workspaces (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
       updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
       state_data JSONB NOT NULL DEFAULT '{}'::jsonb
     );
     ```
3. **Environment & Server Endpoint:**
   * Update `.env` to supply `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
   * Update `api/config.js` and `js/dev-server.js` to serve Supabase credentials to the client.

---

### L. Potential Migration Risks

1. **Script Loading Paradigm:** Ensure `@supabase/supabase-js` is loaded prior to `js/supabase.js` without requiring an ESM bundler (using UMD/CDN script tag).
2. **Backward Compatibility:** Preserving global wrapper aliases (`window.saveToCloud`, `window.loadFromCloud`, `window.showSync`) will guarantee that zero code breaks in `js/script.js` or `js/timer.js`.
3. **UUID Format Differences:** Firebase UIDs are alphanumeric strings; Supabase user IDs are UUIDs. Client code relying on string comparison must handle standard UUID strings.

---

### M. Files That Must Eventually Be Changed

1. [js/firebase.js](file:///d:/TEST/Project%20X%20-%20Copy/js/firebase.js) (Refactor or replace with `js/supabase.js`)
2. [api/config.js](file:///d:/TEST/Project%20X%20-%20Copy/api/config.js) (Output Supabase URL & Anon key)
3. [js/dev-server.js](file:///d:/TEST/Project%20X%20-%20Copy/js/dev-server.js) (Update `/api/config` response)
4. [.env](file:///d:/TEST/Project%20X%20-%20Copy/.env) & [.env.example](file:///d:/TEST/Project%20X%20-%20Copy/.env.example) (Update environment keys)
5. [index.html](file:///d:/TEST/Project%20X%20-%20Copy/index.html) (Update script CDN tags)
6. [login.html](file:///d:/TEST/Project%20X%20-%20Copy/login.html) (Update script CDN tags)

---

### N. Files That Should NOT Need to Change

1. [js/state.js](file:///d:/TEST/Project%20X%20-%20Copy/js/state.js)
2. [js/utils.js](file:///d:/TEST/Project%20X%20-%20Copy/js/utils.js)
3. [css/style.css](file:///d:/TEST/Project%20X%20-%20Copy/css/style.css)
4. [draft/exam_page.html](file:///d:/TEST/Project%20X%20-%20Copy/draft/exam_page.html)
5. [manifest.json](file:///d:/TEST/Project%20X%20-%20Copy/manifest.json)
6. [package.json](file:///d:/TEST/Project%20X%20-%20Copy/package.json)

---

## 5. Proposed Firebase → Supabase Migration Map

| Step | Scope | Description | Affected Files |
| :---: | :--- | :--- | :--- |
| **1** | Environment & API Config | Replace Firebase env variables with Supabase URL & Anon Key | `.env`, `.env.example`, `api/config.js`, `js/dev-server.js` |
| **2** | Client Library CDN Tags | Replace Firebase compat script tags with Supabase JS CDN script | `index.html`, `login.html` |
| **3** | Supabase Service Module | Create/update service client maintaining `window.FirebaseService` interface compatibility (or aliasing to `window.SupabaseService`) | `js/firebase.js` / `js/supabase.js` |
| **4** | Schema & Database | Create `user_workspaces` table with `state_data JSONB` in Supabase | Supabase SQL Editor |
| **5** | Verification & Testing | Test authentication, single-user admin restriction, workspace saves & loads | Full application verification |

---

> **Audit Status:** Complete.  
> **Action Taken:** No application files modified; `FIREBASE_MIGRATION_AUDIT.md` created as requested.  
> **Next Step:** Standing by for user instruction.
