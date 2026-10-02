import type { ProseMirrorMark, ProseMirrorNode } from "../document.types";
import type { DsmDocument, DsmEntry } from "../dsm.types";
import type { GeneralNote } from "../note.types";
import { sortDsmEntries } from "../dsm.utils";

/**
 * Escapes characters for HTML output.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Serializes inline marks to HTML.
 */
function serializeInlineMarks(text: string, marks?: ProseMirrorMark[]): string {
  let escaped = escapeHtml(text);
  if (!marks || marks.length === 0) return escaped;

  for (const mark of marks) {
    switch (mark.type) {
      case "bold":
        escaped = `<strong>${escaped}</strong>`;
        break;
      case "italic":
        escaped = `<em>${escaped}</em>`;
        break;
      case "strike":
        escaped = `<del>${escaped}</del>`;
        break;
      case "code":
        escaped = `<code>${escaped}</code>`;
        break;
      case "underline":
        escaped = `<u>${escaped}</u>`;
        break;
      case "link": {
        const href = escapeHtml((mark.attrs?.href as string) || "#");
        escaped = `<a href="${href}" target="_blank" rel="noopener noreferrer">${escaped}</a>`;
        break;
      }
      case "internalLink": {
        const noteTitle = escapeHtml((mark.attrs?.noteTitle as string) || text);
        escaped = `<span class="internal-link">[[${noteTitle}]]</span>`;
        break;
      }
    }
  }
  return escaped;
}

/**
 * Serializes inline nodes (text, images, attachments, breaks) to HTML.
 */
function serializeInlineNodes(nodes?: ProseMirrorNode[]): string {
  if (!nodes || nodes.length === 0) return "";
  return nodes
    .map((node) => {
      if (node.type === "text") {
        return serializeInlineMarks(node.text ?? "", node.marks);
      }
      if (node.type === "image") {
        const src = (node.attrs?.src as string) || "";
        const alt = escapeHtml((node.attrs?.alt as string) || "image");
        return `<img src="${src}" alt="${alt}" style="max-width: 100%; height: auto; border-radius: 4px; margin: 8px 0;" />`;
      }
      if (node.type === "attachment" || node.type === "fileAttachment") {
        const name = escapeHtml((node.attrs?.fileName as string) || "Attachment");
        const size = escapeHtml((node.attrs?.fileSize as string) || "");
        return `<div class="attachment-box" style="display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; margin: 8px 0; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 9.5pt;">📎 <strong>${name}</strong> ${size ? `<span style="color: #64748b;">(${size})</span>` : ""}</div>`;
      }
      if (node.type === "hardBreak") {
        return "<br />";
      }
      return "";
    })
    .join("");
}

/**
 * Serializes a table node to HTML.
 */
function serializeTableToHtml(node: ProseMirrorNode): string {
  if (!node.content || node.content.length === 0) return "";
  let html = "<table>\n";
  for (let r = 0; r < node.content.length; r++) {
    const row = node.content[r];
    if (row.type !== "tableRow" || !row.content) continue;
    html += "  <tr>\n";
    for (const cell of row.content) {
      const isHeader = cell.type === "tableHeader" || r === 0;
      const tag = isHeader ? "th" : "td";
      const cellContent = cell.content
        ? cell.content.map(serializeNodeToHtml).join("")
        : "";
      html += `    <${tag}>${cellContent || "&nbsp;"}</${tag}>\n`;
    }
    html += "  </tr>\n";
  }
  html += "</table>\n";
  return html;
}

/**
 * Serializes a block-level ProseMirror node into semantic HTML.
 */
