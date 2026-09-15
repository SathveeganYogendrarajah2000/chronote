# ADR-005: Cloud Strategy, Synchronization, and Conflict Philosophy

## Status
Accepted

## Date
2026-09-16

## Context
Chronote is designed as a **local-first** desktop engineering notebook. 

Many software applications attempt to build proprietary cloud backends early in their lifecycle (e.g. Firebase, Supabase, custom AWS microservices), which introduces:
- Mandatory server hosting and operational costs.
- User account and authentication friction.
- Privacy and compliance concerns for proprietary corporate engineering notes.
- Severe operational failure risks if the backend is deprecated or goes down.
- Heavy complexity around multi-master offline synchronization protocols (CRDTs, OT).

However, users naturally desire access to their notes across multiple workstations (e.g. work laptop and home desktop). They frequently place local workspace directories inside standard consumer or enterprise file synchronizers:
- Google Drive
- Microsoft OneDrive
- Dropbox
- Syncthing
- Git repositories
- Network Attached Storage (NAS)

## Problem
What is Chronote's cloud and synchronization strategy for Phase 1 and beyond, and how should multi-device synchronization and write conflicts be addressed without violating the zero-cost, local-first mandate?

## Decision Drivers
1. **Zero Operational Cost**: The project must not require paid cloud infrastructure, hosting, or external database tiers.
2. **Strict Privacy**: Engineering notes often contain sensitive architectural discussions, internal endpoints, and credentials that must never leak to unvetted cloud backends.
3. **Local Sovereignty**: The application must function 100% offline indefinitely.
4. **Third-Party File Sync Compatibility**: Minimize file-locking conflicts when the workspace resides in OneDrive, Dropbox, or Syncthing.
5. **Architectural Honesty Regarding Conflicts**: Transparently document the failure modes of naive filesystem synchronization and map out the evolutionary path to multi-device convergence.

## Considered Alternatives

### 1. Chronote-Hosted Cloud Backend (Phase 1)
* **Pros**:
  - Proprietary end-to-end sync control.
* **Cons**:
  - Violates zero-cost development rule.
  - Requires maintaining auth, servers, databases, security compliance, backups.
  - Contradicts local-first offline ethos.

### 2. Built-in WebRTC / P2P CRDT Sync (Phase 1)
* **Pros**:
  - Real-time peer-to-peer syncing without central servers (e.g. Yjs / Automerge).
* **Cons**:
  - Massive complexity: requires discovery signaling servers, STUN/TURN infrastructure, complex binary CRDT document persistence, and tombstone compaction.
  - Premature optimization for a Phase 1 MVP focused on individual developer note-taking.

### 3. Local-First Directory Storage with Sync-Tool Tolerance (Phase 1 Decision)
* **Pros**:
  - **Zero Cost**: Relies on file sync utilities users already possess (Syncthing, OneDrive, Git, Dropbox).
  - **Transparent Scope**: Chronote does not pretend to be a real-time collaborative multi-user Google Docs.
  - **Discreet File Boundaries**: Because General notes are individual files and assets are static, sync engines only transmit changed notes.
  - **Index Isolation**: The `.chronote/` cache directory contains host-specific SQLite locks and is flagged with ignore markers (`.stignore`, `.gitignore`, OneDrive ignore) so external sync engines do not lock the active SQLite database.
* **Cons**:
  - Simultaneous writes across two devices can cause file-level sync conflicts (e.g. Dropbox creating `dsm (Conflicted Copy 2026-09-16).json`).

## Decision

### Phase 1 Rule
**No Chronote-owned or third-party cloud backend will be built in Phase 1.** Chronote operates purely as a local-first desktop application.

Users may place their workspace folder inside standard file synchronization tools (Dropbox, OneDrive, Google Drive, Syncthing, Git) at their own discretion.

### Conflict Prevention & Detection Strategy (Phase 1 & Future)
1. **Non-Authoritative Index**: The `.chronote/` database directory is strictly machine-local. It must never be synced. The workspace initialization generates `.gitignore` and `.stignore` files by default.
2. **Monotonic Document Metadata**: Every note and DSM document carries a `revision` counter, an `updated_at` UTC timestamp, and a `last_modified_by_device_id` string.
3. **External Change Detection**: The Rust backend utilizes the `notify` crate to watch the `notes/` directory for external changes:
   - When an external sync tool writes an updated version of a note while the note is *unopened*, Chronote silently re-indexes it in SQLite.
   - If an open note is modified externally while the user has *unsaved in-memory edits*, Chronote detects the revision mismatch and prompts the user with a side-by-side Diff / Conflict Resolution Dialog rather than silently clobbering either version.
4. **Sync Conflict File Absorption**: Third-party sync tools create conflict files (e.g. `dsm.conflict-xyz.json`). Chronote's scanner detects these files, flags them in the UI with a warning badge, and provides a "Merge Entries" wizard.

## Future Evolution (Phase 3+)
Direct integration with cloud storage APIs (Google Drive, Microsoft Graph) via user-provided OAuth tokens, utilizing a deterministic 3-way merge on the structured ProseMirror JSON tree.

## Consequences

### Positive
- Zero cloud hosting bills, zero user authentication code, zero backend vulnerabilities.
- Total privacy for enterprise software engineers.
- Clean separation between storage files (`notes/*.json`) and host-local runtime locks (`.chronote/index.db`).

### Negative / Trade-offs
- Users who edit the same note simultaneously on two offline laptops will encounter conflict resolution dialogues handled by their external file sync or Chronote's conflict detector.

## Reversibility
High. Because documents are structured JSON, future sync adapters (e.g. Automerge or WebDAV) can operate over the existing document entities without breaking the storage model.
