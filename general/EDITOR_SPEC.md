# Chronote Editor Specification

## 1. Editor Philosophy

Chronote is **not a plain Markdown raw text editor**. It is a **modern structured rich-text editor that natively understands Markdown authoring conventions**.

- **Invisible Syntax After Acceptance:** When an engineer types a Markdown trigger (e.g. `## How to configure MongoDB`), the editor immediately transforms the line into a Heading 2 node. The trigger characters `## ` are consumed and **do not remain visible as literal text**.
- **No Word-Style Bloated Ribbons:** Chronote eliminates multi-tab formatting ribbons. Formatting is handled via:
  1. Keyboard shortcuts (`Ctrl+B`, `Ctrl+I`, `Ctrl+K`).
  2. Markdown input shortcuts (`# `, `- `, ````).
  3. Slash command menu (`/code`, `/heading`, `/image`).
  4. Floating contextual bubble menus that appear only on text selection.
- **Engine:** Built on **Tiptap 3.x / ProseMirror core**, providing bulletproof cursor management, undo/redo stacks, and recursive JSON node trees.

---

## 2. Supported Nodes, Marks, and Markdown Input Rules

### 2.1 Input Rules (Markdown-Style Shorthand)
The editor monitors keystrokes and fires ProseMirror `InputRules` that replace matched trigger text with semantic node structures:

| Trigger Pattern | Resulting Node | Behavior & Arguments |
| :--- | :--- | :--- |
| `# ` + Space | `Heading 1` | Sets current block to Heading level 1; consumes `# `. |
| `## ` + Space | `Heading 2` | Sets current block to Heading level 2; consumes `## `. |
| `### ` + Space | `Heading 3` | Sets current block to Heading level 3; consumes `### `. |
| `- ` or `* ` + Space | `BulletList` | Creates an unordered bulleted list item. |
| `1. ` + Space | `OrderedList` | Creates an ordered numbered list item. |
| `> ` + Space | `Blockquote` | Converts block into a styled blockquote. |
| ```` + Enter | `CodeBlock` | Opens structured code block (prompts for language or defaults to plain). |
| ````ts + Enter | `CodeBlock` | Opens structured code block with `language="typescript"`. |
| `[ ] ` or `[] ` | `TaskItem` | Creates an interactive checklist checkbox. |
| `---` + Enter | `HorizontalRule` | Inserts a divider rule. |

### 2.2 Inline Formatting (Marks) & Paste Rules
- Bold: `**bold**` or `Ctrl+B`
- Italic: `*italic*` or `Ctrl+I`
- Underline: `Ctrl+U`
- Strikethrough: `~~strike~~` or `Ctrl+Shift+X`
- Inline Code: `` `code` `` or `Ctrl+Shift+C`
- External Hyperlink: `Ctrl+K` (opens URL modal)

---

## 3. First-Class Code Block System

Code blocks are primary engineering assets. They must provide visual clarity and zero-friction interaction.

### 3.1 Node Attributes
```typescript
interface CodeBlockAttrs {
  id: string;        // Stable ULID e.g. "blk_01JC..."
  language: string;  // e.g. "java", "sql", "mongodb", "typescript", "bash"
}
```

### 3.2 UI Capabilities
- **Language Selector:** An inline searchable dropdown in the top-right corner of the code block.
- **Copy Button:** A one-click button that copies the code block text to the OS clipboard, briefly displaying a green checkmark (`"Copied!"`).
- **Syntax Highlighting:** Powered by `lowlight` / `highlight.js` or `shiki`, styled with high-contrast, developer-friendly themes (e.g. JetBrains / One Dark).
- **Line Numbers:** Subtle, non-selectable line numbers aligned on the left margin.

### 3.3 Core Supported Language Set
- **Backend & Systems:** Java, Spring Boot properties/YAML, Rust, C, C++, Go, C#.
- **Databases & Queries:** SQL (PostgreSQL, MySQL, Oracle), MongoDB (aggregation pipeline syntax).
- **Frontend & Web:** TypeScript, JavaScript, HTML, CSS, Angular templates, JSON.
- **Scripting & Shell:** Bash, PowerShell, Python, YAML, Dockerfile, Terraform/HCL.
- **Extensibility:** Accepts any custom language identifier typed by the user.

---

## 4. Internal Note Linking (`[[...]]`)

### 4.1 Authoring Interaction
1. When the user types `[[`, an inline autocomplete popover appears.
2. As the user types (e.g. `[[spring`), the list filters matching General notes and recent DSM dates.
3. Pressing `Enter` or clicking an item inserts an `internalLink` mark:
   ```json
   {
     "type": "text",
     "text": "Spring Security Config",
     "marks": [
       {
         "type": "internalLink",
         "attrs": {
           "targetNoteId": "not_01JC87XK89",
           "originalTitle": "Spring Security Config"
         }
       }
     ]
   }
   ```
4. **Custom Display Text (Alias):** Supports `[[Note Title|Custom Label]]`. The anchor text displays "Custom Label" while pointing to the target note's ID.

### 4.2 Link Resolution and Renaming Resilience
- Because internal links store `targetNoteId`, **renaming a note never breaks incoming links**.
- When the user clicks an internal link, the editor switches to or opens a new tab displaying the referenced note.
- If the referenced note no longer exists, the link renders with a visual broken badge (`[!?] Broken link`).

---

## 5. Slash Commands (`/`)

Typing `/` on an empty line or at the end of a word opens the **Quick Insert Command Palette**:

| Command | Action |
| :--- | :--- |
| `/code` | Inserts a structured code block. |
| `/h1`, `/h2`, `/h3` | Formats block as Heading 1, 2, or 3. |
| `/bullet`, `/numbered` | Creates a bulleted or numbered list. |
| `/todo`, `/task` | Creates a task item checkbox. |
| `/quote` | Inserts a blockquote. |
| `/image` | Opens file picker to insert an image asset. |
| `/table` | Inserts a 3x3 table with headers. |
| `/divider` | Inserts a horizontal rule divider. |

---

## 6. Keyboard Shortcuts Reference

| Shortcut | Scope | Action |
| :--- | :--- | :--- |
| `Ctrl+B` | Global Editor | Toggle Bold |
| `Ctrl+I` | Global Editor | Toggle Italic |
| `Ctrl+U` | Global Editor | Toggle Underline |
| `Ctrl+K` | Global Editor | Insert / Edit Link |
| `Ctrl+Shift+C` | Global Editor | Toggle Inline Monospace Code |
| `Ctrl+Alt+1` | Global Editor | Apply Heading 1 |
| `Ctrl+Alt+2` | Global Editor | Apply Heading 2 |
| `Ctrl+Alt+3` | Global Editor | Apply Heading 3 |
| `Ctrl+Alt+0` | Global Editor | Revert to Normal Paragraph |
| `Ctrl+Z` | Global Editor | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Global Editor | Redo |
| `Ctrl+S` | Application | Force Immediate Save |
| `Ctrl+F` | Application | Open Workspace Search Palette |
| `Ctrl+N` | Application | Create New General Note |
| `Ctrl+Shift+D` | Application | Jump to Today's DSM Entry |
| `Ctrl+W` | Tab Bar | Close Active Tab |
| `Ctrl+Tab` | Tab Bar | Switch to Next Tab |
| `Ctrl+Shift+Tab` | Tab Bar | Switch to Previous Tab |
| `Ctrl+Shift+T` | Tab Bar | Reopen Recently Closed Tab |
