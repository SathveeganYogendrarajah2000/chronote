# Changelog

All notable changes to the **Chronote** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned for [0.1.0] - Phase 1 Windows MVP
- Milestone 1.4: General Notes subsystem.
- Milestone 1.5: Tiptap 3.x rich-text editor with instant Markdown shortcut input rules.
- Milestone 1.6: Instant Search DSL & Resource Browser.
- Milestone 1.7: Export Pipeline (Markdown, DOCX, PDF, Zip backup).

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
