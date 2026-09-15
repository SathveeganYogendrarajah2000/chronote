# Chronote Export Specification

## 1. Export Overview & Philosophy

Chronote treats user data as the absolute property of the engineer. Exporting notes must be frictionless, high-fidelity, and possible entirely offline without external web converters.

Chronote supports four core export targets:
1. **Markdown (`.md`)**: Clean, standard CommonMark / GitHub Flavored Markdown (GFM).
2. **Microsoft Word (`.docx`)**: Modern OpenXML format with professional typographic hierarchy.
3. **PDF (`.pdf`)**: Vector-rendered, print-ready document.
4. **Native Backup Archive (`.zip`)**: Lossless workspace container.

Legacy `.doc` formats are explicitly excluded.

---

## 2. Export Scopes

Users can invoke the export dialog with four distinct scopes:
- **Active Document:** Exports the current General note or active DSM view.
- **Single DSM Date Entry:** Exports a specific calendar day's stand-up notes (e.g. for sharing in Slack or Jira).
- **DSM Date Range:** Exports stand-up entries spanning a sprint or time range (e.g. `2026-09-01` to `2026-09-15`).
- **Complete Workspace:** Generates a unified archive of all notes and assets.

---

## 3. Markdown Export Specification

### 3.1 Supported CommonMark / GFM Subset
The Markdown exporter walks the canonical ProseMirror JSON tree and maps nodes to standard GitHub Flavored Markdown syntax:

| ProseMirror Node / Mark | Output Markdown Format | Notes |
| :--- | :--- | :--- |
| `heading` (level 1..6) | `# ` to `###### ` | Standard ATX headings |
| `paragraph` | Text + `\n\n` | Normalized paragraph breaks |
| `bulletList` / `listItem` | `- ` | Unordered list |
| `orderedList` / `listItem`| `1. ` | Ordered list |
| `taskList` / `taskItem` | `- [ ] ` / `- [x] ` | GFM task list checkboxes |
| `codeBlock` | ````{lang}\n{code}\n```` | Fenced code blocks with language |
| `blockquote` | `> ` | Blockquote lines |
| `horizontalRule` | `---` | Standard thematic break |
| `table` | `\| Header \| ...` | Standard GFM Markdown table |
| `bold` | `**text**` | Strong emphasis |
| `italic` | `*text*` | Emphasis |
| `strike` | `~~text~~` | Strikethrough |
| `code` | `` `code` `` | Inline monospace code |
| `link` | `[text](url)` | Standard hyperlink |

### 3.2 Chronote Extensions Mapping Rules
Because Markdown lacks native representations for certain Chronote features, the exporter handles them using standardized conventions:

- **DSM Date Entries:** Represented as Heading level 2 with ISO date: `## 2026-09-16`.
- **Tags:** Emitted as a formatted metadata callout or tag list at the top of the entry:
  ```markdown
  > Tags: #springboot #jwt #backend
  ```
- **Internal Note Links (`[[Note Title]]`):**
  - Option A (Default): Degrades to relative file link: `[Note Title](./note_title.md)`.
  - Option B (Wiki-Link Mode): Preserves raw wiki syntax `[[Note Title]]` for Obsidian / Foam compatibility.
- **Images:** Exported with relative paths pointing to the accompanying assets folder:
  ```markdown
  ![Diagram](./assets/images/img_01JC87Z1AA.png)
  ```
- **Custom Block Attributes:** Unserializable runtime attributes (such as collapsed states or block UUIDs) are omitted or serialized as clean HTML comments (`<!-- block-id: blk_01... -->`) when full round-trip preservation is requested.

---

## 4. Microsoft Word (`.docx`) Export Specification

The DOCX exporter builds native OpenXML `.docx` files using the `docx` library in TypeScript/Rust.

### 4.1 Typography & Layout Styling
- **Page Setup:** Standard Letter / A4 with 1-inch margins.
- **Font Stack:** Aptos / Calibri / Arial for body text; Consolas / JetBrains Mono for code.
- **Headings:** Styled with corporate-clean hierarchy and heading bookmark IDs for Word Navigation Pane compatibility.
- **Code Blocks:** Rendered as single-cell shaded table boxes with light-grey background (`#F4F6F8`), thin borders, and monospace font with preserved whitespace.
- **Callouts & Blockquotes:** Styled with a 3pt left border accent (`#3B82F6`) and slight indent.
- **Images:** Embedded directly into the `.docx` package with original aspect ratios preserved.

---

## 5. PDF Export Specification

PDF export renders the canonical ProseMirror document into a dedicated, clean print view using print-specific CSS media queries:

```css
@media print {
  body {
    background: #ffffff !important;
    color: #1a1a1a !important;
    font-size: 11pt;
    line-height: 1.5;
  }
  .app-sidebar, .tab-bar, .resource-pane, .floating-menu {
    display: none !important;
  }
  pre, code {
    background: #f6f8fa !important;
    color: #24292f !important;
    border: 1px solid #d0d7de !important;
    page-break-inside: avoid;
  }
  h1, h2, h3 {
    page-break-after: avoid;
  }
}
```
The view is converted to PDF via Tauri's native webview print pipeline.

---

## 6. Native Backup Archive (`.zip`) Specification

Chronote provides a one-click **"Export Full Workspace Backup"** operation.

### 6.1 Archive Structure
```
chronote-backup-2026-09-16-120000.zip
├── manifest.json                   # Archive metadata, timestamp, workspace version
├── workspace.json                  # Workspace settings
├── notes/
│   ├── dsm.json                    # Full DSM journal
│   └── not_*.json                  # All General notes
└── assets/
    ├── images/                     # All binary images
    └── files/                      # All attachments
```
*(Note: The disposable `.chronote/index.db` SQLite cache is strictly omitted to minimize archive size and prevent lock collisions).*

### 6.2 Restore Integrity
The backup archive is a standard zip file. Any user can unzip it and immediately use it as a valid Chronote workspace directory, or inspect its JSON files using any text editor.
