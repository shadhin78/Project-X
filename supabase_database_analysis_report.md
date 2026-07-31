# Project X — Database Requirements & Supabase Migration Analysis

> **Project:** Project X / Study Dashboard  
> **Status:** Analysis & Blueprint Only (Zero code/file modifications)  
> **Target Database:** Supabase (PostgreSQL + Supabase Auth)  
> **Date:** July 31, 2026  

---

## 1. Project Data Architecture Summary

The **Project X / Study Dashboard** application uses a **Local-First / In-Memory State Architecture** with background cloud persistence:

1. **State Management:** Single source of truth defined in [js/state.js](file:///d:/TEST/Project%20X/js/state.js) under `window.AppState`. Property accessors on `window` transparently alias keys on `window.AppState`.
2. **Data Model:** The application serializes all workspace state into a **monolithic JSON object payload** (`state_data` / `appState`). 
3. **Cloud Persistence Pipeline:**
   - **Historical Firebase Model:** Monolithic document stored in Firestore under collection `user_workspaces` (or `users`) with Document ID = `{userId}`.
   - **Current Supabase Integration:** Managed in [js/supabase.js](file:///d:/TEST/Project%20X/js/supabase.js) via `window.SupabaseService` (also aliased as `window.FirebaseService`). Upserts state payload to PostgreSQL table `public.user_workspaces` (`user_id`, `state_data` JSONB, `updated_at`).
4. **Local Fallback Persistence:** Managed in [js/utils.js](file:///d:/TEST/Project%20X/js/utils.js) via `safeStorage` (`localStorage` wrapper), caching `cached_fullAppState`, `supabaseConfig`, and `local_auth_user` for instant rendering and offline support under `file://` protocol.

---

## 2. Firebase Collections Found

| Collection Name | Document ID Pattern | Document Structure | Purpose |
| :--- | :--- | :--- | :--- |
| `user_workspaces` *(or `users`)* | `{userId}` (Firebase UID / Supabase UUID) | Single monolithic JSON document containing all 24 sub-entities | Stores user's entire study workspace state, target configurations, timer logs, and routines. |

---

## 3. Firestore Fields Found

All persistent application data is stored inside the serialized workspace document payload. Below is the complete catalog of all 24 fields/sub-entities identified in the application:

| Field / Entity | Firebase / JSON Type | Example / Purpose | Required? |
| :--- | :--- | :--- | :--- |
| `tasks` | Array of Objects | Tasks list: `[{ id, text, completed, priority, subject }]` | Yes |
| `tracks` | Array of Objects | Curriculum tracks: `[{ id, name, color }]` | Yes |
| `customSyllabus` / `syllabusStructure` | Object (Key-Value) | Subject/Chapter hierarchy: `{ "Physics": { "chapters": [...] } }` | Yes |
| `customPrograms` | Object | User-defined program structures & groupings | Yes |
| `customActions` | Array | Custom trackable commitment actions | Yes |
| `paceGoals` | Array | Goal targets for pace tracking | Yes |
| `passedItems` | Object | Completed items: `{ programs: [], subjects: [] }` | Yes |
| `revisionData` | Object | Revision progress: `{ active: [], progress: {} }` | Yes |
| `programVisibility` | Object | UI visibility toggles per program | Yes |
| `subjectTimeLinks` | Object | Time allocations linked per subject | Yes |
| `successResults` | Array | Exam and milestone results history | Yes |
| `timerLogs` | Array of Objects | Focus timer sessions: `[{ id, subject, duration, timestamp }]` | Yes |
| `dailyFocusHoursTarget` | Number (Float) | Target daily focus hours (e.g. `4.0`) | Yes |
| `dailyFocusHoursTargetDate` | String | Target date string (e.g. `"2026-07-31"`) | Yes |
| `dailyFocusHoursTargetHistory` | Array | Target change audit history | Yes |
| `timerAnalyticsRange` | Number | Days range for timer analytics (e.g. `180`) | Yes |
| `timerAnalyticsGrouping` | String | Analytics grouping mode (`"daily"`, `"weekly"`) | Yes |
| `timerAnalyticsChartStyle` | String | Analytics chart presentation style (`"combo"`) | Yes |
| `subjectFocusTargets` | Object | Target hours per individual subject | Yes |
| `dashboardConfig` | Object | Title/header config: `{ topTag, mainTitle, subTitle, ... }` | Yes |
| `weeklyTargetsDatabase` | Object | Weekly goal tracking records | Yes |
| `dailyTargetsDatabase` | Object | Daily goal tracking records | Yes |
| `scheduleBlocks` / `scheduleBlocks2` | Array of Objects | Routine time-blocking schedules | Yes |
| `scheduleGroups` | Array of Objects | Time-blocking schedule groups | Yes |
| `fiscalLedger` | Object | Financial ledger: `{ transactions: [], budgets: [], vaults: [] }` | Yes |
| `examSessions` / `examRoutine` | Array of Objects | Exam schedules and routines | Yes |
| `selectedCountdownExamId` | String | Active exam countdown ID (`"auto"`) | Yes |

---

## 4. All Firebase Database Operations

### Operation 1: Save Workspace Payload (`saveToCloud`)
- **File:** [js/supabase.js](file:///d:/TEST/Project%20X/js/supabase.js#L309-L433)
- **Function:** `saveToCloud(immediate)`
- **Operation:** `upsert()` on `user_workspaces` (formerly `setDoc`/`updateDoc` on Firestore `user_workspaces/{userId}`)
- **Target Collection/Table:** `user_workspaces`
- **Target Document/Row:** `user_id = auth.uid()`
- **Fields Written:** `user_id`, `state_data` (JSONB payload of all 24 entities), `updated_at` (ISO timestamp)
- **Type:** Create / Update (Upsert)
- **User-Specific:** Yes (`user_id = user.id`)
- **Depends on Auth:** Yes (`getCurrentUser()`)

### Operation 2: Load Workspace Payload (`loadFromCloud`)
- **File:** [js/supabase.js](file:///d:/TEST/Project%20X/js/supabase.js#L436-L507)
- **Function:** `loadFromCloud()`
- **Operation:** `select()` on `user_workspaces` (formerly `getDoc` on Firestore `user_workspaces/{userId}`)
- **Target Collection/Table:** `user_workspaces`
- **Target Document/Row:** `user_id = auth.uid()`
- **Fields Read:** `state_data`, `updated_at`
- **Type:** Read
- **User-Specific:** Yes (`user_id = user.id`)
- **Depends on Auth:** Yes (`getCurrentUser()`)

### Operation 3: Save Active Timer (`saveTimerToCloud`)
- **File:** [js/supabase.js](file:///d:/TEST/Project%20X/js/supabase.js#L509-L515)
- **Function:** `saveTimerToCloud()`
- **Operation:** `TimerService.saveActiveStateToStore()` + `saveToCloud(true)`
- **Target Collection/Table:** `user_workspaces`
- **Fields Written:** `activeTimerState` inside `state_data`
- **Type:** Update
- **User-Specific:** Yes
- **Depends on Auth:** Yes

### Operation 4: Delete User Workspace (`wipeCloudWorkspace`)
- **File:** [js/supabase.js](file:///d:/TEST/Project%20X/js/supabase.js#L517-L534)
- **Function:** `wipeCloudWorkspace()`
- **Operation:** `delete()` on `user_workspaces` (formerly `deleteDoc` on Firestore)
- **Target Collection/Table:** `user_workspaces`
- **Target Document/Row:** `user_id = user.id`
- **Fields Deleted:** Entire workspace row
- **Type:** Delete
- **User-Specific:** Yes
- **Depends on Auth:** Yes

### Operation 5: Realtime Workspace Listener (`subscribeToRealtime`)
- **File:** [js/supabase.js](file:///d:/TEST/Project%20X/js/supabase.js#L541-L583)
- **Function:** `subscribeToRealtime()`
- **Operation:** `postgres_changes` subscription (formerly `onSnapshot` listener on Firestore)
- **Target Collection/Table:** `user_workspaces` (`table=user_workspaces`, `filter=user_id=eq.{user.id}`)
- **Fields Read:** `state_data`, `updated_at` on remote device changes
- **Type:** Read (Realtime Sync Stream)
- **User-Specific:** Yes
- **Depends on Auth:** Yes

---

## 5. Authentication Architecture

- **Auth Provider:** Email & Password authentication.
- **Admin Email Restriction:** Access is strictly restricted to administrator email `ris2k29@gmail.com`.
- **User Identifier Mapping:** Firebase UID (`mock-local-user-id` or alphanumeric string) maps directly to Supabase Auth UUID (`auth.users.id`).
- **Login Flow:** Submitted from [login.html](file:///d:/TEST/Project%20X/login.html) → invokes `SupabaseService.login(email, password)` → validates admin email (`ris2k29@gmail.com`) → persists session token via Supabase Auth SDK.
- **Logout Flow:** Initiated from logout action in [index.html](file:///d:/TEST/Project%20X/index.html) → invokes `SupabaseService.logout()` → clears local session storage and resets state.
- **Auth State Listener:** `SupabaseService.onAuthStateChanged(callback)` binds `supabase.auth.onAuthStateChange` to trigger UI updates and initiate realtime channels upon sign-in.

```text
Firebase Authentication (Legacy)
        ↓ (Email & Password: ris2k29@gmail.com)
Supabase Authentication (Target)
        ↓
auth.users (UUID)
```

---

## 6. Current Security Rules

- **Firestore Rules (Legacy):**
  - Read/Write restricted to authenticated users matching document owner ID: `request.auth.uid == userId`.
  - Admin email restriction enforced at application boundary.
- **Supabase Row Level Security (RLS) Requirements:**
  - Row Level Security MUST be enabled on `public.user_workspaces`.
  - Access policies must ensure authenticated users can ONLY query, insert, update, or delete rows where `auth.uid() = user_id`.
  - Anonymous/unauthenticated requests MUST be denied.

---

## 7. Persistent vs Temporary Data

### A. Persistent Database Data (`public.user_workspaces.state_data`)
*Data that must survive page refreshes, browser restarts, and login on other devices:*
- `tasks`, `tracks`, `customSyllabus`, `customPrograms`, `customActions`, `paceGoals`, `passedItems`, `revisionData`, `programVisibility`, `subjectTimeLinks`, `successResults`, `timerLogs`, `dailyFocusHoursTarget`, `dailyFocusHoursTargetDate`, `dailyFocusHoursTargetHistory`, `subjectFocusTargets`, `dashboardConfig`, `weeklyTargetsDatabase`, `dailyTargetsDatabase`, `scheduleBlocks`, `scheduleBlocks2`, `scheduleGroups`, `fiscalLedger`, `examSessions`, `examRoutine`, `selectedCountdownExamId`, `activeTimerState`.

### B. Temporary Application State (In-Memory / Local Storage Cache)
*Data that can remain only in browser memory or local cache:*
- Chart instances (`progressChart`, `masterLineChart`, `paceTrendChartInstance`, etc.).
- UI navigation state (`currentFilter`, `currentDadbTab`, `editingTask`, `editingPaceId`).
- Active interval timers (`timerInterval`, `saveTimeout`, `_autoSaveDebounceTimer`).
- Temporary flags (`isSyncing`, `isSaving`, `needsSave`, `isAppInitialized`, `dataHydrationComplete`).
- Cached local storage keys (`cached_fullAppState`, `supabaseConfig`, `local_auth_user`).

### C. Authentication Data (`auth.users`)
*Handled natively by Supabase Auth service:*
- User UUID, email address (`ris2k29@gmail.com`), hashed credentials, session tokens, and auth audit timestamps.

---

## 8. Proposed Supabase PostgreSQL Schema

### Primary Production Schema: Monolithic Workspace Table (`public.user_workspaces`)
*Matches 100% of existing application behavior with zero code refactoring needed:*

### Table: `user_workspaces`

| Column | PostgreSQL Type | Nullable | Primary Key | Foreign Key | Default |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | No | Yes | — | `gen_random_uuid()` |
| `user_id` | `uuid` | No | No (Unique) | `auth.users(id)` ON DELETE CASCADE | — |
| `state_data` | `jsonb` | No | No | — | `'{}'::jsonb` |
| `created_at` | `timestamptz` | No | No | — | `now()` |
| `updated_at` | `timestamptz` | No | No | — | `now()` |

---

## 9. Table Relationships

```text
auth.users (Supabase Auth)
    │
    └── public.user_workspaces (1-to-1 Relationship via user_id)
            │
            └── state_data (JSONB payload containing all entities)
```

- **User Ownership:** 1-to-1 relationship between `auth.users.id` and `public.user_workspaces.user_id`.
- **Entities inside `state_data`:** Monolithic JSON tree containing subjects, chapters, tasks, logs, target settings, routines, and fiscal ledgers.

---

## 10. Supabase RLS Requirements

1. **Enable RLS:**
   `ALTER TABLE public.user_workspaces ENABLE ROW LEVEL SECURITY;`

2. **Access Policies:**
   - **SELECT:** `auth.uid() = user_id`
   - **INSERT:** `auth.uid() = user_id`
   - **UPDATE:** `auth.uid() = user_id`
   - **DELETE:** `auth.uid() = user_id`

---

## 11. SUPABASE DATABASE BLUEPRINT

```text
1. auth.users (Managed by Supabase Auth)
2. public.user_workspaces (Primary JSONB Workspace table)
```

### Entity Relationship Diagram (ERD)

```text
+-----------------------+               +----------------------------------+
|      auth.users       |  1         1  |      public.user_workspaces      |
+-----------------------+---------------+----------------------------------+
| id (UUID, PK)         |<------------->| id (UUID, PK)                    |
| email                 |               | user_id (UUID, FK, UNIQUE)       |
| ...                   |               | state_data (JSONB)               |
+-----------------------+               | updated_at (TIMESTAMPTZ)         |
                                        +----------------------------------+
```

---

## 12. Draft PostgreSQL SQL Script (ANALYSIS ONLY — DO NOT EXECUTE)

```sql
-- ====================================================================
-- PROJECT X — SUPABASE POSTGRESQL SCHEMA DRAFT
-- DO NOT EXECUTE — FOR REVIEW AND BLUEPRINT PURPOSES ONLY
-- ====================================================================

-- 1. Create primary workspace persistence table
CREATE TABLE IF NOT EXISTS public.user_workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    state_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT user_workspaces_user_id_key UNIQUE (user_id)
);

-- 2. Create index for high-performance user lookups
CREATE INDEX IF NOT EXISTS idx_user_workspaces_user_id 
ON public.user_workspaces(user_id);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.user_workspaces ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies for full user data isolation
CREATE POLICY "Users can view own workspace" 
ON public.user_workspaces 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workspace" 
ON public.user_workspaces 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workspace" 
ON public.user_workspaces 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workspace" 
ON public.user_workspaces 
FOR DELETE 
USING (auth.uid() = user_id);

-- 5. Enable Realtime Replication for cross-device synchronization
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_workspaces;
```

---

## 13. Migration Risks / Important Notes

1. **Serialization Format:** The application relies on serialized in-memory JSON state. Keeping `state_data JSONB` ensures 100% compatibility without requiring widespread modifications across `js/script.js`.
2. **Single-Admin Enforcement:** Retain strict admin email verification (`ris2k29@gmail.com`) during authentication.
3. **Offline Caching:** `safeStorage` local storage fallback must remain active so app works seamlessly under `file://` protocol or during network drops.

---

## 14. Files That Will Need Changes Later (When Migration Is Requested)

When schema creation or migration execution is requested, the following files will be affected:
1. [api/config.js](file:///d:/TEST/Project%20X/api/config.js)
2. [js/supabase.js](file:///d:/TEST/Project%20X/js/supabase.js)
3. [index.html](file:///d:/TEST/Project%20X/index.html)
4. [login.html](file:///d:/TEST/Project%20X/login.html)

---

# MIGRATION READINESS

```text
READY FOR SUPABASE SCHEMA CREATION
```
