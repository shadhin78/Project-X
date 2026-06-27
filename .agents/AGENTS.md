# Project Rules

## Feature Modifications & Cleanups
- Before making ANY code change, analyze the entire feature and identify every affected file.
- **Cross-File Rule**: Never modify only one file unless it is proven that no other file requires changes. If a feature is added, removed, or modified, automatically update every affected file (HTML, CSS, JS, Assets, Configuration, Manifest, Service Workers, etc.).

## UI Changes
- If a new UI element is added:
  - Add the HTML.
  - Add the required CSS.
  - Add the required JavaScript.
  - Connect event listeners.
  - Update responsive styles if necessary.
  - Ensure dark/light mode compatibility if present.
- Do not leave placeholder code.

## JavaScript & HTML & CSS Sync
- If JavaScript changes require new HTML elements or CSS classes, create or update them automatically.
- If JavaScript removes functionality, remove obsolete HTML and CSS that are no longer used.
- If HTML introduces new IDs or classes:
  - Update CSS.
  - Update JavaScript selectors.
  - Remove unused selectors.
- If CSS selectors are renamed:
  - Update HTML.
  - Update JavaScript.
  - Never leave broken selectors.

## Dependency Check
- Before finishing any task, verify:
  - Every HTML reference exists.
  - Every CSS selector exists.
  - Every JavaScript selector exists.
  - Every event listener has a matching element.
  - Every import path is valid.
  - Every asset exists.

## Code Consistency & Reusability
- Never create duplicate code. Reuse existing functions whenever possible.
- If functionality already exists, extend it instead of creating another implementation.
- Avoid duplicate CSS and JavaScript files.
- Do not create new files unless absolutely necessary. If an existing file serves the purpose, modify it.

## Safety & Quality Checks
- Never break existing functionality or remove working features.
- Never rename IDs, classes, or functions without updating every reference.
- Never leave partial implementations.
- Confirm there are no console errors, broken links, missing CSS/JS, or broken buttons/forms.
