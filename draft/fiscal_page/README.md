# Fiscal Ledger Draft Backup & Re-integration Guide

This directory (`draft/fiscal_page/`) contains all decoupled source code, UI templates, modal views, logic, and styles for the **Fiscal Ledger & Financial Management System** extracted from Project X.

---

## Contents

1. **`fiscal_page.html`**:
   - `btn-nav-fiscal-ledger` (Sidebar Navigation Button)
   - `dashboard-fiscal-section` (Realtime Fiscal Overview Card on Dashboard)
   - `<section id="fiscal-ledger-page">` (Main 6-Tab Fiscal Ledger UI: Ledger, Budget, Vaults, Analytics, 13-Stage Accounting Matrix, Movement Database)
   - Fiscal Modals:
     - `fiscal-tx-modal` (Cash Flow Entry Logger)
     - `fiscal-budget-modal` (Category Budget Creator/Editor)
     - `fiscal-vault-modal` (Savings & Reserve Vault Setup)
     - `fiscal-deposit-modal` (Vault Deposit / Withdrawal)
     - `fiscal-vault-transfer-modal` (Inter-Vault Capital Transfer)
     - `fiscal-vault-to-budget-modal` (Vault Budget Funding)
     - `fiscal-delete-modal` (Safe Deletion Confirmation)

2. **`fiscal.js`**:
   - ~3,000 lines of pure JavaScript logic, state calculations, Chart.js integrations, accounting equilibrium proofs, dynamic data filtering, and Firebase sync handlers.

3. **`fiscal.css`**:
   - Mobile sheet animations and responsive modal styling (`.fiscal-bottom-sheet` and `@keyframes fiscalBottomSheetSlideUp`).

---

## Restoration / Re-integration Instructions

When you decide to reactivate the Fiscal Ledger feature on the main site, follow these steps:

### Step 1: Restore CSS
Copy the contents of `draft/fiscal_page/fiscal.css` back into `css/style.css`.

### Step 2: Restore HTML Components in `index.html`
1. **Sidebar Navigation**: Paste the `btn-nav-fiscal-ledger` button inside the sidebar `<nav>` tag in `index.html`.
2. **Dashboard Grid**: Paste `dashboard-fiscal-section` into the main dashboard grid in `index.html`.
3. **Page Section**: Paste `<section id="fiscal-ledger-page">` inside `<main>` alongside other page sections in `index.html`.
4. **Modals**: Paste the 7 modal divs from `fiscal_page.html` before `</body>` in `index.html`.

### Step 3: Restore JavaScript
1. Append the contents of `draft/fiscal_page/fiscal.js` back into `js/script.js`.
2. Re-add `'fiscal-ledger'` to the `pages` routing array in `switchPage` in `js/script.js`.
3. Re-add theme configuration for `'fiscal-ledger'` in `switchPage`.
4. Re-add modal IDs to backdrop/content maps (`backdrops` and `contents`) in `script.js`.
5. Re-add `renderFiscalLedgerPage()` call under `pageId === 'fiscal-ledger'` in `switchPage()`.
6. Re-add state default initialization `AppState.fiscalLedger` in `js/state.js` and Firebase listener sync in `js/firebase.js`.
