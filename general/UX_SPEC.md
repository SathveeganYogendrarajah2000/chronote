# Chronote UX and Layout Specification

## 1. UI Principles & Aesthetics

Chronote is designed specifically for software engineers who spend hours inside code editors and terminal windows. 

- **Visually Calm & Developer-Native:** Sleek, high-contrast dark mode (with an optional clean light mode), subdued border accents, and zero distracting marketing graphics or unnecessary animations.
- **Information Dense Without Clutter:** Generous editor margins for distraction-free typing, paired with high-density sidebars and inspectors for instant navigation.
- **Keyboard-First Ergonomics:** Every key workflow (creating a note, searching, switching tabs, expanding/collapsing days, jumping to code) is achievable entirely via keyboard shortcuts.
- **Zero Oversized Ribbons:** Controls are placed in contextual floating menus or responsive sidebars.

---

### 2. Desktop Application Window Layout

Chronote utilizes a 3-pane responsive desktop layout with dynamically resizable sidebars and full-application zoom scaling:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  [Search workspace... (Ctrl+F)]               [-] 100% [+]               [+ New Note] [⚙ Settings]     │  <-- App Header
├────────────────────────┬───────────────────────────────────────────────────────────────┬───────────────┤
│ NAVIGATION SIDEBAR     │ MAIN EDITOR WORKSPACE                                         │ RESOURCE PANE │
│ (Resizable: 180-600px) │ ┌───────────────────────────────────────────────────────────┐ │ (200-700px)   │
│                        │ │ [★ DSM] [Spring Security] [MongoDB Notes]x                │ │               │
│ ▼ DAILY STAND-UP (DSM) │ └───────────────────────────────────────────────────────────┘ │ ▼ OUTLINE (5) │
│   Today (2026-10-02)   │                                                               │   H1 Architect│
│   2026-10-01           │ ▼ 2026-10-02 [Friday]        #springboot #jwt   [📑 Outline] │   H2 Database │
│                        │   Investigating Auth Token Expiry                             │               │
│ ▼ GENERAL NOTES (12)   │   Completed token refresh logic...                            │ ▼ CODE (14)   │
│   Spring Security      │                                                               │   - JWT Auth  │
│   Postgres Indexing    │ ▶ 2026-10-01 [Thursday]      #aws #monitoring                 │   - Mongo Agg │
│   Docker Setup         │   Set up CloudWatch alarms for ECS memory...                  │               │
│                        │                                                               │ ▼ IMAGES (4)  │
│ ▼ TAGS                 │                                                               │   - Screenshot│
│   [#springboot] [#jwt] │                                                               │               │
│   Match: [ALL] [ANY]   │                                                               │ ▼ BACKLINKS(2)│
│                        │                                                               │   - Arch Note │
└─[⋮ Drag Handle]────────┴───────────────────────────────────────────────────────────────┴─[⋮ Handle]────┘
```

---

## 3. Component Details & UX States

### 3.1 App Header Bar
- **Global Search Input:** Centered search pill (`Ctrl+F`). Pressing `Enter` or clicking opens the Quick Search Modal with filter suggestions.
- **Application Zoom Controls (`[-] 100% [+]`):**
  - Buttons for quick stepping: `[-]` zoom out (down to 70%), `[+]` zoom in (up to 200%).
  - Center percentage pill displays current zoom factor; clicking resets instantly to 100%.
  - On-screen glassmorphic HUD toast indicator displays current zoom level on change.
  - Scales elements smaller or larger while **completely filling 100% of the window dimensions** via dynamic calc compensation.
- **New Note Button (`Ctrl+N`):** Creates a new untitled General Note and immediately places cursor focus in the title input.
- **Settings Icon:** Opens workspace preferences (theme, font size, export, backup, re-index database).

### 3.2 Navigation Sidebar (Left, Resizable & Collapsible)
- **Interactive Edge Drag Handle:** Grab the right boundary (`.sidebar-resize-handle`) to resize width between **180px** and **600px** (default 260px). Double-click resets to default.
- **Full-Width Element Responsiveness:** Workspace card, navigation items, note lists, and tag chips flex to fill 100% of the sidebar width.
- **DSM Journal Root:** Quick button with calendar badge to jump to Today’s DSM entry (`Ctrl+Shift+D`).
- **DSM Date Tree:** Quick scroll targets for recent days (grouped by "This Week", "Last Week", "Older").
- **General Notes Catalog:** Pinned notes on top, followed by alphabetically sorted notes with search filter.
- **Multi-Tag Search & Filter Bar:**
  - Clicking tags adds/removes them from the multi-tag filter set.
  - Active filter bar displays chips with individual remove buttons (`×`), a match mode switcher (`ALL` vs `ANY`), and a `Clear` button.
- **Sidebar Collapse:** Toggleable via `Ctrl+\` to maximize editor canvas.

### 3.3 Multi-Document Tab Bar
- Situates directly above the editor canvas.
- **Pinned DSM Tab:** The Daily Stand-up Journal is pinned as the permanent left-most tab (`★ DSM`).
- **Dynamic Tabs:** Opening General notes adds lightweight tabs.
- **Tab Controls:**
  - Close button (`×`) on each unpinned tab.
  - Right-click context menu: *Close Tab*, *Close Other Tabs*, *Close Tabs to the Right*, *Pin Tab*.
  - Drag and drop tab reordering.
  - Middle-click tab to close.
  - `Ctrl+Shift+T` reopens the most recently closed tab.

### 3.4 DSM Continuous Timeline UX
- **The Journal Stream:** All calendar dates render sequentially in one scrollable timeline.
- **Timeline Multi-Tag Filter Bar:** Filter timeline entries by multiple tags with `ALL` / `ANY` mode switcher and clear button.
- **Collapsible Entry Headers:**
  - **Expanded View (▼):** Header displays Date, Day of week, Entry Tags, and interactive tag chips.
  - **Collapsed View (▶):** Single-line summary strip with auto-derived text preview.
- **Floating Outline Trigger:** `📑 Outline` toolbar button opens floating table of contents popover for quick navigation across stand-up entries.
- **Calendar Quick Jump:** Header date picker to jump directly to any historical date without scrolling.

### 3.5 Resource Browser Pane (Right, Resizable & Collapsible)
- **Interactive Edge Drag Handle:** Grab the left boundary (`.resource-pane-resize-handle`) to resize width between **200px** and **700px** (default 320px). Double-click resets to default.
- **Outline Tab (Table of Contents):**
  - Displays hierarchical heading outline (`H1`, `H2`, `H3`) with depth indentation and total heading count badge.
  - Real-time cursor context tracking: switches context dynamically when cursor enters a General Note or a specific DSM date entry.
  - **Exact Cursor Navigation:** Clicking any heading item moves the editor cursor directly inside that heading, scrolls into view, and pulses.
  - Filter input for searching headings in long documents.
- **Code Tab:** Shows all code blocks with language pills and jump-to-code action.
- **Images Tab:** Thumbnail gallery of all embedded screenshots and figures.
- **Links Tab:** All external HTTP(S) URLs referenced with native external browser launcher.
- **Attachments / Files Tab:** File attachments with size formatting and OS explorer reveal action.
- **Backlinks Tab:** Shows all referencing notes and DSM dates using `[[...]]` wiki-links.

---

## 4. Design Tokens and Theme Specifications

Chronote avoids generic primary colors in favor of a curated, ergonomic palette.

### 4.1 Dark Theme Tokens (Default)
```css
:root[data-theme="dark"] {
  /* Surface colors */
  --bg-app: #121418;             /* Darkest background behind sidebars */
  --bg-canvas: #181b20;          /* Main editor canvas */
  --bg-surface: #20242b;         /* Cards, tabs, dialogs */
  --bg-surface-hover: #2a2f38;   /* Hover states */
  
  /* Text colors */
  --text-primary: #e6edf3;       /* High-contrast readable prose */
  --text-secondary: #8b949e;     /* Subtitles, dates, meta */
  --text-muted: #6e7681;         /* Placeholders, shortcuts */
  
  /* Accent colors */
  --accent-primary: #3b82f6;     /* Primary brand blue */
  --accent-hover: #60a5fa;
  --accent-tag: #1e3a5f;         /* Tag chip background */
  --accent-tag-text: #93c5fd;    /* Tag chip text */
  --accent-code-bg: #0d1117;     /* Monospace code block background */
  
  /* Borders and Dividers */
  --border-subtle: #30363d;
  --border-focus: #3b82f6;
  
  /* Typography */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
}
```

---

## 5. Accessibility & Motion Guidelines

- **WCAG 2.1 AA Compliance:** Minimum 4.5:1 contrast ratio for all body text against canvas backgrounds.
- **Visible Focus Rings:** Strict keyboard focus outline (`2px solid var(--accent-primary)`) on all interactive inputs, buttons, and tab controls.
- **Reduced Motion:** Respects `prefers-reduced-motion: reduce`. Disables scroll-smoothing and animations when enabled in OS settings.
- **Screen Reader Semantics:** Uses standard HTML5 landmarks (`<nav>`, `<main>`, `<aside>`, `<header>`) and ARIA roles for tabs (`role="tablist"`, `role="tab"`).
