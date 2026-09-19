import type { ProseMirrorMark, ProseMirrorNode } from "../document.types";
import type { DsmDocument, DsmEntry } from "../dsm.types";
import type { GeneralNote } from "../note.types";
import type { MarkdownExportOptions } from "./export.types";

/**
 * Sanitizes a title for relative file links (e.g. "Spring Boot & Kafka" -> "spring_boot_kafka.md").
 */
export function sanitizeTitleToFilename(title: string): string {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "untitled"
  );
}

/**
 * Serializes inline text and marks to standard Markdown.
 */
function serializeInlineMarks(text: string, marks?: ProseMirrorMark[], options?: MarkdownExportOptions): string {
  if (!marks || marks.length === 0) {
    return text;
  }

  let result = text;

  // Process marks in order
  for (const mark of marks) {
    switch (mark.type) {
      case "bold":
        result = `**${result}**`;
        break;
      case "italic":
        result = `*${result}*`;
        break;
      case "strike":
        result = `~~${result}~~`;
        break;
      case "code":
        result = `\`${result}\``;
        break;
      case "link": {
        const href = (mark.attrs?.href as string) || "";
        result = `[${result}](${href})`;
        break;
      }
      case "internalLink": {
        const noteTitle = (mark.attrs?.noteTitle as string) || result;
        if (options?.wikiLinkMode) {
          result = `[[${noteTitle}]]`;
        } else {
          const filename = `${sanitizeTitleToFilename(noteTitle)}.md`;
          result = `[${noteTitle}](./${filename})`;
        }
        break;
      }
      case "underline":
        // Markdown has no standard underline; preserve text cleanly
        break;
      default:
        break;
    }
  }

  return result;
}

/**
 * Serializes inline nodes (text, inline marks, inline images).
 */
function serializeInlineNodes(nodes?: ProseMirrorNode[], options?: MarkdownExportOptions): string {
  if (!nodes || nodes.length === 0) return "";

  return nodes
    .map((node) => {
      if (node.type === "text") {
        return serializeInlineMarks(node.text ?? "", node.marks, options);
      }
      if (node.type === "image") {
        const src = (node.attrs?.src as string) || "";
        const alt = (node.attrs?.alt as string) || (node.attrs?.caption as string) || "image";
        return `![${alt}](${src})`;
      }
      if (node.type === "hardBreak") {
        return "  \n";
      }
      return "";
    })
    .join("");
}

/**
 * Serializes a GFM Table node.
 */
function serializeTable(node: ProseMirrorNode, options?: MarkdownExportOptions): string {
  if (!node.content || node.content.length === 0) return "";

  const rows: string[][] = [];

  for (const rowNode of node.content) {
    if (rowNode.type !== "tableRow" || !rowNode.content) continue;
    const cells: string[] = [];
    for (const cellNode of rowNode.content) {
      const cellText = serializeInlineNodes(
        cellNode.content?.flatMap((p) => (p.content ? p.content : p)),
        options
      ).replace(/\|/g, "\\|").trim();
      cells.push(cellText);
    }
    rows.push(cells);
  }

  if (rows.length === 0) return "";

  // Compute column count
  const maxCols = Math.max(...rows.map((r) => r.length));
  if (maxCols === 0) return "";

  const lines: string[] = [];

  // Header row
  const headerRow = rows[0];
  while (headerRow.length < maxCols) headerRow.push("");
  lines.push(`| ${headerRow.join(" | ")} |`);

  // Separator row
  const separators = Array.from({ length: maxCols }, () => "---");
  lines.push(`| ${separators.join(" | ")} |`);

  // Data rows
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    while (row.length < maxCols) row.push("");
    lines.push(`| ${row.join(" | ")} |`);
  }

  return lines.join("\n") + "\n\n";
}

/**
 * Serializes a block-level ProseMirror node into Markdown.
 */
