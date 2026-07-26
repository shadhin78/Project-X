# Project X — Site Color Palette & Mapping Guide

This document provides a comprehensive analysis of all color palettes used across **Project X**, including color HEX codes, roles, CSS variables, and exact component usage throughout the application.

---

## 🎨 1. Core Brand & Theme Colors

| Color Preview | Color Name | HEX / Value | Primary Role | Where Used in the Site |
| :--- | :--- | :--- | :--- | :--- |
| 🔵 | **Primary Blue** | `#2563eb` | Brand Primary / Action Color | PWA Theme Color (`manifest.json`), Meta Header, Active Navigation Tabs, Main CTA Buttons, Default Timer Accent |
| 🔷 | **Electric Blue Accent** | `#3b82f6` | Dynamic Accent & Highlights | Chronograph Main Sweeping Hand (`--chrono-main-hand`), Digital Seconds/Millis Text, Input Focus Glow (`glowing-input`), Loading Shimmer Gradient |
| 🟣 | **Primary Indigo** | `#6366f1` | Default Subject & Chart Color | Default Subject Theme, Schedule Block Highlight, Analytics Chart Gradient Line, Active Tab Accents |
| 🌌 | **Dark Slate (Navy)** | `#0f172a` | Dark Mode Background | Application Main Background (`dark:bg-[#0f172a]`), Fullscreen Clock Dark BG, PWA Background |
| 🌑 | **Deep Obsidian Black** | `#0b0f19` | Splash & Auth Background | Full-screen Loading Overlay (`#auth-loading`), Login Page Background |
| ⚪ | **Light Slate Background**| `#f8fafc` | Light Mode Background | Application Main Light BG (`bg-slate-50`), Fullscreen Clock Light Mode Surface |
| ⬜ | **Pure White** | `#ffffff` | Surface & Text | Light Mode Cards, Dark Mode Primary Text (`text-white`), Fullscreen Clock Text in Dark Mode, Major Chronograph Ticks |

---

## ⏱️ 2. Chronograph & Timer Custom CSS Variables (`css/style.css`)

The timer and chronograph clock use a dedicated CSS design system defined under `:root`:

| Variable Name | HEX / RGBA Value | Purpose & Location on Clock |
| :--- | :--- | :--- |
| `--chrono-dial-bg-start` | `#0e1017` | Center gradient origin of the chronograph dial |
| `--chrono-dial-bg-mid` | `#07080c` | Mid-ring gradient of the chronograph dial |
| `--chrono-dial-bg-end` | `#020204` | Outer edge gradient of the dial plate |
| `--chrono-bezel-start` | `#2c303e` | Top outer metallic highlight rim on the bezel |
| `--chrono-bezel-mid` | `#171922` | Mid-shade ring on the outer bezel |
| `--chrono-bezel-end` | `#0a0b10` | Dark drop-shadow edge of the outer bezel |
| `--chrono-bezel-inner-stroke`| `#1f2330` | Inner metallic groove separating bezel and dial |
| `--chrono-tick-major` | `#ffffff` | Major hour/minute markers (12, 1, 2, 3...) |
| `--chrono-tick-minor` | `#94a3b8` | Minor second subdivisions (Slate-400) |
| `--chrono-subdial-bg` | `#050609` | Background fill for stopwatch sub-dials |
| `--chrono-subdial-stroke` | `#1b1d28` | Outer ring stroke of sub-dials |
| `--chrono-subdial-tick-minor`| `#64748b` | Minor tick marks on sub-dials (Slate-500) |
| `--chrono-subdial-hand` | `#ffffff` | Sub-dial indicator needle color |
| `--chrono-center-hub-inner` | `#3b82f6` | Center pin accent hub dot |
| `--chrono-main-hand` | `#3b82f6` | Main sweeping stopwatch/timer hand |
| `--chrono-main-hand-glow` | `rgba(59, 130, 246, 0.7)` | Drop-shadow glow aura behind the sweeping hand |
| `--chrono-digital-hhmm` | `#ffffff` | Hours & Minutes digital text display |
| `--chrono-digital-ssms` | `#3b82f6` | Seconds & Milliseconds digital text display |

