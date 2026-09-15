# ADR-004: Search Architecture and Indexing Engine

## Status
Accepted

## Date
2026-09-16

## Context
Search is the defining capability of Chronote ("The fastest lightweight searchable engineering work journal"). 

Developers must be able to query across:
- DSM entries spanning multiple years.
- General technical notes.
- Code blocks filtered by language (`type:code lang:sql` or `type:code springboot`).
- Structured tags (`tag:backend tag:aws`).
- Date specifications (`date:2026-09-15`, `after:2026-09-01`, `before:2026-09-16`).
- Resource references (images, URLs, attached files).

Search results must return near-instantly (< 50 ms) with highlighted text snippets, matched tags, and exact navigation targets (jumping straight to the specific DSM entry or code block).

## Problem
What technology and architecture should power Chronote's search engine to guarantee sub-50 ms queries across tens of thousands of entries without inflating memory consumption or requiring external background daemons?

## Decision Drivers
1. **Latency**: Sub-50 ms execution time for full-text search across large workspaces (10,000+ entries).
2. **Resource Footprint**: Zero external background services (no Elasticsearch, Meilisearch daemon, or Java JVM). Minimal RAM overhead.
3. **Rich Query DSL**: Support for boolean logic, prefix matching, date ranges, tag filters, and block type filters.
4. **Ranking & Snippets**: BM25 relevance ranking with highlighted match snippets.
5. **Offline & Embedded**: Must run entirely in-process on the local machine.

## Considered Alternatives

### 1. In-Memory Frontend Client Search (FlexSearch / Lunr.js in Webview)
* **Pros**:
  - Runs in JavaScript without IPC serialization.
* **Cons**:
  - Requires loading the entire text of every note and DSM entry into frontend V8 JavaScript heap on startup.
  - Explodes frontend RAM usage by 100–300 MB on large workspaces.
  - High garbage collection pressure during indexing.
  - Cold start indexing causes UI stutter.

### 2. Standalone Native Search Daemon (Meilisearch / Tantivy binary daemon)
* **Pros**:
  - Meilisearch provides world-class typo tolerance and tokenization.
  - Tantivy is an ultra-fast Rust Lucene clone.
* **Cons**:
  - Running a background daemon contradicts the lightweight requirement ("no background service").
  - Packaging and managing lifetime of a separate search daemon inside a desktop installer creates OS port conflicts and process leak risks.
  - Tantivy embedded index management adds binary weight and index complexity when SQLite is already present.

### 3. Embedded SQLite with FTS5 (Full-Text Search 5)
* **Pros**:
  - **Embedded & Zero Overhead**: Included in modern SQLite builds (`rusqlite` with `bundled` feature and FTS5). Runs in-process within the native Rust backend.
  - **Blazing Speed**: FTS5 queries execute in 2–15 ms for 50,000 documents using inverted index B-trees.
  - **Integrated Relational Querying**: Allows single-query joins between full-text matches, structured tags (`note_tags`), date ranges (`entry_date BETWEEN ? AND ?`), and block types (`block_type = 'code'`).
  - **Native Snippet & Highlight Functions**: Built-in `snippet()` and `highlight()` helper functions produce contextual excerpts out of the box.
  - **BM25 Ranking**: Native support for BM25 ranking algorithms with column weighting.
  - **Trigram Tokenizer Support**: Allows substring search within code snippets (e.g. searching for `getAuthToken` or regex-like terms).
* **Cons**:
  - Lacks out-of-the-box phonetic typo tolerance (e.g., Levenshtein distance), though prefix matching (`spring*`) and trigram indexing solve developer search needs effectively.

## Decision
We choose **SQLite FTS5 embedded in the Rust native backend** as Chronote's search engine.

Search queries will be parsed by a lightweight query parser in Rust, executed against SQLite FTS5 virtual tables and relational metadata tables, and returned to the frontend via Tauri IPC.

## FTS5 Schema Architecture
```sql
-- Main virtual table for full-text search
CREATE VIRTUAL TABLE fts_blocks USING fts5(
    block_id UNINDEXED,
    document_id UNINDEXED,
    document_type UNINDEXED, -- 'dsm' or 'general'
    entry_id UNINDEXED,      -- NULL for general notes, date entry ID for DSM
    entry_date,              -- YYYY-MM-DD for date filtering
    block_type,              -- 'paragraph', 'heading', 'code', 'list_item', 'blockquote'
    language,                -- 'java', 'sql', 'python', etc. (for code blocks)
    tags,                    -- Space-delimited normalized tags: "springboot backend aws"
    content,                 -- Plain text content of the block
    tokenize = 'unicode61 remove_diacritics 2'
);

-- Trigram index for exact code and token matching
CREATE VIRTUAL TABLE fts_code_trigram USING fts5(
    block_id UNINDEXED,
    language UNINDEXED,
    code_content,
    tokenize = 'trigram'
);
```

## Consequences

### Positive
- Sub-20 ms search response times across 100,000 blocks.
- Zero memory bloat in the frontend webview.
- Complex filter combinations (`tag:springboot type:code after:2026-09-01`) resolve in a single SQL statement.
- Index lives in `.chronote/index.db` and is 100% rebuildable from disk notes.

### Negative / Trade-offs
- Searches must bridge the Tauri IPC boundary (typically < 1 ms overhead for JSON-serialized result lists).
- Advanced typo tolerance is limited compared to dedicated NLP search engines, which is acceptable and often preferred for developer code/tag search where exact token matching is desired.

## Reversibility
Medium. Since SQLite is non-authoritative and completely derived from `notes/*.json`, the indexing engine could theoretically be swapped in Rust (e.g. to embedded Tantivy) without changing any user data on disk.