export function serializeNodeToMarkdown(
  node: ProseMirrorNode,
  options?: MarkdownExportOptions,
  listPrefix: string = ""
): string {
  switch (node.type) {
    case "doc": {
      if (!node.content) return "";
      return node.content
        .map((child) => serializeNodeToMarkdown(child, options))
        .join("")
        .trim();
    }

    case "paragraph": {
      const content = serializeInlineNodes(node.content, options);
      return content ? `${content}\n\n` : "\n";
    }

    case "heading": {
      const level = Math.min(Math.max((node.attrs?.level as number) || 1, 1), 6);
      const prefix = "#".repeat(level);
      const content = serializeInlineNodes(node.content, options);
      return `${prefix} ${content}\n\n`;
    }

    case "codeBlock": {
      const lang = (node.attrs?.language as string) || "";
      const code = node.content?.map((c) => c.text ?? "").join("") || "";
      return `\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
    }

    case "blockquote": {
      if (!node.content) return "> \n\n";
      const inner = node.content
        .map((child) => serializeNodeToMarkdown(child, options).trim())
        .filter(Boolean)
        .join("\n> \n");
      const prefixed = inner
        .split("\n")
        .map((line) => (line.startsWith(">") ? line : `> ${line}`))
        .join("\n");
      return `${prefixed}\n\n`;
    }

    case "bulletList": {
      if (!node.content) return "";
      return (
        node.content
          .map((child) => serializeNodeToMarkdown(child, options, "- "))
          .join("") + "\n"
      );
    }

    case "orderedList": {
      if (!node.content) return "";
      const start = (node.attrs?.start as number) || 1;
      return (
        node.content
          .map((child, idx) =>
            serializeNodeToMarkdown(child, options, `${start + idx}. `)
          )
          .join("") + "\n"
      );
    }

    case "taskList": {
      if (!node.content) return "";
      return (
        node.content
          .map((child) => serializeNodeToMarkdown(child, options, "task"))
          .join("") + "\n"
      );
    }

    case "listItem": {
      if (!node.content) return `${listPrefix}\n`;
      const itemContent = node.content
        .map((child, idx) => {
          const text = serializeNodeToMarkdown(child, options).trim();
          if (idx === 0) return `${listPrefix}${text}`;
          return `  ${text}`;
        })
        .join("\n");
      return `${itemContent}\n`;
    }

    case "taskItem": {
      const isChecked = Boolean(node.attrs?.checked);
      const checkPrefix = isChecked ? "- [x] " : "- [ ] ";
      if (!node.content) return `${checkPrefix}\n`;
      const itemContent = node.content
        .map((child, idx) => {
          const text = serializeNodeToMarkdown(child, options).trim();
          if (idx === 0) return `${checkPrefix}${text}`;
          return `  ${text}`;
        })
        .join("\n");
      return `${itemContent}\n`;
    }

    case "horizontalRule": {
      return "---\n\n";
    }

    case "table": {
      return serializeTable(node, options);
    }

    default: {
      // Fallback for custom or unrecognized nodes with text content
      if (node.content) {
        return node.content
          .map((child) => serializeNodeToMarkdown(child, options))
          .join("");
      }
      if (node.text) {
        return node.text;
      }
      return "";
    }
  }
}

/**
 * Formats a list of tags as Markdown callout or frontmatter.
 */
function formatTagsMarkdown(tags: string[]): string {
  if (!tags || tags.length === 0) return "";
  const tagList = tags.map((t) => `#${t}`).join(" ");
  return `> Tags: ${tagList}\n\n`;
}

/**
 * Exports a ProseMirror document root to Markdown.
 */
export function exportProseMirrorDocToMarkdown(
  doc: ProseMirrorNode,
  options?: MarkdownExportOptions
): string {
  return serializeNodeToMarkdown(doc, options).trim() + "\n";
}

/**
 * Exports a GeneralNote to standard GitHub Flavored Markdown.
 */
export function exportNoteToMarkdown(
  note: GeneralNote,
  options: MarkdownExportOptions = { includeTags: true, includeTitle: true }
): string {
  const parts: string[] = [];

  // Optional YAML Frontmatter
  if (options.includeFrontmatter) {
    parts.push("---");
    parts.push(`title: "${note.title.replace(/"/g, '\\"')}"`);
    parts.push(`id: "${note.id}"`);
    parts.push(`updatedAt: "${note.updatedAt}"`);
    if (note.tags.length > 0) {
      parts.push("tags:");
      for (const t of note.tags) parts.push(`  - "${t}"`);
    }
    parts.push("---\n");
  }

  // Title as H1
  if (options.includeTitle !== false && !options.includeFrontmatter) {
    parts.push(`# ${note.title}\n\n`);
  }

  // Tags callout
  if (options.includeTags !== false && note.tags.length > 0) {
    parts.push(formatTagsMarkdown(note.tags));
  }

  // Document body
  const body = exportProseMirrorDocToMarkdown(note.content, options);
  parts.push(body);

  return parts.join("").trim() + "\n";
}

/**
 * Exports a single DSM date entry to Markdown.
 */
export function exportDsmEntryToMarkdown(
  entry: DsmEntry,
  options: MarkdownExportOptions = { includeTags: true, includeTitle: true }
): string {
  const parts: string[] = [];

  // Entry Header (H2 ISO date)
  if (options.includeTitle !== false) {
    parts.push(`## ${entry.date}\n\n`);
  }

  // Tags
  if (options.includeTags !== false && entry.tags.length > 0) {
    parts.push(formatTagsMarkdown(entry.tags));
  }

  // Body
  const body = exportProseMirrorDocToMarkdown(entry.content, options);
  parts.push(body);

  return parts.join("").trim() + "\n";
}

/**
 * Exports multiple DSM entries spanning a date range to Markdown.
 */
export function exportDsmRangeToMarkdown(
  entries: DsmEntry[],
  dateRange?: { from: string; to: string },
  options: MarkdownExportOptions = { includeTags: true, includeTitle: true }
): string {
  let filtered = [...entries];

  if (dateRange) {
    filtered = filtered.filter(
      (e) => e.date >= dateRange.from && e.date <= dateRange.to
    );
  }

  // Sort descending by date
  filtered.sort((a, b) => b.date.localeCompare(a.date));

  const parts: string[] = [];
  const rangeTitle = dateRange
    ? `# DSM Stand-up Journal (${dateRange.from} to ${dateRange.to})\n\n`
    : "# DSM Stand-up Journal\n\n";

  parts.push(rangeTitle);

  if (filtered.length === 0) {
    parts.push("_No stand-up entries found in this date range._\n");
    return parts.join("");
  }

  for (let i = 0; i < filtered.length; i++) {
    parts.push(exportDsmEntryToMarkdown(filtered[i], options));
    if (i < filtered.length - 1) {
      parts.push("\n---\n\n");
    }
  }

  return parts.join("").trim() + "\n";
}

/**
 * Exports full DSM Document to Markdown.
 */
export function exportFullDsmToMarkdown(
  dsmDoc: DsmDocument,
  options: MarkdownExportOptions = { includeTags: true, includeTitle: true }
): string {
  return exportDsmRangeToMarkdown(dsmDoc.entries, undefined, options);
}
