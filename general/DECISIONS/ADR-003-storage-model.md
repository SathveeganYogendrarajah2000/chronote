# ADR-003: Physical Storage Model and Workspace Architecture

## Status
Accepted

## Date
2026-09-16

## Context
Chronote is a local-first application where user data ownership, backup resilience, human recoverability, and corruption resistance are paramount. 

The application must persist:
- A continuous DSM journal containing hundreds of date entries over months or years.
- Standalone General notes with titles, tags, and cross-references.
- Binary assets (screenshots, diagrams, PDF attachments).
- Relational metadata, tags, backlinks, and a high-performance full-text search index.

The format must not lock the user into an opaque proprietary blob. If Chronote ceases to exist or the application database corrupts, the user must be able to open their files in any standard text editor or script and recover 100% of their notes and images.

## Problem
What is the optimal on-disk storage architecture for a Chronote workspace that balances human recoverability, atomic write safety, multi-file sync compatibility, and search performance?

## Decision Drivers
1. **User Data Ownership & Recoverability**: Files must be plain, human-inspectable text/JSON rather than opaque proprietary binary blobs.
2. **Atomic Write Safety**: Power cuts or crashes during saving must never corrupt previously saved notes.
3. **Sync & Backup Friendliness**: The workspace must be safely backupable via standard file tools (ZIP, Git, OneDrive, Dropbox, Syncthing) without locking issues.
4. **Binary Asset Handling**: Prevent database bloat caused by storing multimegabyte images directly in relational tables.
5. **Index Rebuildability**: SQLite must act as an index and relational cache that can be completely reconstructed from authoritative files on disk at any time.

## Considered Alternatives

### 1. Monolithic SQLite File (All-in-One Database)
* **Pros**:
  - Single file distribution; ACID transactions out of the box.
* **Cons**:
  - **Zero Human Recoverability**: An engineer cannot open the workspace in VS Code or Notepad to read their notes without SQLite tools.
  - **Catastrophic Failure Risk**: Single-byte corruption or interrupted write in SQLite header can lock the user out of all notes simultaneously.
  - **Terrible Cloud Sync Experience**: Every small keystroke edits the monolithic `.sqlite` file, causing massive sync thrashing, sync conflicts, and multi-gigabyte bandwidth waste in Dropbox/Google Drive.
  - **Git Hostility**: Cannot meaningfully version-control a binary SQLite database in Git.

### 2. Flat Markdown Directory (One `.md` file per day / note)
* **Pros**:
  - High human readability.
* **Cons**:
  - Contradicts the DSM design mandate: forcing one Markdown file per day shatters the continuous journal concept into thousands of tiny files.
  - Fragile metadata persistence: storing block IDs, collapsed states, and asset linkages requires custom frontmatter or comment tags.
  - Heavy parsing overhead on application startup.

### 3. Directory-Based Workspace with Structured JSON and Rebuildable SQLite Index
* **Pros**:
  - **Authoritative Files are Transparent JSON**: Every note (`notes/dsm.json`, `notes/{id}.json`) is an indented UTF-8 JSON file containing document metadata and ProseMirror content trees.
  - **External Binary Assets**: Images and files reside in `assets/images/` and `assets/files/` with content-addressable or ULID filenames.
  - **Decoupled Relational Index (`.chronote/index.db`)**: SQLite handles fast queries (FTS5 search, tags, backlinks, recents) but is strictly disposable. If deleted or corrupted, the Rust engine automatically scans `notes/` and reconstructs the database in seconds.
  - **Atomic Save Pipeline**: Saves write to a temporary file (`.tmp`), flush to disk (`fsync`), and perform an atomic filesystem rename over the target file.
  - **Cloud Sync & Git Friendly**: Each General note is an independent file; the DSM is a single document file; assets are immutable static files.
* **Cons**:
  - Multi-file directory requires managing workspace folder boundaries.

## Decision
We choose the **Directory-Based Workspace Architecture with Structured JSON Files, Discrete Asset Directories, and a Rebuildable SQLite Index**.

### Workspace Filesystem Layout
```
my-engineering-workspace/
├── workspace.json                  # Workspace metadata (schema version, name, created_at)
├── notes/
│   ├── dsm.json                    # Single logical DSM journal document with date entries
│   ├── note_01JC8...json           # Standalone General note
│   └── note_01JC9...json           # Standalone General note
├── assets/
│   ├── images/
│   │   ├── img_01JC...png          # Screenshots & pasted images
│   │   └── img_01JD...jpg
│   └── files/
│       └── att_01JE...pdf          # Attached specifications or data files
└── .chronote/                      # Application cache directory (git-ignorable)
    └── index.db                    # SQLite database (FTS5 index, tag map, backlink graph)
```

## Data Authority Model
- **Source of Truth (Authoritative)**: `workspace.json`, `notes/*.json`, and `assets/*`.
- **Derived Cache (Non-authoritative)**: `.chronote/index.db`.
- **Disaster Recovery**: If `.chronote/index.db` is missing, corrupt, or has an outdated schema version, Chronote automatically triggers `rebuild_index_from_disk()`.

## Atomic Write Protocol
1. Frontend debounces user keystrokes (800 ms) and invokes Tauri IPC `save_note(note_payload)`.
2. Rust backend serializes payload to formatted JSON.
3. Rust creates a temporary file: `notes/{id}.json.tmp.{process_id}`.
4. Payload is written and synced to disk via `std::fs::File::sync_all()`.
5. Atomic rename replaces `notes/{id}.json` using OS atomic rename operations (`std::fs::rename`).
6. Rust updates the corresponding rows in `.chronote/index.db`.

## Consequences

### Positive
- Absolute data safety: interrupted writes leave the original note completely untouched.
- Full human recoverability: JSON files can be inspected and parsed by standard tools (`jq`, Python scripts, text editors).
- Cloud-sync friendly: only modified notes change timestamp; immutable assets are uploaded once.
- SQLite acts as an ultra-fast query accelerator without putting user data at risk of database corruption.

### Negative / Trade-offs
- The DSM journal is stored in a single document file (`notes/dsm.json`), which will grow over years (e.g. 5–15 MB after 5 years). Handled via lazy entry parsing and virtualized scrolling in the UI.

## Reversibility
Medium. Changing how files are structured on disk would require a one-time migration script that moves files between workspace directories.
