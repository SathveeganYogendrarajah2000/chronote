# Chronote AI Context

> **Target Audience:** AI Coding Agents operating within Google's Antigravity IDE (and human developers).  
> **Rule #1:** Read this entire file BEFORE proposing changes or writing code.

---

## 1. Product Summary & Mission
**Chronote** ("Your work. Remembered.") is a lightweight, local-first desktop knowledge notebook initially optimized for structured engineering Daily Stand-up / DSM notes.

- **Competitive Focus:** The fastest lightweight searchable engineering work journal.
- **Core Workflow:** Write → structure → tag → search → navigate → revisit.
- **Primary Persona:** Software engineers capturing multi-day technical work, code snippets, database queries (MongoDB/SQL), commands (Bash/PowerShell), screenshots, and architecture references.

---

## 2. Current Phase & Status
- **Current Phase:** **Release 0.1.4 (Adaptive Ergonomics & Navigation)** — Completed. Ready for release tagging. Transitioning to Phase 3 (Cloud Integrations & Advanced Navigation).
- **Status:** Release **0.1.4 COMPLETED**. Delivers window-filling application zoom in/out with dynamic calc compensation, on-screen HUD overlay, and Tauri native webview zoom factor integration; interactive resizable sidebars (drag edge handles for left navigation sidebar and right Resource Inspector with min/max clamping, double-click reset to default width, and 100% full-width child responsiveness); automated Table of Contents with live cursor tracking across General Notes and DSM stand-up entries, outline search, and exact ProseMirror text selection navigation upon click; multi-tag search & filtering with `ALL`/`ANY` match mode toggling across sidebar and DSM timeline. **145/145 Vitest tests** across 23 test suites and **22/22 native Rust tests + 1 stress test** passing with zero errors.
- **Next Milestone:** Phase 3: Cloud Integrations & Advanced Navigation (direct Google Drive / OneDrive OAuth sync adapters, interactive 3-way conflict resolution wizard for concurrent edits, and interactive visual backlinks graph).

---

## 3. Architecture Summary
Chronote follows a strict **Clean Layered Architecture** with unidirectional data flow:
```
┌─────────────────────────────────────────────────────────────┐
│ Presentation Layer (React 19, TypeScript, Vanilla CSS)      │
│  - UI Components, Editor Views, Tab Bar, Resource Browser   │
│  - NO direct filesystem, SQLite, or business domain rules   │
├─────────────────────────────────────────────────────────────┤
│ Application Layer (Zustand Stores & Application Services)   │
│  - WorkspaceStore, EditorStore, SearchStore, TabsStore      │
├─────────────────────────────────────────────────────────────┤
│ Domain Model (Entities, Value Objects, Types)               │
│  - DsmDocument, DsmEntry, GeneralNote, Block, Tag, Asset    │
├─────────────────────────────────────────────────────────────┤
│ Infrastructure & IPC Boundary (Tauri IPC Invocation Bridge) │
│  - invoke('save_note'), invoke('search_fts'), etc.          │
├─────────────────────────────────────────────────────────────┤
│ Native Core (Rust 2021 Stable)                              │
│  - Atomic File I/O (tmp -> fsync -> rename)                 │
│  - SQLite 3 with FTS5 virtual tables (index.db cache)       │
│  - Asset file management, export pipelines, OS shell guard  │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Key Architectural Decisions (Immutable Baselines)
Refer to [general/DECISIONS/](file:///e:/workspace/chronote/general/DECISIONS/) for full rationales:
1. **Shell & Native Backend:** Tauri 2.x stable with Rust. Memory budget: < 90 MB idle, cold boot: < 800 ms ([ADR-001](file:///e:/workspace/chronote/general/DECISIONS/ADR-001-desktop-framework.md)).
2. **Canonical Document Model:** Tiptap 3.x / ProseMirror structured JSON tree. **NOT raw Markdown**. Markdown is strictly an import/export interchange format ([ADR-002](file:///e:/workspace/chronote/general/DECISIONS/ADR-002-document-model.md)).
3. **Storage Model:** Workspace directory with human-readable JSON files (`notes/dsm.json`, `notes/{id}.json`), static binary assets (`assets/images/`, `assets/files/`), and a disposable, fully rebuildable SQLite index database (`.chronote/index.db`) ([ADR-003](file:///e:/workspace/chronote/general/DECISIONS/ADR-003-storage-model.md)).
4. **Search Engine:** Embedded SQLite FTS5 running in the Rust native core with trigram support for code tokens ([ADR-004](file:///e:/workspace/chronote/general/DECISIONS/ADR-004-search.md)).
5. **Cloud & Sync:** 100% offline local-first in Phase 1. Users can sync the workspace folder via OneDrive/Dropbox/Syncthing/Git at their own risk. Zero proprietary server infrastructure ([ADR-005](file:///e:/workspace/chronote/general/DECISIONS/ADR-005-cloud-strategy.md)).
6. **DSM Model:** One continuous logical journal composed of independently addressable date entry domain objects (`YYYY-MM-DD`). **NEVER one file per day** ([ADR-006](file:///e:/workspace/chronote/general/DECISIONS/ADR-006-dsm-model.md)).
7. **Export Pipeline:** Isolated converter adapters transforming canonical ProseMirror JSON into Markdown, DOCX, PDF, and ZIP backups ([ADR-007](file:///e:/workspace/chronote/general/DECISIONS/ADR-007-export-strategy.md)).
8. **AI Policy:** Explicitly excluded from Phase 1 core. Zero cloud model calls, zero embeddings, zero vector databases ([ADR-008](file:///e:/workspace/chronote/general/DECISIONS/ADR-008-ai-policy.md)).

---

## 5. Non-Negotiable Engineering Rules
1. **No Business Logic in React Components:** UI components only render state and dispatch store actions. Domain logic lives in domain/application modules.
2. **Atomic Saves Only:** Never overwrite note files directly. Always write to a `.tmp` file, flush with `fsync`, and atomically rename.
3. **Source of Truth vs. Cache:** Note JSON files on disk are the authoritative source of truth. SQLite is a derived cache. The application must survive and seamlessly rebuild if `.chronote/index.db` is deleted.
4. **Dates are Structured Metadata:** Never parse dates from markdown headings (`# Sept 15`). Dates are first-class fields (`entry.date = "2026-09-15"`).
5. **IDs are Stable:** All links (`[[Note Title]]`) must resolve to stable unique IDs (ULID/UUID). Titles may change without breaking links.
6. **Zero External Network Calls:** The application must never emit telemetry, analytics, or require internet connectivity to perform note operations.
7. **Dependency Discipline:** Use `pnpm` (or npm). Choose boring, stable, production-ready packages. No alpha, nightly, or experimental dependencies without documented justification.

