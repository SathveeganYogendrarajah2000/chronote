# ADR-002: Canonical Internal Document Model

## Status
Accepted

## Date
2026-09-16

## Context
Chronote is a structured engineering journal that supports daily stand-up (DSM) entries and general developer notes. The editor must provide a fluid rich-text experience with Markdown authoring shortcuts (e.g. typing `## ` creates an H2 node without retaining the `#` characters in text, ```` creates a structured code block, `- ` creates an unordered list).

Furthermore, the document model must support:
- Stable internal block IDs for deep linking and resource browser indexing.
- Native code blocks with explicit language tags, copy buttons, and execution/lint metadata.
- Embedded media (images, screenshots) with stable asset IDs.
- Tag entities and internal wiki-style cross-references (`[[Note Title]]` or `[[dsm:2026-09-15]]`).
- Reliable import and export to standard Markdown, DOCX, and PDF.

## Problem
What should serve as the canonical internal representation of documents in Chronote? Should it be raw Markdown text, a custom AST/block-tree, or an established structured document schema (such as ProseMirror / Tiptap JSON)?

## Decision Drivers
1. **Structural Rigor**: The data model must represent semantic node trees, attributes, and formatting marks without parsing ambiguities.
2. **Authoring Experience**: Must support modern Notion/Confluence-style rich editing with transparent Markdown shortcuts and inline decorations.
3. **Lossless Storage & Querying**: Attributes like stable block IDs, entry tags, collapsed states, and asset references must persist reliably without polluting user prose.
4. **Interoperability**: Clean conversion paths to and from Markdown, DOCX, and PDF without making the storage format dependent on Markdown text nuances (such as whitespace differences or inconsistent Markdown parsers).
5. **Ecosystem Stability**: Avoid hand-rolling a custom rich-text engine from scratch.

## Considered Alternatives

### 1. Raw Markdown as Canonical Format (Obsidian / Logseq approach)
* **Pros**:
  - Maximum human readability in any plain text editor.
  - Trivial git versioning and diffing.
* **Cons**:
  - Markdown lacks standard representation for block-level metadata (stable block IDs, per-entry tags, custom attributes, collapsible section states) without inventing proprietary comments (e.g., `<!-- id: 123 -->` or YAML frontmatter hacks).
  - Round-trip instability: Parsing Markdown into a DOM/AST and re-serializing back to Markdown frequently mutates whitespace, indentation, list numbering, and character escapes.
  - Requires constant regex or AST parsing on every keystroke or search operation.
  - Contradicts the explicit requirement: *"The application's internal canonical representation MUST NOT be raw Markdown."*

### 2. Custom Block Tree (Notion / Roam-style JSON array of blocks)
* **Pros**:
  - Total control over the JSON schema and block nesting semantics.
* **Cons**:
  - Requires building a custom editor engine or writing complex bridge layers to render and edit blocks within standard web contentEditable.
  - Massive development overhead for cursor management, multi-block selection, copy-paste normalization, and undo/redo history.
  - High risk of reinventing solved ProseMirror mechanics poorly.

### 3. Tiptap 3.x / ProseMirror JSON Document Model
* **Pros**:
  - **Battle-Tested Engine**: ProseMirror powers the world's most reliable rich text editors (Atlassian Confluence, The Guardian, GitLab).
  - **Structured JSON Schema**: Represented as a recursive JSON tree of nodes and marks with typed attributes (e.g., `attrs: { id: "blk_01H...", language: "typescript" }`).
  - **Clean Markdown Authoring**: Tiptap provides native InputRules and PasteRules that effortlessly convert `# `, `- `, and ```` into rich nodes while consuming the Markdown trigger tokens.
  - **Deterministic Serialization**: JSON documents serialize and deserialize losslessly without AST guesswork.
  - **Decoupled Interop**: Markdown, DOCX, and PDF conversion is isolated behind explicit import/export adapter layers.
* **Cons**:
  - Slightly less human-readable than raw `.md` when opened in Notepad, though still structured, transparent JSON.
  - Tiptap's official Markdown extension is evolving; therefore, Markdown conversion must be isolated behind an adapter to insulate the rest of the application.

## Decision
We choose **Tiptap 3.x / ProseMirror JSON** as Chronote's **canonical internal document representation**.

Raw Markdown is strictly an **interoperability format** (for import and export). Document conversion is strictly encapsulated behind explicit adapter interfaces.

## Document Model Schema Overview
```json
{
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": { "level": 2, "id": "blk_01J..." },
      "content": [{ "type": "text", "text": "Sprint 34 Investigation" }]
    },
    {
      "type": "codeBlock",
      "attrs": { "id": "blk_01K...", "language": "mongodb" },
      "content": [{ "type": "text", "text": "db.orders.aggregate([ ... ])" }]
    }
  ]
}
```

## Consequences

### Positive
- Strict structural integrity: no syntax ambiguity or regex parsing errors.
- Rich-text editor behavior (caret, selections, history, undo/redo) handled natively by ProseMirror core.
- Stable block IDs and metadata attributes are first-class properties in node JSON.
- High-fidelity exports to DOCX, PDF, and Markdown via structured node traversal.

### Negative / Trade-offs
- Users inspecting raw document files see structured JSON rather than plain text.
- Git diffs on JSON files are more verbose than plain text diffs (mitigated by formatting persisted JSON with deterministic indentation and sorted keys).

## Reversibility
Low. The editor UI, persistence schemas, and indexing pipelines are coupled to the ProseMirror node/mark hierarchy. Changing this would require replacing the entire editor subsystem.
