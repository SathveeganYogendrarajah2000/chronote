# Changelog

All notable changes to the **Chronote** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned for [0.2.0] - Phase 3 Cloud Integrations & Advanced Navigation
- Direct Google Drive and Microsoft OneDrive OAuth sync adapters.
- Interactive 3-way conflict resolution engine for simultaneous edits.
- Interactive backlinks graph and visual connection explorer.

---

## [0.1.0] - 2026-09-22

### Added
- **File Attachments, Image Embedding & Drag-and-Drop:**
  - Full desktop drag-and-drop support: drag files and images directly from OS file explorer into any note or stand-up entry.
  - Clipboard image paste support (`handlePaste`): pasting screenshot/image data automatically persists local copies into workspace `.chronote/assets/` storage.
  - Native Rust asset management commands (`pick_asset_file`, `save_asset_binary`, `get_asset_path`, `reveal_in_explorer`).
  - Custom TipTap extensions: `CustomImage` and `AttachmentExtension` with interactive cards showing file name, formatted size, and reveal in explorer action.
  - Slash command extensions `/image` and `/file` for quick media insertion.
  - Action buttons in Resource Inspector: `+ Attach File` and `+ Insert Image` with instant insertion into the active document.
- **Clean Vector PDF / Print Generation:**
  - Dedicated isolated `<iframe>` print pipeline replacing naive full-window printing, ensuring app UI chrome, sidebars, and modals are never printed.
  - Pure semantic HTML exporter (`htmlExporter.ts`) generating print-optimized layouts with Aptos/system-ui typography, code block syntax styling, task lists, GFM tables, and `@page` margin control.
  - Multi-scope PDF support: active note, single stand-up entry, date range journal, or full workspace bundle.
- **Tag Filtering in DSM Timeline and Sidebar:**
  - DSM Journal tag filter bar: filter daily stand-up timeline to entries matching specific tags with dynamic entry counters.
  - Clickable tag chips in DSM entry headers to filter timeline instantly.
  - General Notes tag filter in navigation sidebar with active tag badge and clear button.
  - Interactive workspace tag chips in sidebar for rapid filtering across notes and stand-ups.
- **External URL Browser Launcher:**
  - Native Rust command `open_external_url` with protocol validation (`http:`, `https:`, `mailto:`) and OS launcher for external links in editor and Resource Inspector.
- **Backlinks Guidance:**
  - Educational explanation banner and contextual empty states in the Resource Inspector Backlinks tab explaining bidirectional wiki-links (`[[Note Title]]`).

### Changed
- **Resource Inspector Real-Time Synchronization:**
  - Resource Inspector now updates reactively on note and stand-up document saves/deletes without requiring app restart.
  - Added manual `Refresh` button in inspector header for instant re-indexing.
  - SQLite resource indexer extracts both images and file attachments into the workspace resources index.

### Fixed
- **Cold Startup Latency runaway:**
  - Resolved runaway latency timer in Performance & Architecture Diagnostics by marking `timeline_rendered` lifecycle milestone upon DSM timeline mount and adding fallback latch on `workspace_ready`.
- **Duplicate class member in MockIpcBridge:**
  - Cleaned up duplicate `mockConflicts` declaration in development test harness.

---

### Added
- **Phase 2: Stabilization, Hardening & Distribution:**
  - Implemented **Synthetic Large Workspace Generator** (`scripts/generate_test_workspace.ts`, `pnpm run generate:workspace`):
    - Configurable generation of 500, 5,000, or 20,000 notes and DSM entries with realistic code blocks, tags, and internal links.
  - Implemented **Batched Transaction & Prepared Statement Optimization** (`database/mod.rs`):
    - Full SQLite index rebuild from disk for 1,001 documents benchmarks at **274 ms** (well below the < 350 ms budget threshold in `PERFORMANCE.md`).
    - FTS5 multi-term queries and trigram code token matching execute in **3–5 ms** (budget: < 30 ms).
  - Implemented **Startup & Performance Profiler** (`performanceProfiler.ts`, `performance.rs`, `PerformanceModal.tsx`, `performance.css`):
    - Telemetry-free local performance profiler tracking boot lifecycle markers, keystroke responsiveness, and active JS heap.
    - Native Windows RSS Working Set introspection via `K32GetProcessMemoryInfo` (< 90 MB total memory budget).
    - Interactive Performance Diagnostics Modal accessible via `Ctrl+Shift+P` or AppHeader button.
  - Implemented **Windows NSIS and WiX MSI Packaging & CI** (`tauri.conf.json`, `ci.yml`, `release.yml`):
    - Production Windows bundle metadata (publisher, copyright, category, NSIS currentUser install mode, WiX upgrade GUID).
    - Multi-stage GitHub Actions CI workflow running TypeScript build, Vitest suite, and native Rust tests.
    - Automated GitHub Actions release workflow building signed installers and publishing release assets.
  - Implemented **External Sync Conflict Detection & Resolution Engine** (`conflict.rs`, `useConflictStore.ts`, `ConflictModal.tsx`, `conflict.css`):
    - Detects conflict copies generated by Dropbox, OneDrive, Syncthing, and Google Drive.
    - Window focus listeners and startup scanners notify engineers immediately via animated header warning badge.
    - Safe 3-way resolution modal: "Keep Local Version", "Overwrite with Conflicted", or "Keep Both as Separate Notes" (zero data loss).
  - Test coverage expanded to **118/118 passing Vitest tests** and **21/21 passing Rust native & stress tests**.