---

## 6. Document & Schema Versions
- `workspace.json` schema version: `1`
- `dsm.json` document schema version: `1`
- `notes/*.json` document schema version: `1`
- SQLite `PRAGMA user_version`: `1`

---

## 7. Critical File Locations (Once Implemented)
| Purpose | Location |
| :--- | :--- |
| **Specifications & ADRs** | `general/` and `general/DECISIONS/` |
| **Frontend Source** | `src/` |
| **UI Components** | `src/presentation/` |
| **Zustand State Stores** | `src/application/stores/` |
| **Domain Types & Rules** | `src/domain/` |
| **Editor Extensions (Tiptap)** | `src/presentation/editor/` |
| **Tauri IPC Client** | `src/infrastructure/tauri/` |
| **Rust Native Core** | `src-tauri/src/` |
| **SQLite & Storage Engine** | `src-tauri/src/storage/` |
| **Search Engine (FTS5)** | `src-tauri/src/search/` |

---

## 8. Current Work & Next Task
- **Current Work:** Version bumped to `v0.1.4`. Window-filling application zoom in/out (`Ctrl+=`, `Ctrl+-`, `Ctrl+0`, wheel, HUD overlay & header controls), resizable sidebars with interactive edge drag handles and double-click reset, Multi-Tag filtering in Sidebar & DSM timeline with `ALL`/`ANY` match mode toggles, and automated Table of Contents with live cursor context tracking across General Notes and DSM entries with exact ProseMirror cursor navigation upon click. 145 Vitest + 22 Rust tests passing.
- **Next Recommended Task:** Create git release tag `v0.1.4` and trigger GitHub Actions automated release pipeline. Proceed to Phase 3 (direct OAuth adapters for Google Drive and OneDrive, 3-way conflict resolution engine, interactive visual backlinks graph).

---

## 9. How to Update This Context File
When concluding an engineering session in Antigravity:
1. Update `Current Phase`, `Status`, and `Next Recommended Task`.
2. If new ADRs were accepted, add them to `Key Architectural Decisions`.
3. If schema versions bumped, record them under `Document & Schema Versions`.
4. Keep this file concise and high-signal (under 150 lines). Do NOT dump conversation logs or transient thoughts here.
