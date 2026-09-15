# Chronote Product Specification

## 1. Product Identity

- **Product Name:** Chronote
- **Tagline:** *Your work. Remembered.*
- **Core Positioning:** Chronote is a lightweight, local-first desktop knowledge notebook initially optimized for structured engineering Daily Stand-up / DSM notes.
- **Competitive Focus:** *"The fastest lightweight searchable engineering work journal."*
- **Primary Value Loop:** Write → structure → tag → search → navigate → revisit.

Chronote is not intended to compete directly with sprawling platforms like Notion, OneNote, Obsidian, or Evernote by copying their generic feature matrices. Instead, it solves a specific, acute problem faced by software engineers: capturing, structuring, finding, and recalling technical work history across multi-day tasks without friction.

---

## 2. Target User Persona and Use Cases

### 2.1 Target User Persona
- **Role:** Software Engineers, Backend Developers, Full-Stack Engineers, DevOps/SREs, Engineering Leads.
- **Environment:** Windows-first developer workstations (enterprise and personal laptops), with Linux support targeted for subsequent phases.
- **Work Patterns:** Daily stand-up meetings (DSM), sprint-based deliverables, context switching across multiple repositories, long investigations, ad-hoc terminal and database queries, incident root-cause analysis, and cross-team knowledge handoffs.

### 2.2 Typical Content Captured
- **Daily Stand-up Logs:** Completed work, active blockers, daily priorities.
- **Code Snippets & Queries:** MongoDB aggregations, SQL joins, Java / Spring Boot configurations, Angular / TypeScript components, Python scripts, Bash commands, PowerShell one-liners, AWS CLI invocations.
- **Architectural Notes:** Decisions, endpoint contracts, API curl examples, internal wiki links.
- **Visual Artifacts:** Pasted screenshots of UI bugs, Grafana dashboards, stack traces, terminal outputs, error modals.
- **Reference Links:** Jira tickets, GitHub PRs, internal documentation URLs, Stack Overflow threads.

### 2.3 Critical Real-World Insight: Multi-Day Engineering Continuity
In typical software engineering, significant tasks span across multiple days. An engineer investigating a flaky database connection might begin on Tuesday, continue writing reproduction scripts on Wednesday, and deploy a fix on Thursday. 

**Existing tools fail this workflow in two distinct ways:**
1. **The "One File Per Day" Trap (Obsidian Daily Notes / Logseq):** Forces the engineer to fragment a single continuous investigation into separate disconnected daily files. Context is lost; reviewing the story of a feature requires switching tabs and stitching disparate fragments together.
2. **The "Single Infinite Scratchpad" Trap (Notepad / Apple Notes):** Lacks structured dates, per-entry tags, collapsible sections, and fast date-range filtering.

**Chronote's Solution:** The Daily Stand-up Journal is presented as **one continuous, scrollable notebook**, while internally every calendar date entry is an **independently addressable, taggable, collapsible, and searchable first-class domain object**.

---

## 3. Note Types for Phase 1

To preserve extreme lightweight simplicity and focus, Phase 1 strictly supports exactly two note types:

```
┌─────────────────────────────────────────────────────────────┐
│ Chronote Note System                                        │
├──────────────────────────────┬──────────────────────────────┤
│ 1. Daily Stand-up (DSM)      │ 2. General Notes             │
│  - One continuous journal    │  - Standalone notes          │
│  - Discrete date entries     │  - Arbitrary title & content │
│  - Entry-level tags          │  - Global note tags          │
│  - Collapsible day sections  │  - Rich-text + code blocks   │
│  - Date & tag navigation     │  - Internal cross-links      │
│  - Full-text search          │  - Attachments & media       │
└──────────────────────────────┴──────────────────────────────┘
```