---

## [0.1.0-alpha.7] - 2026-09-19

### Added
- **Milestone 1.7: Export Pipeline:**
  - Implemented pure TypeScript **CommonMark / GitHub Flavored Markdown (GFM) Exporter** (`markdownExporter.ts`):
    - Converts ProseMirror JSON nodes into standard GFM syntax (headings 1-6, paragraphs, code blocks with language, blockquotes, horizontal rules, task lists, bullet/ordered lists, and GFM tables).
    - Degrades internal links (`[[Note Title]]`) gracefully to relative markdown paths (`[Note Title](./note_title.md)`) or preserves raw wiki-link syntax based on user preference.
    - Supports single DSM date entry, DSM date range, and workspace bundle exports.
    - One-click copy directly to system clipboard.
  - Implemented native **Microsoft Word (.docx) OpenXML Exporter** (`docxExporter.ts`):
    - Produces clean Word documents with Aptos/Calibri typography.
    - Monospace code blocks styled as shaded single-cell boxes (`#F4F6F8` background, `#D0D7DE` border, Consolas font, preserved whitespace).
    - Blockquotes with 3pt blue accent border (`#3B82F6`) and slight indent.
    - Formatted Word tables with header shading and borders.
  - Implemented **Print & Vector PDF Export** (`print.css`):
    - Clean `@media print` layout hiding sidebar, header, tabs, and modals.
    - Strict `page-break-inside: avoid` on code blocks and tables, and `page-break-after: avoid` on headings.
  - Implemented native **Workspace Backup Archive (.zip)** in Rust (`backup.rs`, `export.rs`):
    - Lossless one-click `.zip` archive generation.
    - Auto-generates `manifest.json` with metadata, timestamps, and entity counts.
    - Strictly excludes disposable `.chronote/index.db` SQLite cache and temporary files.
  - Implemented **Export Modal UI** (`ExportModal.tsx`, `export.css`):
    - Global keyboard shortcut `Ctrl+E`.
    - Format cards for Markdown, Word, PDF, and Backup Archive.
    - Scope selection for Active Document, Single DSM Entry, Sprint Date Range, and Full Workspace.
    - Context menu integration ("Export Note...") on tabs and top header action button.
  - Test coverage expanded to **113/113 passing Vitest tests** and **16/16 passing Rust native tests**.

## [0.1.0-alpha.6] - 2026-09-19

