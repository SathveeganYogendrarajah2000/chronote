# ADR-007: Export Architecture and Markdown Interoperability

## Status
Accepted

## Date
2026-09-16

## Context
Engineers frequently need to share notes, investigations, and sprint summaries with colleagues, managers, and external ticketing systems. 

Chronote must support four core export targets:
1. **Markdown (`.md`)**: Clean, standard CommonMark/GFM for GitHub PRs, issues, or personal archives.
2. **DOCX (`.docx`)**: Modern Microsoft Word format for enterprise reports and corporate documentation.
3. **PDF (`.pdf`)**: Print-ready, pixel-perfect document for formal distribution.
4. **Native Workspace Archive (`.zip`)**: Complete, lossless backup containing all JSON notes, workspace metadata, and raw image/file assets.

Legacy `.doc` formats are explicitly excluded.

A crucial challenge is that the internal document representation is a structured Tiptap/ProseMirror JSON tree with Chronote-specific features (entry tags, internal wiki-links `[[Note]]`, stable block IDs, and custom code block attributes). Naive direct conversion leads to tight coupling and brittle serialization.

## Problem
How should Chronote architect its export subsystem to support diverse target formats while isolating third-party conversion libraries and guaranteeing predictable handling of Chronote-specific extensions?

## Decision Drivers
1. **Lossless Semantic Export**: Formatting, code blocks (with language identifiers), tables, lists, and images must convert cleanly.
2. **Predictable Markdown Subset**: Follow CommonMark / GitHub Flavored Markdown (GFM) standards without inventing proprietary markdown garbage.
3. **Internal Reference Translation**: When exporting to Markdown or DOCX, internal links (`[[Spring Boot]]`) must degrade gracefully to readable text or relative document links.
4. **Decoupled Architecture**: The editor core and data models must not be directly coupled to experimental export packages (such as beta Tiptap markdown plugins).
5. **No External Server / Cloud Dependencies**: Conversion must run locally and offline on the user's desktop.

## Considered Alternatives

### 1. Direct Client-Side DOM Scraping & HTML Printing
* **Pros**:
  - Trivial to implement via `window.print()` or `html2pdf`.
* **Cons**:
  - Poor styling control for PDF/DOCX (breaks page headers, footers, pagination, margins).
  - Incapable of producing clean Markdown or DOCX.

### 2. Pandoc External Binary Invocation
* **Pros**:
  - Universal document converter.
* **Cons**:
  - Pandoc is a 100+ MB external dependency written in Haskell. Bundling it inside a lightweight Tauri app violates the lightweight requirement and complicates cross-platform distribution.

### 3. Isolated Document Export Pipeline with Dedicated Target Adapters
* **Pros**:
  - **Single Source of Truth**: All exporters take the canonical ProseMirror JSON tree as input.
  - **Markdown Adapter**: Traverses the node tree using an isolated serializer producing standard GFM. Chronote extensions (`[[Note Title]]`) are mapped either to title text or relative Markdown links (`[Note Title](./note_title.md)`).
  - **DOCX Adapter**: Utilizes a lightweight, pure TypeScript/JavaScript library (`docx`) running in webview or Rust native backend to build native OpenXML `.docx` documents with styled code blocks, tables, and embedded images.
  - **PDF Adapter**: Utilizes Tauri's native webview print-to-PDF or a headless PDF layout engine, injecting print-specific CSS media queries for page breaks and code styling.
  - **Native Backup Archive**: Pure Rust zip compressor (`zip` crate) creating an uncompressed or deflated `.zip` containing the entire workspace directory (excluding the rebuildable `.chronote/` cache).
* **Cons**:
  - Requires maintaining dedicated visitor/serialization logic for each export format.

## Decision
We choose **Alternative 3: An Isolated Export Pipeline with Dedicated Target Adapters**.

The application will define a formal `DocumentExportService` interface:
```typescript
interface DocumentExportService {
  exportToMarkdown(doc: ProseMirrorDoc, options: MarkdownExportOptions): Promise<string>;
  exportToDocx(doc: ProseMirrorDoc, options: DocxExportOptions): Promise<Uint8Array>;
  exportToPdf(doc: ProseMirrorDoc, options: PdfExportOptions): Promise<Uint8Array>;
  exportWorkspaceArchive(workspacePath: string, outputPath: string): Promise<void>;
}
```

## Markdown Representation Mapping Rules
| Chronote Feature | Canonical Model | Exported GFM Markdown |
| :--- | :--- | :--- |
| **Heading 1-6** | `heading` node with `level` | `# Heading` ... `###### Heading` |
| **Code Block** | `codeBlock` with `language` | ````{lang}\n{content}\n```` |
| **Internal Link** | `internalLink` mark with `noteId` | `[Title](relative_path.md)` or `[[Title]]` (user option) |
| **DSM Date Header** | `dsmEntry` boundary with `date` | `## 2026-09-15` |
| **Entry Tags** | `tags: ["backend", "aws"]` | `> Tags: #backend #aws` or frontmatter |
| **Image Asset** | `image` node with `assetId` | `![caption](./assets/images/img_id.png)` |
| **Blockquote** | `blockquote` node | `> text` |
| **Task / Checklist**| `taskList` & `taskItem` | `- [ ] pending` / `- [x] done` |

## Consequences

### Positive
- Markdown export conforms strictly to GitHub Flavored Markdown (GFM).
- Tiptap's beta Markdown parser is encapsulated; if upstream changes occur, only the Markdown adapter is affected.
- DOCX export produces professionally styled Word documents with clean monospace code boxes.
- Zero external command-line dependencies (no Pandoc, no LibreOffice).

### Negative / Trade-offs
- Features that have no equivalent in plain Markdown (such as collapsed section state or block UUIDs) are omitted from Markdown export or recorded as metadata comments.

## Reversibility
High. Exporters are pure transformation functions mapping AST nodes to target formats. Adding a new exporter (e.g. HTML or ePub) requires only adding a new adapter.
