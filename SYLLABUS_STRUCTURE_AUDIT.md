# Real Syllabus Data Structure & Codebase Architecture Audit (STEP 22)

> **Project:** Project X - Dynamic Multi-Track Execution & Tracking Dashboard  
> **Phase:** Step 22 — Read-Only Audit of Real Syllabus Data Structure  
> **Date:** July 31, 2026  

---

## 1. Executive Summary

This read-only audit provides a comprehensive structural breakdown of how Project X represents, links, calculates, serializes, and persists the 4-level educational hierarchy:

$$\text{Track} \longrightarrow \text{Program} \longrightarrow \text{Subject} \longrightarrow \text{Chapter}$$

All calculations (completion rates, pacing, revision tracking, charts, and fiscal summaries) derive from `window.AppState` and its serialized JSON payload stored in Supabase `public.user_workspaces.state_data`.

---

## 2. Exact `AppState` Data Schema for Syllabus Entities

### A. Tracks (`AppState.tracks`)
An array of track objects defining major study pathways (e.g., Core, Electives):
```json
[
  {
    "id": "core",
    "name": "Core Study Track",
    "priority": 1,
    "order": 0
  }
]
```

### B. Programs (`AppState.customPrograms`)
An object/map keyed by `track.id`. Each key holds an array of program objects:
```json
{
  "core": [
    {
      "id": "core-prog-1",
      "name": "Computer Science Major",
      "priority": 1,
      "order": 0
    }
  ]
}
```

### C. Subjects & Chapters (`AppState.syllabusStructure` / `customSyllabus`)
An object/map keyed by `track.id`. Each key holds an array of subject definition objects:
```json
{
  "core": [
    {
      "program": "Computer Science Major",
      "subject": "Data Structures & Algorithms",
      "chapters": 20,
      "priority": 1,
      "order": 0
    }
  ]
}
```

> [!IMPORTANT]
> **Chapter Storage Model:**  
> Chapters are **NOT** stored as an array of individual chapter objects inside `syllabusStructure`.  
> Instead, a subject defines total static chapters as an integer count (`chapters: 20`).  
> Individual chapter tags (`"Ch. 1"`, `"Ch. 2"`, ..., `"Ch. 20"`) are dynamically generated during task creation and UI rendering.

### D. Daily Study Tasks (`AppState.tasks`)
An array of daily schedule objects mapping chapters to specific days:
```json
[
  {
    "id": 1,
    "type": "study",
    "coreTasks": [
      {
        "id": "task-101",
        "subject": "Data Structures & Algorithms",
        "chapter": "Ch. 1",
        "title": "Arrays & Strings",
        "completed": true,
        "completedAt": "2026-07-31T18:00:00.000Z",
        "skipped": false
      }
    ]
  }
]
```

### E. Revision Tracking (`AppState.revisionData`)
```json
{
  "active": ["Data Structures & Algorithms"],
  "progress": {
    "Data Structures & Algorithms": {
      "1": true,
      "2": true
    }
  }
}
```

---

## 3. Entity Relationships & Cross-References

```
   AppState.tracks [ { id: "core", name: "Core Track" } ]
                          │
         ┌────────────────┴────────────────┐
         ▼                                 ▼
AppState.customPrograms["core"]    AppState.syllabusStructure["core"]
[ { name: "CS Major" } ]           [ { program: "CS Major", subject: "DS & Algo", chapters: 20 } ]
                                                   │
                                                   ▼
                                     AppState.tasks [ { coreTasks: [ { subject: "DS & Algo", chapter: "Ch. 1" } ] } ]
```

* **Track ➔ Program:** Map key `customPrograms[track.id]`
* **Track ➔ Subject:** Map key `syllabusStructure[track.id]`
* **Program ➔ Subject:** `subject.program === program.name` (String match)
* **Subject ➔ Chapter Tasks:** `task[trackId + 'Tasks'].subject === subject.subject` and `chapter === "Ch. N"`

---

## 4. Key Functions & Code Responsibilities

| Function | File | Description |
| :--- | :--- | :--- |
| `appendNewTrack()` | [js/script.js](file:///d:/TEST/Project%20X%20-%20Copy/js/script.js) | Creates a track and initializes `customPrograms[id]` & `syllabusStructure[id]`. |
| `appendNewProgram()` | [js/script.js](file:///d:/TEST/Project%20X%20-%20Copy/js/script.js) | Appends a program object to `customPrograms[trackId]`. |
| `appendNewSubject()` | [js/script.js](file:///d:/TEST/Project%20X%20-%20Copy/js/script.js) | Appends a subject to `syllabusStructure[trackId]` with initial chapter count. |
| `appendNewChapter()` | [js/script.js](file:///d:/TEST/Project%20X%20-%20Copy/js/script.js) | Increments subject chapter count (`subjectObj.chapters++`). |
| `recalculateTotals()` | [js/script.js](file:///d:/TEST/Project%20X%20-%20Copy/js/script.js) | Computes total static chapters, completed chapters, effective progress, and pacing metrics. |
| `applyFullAppState()` | [js/state.js](file:///d:/TEST/Project%20X%20-%20Copy/js/state.js) | Unpacks serialized cloud state onto `AppState` without breaking reference identities. |
| `saveToCloud()` | [js/supabase.js](file:///d:/TEST/Project%20X%20-%20Copy/js/supabase.js) | Serializes `AppState` payload and upserts to Supabase `user_workspaces.state_data`. |
| `loadFromCloud()` | [js/supabase.js](file:///d:/TEST/Project%20X%20-%20Copy/js/supabase.js) | Queries Supabase `user_workspaces` for authenticated user and invokes `applyFullAppState()`. |

---

## 5. Hidden Dependencies & Constraints

1. **Subject Name Immutability:** Subject names are used as string keys in `revisionData.progress`, `subjectTimeLinks`, `subjectFocusTargets`, and `tasks`. Renaming a subject requires updating all cross-referencing keys.
2. **Program Name Linkage:** `subject.program` links to `program.name` by exact string value rather than UUID.
3. **Task Container Pattern:** Study tasks are stored under array properties dynamically named `${track.id}Tasks` (e.g. `coreTasks`, `electivesTasks`).

---

## 6. Entry Method Safety Assessment

### A. Manual Entry via UI
* **Safe? YES.**
* *Rationale:* The existing UI forms (`Add Track`, `Add Program`, `Add Subject`, `Add Chapter`) handle all string sluggification, list priority sorting, and dynamic dropdown population safely.

### B. Bulk Import via JSON
* **Safe? YES (if schema is strictly respected).**
* *Requirements:*
  1. `tracks` array must define valid `{ id, name, priority, order }` objects.
  2. `customPrograms` object must have keys for each `track.id`.
  3. `customSyllabus` / `syllabusStructure` object must have keys for each `track.id`, with subjects containing integer `chapters` counts.
  4. Subject names must be unique within each track.

---

## 7. Recommended Next Steps

You are ready to enter your real study syllabus.
* **Option 1 (Manual Entry):** Add tracks, programs, subjects, and chapter counts step-by-step using the UI.
* **Option 2 (Bulk JSON Entry):** Construct a clean JSON payload adhering to the schema above and apply it via `window.applyFullAppState(jsonPayload)` followed by `SupabaseService.saveToCloud(true)`.