### Added
- **Milestone 1.6: Instant Search & Resource Browser:**
  - Implemented pure TypeScript **Search DSL Parser** (`search.parser.ts`, `search.types.ts`):
    - Supports filter tokens: `tag:<tag>`, `type:<code>`, `type:<image>`, `type:<dsm>`, `type:<note>`, `lang:<language>`, `date:<YYYY-MM-DD>`, `after:<YYYY-MM-DD>`, `before:<YYYY-MM-DD>`.
    - Supports exact quoted phrases (`"exact phrase"`), prefix tokens (`prefix*`), and unkeyed full-text keywords.
    - Tag normalization via `normalizeTag()`.
  - Implemented **SQLite FTS5 Query Runner (< 50 ms)** in Rust backend (`src-tauri/src/search/mod.rs`):
    - BM25 relevance ranking with column weighting (`content: 10.0`, `tags: 5.0`).
    - Contextual excerpt generation with `<mark>` highlight tags via SQLite `snippet()`.
    - Trigram code index matching for symbols and function signatures.
  - Implemented **Resource & Backlink Indexer** (`src-tauri/src/database/mod.rs`, `resourceExtractor.ts`):
    - Automatically extracts code blocks, embedded images, external HTTP(S) URLs, and incoming backlinks from ProseMirror document trees into `resources` and `backlinks` SQLite tables.
    - Disaster-recovery rebuilds populate resources and backlinks seamlessly.
  - Implemented **Quick Search Modal UI** (`SearchModal.tsx`, `search.css`):
    - Keyboard-first desktop interaction (`Ctrl+F` global accelerator, `↑`/`↓` navigation, `Enter` to open, `Escape` to close).
    - Suggestion pills for quick filter insertion (`tag:`, `type:code`, `type:dsm`, `type:note`, `lang:`, `after:`, `before:`).
    - Recent searches history with one-click replay.
    - Deep block navigation: opening document, switching tabs, expanding target DSM date, smoothly scrolling to target block, and triggering a temporary CSS pulse glow (`@keyframes blockHighlightPulse`).
  - Implemented **Resource Browser Inspector** (`ResourcePane.tsx`):
    - Indexed inspector with tabs: **Code**, **Images**, **Links**, **Files**, and **Backlinks**.
    - Scope toggle between "This Note" (active document) and "All Notes" (workspace-wide).
    - Inline filter search to quickly filter resources by keyword or language.
    - Code cards with language badge, one-click copy snippet, and jump to block.
    - External links with URL domain badge, browser launcher, and jump to editor block.
    - Backlinks inspector displaying all notes and DSM dates linking to the active note.
  - Added full test coverage: 95/95 passing Vitest tests and 15/15 passing Rust native tests.

---

## [0.1.0-alpha.5] - 2026-09-19

