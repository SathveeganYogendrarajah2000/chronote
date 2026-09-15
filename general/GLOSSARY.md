# Chronote Glossary of Terms

This glossary establishes the unambiguous, canonical terminology for the Chronote project. Developers and AI coding agents must use these terms consistently across documentation, code identifiers, database columns, and user interfaces.

---

### Workspace
The root folder on the user's local filesystem containing all notes (`notes/`), binary assets (`assets/`), configuration (`workspace.json`), and the local SQLite index cache (`.chronote/index.db`).

### Daily Stand-up (DSM)
The core engineering journal workflow. In Chronote, the DSM is represented as **one logical document** containing many chronological calendar entries.

### DSM Entry (`DsmEntry`)
A discrete, first-class domain object representing an individual calendar day's stand-up record within the master DSM document. Each entry has an immutable ID (`ent_...`), a strict ISO date (`YYYY-MM-DD`), its own tags, collapse state, and its own rich-text block tree.

### General Note (`GeneralNote`)
A standalone, title-based knowledge note (e.g. "Spring Security Setup", "PostgreSQL Query Optimization") stored in an independent JSON document (`notes/not_...json`).

### Canonical Document Model
The structured JSON tree representation (based on ProseMirror / Tiptap) that serves as the internal authoritative representation of note content. Raw Markdown is **not** the canonical format.

### Content Block (`Block`)
A semantic node within the canonical document tree, such as a paragraph, heading, code block, list item, blockquote, or table. Every block is assigned a stable unique ID (`blk_...`) for search highlighting and deep navigation.

### Code Block
A first-class structured content block specifically configured for programming language source code. Features an explicit language attribute, line numbers, syntax highlighting, a copy button, and indexing in the Resource Browser.

### Tag / Normalized Tag
A structured categorization label. Tags are stripped of leading `#` characters and normalized to lowercase alphanumeric characters with hyphens/underscores (`^[a-z0-9_\-]+$`). Tags belong directly to specific DSM entries or General notes.

### Internal Link (`[[Note Title]]`)
A cross-reference pointing from one note or DSM entry to another note. While authored using wiki-style brackets, the internal link stores the target's immutable unique ID (`noteId`) so that renaming the destination note never breaks the link.

### Backlink
An incoming reference showing all documents or DSM entries that link to the currently active note.

### Asset
A binary file (image, screenshot, diagram, attached PDF) stored within the workspace's `assets/images/` or `assets/files/` directories, referenced by an immutable asset ID (`img_...` or `att_...`).

### Resource Browser
An indexed sidebar view inspired by media tabs in modern communication tools, categorizing all Code Blocks, Images, Links, Attachments, and Backlinks across the workspace with instant navigation.

### Atomic Save
A filesystem persistence technique where data is first written to a temporary file (`.tmp`), flushed to disk via `fsync`, and then atomically swapped into place via OS directory rename operations. This guarantees zero file corruption during power cuts or crashes.

### Disposable Index Cache
The embedded SQLite database (`.chronote/index.db`) containing FTS5 search tables, tag catalogs, and backlink graphs. It is derived entirely from the authoritative JSON notes and can be safely deleted and reconstructed from disk files at any time.

### Local-First
An architectural paradigm ensuring that the software functions 100% offline, stores data on the user's local disk, requires no mandatory cloud accounts or external servers, and grants the user absolute data sovereignty.