### 3.1 Daily Stand-up (DSM) Note
- **Singular Instance:** There is exactly one master DSM journal per workspace.
- **Date Entries:** Each calendar date (`YYYY-MM-DD`) is a distinct entry section within the journal.
- **Collapsible:** Each date section can be expanded or collapsed independently.
- **Entry-Level Tags:** Tags belong directly to specific date entries (e.g., entry `2026-09-15` tagged `#springboot`, `#backend`; entry `2026-09-14` tagged `#aws`, `#monitoring`).
- **Derived Previews:** When collapsed, the entry displays an automatically derived summary preview (first meaningful sentence/task) along with its date badge and tag chips.
- **Interlinking:** DSM entries can link directly to General notes (`[[Spring Boot Authentication]]`), and General notes can link back to specific DSM dates (`[[dsm:2026-09-15]]`).

### 3.2 General Notes
- **Independent Documents:** Created on-demand with an arbitrary title (e.g., "PostgreSQL Indexing Strategies", "Docker Setup on Windows").
- **Flexible Hierarchy:** Managed via tags and direct cross-references rather than deep, fragile folder trees.
- **Rich Media & Attachments:** Supports code blocks, inline images, file attachments, and internal wiki-links.

---

## 4. Functional Requirements

### 4.1 Editor & Authoring Experience
- **Structured Rich-Text with Markdown Input Rules:**
  - Typing `# ` converts to Heading 1; `## ` converts to Heading 2; `### ` converts to Heading 3.
  - Typing `- ` or `* ` creates a Bulleted List.
  - Typing `1. ` creates an Ordered List.
  - Typing `> ` creates a Blockquote.
  - Typing ```` + Enter creates a Code Block with language selection.
  - Typing `[] ` or `- [ ] ` creates a Task Checklist.
  - Formatting triggers immediately consume the Markdown shortcut characters. The characters `#`, `*`, etc. do not remain visible as literal text once transformed.
- **Standard Keyboard Accelerators:**
  - `Ctrl+B` (Bold), `Ctrl+I` (Italic), `Ctrl+U` (Underline), `Ctrl+K` (Insert Link).
  - `Ctrl+Shift+C` (Inline Code), `Ctrl+Alt+1..3` (Headings).
  - `Ctrl+S` (Force immediate save, though autosave operates continuously).
- **Minimalist, Contextual UI:** No oversized Microsoft Word ribbons. Uses floating bubble menus for text formatting, slash commands (`/code`, `/table`, `/heading`, `/image`), and clean typography.

### 4.2 First-Class Code Block System
- Supported out-of-the-box syntax highlighting for primary engineering languages:
  - Java, Spring Boot configurations, SQL, MongoDB queries, TypeScript, JavaScript, Python, Bash, PowerShell, Rust, JSON, YAML, HTML, CSS, C, C++.
- Extensible language dictionary allowing arbitrary language tags.
- Dedicated UI elements on code blocks:
  - Language indicator badge with searchable dropdown selector.
  - One-click "Copy Code" button with visual confirmation checkmark.
  - Persistent block ID for indexing in the Resource Browser.

### 4.3 Internal Note Linking & Backlinks
- Wiki-link syntax support: `[[Note Title]]` or with custom label `[[Note Title|Custom Alias]]`.
- Stable Identity Resolution: Internal links resolve against the target note's immutable unique ID (`noteId`), ensuring note renames never break incoming references.
- Link Autocomplete: Typing `[[` invokes a responsive popup list of matching General notes and recent DSM dates.
- Navigation: Clicking an internal link opens the destination document in a new tab (or focuses the existing tab).
- Backlink Graph: The sidebar and note footer reveal all notes referencing the currently active document.

### 4.4 Multi-Document Tab System
- Lightweight tab bar situated above the active editor.
- Supports pinning the DSM journal as the permanent first tab.
- Tab management operations: Close tab (`Ctrl+W`), Close other tabs, Reopen recently closed tab (`Ctrl+Shift+T`), Switch tabs (`Ctrl+Tab` / `Ctrl+1..9`).
- Persisted Session: Open tabs, active tab index, and cursor scroll positions are saved in local application state and restored across application restarts.