### Added
- **Milestone 1.5: Rich-Text Editor & Code Blocks:**
  - Integrated **Tiptap 3.x / ProseMirror** core engine across Chronote (`@tiptap/core`, `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-underline`, `@tiptap/extension-link`, `@tiptap/extension-task-list`, `@tiptap/extension-task-item`, `@tiptap/extension-code-block-lowlight`, `@tiptap/extension-placeholder`).
  - Implemented instant Markdown authoring shorthand (`InputRules`):
    - `# `, `## `, `### ` + Space → Headings (levels 1–3).
    - `- ` or `* ` + Space → Bullet list item.
    - `1. ` + Space → Ordered list item.
    - `> ` + Space → Styled blockquote with left accent border.
    - ```` + Enter or ````lang + Enter → Structured code block with language pre-selection.
    - `[ ] ` or `[] ` + Space → Interactive task item checkbox with strikethrough upon check.
    - `---` + Enter → Horizontal rule divider.
    - `**bold**`, `*italic*`, `~~strike~~`, `` `inline code` `` inline marks.
  - Implemented **First-Class Code Blocks** (`CodeBlockExtension.ts`, `CodeBlockView.tsx`):
    - Syntax highlighting powered by `lowlight` with 35+ common engineering languages (TypeScript, JavaScript, Python, Bash, SQL, Java, Rust, Go, C#, C++, C, JSON, YAML, HTML, CSS, Markdown, Dockerfile, Diff).
    - Styled in high-contrast One Dark / JetBrains theme palette.
    - Header bar with inline searchable/selectable language picker.
    - One-click Copy button with "Copied!" feedback indicator.
    - Auto-assigned stable block IDs (`blk_...`).
  - Implemented **Internal Note Linking (`[[...]]`)** (`InternalLinkExtension.ts`, `InternalLinkSuggestion.ts`, `InternalLinkPopover.tsx`):
    - Typing `[[` triggers an autocomplete popover filtering General Notes and recent DSM dates.
    - Keyboard navigation (`↑`, `↓`, `Enter`, `Esc`) and alias format support (`[[Note Title|Custom Alias]]`).
    - Internal link clicks immediately navigate/open note tabs in the workspace.
    - Broken reference styling (`is-broken`) if target note was moved or deleted.
  - Implemented **Quick Insert Slash Palette (`/`)** (`SlashCommandExtension.ts`, `SlashCommandMenu.tsx`):
    - Typing `/` on an empty line or after space presents quick insert options (`/code`, `/h1`, `/h2`, `/h3`, `/bullet`, `/numbered`, `/todo`, `/quote`, `/divider`).
  - Added **Contextual Bubble Formatting Bar** (`BubbleMenuBar.tsx`):
    - Appears smoothly on text selection offering Bold, Italic, Underline, Strikethrough, Monospace Code, and Link controls.
  - Unified editor integration across **General Notes** (`NoteEditorCanvas`) and **Daily Stand-up** entries (`DsmEntryEditor`).
  - Extended `useNotesStore` and `useDsmStore` with `updateContent` and `updateEntryContent` preserving structured ProseMirror JSON trees with debounced autosave (800ms).
  - Enhanced domain text extraction utilities (`dsm.utils.ts`) to recursively extract text from all block and list types.
  - Added 11 new unit tests (77/77 Vitest tests passing, 12/12 Cargo tests passing, zero Clippy warnings).

---

## [0.1.0-alpha.4] - 2026-09-19

### Added
- **Milestone 1.4: General Notes Subsystem:**
  - Implemented domain utilities (`note.utils.ts`) for canonical note entity generation (`createDefaultGeneralNote`), note sorting with pinned precedence (`sortNotes`), and case-insensitive query filtering across titles and tags (`filterNotes`).
  - Created `useNotesStore` (Zustand 5) providing complete standalone note lifecycle: note creation, load, debounced autosave (800ms), title updating with instant tab synchronization, tag management, pin toggling, and deletion.
  - Built note presentation components (`NoteEditorCanvas`, `NoteEditorHeader`, `NoteTagBar`, `NoteDeleteModal`) with auto-focusing title renaming, tag chips with inline creator, word & character statistics, and confirmation deletion dialog.
  - Upgraded multi-document `TabBar` and `useTabsStore`:
    - Permanent DSM journal tab pinning (`★ DSM`) locked to the left.
    - Dynamic tabs for General Notes with pin/unpin toggles.
    - Right-click context menu (`TabContextMenu`) supporting *Pin/Unpin Tab*, *Close Tab*, *Close Other Tabs*, and *Close Tabs to the Right*.
    - Workspace tab session persistence and restore across sessions with disk validation against existing notes.
  - Enhanced `NavigationSidebar`:
    - Dedicated live note search/filter input (`Filter notes...`).
    - Pinned notes section on top (`PINNED`), followed by all notes.
    - Inline "New Note" (+) trigger in section header.
    - Quick hover action buttons for note items (Pin toggle 📌, Delete 🗑️).
    - Active note highlighting synchronized with active tab.
  - Added `notes.css` styling adhering strictly to dark/light design system tokens.
  - Added 19 new unit tests across domain and store layers (66/66 Vitest tests passing, 12/12 Cargo tests passing, zero Clippy warnings).

---

## [0.1.0-alpha.3] - 2026-09-19

### Added
- **Milestone 1.3: Continuous Daily Stand-up (DSM) Journal:**
  - Implemented domain utilities (`dsm.utils.ts`) for date validation, UTC date labeling, ProseMirror serialization, and auto-derived summary previews (`deriveDsmEntryPreview`).
  - Added strict Gregorian date validator rejecting invalid dates (`2026-02-30`).
  - Created `useDsmStore` (Zustand 5) managing DSM document lifecycle, unique date entry invariants, collapsing/expanding, tag management, debounced autosave, and smooth date jumping.
  - Built continuous timeline UI stream (`DsmTimeline`, `DsmEntryItem`, `DsmEntryHeader`, `DsmSummaryPreview`, `DsmEntryEditor`, `DsmDatePicker`).
  - Added single-click/double-click entry collapsing with 120-character auto-derived preview summaries and tag chips.
  - Implemented entry-level tag management with auto-normalization, removal, and inline tag creator.
  - Built calendar quick-jump date picker modal supporting custom date jumping and preset offsets ("Today", "Yesterday", "2 Days Ago", "1 Week Ago").
  - Connected `NavigationSidebar` to recent DSM entries and unified tag aggregation across general notes and DSM journal entries.
  - Wired global accelerator `Ctrl+Shift+D` to jump directly to today's entry.
  - Created `dsm.css` styles adhering strictly to the curated design tokens.
  - Added 23 new unit tests across domain and application stores (47/47 Vitest tests passing, 12/12 Cargo tests passing, zero Clippy warnings).

---

## [0.1.0-alpha.2] - 2026-09-17

### Added
- **Milestone 1.2: Workspace & Storage Engine:**
  - Implemented atomic file persistence pipeline in Rust (`.tmp` -> `File::sync_all()` -> `std::fs::rename`) with automatic orphan `.tmp` sweep.
  - Built directory layout initializer generating `notes/`, `assets/images/`, `assets/files/`, `.chronote/`, `workspace.json`, `.gitignore`, and `.stignore`.
  - Added path traversal security guard rejecting `..` and non-workspace paths.
  - Implemented SQLite index database cache at `.chronote/index.db` with WAL mode, normalized relational tables (`documents`, `dsm_entries`, `tags`, `backlinks`, `resources`), and FTS5 virtual tables (`fts_blocks`, `fts_code_trigram`).
  - Added disaster recovery index rebuild scanner reconstructing 100% of SQLite state from disk JSON files in milliseconds.
  - Added native OS directory picker via `rfd` (asynchronous folder selection dialog).
  - Implemented Tauri IPC commands for workspace creation, folder picking, opening, DSM & note persistence, and index rebuilding.
  - Implemented `MockIpcBridge` for complete in-memory testing and headless browser execution.
  - Upgraded `useWorkspaceStore` with full workspace lifecycle, recent workspace persistence, and error handling.
  - Created developer-native `WorkspaceModal` dialog for opening and creating workspaces.
  - Connected `AppHeader` and `NavigationSidebar` to dynamic workspace note lists and tag aggregation.
  - Added 6 new frontend unit tests (24/24 Vitest passing) and 10 new native Rust tests (12/12 passing) with zero Clippy warnings.

---

## [0.1.0-alpha.1] - 2026-09-16

### Added
- **Milestone 1.1: Project Scaffolding & Native Shell:**
  - Initialized Tauri 2.x native shell with Rust 2021 stable backend (`chronote`, `chronote_lib`).
  - Configured React 19, TypeScript strict mode (`strict: true`, `noImplicitAny: true`, `exactOptionalPropertyTypes: true`), and Vite 6.
  - Implemented Clean Architecture directory hierarchy (`domain`, `application`, `infrastructure`, `presentation`, `src-tauri`).
  - Created pure TypeScript domain layer with Zod validation schemas (`TagSchema`, `IsoDateSchema`, `DsmEntrySchema`, `GeneralNoteSchema`, `WorkspaceSchema`).
  - Created tag normalizer and generator utility for stable prefixed identifiers (`wsp_`, `ent_`, `not_`, `blk_`, `img_`, `att_`).
  - Implemented Zustand application stores (`useWorkspaceStore`, `useTabsStore`, `useUiStore`) with tab pinning, close history stack, and scroll state preservation.
  - Created typed Tauri IPC bridge and test mock adapter.
  - Implemented dark and light theme custom CSS design tokens (`tokens.css`, `reset.css`, `layout.css`).
  - Built responsive 3-pane desktop layout (`AppHeader`, `NavigationSidebar`, `TabBar`, `MainContentArea`, `ResourcePane`).
  - Added desktop global keyboard accelerators (`Ctrl+F`, `Ctrl+N`, `Ctrl+Shift+D`, `Ctrl+\`, `Ctrl+W`, `Ctrl+Tab`, `Ctrl+Shift+T`).
  - Implemented unit tests for domain validators, tag normalization, and tab store (18/18 tests passing in Vitest, 2/2 in Cargo).

---

## [0.0.0] - 2026-09-16

### Added
- **Documentation Foundation (Phase 0):**
  - Created operational context briefing for AI coding agents (`AI_CONTEXT.md`).
  - Defined product identity, user workflows, and Phase 1 scope (`PRODUCT_SPEC.md`).
  - Authored clean layered architecture with Tauri IPC contracts (`ARCHITECTURE.md`).
  - Defined TypeScript and Rust domain models, Zod validation schemas, and ID conventions (`DOMAIN_MODEL.md`).
  - Specified directory-based workspace storage model and atomic save algorithm (`STORAGE_FORMAT.md`).
  - Designed SQLite FTS5 search engine, query grammar, and ranking system (`SEARCH_SPEC.md`).
  - Specified rich-text editor behavior, Markdown input rules, and code block system (`EDITOR_SPEC.md`).
  - Created UX specifications, window layout, design tokens, and tab management (`UX_SPEC.md`).
  - Specified multi-target export pipelines for Markdown, DOCX, PDF, and Zip backups (`EXPORT_SPEC.md`).
  - Authored security policies, Tauri capability sandboxing, and path traversal defenses (`SECURITY.md`).
  - Established measurable lightweight performance budgets and benchmarking harnesses (`PERFORMANCE.md`).
  - Defined comprehensive testing strategy across unit, editor, persistence, and E2E tiers (`TESTING.md`).
  - Codified engineering standards, React/Rust boundaries, and AI agent protocols (`DEVELOPMENT_RULES.md`).
  - Published 5-phase project roadmap and Phase 1 non-goals (`ROADMAP.md`).
  - Created canonical terminology glossary (`GLOSSARY.md`).
  - Documented technology stack and dependency vetting (`STACK.md`).
  - Analyzed open-source licensing constraints (`LICENSE_NOTES.md`).
  - Cataloged technical open questions, trade-offs, and future spikes (`OPEN_QUESTIONS.md`).
  - Authored 8 Architectural Decision Records (`DECISIONS/ADR-001` through `ADR-008`).
