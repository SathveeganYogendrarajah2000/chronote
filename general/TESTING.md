# Chronote Testing Specification

## 1. Testing Philosophy & Test Pyramid

Chronote enforces a strict multi-tier testing strategy to ensure reliability, data safety, and performance. Because Chronote manages engineering work history, data loss or silent file corruption is unacceptable.

```
                  ┌──────────────────────┐
                  │  End-to-End Tests    │  Playwright (Desktop Shell)
                  │   (Smoke & Workflows)│  ~15 Scenarios
                  ├──────────────────────┴─────┐
                  │    Integration Tests       │  Vitest + Rust Integration
                  │  (Stores, Exporters, IPC)  │  ~150 Tests
                  ├────────────────────────────┴────────┐
                  │           Unit Tests                │  Vitest (TS) + Cargo Test (Rust)
                  │   (Domain, Validators, FTS, I/O)    │  ~500+ Tests
                  └─────────────────────────────────────┴─────────────────────────┘
```

---

## 2. Testing Frameworks & Tooling

| Layer | Framework / Runner | Primary Focus |
| :--- | :--- | :--- |
| **Frontend Unit & Domain** | `vitest` | Domain entities, Zod schemas, tag normalization, search AST parser |
| **Frontend Application Stores** | `vitest` | Zustand stores, dirty state tracking, debounce queues, tab management |
| **Editor Behavior** | `vitest` + `@tiptap/core` | Markdown input rules (`## ` -> H2), paste sanitization, internal link marks |
| **Exporters & Adapters** | `vitest` | Markdown serializer, DOCX generator, round-trip fidelity |
| **Rust Native Unit & I/O** | `cargo test` | Atomic writes, path traversal prevention, asset management |
| **Search Engine & SQLite** | `cargo test` | FTS5 indexing, trigram matching, query construction, index rebuild |
| **End-to-End Desktop Workflows** | `playwright` | Full Tauri desktop shell execution, window controls, UI interactions |

---

## 3. Core Test Scenarios & Verification Matrix

### 3.1 DSM Journal & Date Entries
- [x] **Entry Creation:** Creating a stand-up entry for today (`YYYY-MM-DD`) adds an item to `dsm.json` without creating new physical files.
- [x] **Existing Date Resolution:** Writing to an already existing date appends/focuses the existing entry rather than duplicating date entries.
- [x] **Collapsing & Derived Preview:** Collapsing an entry renders the auto-derived preview extracted from the first paragraph and hides the full ProseMirror canvas.
- [x] **Date Navigation:** Selecting a date from the calendar or sidebar scrolls the virtualized timeline directly to that date's DOM element.

### 3.2 Tags & Filtering
- [x] **Tag Normalization:** `#SpringBoot`, `springboot`, and `  #spring-boot  ` are normalized to `springboot` and `spring-boot`.
- [x] **Deduplication:** Adding an existing tag to an entry is an idempotent no-op.
- [x] **Tag Filtering:** Clicking `#aws` in the sidebar filters the DSM timeline to only show entries carrying the `#aws` tag.

### 3.3 Editor Markdown Shortcuts & Paste
- [x] **Heading Input Rules:** Typing `## Test Heading` transforms the node into an H2 and strips `## ` from text.
- [x] **Code Block Shortcut:** Typing ````ts + Enter opens a code block with `language="typescript"`.
- [x] **HTML Paste Sanitization:** Pasting malicious HTML with `<script>` tags or inline `onerror` attributes strips all executable scripts while preserving formatting.

### 3.4 Internal Links & Resilient Renaming
- [x] **Link Creation:** Typing `[[` triggers autocomplete; selecting a note inserts an `internalLink` mark with target `noteId`.
- [x] **Rename Resilience:** Renaming the target note updates its title in `workspace.json` / SQLite, but existing links with the immutable `noteId` remain intact and resolve correctly.
- [x] **Broken Link Handling:** Deleting a note causes incoming links to render with a broken-link indicator without throwing unhandled exceptions.

### 3.5 Storage, Autosave & Crash Recovery
- [x] **Atomic Save Verification:** Modifying a note writes to `.tmp`, calls `fsync`, and renames to the target path. Original file is never partially overwritten.
- [x] **Interrupted Save Recovery:** If a crash occurs while `.tmp` is being written, the original note file remains 100% intact and the application cleans up the orphaned `.tmp` on next boot.
- [x] **Index Rebuilding:** Deleting `.chronote/index.db` and launching Chronote triggers a complete, lossless reconstruction of the SQLite database from disk notes in under 350 ms.

### 3.6 Export Pipelines
- [x] **Markdown Export:** Exporting a DSM date range produces standard GitHub Flavored Markdown with clean headings, code blocks, and tag callouts.
- [x] **DOCX Export:** Exporting a General note produces a valid OpenXML `.docx` file containing embedded images and styled code tables.
- [x] **Zip Backup:** Exporting a workspace backup creates a valid zip archive containing all notes and assets (excluding `.chronote/index.db`). Unzipping and loading as a new workspace succeeds without error.

---

## 4. Running the Test Suites

### Frontend Tests (Unit, Store, Editor, Exporter)
```bash
# Run all unit and integration tests
pnpm test

# Run tests in watch mode during development
pnpm test:watch

# Generate code coverage report
pnpm test:coverage
```

### Rust Native Tests (Storage, SQLite, Search, IPC)
```bash
# Run all native unit and integration tests
cargo test --manifest-path src-tauri/Cargo.toml

# Run tests with output logging
cargo test --manifest-path src-tauri/Cargo.toml -- --nocapture
```

### End-to-End Desktop Tests (Playwright)
```bash
# Build desktop test binary and run Playwright suite
pnpm test:e2e
```
