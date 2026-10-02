# Chronote Storage Format Specification

## 1. Physical Workspace Layout

Chronote workspaces are organized as human-readable, backup-friendly filesystem directories. Every note is stored in transparent, formatted UTF-8 JSON.

```
my-engineering-workspace/
├── workspace.json                  # Root workspace descriptor & configuration
├── .gitignore                      # Git ignore file (auto-generated)
├── .stignore                       # Syncthing ignore file (auto-generated)
├── notes/
│   ├── dsm.json                    # Single logical DSM document containing date entries
│   ├── courses.json                # Single logical Courses & Topics learning tracker document
│   ├── not_01JC87XK89.json         # General note
│   └── not_01JC87Y11Z.json         # General note
├── assets/
│   ├── images/
│   │   ├── img_01JC87Z1AA.png      # Embedded screenshots & diagrams
│   │   └── img_01JC87Z2BB.jpg
│   └── files/
│       └── att_01JC8803BB.pdf      # Attached documents or specifications
└── .chronote/                      # Machine-local cache directory (non-authoritative)
    ├── index.db                    # SQLite index & FTS5 database (disposable/rebuildable)
    ├── index.db-shm                # SQLite WAL shared-memory file
    └── index.db-wal                # SQLite Write-Ahead Log
```

---

## 2. Document File Formats & Schemas

### 2.1 `workspace.json`
Defines root workspace identity and preferences.
```json
{
  "id": "wsp_01JC87V1M4P9X78Q2W1A",
  "schemaVersion": 1,
  "name": "Acme Engineering Notes",
  "createdAt": "2026-09-15T08:30:00.000Z",
  "updatedAt": "2026-09-16T10:15:00.000Z",
  "settings": {
    "editorFontSize": 15,
    "editorLineHeight": 1.6,
    "theme": "dark",
    "dsmSortOrder": "desc",
    "autosaveIntervalMs": 800
  }
}
```

### 2.2 `notes/dsm.json`
Stores the continuous Daily Stand-up Journal. Each calendar day is an independent domain entry.
```json
{
  "id": "dsm_master",
  "schemaVersion": 1,
  "title": "Daily Stand-up Journal",
  "createdAt": "2026-09-01T00:00:00.000Z",
  "updatedAt": "2026-09-16T09:30:00.000Z",
  "entries": [
    {
      "id": "ent_01JC87W9E30000000000",
      "date": "2026-09-16",
      "tags": ["springboot", "jwt", "backend"],
      "collapsed": false,
      "createdAt": "2026-09-16T08:45:00.000Z",
      "updatedAt": "2026-09-16T09:30:00.000Z",
      "content": {
        "type": "doc",
        "content": [
          {
            "type": "heading",
            "attrs": { "id": "blk_01JC87Y1", "level": 2 },
            "content": [{ "type": "text", "text": "Investigating Auth Token Expiry" }]
          },
          {
            "type": "paragraph",
            "attrs": { "id": "blk_01JC87Y2" },
            "content": [
              { "type": "text", "text": "Completed token refresh logic. Testing with " },
              {
                "type": "text",
                "text": "Spring Security Config",
                "marks": [{ "type": "internalLink", "attrs": { "noteId": "not_01JC87XK89" } }]
              }
            ]
          },
          {
            "type": "codeBlock",
            "attrs": { "id": "blk_01JC87Y3", "language": "java" },
            "content": [
              { "type": "text", "text": "@Bean\npublic SecurityFilterChain filterChain(HttpSecurity http) throws Exception {\n  return http.build();\n}" }
            ]
          }
        ]
      }
    },
    {
      "id": "ent_01JC87W9E31111111111",
      "date": "2026-09-15",
      "tags": ["aws", "monitoring"],
      "collapsed": true,
      "createdAt": "2026-09-15T08:30:00.000Z",
      "updatedAt": "2026-09-15T17:00:00.000Z",
      "content": {
        "type": "doc",
        "content": [
          {
            "type": "paragraph",
            "attrs": { "id": "blk_01JC87Y4" },
            "content": [{ "type": "text", "text": "Set up CloudWatch alarms for ECS memory limits." }]
          }
        ]
      }
    }
  ]
}
```

### 2.3 `notes/{noteId}.json` (General Note)
Stores standalone general engineering notes.
```json
{
  "id": "not_01JC87XK89",
  "schemaVersion": 1,
  "title": "Spring Security Config Reference",
  "tags": ["springboot", "java", "security"],
  "pinned": true,
  "createdAt": "2026-09-10T14:20:00.000Z",
  "updatedAt": "2026-09-16T09:15:00.000Z",
  "content": {
    "type": "doc",
    "content": [
      {
        "type": "paragraph",
        "attrs": { "id": "blk_01JC8810" },
        "content": [{ "type": "text", "text": "Core configuration patterns for JWT validation." }]
      },
      {
        "type": "image",
        "attrs": {
          "id": "blk_01JC8811",
          "assetId": "img_01JC87Z1AA",
          "src": "chronote-asset://assets/images/img_01JC87Z1AA.png",
          "alt": "Auth Architecture Diagram"
        }
      }
    ]
  }
}
```

