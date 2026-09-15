# Chronote Open Questions & Technical Spikes

This document tracks technical uncertainties, potential edge cases, and proposed architectural spikes identified during Phase 0 design. These items do not block Phase 1 implementation but are recorded for future exploration and refinement.

---

## 1. Long-Term Multi-Year Scaling of `notes/dsm.json`

### The Question
`dsm.json` stores all Daily Stand-up entries in a single continuous document file. If an active engineer records detailed daily notes with code snippets over 5 years (approximately 1,250 working days):
- Estimated file size: 8 MB to 20 MB of formatted JSON.
- What is the JSON parsing and deserialization latency on low-end hardware upon opening the application?

### Current Mitigation & Spike Plan
- **Current Baseline:** Modern V8 and `serde_json` parse 15 MB of JSON in approximately 30–60 ms on modern CPUs, well within the 800 ms cold startup budget.
- **Spike (Phase 2):** If benchmarks indicate startup latency degradation past 1,000 entries, investigate a transparent **Yearly Journal Partitioning** scheme:
  - Active file: `notes/dsm.json` (current calendar year).
  - Archived files: `notes/dsm-2025.json`, `notes/dsm-2024.json`.
  - The UI and SQLite search engine present all years seamlessly as one continuous timeline, loading past years lazily upon scrolling.

---

## 2. Syntax Highlighting Engine: Lowlight vs. Shiki

### The Question
Code blocks are a first-class feature in Chronote. Two primary web highlighting engines exist:
1. **Lowlight (Highlight.js wrapper):** Extremely fast, tiny bundle footprint (~40 KB core), but uses regex-based heuristics that occasionally misidentify complex TypeScript or Spring annotations.
2. **Shiki:** Uses real TextMate grammars (identical to VS Code), producing perfect syntax highlighting, but requires WebAssembly (Wasm) and larger language grammar assets (~1–3 MB).

### Current Baseline & Spike Plan
- **Phase 1 Baseline:** Start with **Lowlight** for maximum startup speed and minimal memory footprint.
- **Spike:** Measure whether Shiki's Wasm initialization introduces measurable cold-start latency (> 50 ms) in WebView2. If negligible, evaluate migrating to Shiki for identical-to-VS-Code aesthetics.

---

## 3. Upstream Tiptap Markdown Extension Stability

### The Question
Tiptap's official `@tiptap/markdown` package is actively evolving. Direct coupling between core note state and this extension could introduce breaking changes during minor updates.

### Current Mitigation
- As mandated in [ADR-002](file:///e:/workspace/chronote/general/DECISIONS/ADR-002-document-model.md) and [ADR-007](file:///e:/workspace/chronote/general/DECISIONS/ADR-007-export-strategy.md), Chronote treats canonical document state strictly as ProseMirror JSON.
- All Markdown conversion is isolated behind an abstract `MarkdownExportAdapter`. If upstream Tiptap markdown packages change or prove brittle, the adapter can be swapped with a custom AST visitor without touching any other part of the application.

---

## 4. SQLite WAL Locking on Network Shares (NAS / SMB)

### The Question
SQLite Write-Ahead Logging (`PRAGMA journal_mode = WAL`) relies on OS shared-memory primitives (`index.db-shm`). Some network filesystems (SMB, NFS, and certain NAS implementations) do not properly support POSIX or Windows shared memory locks across network clients, leading to `SQLITE_IOERR` or file locks.

### Current Mitigation
- The `.chronote/` folder is designed to be machine-local.
- **Spike (Phase 2):** Add a workspace initialization check in Rust: detect if the workspace resides on a network share. If detected, place `.chronote/index.db` in the local user application cache directory (`%LOCALAPPDATA%\chronote\indexes\{workspace_hash}\`) while keeping `notes/` and `assets/` on the network share.

---

## 5. Conflict Resolution UI for External Sync Files

### The Question
When an external file synchronizer (Dropbox, OneDrive, Syncthing) detects conflicting edits to a note on two offline laptops, it generates conflict files (e.g. `not_01JC... (Conflicted Copy).json`). How should Chronote present this to the user?

### Proposed UX Spike (Phase 2)
1. The file scanner detects files matching `*.conflict*.json` or `*(Conflicted Copy)*.json`.
2. A subtle warning banner appears in the editor: *"Conflict detected from another device"*.
3. Clicking the banner opens a visual side-by-side Diff Viewer highlighting differing paragraphs and offering:
   - *Keep Local Version*
   - *Accept Remote Version*
   - *Merge Both Versions (append)*.
