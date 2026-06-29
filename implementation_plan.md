# Add Total Chapter Size Tracking and Edit Modals for Target Checklists

This implementation plan covers updates to Weekly and Daily Targets Setup, adding size-based completion tracking, adding edit buttons for checklists, and introducing a Daily Targets Database Modal.

## Proposed Changes

### Target Setup & Checklists UI & Logic

#### [MODIFY] [index.html](file:///d:/TEST/Project%20X/index.html)

1. **Add Form Inputs:**
   - **Weekly Targets Setup Form:** Add an optional number input for `wt-input-size` (Total Chapter Size) underneath the "Target Scope" input.
   - **Daily Targets Setup Form (Study Tab):** Add an optional number input for `dt-input-size` (Target Size / Completed Size) underneath the "Chapter" select.

2. **Add Edit Buttons to Checklist Cards/Headers:**
   - **Dashboard Page:**
     - In **Daily Targets Card Header**, add an edit button invoking `window.openDailyTargetsDatabase()`.
     - In **Weekly Targets Card Header**, add an edit button invoking `window.openWeeklyTargetsDatabase()`.
   - **Daily Actions Page:**
     - In **Daily Target Checklist Header**, add an "Edit" link button invoking `window.openDailyTargetsDatabase()`.
     - In **Weekly Target Checklist Header**, add an "Edit" link button invoking `window.openWeeklyTargetsDatabase()`.

3. **Insert Daily Targets Database Modal HTML:**
   - Add a modal container `daily-targets-db-modal` matching `weekly-targets-db-modal` styling.
   - Inside, include filter controls:
     - `dtdb-filter-date`: Dropdown select filled with all unique daily target dates (plus "All Dates").
     - `dtdb-filter-prog`: Dropdown select filled with programs (plus "All Programs").
     - `dtdb-filter-sub`: Dropdown select filled with subjects (plus "All Subjects").
     - `dtdb-filter-status`: Dropdown select with options "All", "Completed", "Non-Completed".
   - Include a table with columns: Status (checkbox), Date, Program, Subject, Chapter / Task Title, Target Size / Pages (editable number input), and Delete action.
   - Register backdrop and content elements in `openModal`/`closeModal` mapping.

#### [MODIFY] [js/script.js](file:///d:/TEST/Project%20X/js/script.js)

1. **Modal Mappings & Initialization:**
   - In `window.openModal` and `window.closeModal`, map `'daily-targets-db-modal'` to backdrop `'dtdb-backdrop'` and content `'dtdb-content'`.

2. **Weekly Targets Setup Size Persistence:**
   - Update `window.addWeeklyTarget()` to read `wt-input-size` and store it as `totalChapterSize` in the weekly target object if provided. Reset input field value on add.
   - Update `window.addDailyTarget()` to read `dt-input-size` and store it as `totalChapterSize` in the daily target object if provided. Reset input field value on add.

3. **Progress Tracking Helpers:**
   - Implement `window.getCompletedSizeForWeeklyTarget(target, weekKey)`:
     - Iterates through all daily targets matching the weekly target (`track`, `subject`, `chapter`).
     - Filters by dates that fall into the given `weekKey` range.
     - Sums up the completed pages/sizes.
   - Implement `window.getWeeklyTargetProgress(target, weekKey)`:
     - Calculates the completed progress vs total chapter size and returns `{ completed, total, percent }`.

4. **UI Render Updates:**
   - **`window.renderWeeklyTargets()` (Weekly Targets checklist):**
     - Determine weekly target completion if `completed === true` OR if the target has a `totalChapterSize` and completed progress is >= 100%.
     - Display progress text like `(10/100 p)` next to the chapter name.
     - Apply a linear gradient background for uncompleted items matching their progress percentage: e.g., `background: linear-gradient(to right, rgba(59, 130, 246, 0.1) progressPercent%, transparent progressPercent%)`.
   - **`window.renderDashboardWeeklyChecklist()` (Dashboard weekly checklist):**
     - Determine completion similarly (`target.completed` or progress >= 100%).
     - Display progress text next to the chapter name.
     - Apply linear gradient background for uncompleted items based on progress percentage.

5. **Daily Target Setup Form Logic:**
   - In `window.handleSelectFromWeeklyTargetChange()`:
     - Parse the current selected weekly target.
     - Retrieve its remaining size (`totalChapterSize - completedSize`) for the current week.
     - Pre-populate `dt-input-size` input field with this remaining size.

6. **Daily Targets Database Modal Logic:**
   - Implement `window.openDailyTargetsDatabase()`: Opens the modal, switches view, and initializes filters and data list.
   - Implement `window.populateDtdbFilters()`: Fills the dropdowns for date (unique dates in database), program, subject, and status.
   - Implement `window.renderDtdbList()`: Filters the daily target database records, renders them into the tbody (`dtdb-targets-tbody`), showing checkboxes, details, editable target sizes, and delete buttons.
   - Implement `window.toggleDtdbTargetCompletion(dateKey, idx, isCompleted)`: Toggles completion state, updates weekly target and daily study task, saves changes, and re-renders lists.
   - Implement `window.deleteDtdbTarget(dateKey, idx)`: Deletes the target from database, updates list and saves changes.
   - Implement `window.updateDtdbTargetSize(dateKey, idx, size)`: Updates target's `totalChapterSize` property directly, recalculates progress, and saves changes.

---

## Verification Plan

### Automated Tests
- Run `node js/dev-server.js` or standard browser dry-run to ensure no syntax/compilation errors.

### Manual Verification
1. **Adding Targets with Sizes:**
   - Add a weekly target with total size `100`.
   - Verify it is saved in the database with the `totalChapterSize` property.
2. **Form Pre-population & Progress Sync:**
   - Open Daily Target setup modal and choose the created weekly target from the dropdown.
   - Verify the size input pre-populates with `100`.
   - Set the daily target size to `15` and add it.
   - Mark the daily target as completed.
   - Verify the weekly target's progress is shown as `(15/100 p)` with a 15% color fill-up.
   - Open Daily Target setup again, choose the same weekly target, and verify the size pre-populates with `85`.
3. **Checklist Database Modals:**
   - Click the edit buttons on the Dashboard and Actions page for both Weekly and Daily checklist.
   - Check that their respective database modals open correctly.
   - Modify daily target sizes inside the Daily Targets Database modal and check if progress updates immediately.