### 4.5 Resource & Media Browser
A dedicated, indexed resource inspector categorized into:
- **Code:** All code blocks indexed across the workspace, filterable by language.
- **Images:** Gallery of all pasted screenshots and diagrams.
- **Links:** All external HTTP(S) URLs referenced across notes.
- **Attachments:** All embedded PDF, log, or data files.
- **Linked Notes:** Outgoing and incoming cross-document references.
- Clicking any item in the Resource Browser instantly navigates the editor to that exact block in its parent document.

### 4.6 Search Capabilities
- **Sub-50 ms Instant Search:** Powered by embedded SQLite FTS5.
- **Comprehensive Scope:** Searches across DSM entries, General notes, code block bodies, tags, and attachment names.
- **Query Grammar & Filters:**
  - Full-text: `authentication jwt`
  - Tag filter: `tag:springboot`, `tag:backend`
  - Block type: `type:code`, `type:image`
  - Language filter: `lang:sql`, `lang:mongodb`
  - Date & Date Ranges: `date:2026-09-15`, `after:2026-09-01`, `before:2026-09-16`
  - Compound queries: `tag:aws type:code lambda`
- **Result Presentation:** Shows document/date title, snippet with highlighted search terms, tag chips, and relevance score.

### 4.7 Export Pipeline
- **Export Targets:**
  1. Markdown (`.md`): CommonMark / GitHub Flavored Markdown (GFM).
  2. Microsoft Word (`.docx`): Clean OpenXML document with formatted headings, tables, and monospace code blocks.
  3. PDF (`.pdf`): Vector-rendered, print-ready document.
  4. Native Archive (`.zip`): Lossless backup archive containing all workspace JSON notes and binary assets.
- **Export Scopes:** Single General Note, Single DSM Date Entry, Date Range of DSM Entries (e.g. "Export Sprint 42 DSMs"), or Entire Workspace.

---

## 5. Non-Functional & Engineering Principles

### 5.1 "Lightweight" Mandate (Measurable Targets)
- **Cold Boot Time:** Under 800 milliseconds from application launch to interactive editor on standard developer hardware.
- **Idle Memory (RSS):** Under 90 megabytes when running in the background.
- **Typing Latency:** Under 16 milliseconds (steady 60+ fps) during sustained typing.
- **Zero Daemons:** No background Windows services, no persistent node helper processes.

### 5.2 Local-First & 100% Offline
- All notes, assets, and indexes reside on the local physical filesystem.
- Zero features depend on an active internet connection.
- No mandatory accounts, logins, or cloud tokens.

### 5.3 Zero-Cost Development
- Built entirely with permissive open-source technologies (MIT, Apache 2.0).
- Zero paid API keys, zero cloud hosting bills, zero commercial database licenses.

### 5.4 Data Safety & Human Recoverability
- Notes are stored in formatted UTF-8 JSON documents. A user can open any note in a standard text editor to read their content.
- Atomic saves prevent file corruption during crashes or power loss.
- SQLite is treated as an index cache and can be completely reconstructed from disk files at any time.

---

## 6. Phase 1 Non-Goals (Strictly Out of Scope)

The following features are **explicitly excluded** from Phase 1 to ensure delivery of a robust, focused MVP:
- **Mobile Applications:** No iOS or Android clients.
- **Web App / Browser Edition:** No hosted web version.
- **Real-Time Multi-User Collaboration:** No Google Docs-style concurrent multi-user editing.
- **Custom Cloud Backend:** No Firebase, Supabase, or proprietary Chronote sync servers.
- **Artificial Intelligence / LLMs:** No AI summaries, chat sidebars, embeddings, vector databases, or Copilot features (see [ADR-008](file:///e:/workspace/chronote/general/DECISIONS/ADR-008-ai-policy.md)).
- **Whiteboards / Canvas Drawing:** No freehand sketches or diagram editors.
- **Voice Transcription / Audio Notes:** No microphone recording or speech-to-text.
- **OCR (Optical Character Recognition):** No automated text extraction from screenshots.
- **Full Calendar & Task Manager:** No Gantt charts, recurring reminders, or calendar integrations.
- **Plugin Marketplace:** No third-party extension ecosystem in Phase 1.
- **Full-Disk Encryption:** At-rest encryption deferred to future security phases.