---

## 🏷️ 3. Subject & Category Dynamic Palette (`js/state.js`)

Each subject or category dynamically inherits a distinct color suite for badges, buttons, borders, background tints, and charts:

| Subject Theme | HEX Code | Border Class | Button Class | Light BG Tint | Dark BG Tint | Text Color |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Indigo** | `#6366f1` | `border-indigo-500` | `bg-indigo-500` | `bg-indigo-50` | `bg-indigo-900/20` | `text-indigo-600` / `dark:text-indigo-400` |
| **Violet** | `#8b5cf6` | `border-violet-500` | `bg-violet-500` | `bg-violet-50` | `bg-violet-900/20` | `text-violet-600` / `dark:text-violet-400` |
| **Orange** | `#f97316` | `border-orange-500` | `bg-orange-500` | `bg-orange-50` | `bg-orange-900/20` | `text-orange-600` / `dark:text-orange-400` |
| **Purple** | `#a855f7` | `border-purple-500` | `bg-purple-500` | `bg-purple-50` | `bg-purple-900/20` | `text-purple-600` / `dark:text-purple-400` |
| **Emerald** | `#10b981` | `border-emerald-500` | `bg-emerald-500` | `bg-emerald-50` | `bg-emerald-900/20` | `text-emerald-600` / `dark:text-emerald-400` |
| **Rose** | `#f43f5e` | `border-rose-500` | `bg-rose-500` | `bg-rose-50` | `bg-rose-900/20` | `text-rose-600` / `dark:text-rose-400` |
| **Cyan** | `#06b6d4` | `border-cyan-500` | `bg-cyan-500` | `bg-cyan-50` | `bg-cyan-900/20` | `text-cyan-600` / `dark:text-cyan-400` |
| **Amber** | `#f59e0b` | `border-amber-500` | `bg-amber-500` | `bg-amber-50` | `bg-amber-900/20` | `text-amber-600` / `dark:text-amber-400` |
| **Sky Blue**| `#0ea5e9` | `border-sky-500` | `bg-sky-500` | `bg-sky-50` | `bg-sky-900/20` | `text-sky-600` / `dark:text-sky-400` |
| **Pink** | `#ec4899` | `border-pink-500` | `bg-pink-500` | `bg-pink-50` | `bg-pink-900/20` | `text-pink-600` / `dark:text-pink-400` |
| **Teal** | `#14b8a6` | `border-teal-500` | `bg-teal-500` | `bg-teal-50` | `bg-teal-900/20` | `text-teal-600` / `dark:text-teal-400` |

---

## 📊 4. Analytics & Chart Color Palette (`js/timer.js`)

| Element | HEX / Color | Description / Context |
| :--- | :--- | :--- |
| **Primary Chart Gradient** | `#818cf8` ➔ `#6366f1` ➔ `#4f46e5` | 3-step Indigo gradient line used on main study time trends |
| **Target Line / Threshold** | `#f43f5e` | Rose/Red dotted reference line for target study goals |
| **Chart Dark Point BG** | `#0f172a` | Data point fill background when dark mode is enabled |
| **Chart Light Point BG** | `#ffffff` | Data point fill background when light mode is enabled |
| **Chart Grid Lines (Dark)** | `rgba(255, 255, 255, 0.05)` | Subtle white grid overlay for dark mode charts |
| **Chart Grid Lines (Light)**| `rgba(0, 0, 0, 0.05)` | Subtle slate grid overlay for light mode charts |
| **Chart Tooltip Title** | `#ffffff` (Dark) / `#0f172a` (Light) | Tooltip header text |
| **Chart Tooltip Footer** | `#818cf8` (Dark) / `#6366f1` (Light) | Tooltip secondary details |

---