export function serializeNodeToHtml(node: ProseMirrorNode): string {
  switch (node.type) {
    case "doc": {
      if (!node.content) return "";
      return node.content.map(serializeNodeToHtml).join("\n");
    }
    case "paragraph": {
      const content = serializeInlineNodes(node.content);
      return content ? `<p>${content}</p>` : "<p><br /></p>";
    }
    case "heading": {
      const level = Math.min(Math.max((node.attrs?.level as number) || 1, 1), 6);
      const content = serializeInlineNodes(node.content);
      return `<h${level}>${content}</h${level}>`;
    }
    case "codeBlock": {
      const lang = (node.attrs?.language as string) || "";
      const code = node.content?.map((c) => c.text ?? "").join("") || "";
      return `<pre><code class="language-${escapeHtml(lang)}">${escapeHtml(code)}</code></pre>`;
    }
    case "blockquote": {
      if (!node.content) return "<blockquote></blockquote>";
      const content = node.content.map(serializeNodeToHtml).join("\n");
      return `<blockquote>${content}</blockquote>`;
    }
    case "bulletList": {
      if (!node.content) return "";
      return `<ul>\n${node.content.map(serializeNodeToHtml).join("\n")}\n</ul>`;
    }
    case "orderedList": {
      if (!node.content) return "";
      const start = (node.attrs?.start as number) || 1;
      return `<ol start="${start}">\n${node.content.map(serializeNodeToHtml).join("\n")}\n</ol>`;
    }
    case "taskList": {
      if (!node.content) return "";
      return `<ul class="task-list">\n${node.content.map(serializeNodeToHtml).join("\n")}\n</ul>`;
    }
    case "listItem": {
      if (!node.content) return "<li></li>";
      return `<li>${node.content.map(serializeNodeToHtml).join("")}</li>`;
    }
    case "taskItem": {
      const isChecked = Boolean(node.attrs?.checked);
      const content = node.content ? node.content.map(serializeNodeToHtml).join("") : "";
      return `<li class="task-item"><input type="checkbox" ${isChecked ? 'checked="checked"' : ""} disabled="disabled" /> <span>${content}</span></li>`;
    }
    case "horizontalRule": {
      return "<hr />";
    }
    case "table": {
      return serializeTableToHtml(node);
    }
    case "image": {
      const src = (node.attrs?.src as string) || "";
      const alt = escapeHtml((node.attrs?.alt as string) || "image");
      const caption = node.attrs?.caption ? escapeHtml(String(node.attrs.caption)) : null;
      const widthStyle = node.attrs?.width ? `width: ${escapeHtml(String(node.attrs.width))}; ` : "";
      return `<figure style="margin: 14px 0;"><img src="${src}" alt="${alt}" style="${widthStyle}max-width: 100%; height: auto; border-radius: 4px;" />${caption ? `<figcaption style="font-size: 9pt; color: #64748b; margin-top: 4px;">${caption}</figcaption>` : ""}</figure>`;
    }
    case "attachment":
    case "fileAttachment": {
      const name = escapeHtml((node.attrs?.fileName as string) || "Attachment");
      const size = escapeHtml((node.attrs?.fileSize as string) || "");
      return `<div class="attachment-box" style="display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; margin: 8px 0; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 9.5pt;">📎 <strong>${name}</strong> ${size ? `<span style="color: #64748b;">(${size})</span>` : ""}</div>`;
    }
    default: {
      if (node.content) {
        return node.content.map(serializeNodeToHtml).join("");
      }
      if (node.text) {
        return escapeHtml(node.text);
      }
      return "";
    }
  }
}

/**
 * Renders tag badges for print.
 */
function renderTagsHtml(tags: string[]): string {
  if (!tags || tags.length === 0) return "";
  return `<div class="tag-pills">${tags.map((t) => `<span class="tag-pill">#${escapeHtml(t)}</span>`).join(" ")}</div>`;
}

export interface HtmlExportOptions {
  includeTags?: boolean | undefined;
  includeTitle?: boolean | undefined;
}

/**
 * Converts a GeneralNote to clean HTML.
 */
export function exportNoteToHtml(
  note: GeneralNote,
  options?: HtmlExportOptions
): string {
  const includeTitle = options?.includeTitle !== false;
  const includeTags = options?.includeTags !== false;
  const parts: string[] = [];

  parts.push('<article class="document-section">');
  if (includeTitle) {
    parts.push(`  <header class="document-header">`);
    parts.push(`    <h1 class="document-title">${escapeHtml(note.title)}</h1>`);
    parts.push(`    <div class="document-meta">`);
    parts.push(`      <span>Updated: ${escapeHtml(new Date(note.updatedAt).toLocaleDateString())}</span>`);
    parts.push(`    </div>`);
    if (includeTags && note.tags.length > 0) {
      parts.push(renderTagsHtml(note.tags));
    }
    parts.push(`  </header>`);
  }

  parts.push(`  <div class="document-body">`);
  parts.push(serializeNodeToHtml(note.content));
  parts.push(`  </div>`);
  parts.push("</article>");

  return parts.join("\n");
}

/**
 * Converts a single DSM entry to clean HTML.
 */
export function exportDsmEntryToHtml(
  entry: DsmEntry,
  options?: HtmlExportOptions
): string {
  const includeTitle = options?.includeTitle !== false;
  const includeTags = options?.includeTags !== false;
  const parts: string[] = [];

  parts.push('<section class="dsm-section-entry">');
  if (includeTitle) {
    parts.push(`  <header class="document-header">`);
    parts.push(`    <h2 class="document-title" style="font-size: 16pt;">Daily Stand-up — ${escapeHtml(entry.date)}</h2>`);
    if (includeTags && entry.tags.length > 0) {
      parts.push(renderTagsHtml(entry.tags));
    }
    parts.push(`  </header>`);
  }

  parts.push(`  <div class="document-body">`);
  parts.push(serializeNodeToHtml(entry.content));
  parts.push(`  </div>`);
  parts.push("</section>");

  return parts.join("\n");
}

