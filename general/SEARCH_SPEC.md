# Chronote Search Specification

## 1. Search Objectives & Philosophy

Search is Chronote's defining capability. Because software engineers maintain months or years of dense technical history, search must operate with **instant responsiveness (< 50 ms)**, zero index bloat, and predictable precision.

Engineers search for:
- Exact code tokens (e.g. `SecurityFilterChain`, `db.orders.aggregate`, `aws ecs update-service`).
- Topic tags (e.g. `tag:springboot`, `tag:mongodb`, `tag:incident`).
- Calendar stand-up notes by date or date range (e.g. `date:2026-09-15`, `after:2026-09-01`).
- Specific media and block types (e.g. `type:code lang:sql`, `type:image`).

---

## 2. Query Grammar and Filter DSL

Chronote provides a unified search bar supporting both natural full-text keywords and structured filter predicates.

### 2.1 Supported Filters

| Filter Token | Example | Description |
| :--- | :--- | :--- |
| `tag:<tag>` | `tag:springboot` | Matches blocks in notes or DSM entries tagged with `<tag>`. Multiple tags are evaluated as boolean `AND`. |
| `type:<code>` | `type:code` | Restricts results to code blocks. |
| `type:<image>` | `type:image` | Restricts results to image captions or embedded media. |
| `type:<dsm>` | `type:dsm` | Restricts results to Daily Stand-up entries only. |
| `type:<note>` | `type:note` | Restricts results to General notes only. |
| `lang:<language>`| `lang:python` | Filters code blocks by language identifier. |
| `date:<YYYY-MM-DD>`| `date:2026-09-15` | Matches DSM entry for exact date. |
| `after:<YYYY-MM-DD>`| `after:2026-09-01` | Matches entries created on or after date. |
| `before:<YYYY-MM-DD>`| `before:2026-09-16` | Matches entries created on or before date. |
| `"exact phrase"` | `"NullPointerException"` | Exact phrase matching. |
| `prefix*` | `spring*` | Prefix token matching. |

### 2.2 Example Compound Queries
- `tag:springboot type:code authentication`  
  Finds code blocks containing "authentication" within notes or DSM entries tagged `#springboot`.
- `after:2026-09-01 before:2026-09-15 tag:incident`  
  Finds all incident logs recorded during the first half of September.
- `lang:sql "INNER JOIN"`  
  Finds all SQL code snippets performing inner joins.

---

## 3. Query Parsing & AST Generation

The search bar input is parsed in pure TypeScript/Rust into a structured AST:

```typescript
interface SearchQueryAst {
  rawQuery: string;
  textTokens: string[];           // Free-text search words: ["auth", "token"]
  exactPhrases: string[];         // Quoted phrases: ["NullPointerException"]
  tags: string[];                 // ["springboot", "backend"]
  blockTypes: string[];           // ["code"]
  languages: string[];            // ["java"]
  exactDate?: string;             // "2026-09-15"
  afterDate?: string;             // "2026-09-01"
  beforeDate?: string;            // "2026-09-16"
}
```

### Parsing Pipeline
1. Tokenize query string respecting quoted strings (`"..."`).
2. Extract key-value pairs matching `([a-z]+):([^\s]+)`.
3. Normalize extracted tag tokens using `normalizeTag()`.
4. Treat remaining unkeyed tokens as full-text search keywords.

---

## 4. SQLite FTS5 Engine Implementation

The Rust search engine executes queries using SQLite FTS5.

### 4.1 Table Definitions
```sql
-- Main full-text virtual table
CREATE VIRTUAL TABLE fts_blocks USING fts5(
    block_id UNINDEXED,
    document_id UNINDEXED,
    document_type UNINDEXED, -- 'dsm' or 'general'
    entry_id UNINDEXED,      -- ID of DsmEntry or NULL
    entry_date,              -- YYYY-MM-DD
    block_type,              -- 'paragraph', 'heading', 'code', etc.
    language,                -- 'java', 'sql', etc.
    tags,                    -- Space-separated normalized tags
    content,                 -- Indexed plain text
    tokenize = 'unicode61 remove_diacritics 2'
);

-- Trigram index for exact code substrings
CREATE VIRTUAL TABLE fts_code_trigram USING fts5(
    block_id UNINDEXED,
    document_id UNINDEXED,
    language UNINDEXED,
    code_content,
    tokenize = 'trigram'
);
```

### 4.2 SQL Generation Example
For the query: `tag:springboot type:code auth`
```sql
SELECT 
    b.block_id,
    b.document_id,
    b.document_type,
    b.entry_id,
    b.entry_date,
    b.block_type,
    b.language,
    b.tags,
    snippet(fts_blocks, 8, '<mark>', '</mark>', '...', 16) AS excerpt,
    bm25(fts_blocks, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 5.0, 10.0) AS rank
FROM fts_blocks b
WHERE fts_blocks MATCH 'tags:springboot AND block_type:code AND content:auth*'
ORDER BY rank
LIMIT 50;
```

---

## 5. Snippets, Highlighting, and Relevance Ranking

### 5.1 Highlight Markers
Matches are highlighted in search results using `<mark>` tags generated directly by SQLite's `snippet()` function:
```html
...completed token refresh logic using <mark>auth</mark> interceptors...
```
The React presentation layer safely renders marked snippets using a lightweight sanitize-and-highlight component.

### 5.2 BM25 Relevance Weights
Weights configured across FTS5 columns:
- `content`: 10.0 (Highest priority)
- `tags`: 5.0 (High priority for explicit tags)
- `language`: 1.0
- `block_type`: 1.0

### 5.3 Result Navigation
Each search result payload includes:
- `documentId`: ID of the parent note or `"dsm_master"`.
- `documentType`: `"dsm"` or `"general"`.
- `entryId`: The specific `DsmEntry` ID (for DSM matches).
- `blockId`: The exact ProseMirror block ID.

When a user clicks a search result:
1. The target document is opened in a tab (or the active tab is switched).
2. The editor smoothly scrolls the target block into view.
3. A temporary CSS pulse/highlight animation draws attention to the matched block.

---

## 6. Multi-Tag Filtering in Navigation Sidebar & DSM Timeline

In addition to the global FTS modal search, Chronote provides instant, interactive multi-tag filtering directly within the primary navigation panes.

### 6.1 State & Mode Semantics
- Both `useNotesStore` and `useDsmStore` maintain:
  ```typescript
  selectedTags: string[];
  tagMatchMode: "and" | "or";
  ```
- **`and` Mode (ALL):** Requires notes or stand-up entries to contain every selected tag (`tags.includes(t)` for all `t`).
- **`or` Mode (ANY):** Matches any note or entry containing at least one of the selected tags.

### 6.2 Pure Domain Filtering Utilities
- Implemented in `src/domain/note.utils.ts` (`filterNotesByTags`) and `src/domain/dsm.utils.ts` (`filterDsmEntriesByTags`).
- Preserves full immutability and runs synchronously in sub-millisecond time across thousands of notes.

### 6.3 UI Presentation & Controls
- **Sidebar Tags:** Clicking tags in the Tags list toggles them in the active filter set with accent outline badges.
- **Active Filter Bar:** Displays active tag chips with individual remove buttons (`×`), the `ALL` / `ANY` mode switcher, and a `Clear` button.
- **DSM Entry Headers:** Clicking any tag chip on a stand-up entry toggles it in the timeline multi-tag filter.
