# ADR-006: Daily Stand-up (DSM) Domain and Storage Model

## Status
Accepted

## Date
2026-09-16

## Context
A daily stand-up (DSM) note is an essential ritual for software engineers: recording what was completed yesterday, what is planned today, active blockers, technical investigations, and relevant code or query snippets.

A critical user requirement is that **software engineering tasks frequently span multiple days**. An investigation started on Tuesday often continues through Thursday. 

When tools force engineers into a rigid "one file per calendar day" paradigm (like Obsidian Daily Notes or Logseq journals):
1. The user loses continuity: reading what happened across a sprint requires opening, closing, and switching between 10 separate daily files.
2. Cross-day topic tracking is broken: finding notes on an issue requires hopping between disparate files.
3. The filesystem becomes littered with hundreds of tiny markdown files.

Conversely, if an application treats the entire journal as one giant, unstructured raw text file:
1. Jumping to a specific date requires manual scrolling or unreliable text parsing.
2. Tagging an individual day's work is impossible without polluting global tags.
3. Collapsing days or viewing summaries becomes fragile.
4. Parsing dates from arbitrary headers like `## 15/09/2026` breaks across user locales and formatting choices.

## Problem
How can Chronote provide an intuitive, continuous journal reading experience while treating each calendar date entry as a first-class, independently addressable, and queryable domain entity?

## Decision Drivers
1. **Continuous Reading Experience**: The user must be able to scroll smoothly through multiple days as one cohesive notebook.
2. **Independently Addressable Entries**: Each date must be an addressable domain object with a stable ID, explicit date (`YYYY-MM-DD`), entry-level tags, creation timestamps, and individual collapse state.
3. **No Brittle Date Parsing**: Dates must be structured domain metadata, not parsed dynamically from fragile markdown heading strings.
4. **Fast Navigation**: Instant jump to any date via calendar picker, date search (`date:2026-09-15`), or tag filter (`tag:springboot`).
5. **Human Recoverability**: Stored simply and cleanly on disk.

## Considered Alternatives

### 1. One Physical Markdown File Per Day (`dsm/2026-09-15.md`)
* **Pros**: Standard approach in Obsidian / Foam.
* **Cons**:
  - Shatters the continuous journal concept into hundreds of isolated files.
  - Slow rendering of multi-day timeline views (requires opening and concatenating dozens of files on disk).
  - Heavy disk I/O on large workspaces.

### 2. Monolithic Unstructured Markdown Document (`dsm.md`)
* **Pros**: Simple single file.
* **Cons**:
  - Requires fragile regex parsing of headers (`# 2026-09-15` vs `## Sept 15, 2026`).
  - No clean way to attach entry-level tags or collapsed state.
  - Brittle AST manipulation when editing an intermediate day.

### 3. Single Logical Document with Structured Date Entry Entities (`notes/dsm.json`)
* **Pros**:
  - **One Document Container**: Stored on disk as a single document file (`notes/dsm.json`), representing the continuous DSM notebook.
  - **First-Class Date Entries**: The file contains a structured array of `DsmEntry` objects.
  - **Rich Structured Metadata**: Each `DsmEntry` has a unique ID, an ISO date string (`2026-09-15`), entry tags (`["springboot", "auth"]`), collapsed boolean, and its own ProseMirror content block tree.
  - **Continuous Timeline UI**: The editor renders these entries sequentially in a single scrollable timeline, with individual collapse headers, tag chips, and inline date controls.
  - **Instant Jump**: Clicking a date in the calendar or sidebar immediately scrolls the virtualized timeline directly to that entry's DOM element.
* **Cons**:
  - Requires virtualized rendering for very large journals (handled via React windowing or ProseMirror node views).

## Decision
We choose **Alternative 3: A Single Logical DSM Document Composed of Discrete Date Entry Domain Entities**.

### DSM Domain Model
```typescript
interface DsmDocument {
  id: "dsm_master";
  schemaVersion: 1;
  title: "Daily Stand-up Journal";
  createdAt: string; // ISO 8601 UTC
  updatedAt: string;
  entries: DsmEntry[]; // Chronologically ordered (descending or ascending user preference)
}

interface DsmEntry {
  id: string; // Stable ULID e.g. "ent_01JC87A9..."
  date: string; // Canonical ISO date "YYYY-MM-DD"
  tags: string[]; // Normalized tags e.g. ["springboot", "backend"]
  collapsed: boolean; // UI collapse state
  content: ProseMirrorNode; // Structured rich text block tree
  createdAt: string;
  updatedAt: string;
}
```

## Collapsed State & Derived Preview
When a user collapses an entry (`collapsed: true`):
1. The full ProseMirror content editor for that date is collapsed.
2. The UI displays an informative summary strip:
   - Date badge (`2026-09-15`) and day-of-week.
   - Entry tag chips (`#springboot`, `#backend`).
   - An **auto-derived preview string** extracted from the first non-empty paragraph or task block (truncated to 120 characters with ellipsis).
3. The user never needs to write a manual summary; it is derived automatically from content.

## Consequences

### Positive
- Solves the multi-day engineering workflow: read whole weeks as one stream without switching files.
- Zero reliance on parsing text headers for dates.
- SQLite indexes each `DsmEntry` individually in `fts_blocks` and `dsm_entries`, allowing queries like `date:2026-09-15` or `tag:springboot` to return the precise date entry immediately.
- Clean export: exporting DSM entries for a sprint or date range can be exported into a single clean Markdown, DOCX, or PDF document.

### Negative / Trade-offs
- Over 5+ years of daily notes, `notes/dsm.json` could grow to 10–25 MB. Handled by keeping entries in an array that allows lazy-loading or pagination if needed.

## Reversibility
Medium. The `DsmEntry` schema cleanly maps to any database table or multi-file layout if ever refactored.