/**
 * Converts a range of DSM entries to clean HTML.
 */
export function exportDsmRangeToHtml(
  entries: DsmEntry[],
  dateRange?: { from: string; to: string },
  options?: HtmlExportOptions
): string {
  let filtered = entries;
  if (dateRange?.from || dateRange?.to) {
    filtered = entries.filter((e) => {
      if (dateRange.from && e.date < dateRange.from) return false;
      if (dateRange.to && e.date > dateRange.to) return false;
      return true;
    });
  }

  const sorted = sortDsmEntries(filtered, "desc");
  const parts: string[] = [];

  const titleRange = dateRange?.from && dateRange?.to
    ? `Daily Stand-up Journal (${dateRange.from} to ${dateRange.to})`
    : "Daily Stand-up Journal";

  parts.push(`<header class="document-header">`);
  parts.push(`  <h1 class="document-title">${escapeHtml(titleRange)}</h1>`);
  parts.push(`  <div class="document-meta"><span>${sorted.length} entries</span></div>`);
  parts.push(`</header>`);

  for (let i = 0; i < sorted.length; i++) {
    parts.push(exportDsmEntryToHtml(sorted[i], { includeTags: options?.includeTags, includeTitle: true }));
    if (i < sorted.length - 1) {
      parts.push('<div class="page-break"></div>');
    }
  }

  return parts.join("\n");
}

/**
 * Converts full DSM Document to clean HTML.
 */
export function exportFullDsmToHtml(
  doc: DsmDocument,
  options?: HtmlExportOptions
): string {
  return exportDsmRangeToHtml(doc.entries, undefined, options);
}

/**
 * Wraps content in a complete, print-optimized HTML page template.
 */
export function buildCompletePrintableHtml(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page {
      margin: 18mm 16mm;
      size: A4 portrait;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1e293b;
      background: #ffffff;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .print-wrapper {
      max-width: 820px;
      margin: 0 auto;
      padding: 8px 16px;
    }
    .document-header {
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .document-title {
      font-size: 20pt;
      font-weight: 700;
      margin: 0 0 6px 0;
      color: #0f172a;
      letter-spacing: -0.01em;
    }
    .document-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      font-size: 9pt;
      color: #64748b;
      margin-top: 4px;
    }
    .tag-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }
    .tag-pill {
      display: inline-block;
      padding: 2px 7px;
      background: #f1f5f9;
      color: #4338ca;
      font-size: 8.5pt;
      font-weight: 600;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }
    h1, h2, h3, h4, h5, h6 {
      color: #0f172a;
      font-weight: 600;
      page-break-after: avoid;
      break-after: avoid;
    }
    h1 { font-size: 17pt; margin: 20px 0 10px; }
    h2 { font-size: 14pt; margin: 18px 0 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; }
    h3 { font-size: 12pt; margin: 14px 0 6px; }
    p { margin: 0 0 12px; }
    pre {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 14px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 9pt;
      line-height: 1.45;
      overflow-x: auto;
      page-break-inside: avoid;
      break-inside: avoid;
      margin: 0 0 14px;
    }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 9pt;
      background: #f1f5f9;
      color: #0f172a;
      padding: 1px 4px;
      border-radius: 3px;
    }
    pre code {
      background: transparent;
      padding: 0;
    }
    blockquote {
      border-left: 3.5px solid #818cf8;
      background: #f8fafc;
      padding: 8px 16px;
      margin: 0 0 14px;
      color: #475569;
      border-radius: 0 4px 4px 0;
    }
    ul, ol {
      margin: 0 0 12px;
      padding-left: 24px;
    }
    li { margin-bottom: 4px; }
    .task-list {
      list-style: none;
      padding-left: 4px;
    }
    .task-item {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 0 0 16px;
      font-size: 9.5pt;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 7px 10px;
      text-align: left;
    }
    th {
      background: #f8fafc;
      font-weight: 600;
      color: #1e293b;
    }
    img {
      max-width: 100%;
      height: auto;
      border-radius: 4px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .internal-link {
      color: #4f46e5;
      font-weight: 500;
    }
    .dsm-section-entry {
      margin-bottom: 24px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .page-break {
      page-break-before: always;
      break-before: page;
      height: 0;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="print-wrapper">
    ${bodyHtml}
  </div>
</body>
</html>`;
}