## 🪟 5. Glassmorphism & UI Surface Palette

| Surface Type | CSS / Classes | Used Where |
| :--- | :--- | :--- |
| **Glass Card Container** | `background: rgba(30, 41, 59, 0.45); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.08);` | Login Page Form Card (`login.html`), Modal Containers |
| **Pulsing Loading Glow**| `bg-blue-900/10` & `bg-indigo-900/10` with `blur-[100px]` | Radial ambient backdrop glows behind the loading logo |
| **Progress Shimmer Bar**| `linear-gradient(90deg, #3b82f6 0%, #6366f1 50%, #a855f7 100%)` | Initial loading progress indicator (`shimmer-progress`) |
| **Mobile Backdrop** | `bg-slate-900/40 backdrop-blur-sm` | Dimmed backdrop when mobile navigation menu opens |
| **Scrollbar Thumb** | `#cbd5e1` (Light) / `#334155` (Dark) / `rgba(148, 163, 184, 0.4)` | Custom scrollbar thumbs on scrollable panels |

---

## 📍 6. Detailed Location-by-Location Mapping ("Which Color is Where")

### A. Full-Screen Loading Overlay (`#auth-loading`)
* **Background**: `#0b0f19` (Deep Obsidian Black).
* **Ambient Glows**: Blue (`bg-blue-900/10`) and Indigo (`bg-indigo-900/10`) radial blurs.
* **Logo Glow**: `drop-shadow(0 0 15px rgba(59, 130, 246, 0.35))` ➔ `rgba(99, 102, 241, 0.65)`.
* **Title Text**: Gradient from `#ffffff` to `slate-400`.
* **Loading Bar**: Multi-gradient shimmer (`#3b82f6` ➔ `#6366f1` ➔ `#a855f7`).
* **Status Text**: `text-slate-500` with pulse effect.

### B. Navigation & Sidebar
* **Desktop Sidebar**: `bg-white` (Light) / `bg-slate-900` (Dark) with `border-slate-200`/`dark:border-slate-800`.
* **Mobile Header**: `bg-white` / `bg-slate-900`.
* **Active Nav Item**: `bg-blue-50 dark:bg-blue-950/40`, text `text-blue-600 dark:text-blue-400`.
* **Inactive Nav Items**: Text `text-slate-600 dark:text-slate-400`, hover text `text-slate-900 dark:text-slate-100`.

### C. Timer & Stopwatch Clock Panel (`#timer-active-panel`)
* **Clock Outer Housing**: `#050608` with border `#1e293b` and shadow `0 25px 50px -12px rgba(0,0,0,0.9)`.
* **Clock Bezel & Dial**: Multi-ring dark metallic gradients (`#0e1017` to `#020204`).
* **Clock Hands**: Main sweeping hand `#3b82f6` (Electric Blue) with glow `rgba(59, 130, 246, 0.7)`. Subdial hands `#ffffff`.
* **Digital Display**: Hours/Minutes in `#ffffff`, Seconds/Milliseconds in `#3b82f6`.
* **Fullscreen Mode BG**: Light mode `#f8fafc`, Dark mode `#0f172a`.

### D. Analytics & Dashboard Charts (`#page-spectra-analytics`)
* **Trend Lines**: `#6366f1` (Indigo) line with `#818cf8` gradient highlights.
* **Target Line**: `#f43f5e` (Rose Red) dashed indicator.
* **Completion Progress Bars**: `#10b981` (Emerald Green) for 100%+ completion, subject color otherwise.

### E. Login Page (`login.html`)
* **Page BG**: `#0b0f19` (Obsidian Black).
* **Card Container**: Semi-transparent dark slate `rgba(30, 41, 59, 0.45)` with glass backdrop blur.
* **Input Focus State**: Shadow glow `0 0 15px rgba(59, 130, 246, 0.25)`.
* **Primary Button**: `bg-gradient-to-r from-blue-600 to-indigo-600`.

---
*Created automatically for Project X context documentation.*