### 2.4 `notes/courses.json`
Stores the continuous Courses & Topics learning journal. Contains hierarchical topics and attached learning resources.
```json
{
  "id": "courses_master",
  "schemaVersion": 1,
  "title": "Courses & Topics",
  "createdAt": "2026-10-02T10:00:00.000Z",
  "updatedAt": "2026-10-02T16:00:00.000Z",
  "topics": [
    {
      "id": "top_01JC8814CC",
      "parentId": null,
      "title": "Distributed Systems",
      "description": "Consensus, storage engines, and network protocols",
      "tags": ["systems", "architecture"],
      "createdAt": "2026-10-02T10:00:00.000Z",
      "updatedAt": "2026-10-02T10:00:00.000Z"
    },
    {
      "id": "top_01JC8815DD",
      "parentId": "top_01JC8814CC",
      "title": "Consensus Algorithms",
      "description": "Paxos, Raft, Viewstamped Replication",
      "tags": ["consensus", "raft"],
      "createdAt": "2026-10-02T10:05:00.000Z",
      "updatedAt": "2026-10-02T10:05:00.000Z"
    }
  ],
  "resources": [
    {
      "id": "crs_01JC8825EE",
      "topicId": "top_01JC8815DD",
      "title": "Raft Consensus Algorithm Explained",
      "platform": "youtube",
      "url": "https://www.youtube.com/watch?v=vYp4LYbnnW8",
      "author": "Heidi Howard",
      "status": "in_progress",
      "progress": 60,
      "completedItems": 3,
      "totalItems": 5,
      "rating": 5,
      "tags": ["raft", "youtube"],
      "notes": "Key concept: randomized election timeouts prevent split votes.",
      "createdAt": "2026-10-02T10:15:00.000Z",
      "updatedAt": "2026-10-02T11:00:00.000Z"
    }
  ]
}
```

---

## 3. Atomic Write Algorithm (Data Safety)

To prevent file truncation, half-written notes, or corruption during system crashes or power failures:

```
[In-Memory JSON]
       │
       ▼
1. Write to Temp File: `notes/{id}.json.tmp.{process_id}_{timestamp}`
       │
       ▼
2. Flush to Physical Medium: `std::fs::File::sync_all()`
       │
       ▼
3. Atomic Rename: `std::fs::rename(temp_path, target_path)`
       │
       ▼
[Target File Replaced Atomically]
```

### Technical Details (Rust Core)
- **Temporary Filename:** `notes/{filename}.tmp.{pid}_{counter}`
- **Fsync Guarantee:** `File::sync_all(&file)` forces all dirty kernel cache buffers to the physical disk before rename.
- **Atomic Rename:** On Windows (NTFS / ReFS) and Linux (ext4 / XFS / btrfs), renaming within the same filesystem volume is an atomic directory entry swap. The target file is either fully updated or left in its previous valid state.
- **Orphan Cleanup:** On application startup, the Rust backend sweeps the `notes/` directory and deletes any abandoned `.tmp.*` files older than 5 minutes.

---

## 4. SQLite Index Role and Rebuild Strategy

The SQLite database at `.chronote/index.db` is **strictly non-authoritative**. It functions solely as an indexing and query acceleration cache.

### Relational Schema
```sql
-- Schema version tracking
PRAGMA user_version = 1;

-- Document catalog
CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,          -- 'dsm' or 'general'
    title TEXT NOT NULL,
    file_path TEXT NOT NULL,
    schema_version INTEGER NOT NULL,
    pinned INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- DSM entries lookup
CREATE TABLE dsm_entries (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    entry_date TEXT NOT NULL,     -- YYYY-MM-DD
    collapsed INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
);

-- Normalized tags index
CREATE TABLE tags (
    tag TEXT NOT NULL,
    document_id TEXT NOT NULL,
    entry_id TEXT,               -- NULL for general notes; entry ID for DSM
    PRIMARY KEY(tag, document_id, entry_id)
);

-- Backlinks graph
CREATE TABLE backlinks (
    source_document_id TEXT NOT NULL,
    source_entry_id TEXT,
    target_note_id TEXT NOT NULL,
    PRIMARY KEY(source_document_id, source_entry_id, target_note_id)
);

-- Resource references catalog
CREATE TABLE resources (
    id TEXT PRIMARY KEY,
    resource_type TEXT NOT NULL,  -- 'code', 'image', 'link', 'attachment'
    parent_document_id TEXT NOT NULL,
    entry_id TEXT,
    block_id TEXT NOT NULL,
    title TEXT NOT NULL,
    language TEXT,
    target_url TEXT,
    asset_id TEXT
);
```

### Full-Text Search (FTS5) Tables
```sql
CREATE VIRTUAL TABLE fts_blocks USING fts5(
    block_id UNINDEXED,
    document_id UNINDEXED,
    document_type UNINDEXED,
    entry_id UNINDEXED,
    entry_date,
    block_type,
    language,
    tags,
    content,
    tokenize = 'unicode61 remove_diacritics 2'
);
```

### Index Rebuild Procedure
If `.chronote/index.db` is deleted, corrupted, or reports an outdated `PRAGMA user_version`:
1. Chronote re-creates a clean SQLite database and applies current migrations.
2. The Rust scanner reads `workspace.json`, `notes/dsm.json`, and all `notes/*.json`.
3. Every document is parsed; rows are inserted into `documents`, `dsm_entries`, `tags`, `backlinks`, `resources`, and `fts_blocks` inside a single high-speed transaction.
4. For a typical engineering workspace with 5,000 entries, total rebuild time is **under 350 milliseconds**.

---

## 5. Cloud Sync & External File Locking Protections

When users place their workspace in Dropbox, OneDrive, Google Drive, or Syncthing:
- The `.chronote/` folder is automatically excluded via `.gitignore` and `.stignore` generated on workspace creation. This prevents SQLite lock contention (`SQLITE_BUSY` or `database is locked`) with background cloud sync daemons.
- The `notes/` directory is monitored via the `notify` Rust crate. If an external sync updates a note, Chronote re-indexes it in SQLite without blocking the UI.
