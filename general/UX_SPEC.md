# Chronote UX and Layout Specification

## 1. UI Principles & Aesthetics

Chronote is designed specifically for software engineers who spend hours inside code editors and terminal windows. 

- **Visually Calm & Developer-Native:** Sleek, high-contrast dark mode (with an optional clean light mode), subdued border accents, and zero distracting marketing graphics or unnecessary animations.
- **Information Dense Without Clutter:** Generous editor margins for distraction-free typing, paired with high-density sidebars and inspectors for instant navigation.
- **Keyboard-First Ergonomics:** Every key workflow (creating a note, searching, switching tabs, expanding/collapsing days, jumping to code) is achievable entirely via keyboard shortcuts.
- **Zero Oversized Ribbons:** Controls are placed in contextual floating menus or responsive sidebars.

---

## 2. Desktop Application Window Layout

Chronote utilizes a 3-pane responsive desktop layout:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  [Search workspace... (Ctrl+F)]                         [+ New Note] [⚙ Settings]     │  <-- App Header
├────────────────────────┬───────────────────────────────────────────────┬───────────────┤
│ NAVIGATION SIDEBAR     │ MAIN EDITOR WORKSPACE                         │ RESOURCE PANE │
│                        │ ┌───────────────────────────────────────────┐ │ (Collapsible) │
│ ▼ DAILY STAND-UP (DSM) │ │ [★ DSM] [Spring Security] [MongoDB Notes]x│ │               │
│   Today (2026-09-16)   │ └───────────────────────────────────────────┘ │ ▼ CODE (14)   │
│   2026-09-15           │                                               │   - JWT Auth  │
│   2026-09-14           │ ▼ 2026-09-16 [Wednesday]     #springboot #jwt │   - Mongo Agg │
│                        │   Investigating Auth Token Expiry             │               │
│ ▼ GENERAL NOTES (12)   │   Completed token refresh logic...            │ ▼ IMAGES (4)  │
│   Spring Security      │                                               │   - Screenshot│
│   Postgres Indexing    │ ▶ 2026-09-15 [Tuesday]       #aws #monitoring │               │
│   Docker Setup         │   Set up CloudWatch alarms for ECS memory...  │ ▼ LINKS (8)   │
│                        │                                               │   - Spring Doc│
│ ▼ TAGS                 │ ▶ 2026-09-14 [Monday]       #angular #backend │               │
│   #springboot (8)      │   Fixed CORS headers on local gateway...      │ ▼ BACKLINKS(2)│
│   #backend (15)        │                                               │   - Architecture│
│   #aws (4)             │                                               │               │
└────────────────────────┴───────────────────────────────────────────────┴───────────────┘
```

---

## 3. Component Details & UX States

### 3.1 App Header Bar
- **Global Search Input:** Centered search pill (`Ctrl+F`). Pressing `Enter` or clicking opens the Quick Search Modal with filter suggestions.
- **New Note Button (`Ctrl+N`):** Creates a new untitled General Note and immediately places cursor focus in the title input.
- **Settings Icon:** Opens workspace preferences (theme, font size, export, backup, re-index database).

### 3.2 Navigation Sidebar (Left)
- **DSM Journal Root:** Quick button with calendar badge to jump to Today’s DSM entry (`Ctrl+Shift+D`).
- **DSM Date Tree:** Quick scroll targets for recent days (grouped by "This Week", "Last Week", "Older").
- **General Notes Catalog:** Pinned notes on top, followed by alphabetically sorted notes with search filter.
- **Tags Cloud / List:** Lists all normalized workspace tags with entry count badges (`#springboot (8)`). Clicking a tag opens a filtered view.
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
- **Collapsible Entry Headers:**
  - **Expanded View (▼):**
    - Header displays Date (`2026-09-16`), Day of week (`Wednesday`), Entry Tags (`#springboot #jwt`), and an "Add Tag" chip.
    - Full rich-text editor canvas active for that day.
  - **Collapsed View (▶):**
    - Content is collapsed into a single-line summary strip.
    - Displays date badge, tag chips, and an **auto-derived preview** (the first 120 characters of meaningful text, truncated with `...`).
    - Clicking the chevron or double-clicking the header expands the entry.
- **Calendar Quick Jump:** A subtle calendar icon in the header opens an inline date picker to jump directly to any historical date without endless scrolling.

### 3.5 Resource Browser Pane (Right, Collapsible)
An indexed inspector over the current document or entire workspace:
- **Code Tab:** Shows all code blocks with language pills. Clicking an item jumps and highlights that exact code block in the editor.
- **Images Tab:** Thumbnail gallery of all embedded screenshots and figures. Clicking reveals full image or jumps to location.
- **Links Tab:** All external HTTP(S) URLs referenced. Clicking opens URL in default external browser (with safety prompt).
- **Backlinks Tab:** Shows all other notes and DSM dates that reference the active document via `[[...]]` links.

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
