import { describe, it, expect } from "vitest";
import {
  escapeHtml,
  serializeNodeToHtml,
  exportNoteToHtml,
  exportDsmEntryToHtml,
  exportDsmRangeToHtml,
  buildCompletePrintableHtml,
} from "../htmlExporter";
import type { GeneralNote } from "../../note.types";
import type { DsmEntry } from "../../dsm.types";
import type { ProseMirrorNode } from "../../document.types";

describe("htmlExporter", () => {
  it("escapes html special characters", () => {
    expect(escapeHtml("<script>alert('xss' & \"test\")</script>")).toBe(
      "&lt;script&gt;alert(&#039;xss&#039; &amp; &quot;test&quot;)&lt;/script&gt;"
    );
  });

  it("serializes ProseMirror document with headings, bold, links, and code", () => {
    const doc: ProseMirrorNode = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Architecture Overview" }],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "This is " },
            { type: "text", text: "bold text", marks: [{ type: "bold" }] },
            { type: "text", text: " and a " },
            {
              type: "text",
              text: "link",
              marks: [{ type: "link", attrs: { href: "https://example.com" } }],
            },
            { type: "text", text: "." },
          ],
        },
        {
          type: "codeBlock",
          attrs: { language: "typescript" },
          content: [{ type: "text", text: "const x: number = 42;" }],
        },
      ],
    };

    const html = serializeNodeToHtml(doc);
    expect(html).toContain("<h2>Architecture Overview</h2>");
    expect(html).toContain("<strong>bold text</strong>");
    expect(html).toContain('<a href="https://example.com" target="_blank" rel="noopener noreferrer">link</a>');
    expect(html).toContain('<pre><code class="language-typescript">const x: number = 42;</code></pre>');
  });

  it("exports a GeneralNote to clean HTML article", () => {
    const note: GeneralNote = {
      id: "note_123",
      schemaVersion: 1,
      title: "Release Notes v0.1.0",
      pinned: true,
      tags: ["release", "v0.1.0"],
      createdAt: "2026-09-22T10:00:00Z",
      updatedAt: "2026-09-22T12:00:00Z",
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Initial public release with local SQLite storage." }],
          },
        ],
      },
    };

    const html = exportNoteToHtml(note);
    expect(html).toContain('<h1 class="document-title">Release Notes v0.1.0</h1>');
    expect(html).toContain('<span class="tag-pill">#release</span>');
    expect(html).toContain('<span class="tag-pill">#v0.1.0</span>');
    expect(html).toContain("<p>Initial public release with local SQLite storage.</p>");
  });

  it("exports a single DSM entry to clean HTML section", () => {
    const entry: DsmEntry = {
      id: "dsm_1",
      date: "2026-09-22",
      tags: ["scrum", "daily"],
      collapsed: false,
      createdAt: "2026-09-22T09:00:00Z",
      updatedAt: "2026-09-22T09:30:00Z",
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Working on PDF export and tag filters." }],
          },
        ],
      },
    };

    const html = exportDsmEntryToHtml(entry);
    expect(html).toContain("Daily Stand-up — 2026-09-22");
    expect(html).toContain('<span class="tag-pill">#scrum</span>');
    expect(html).toContain("Working on PDF export and tag filters.");
  });

  it("exports a range of DSM entries to clean HTML", () => {
    const entries: DsmEntry[] = [
      {
        id: "dsm_1",
        date: "2026-09-21",
        tags: ["scrum"],
        collapsed: false,
        createdAt: "2026-09-21T09:00:00Z",
        updatedAt: "2026-09-21T09:30:00Z",
        content: {
          type: "doc",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Day 1" }] }],
        },
      },
      {
        id: "dsm_2",
        date: "2026-09-22",
        tags: ["scrum"],
        collapsed: false,
        createdAt: "2026-09-22T09:00:00Z",
        updatedAt: "2026-09-22T09:30:00Z",
        content: {
          type: "doc",
          content: [{ type: "paragraph", content: [{ type: "text", text: "Day 2" }] }],
        },
      },
    ];

    const html = exportDsmRangeToHtml(entries);
    expect(html).toContain("Daily Stand-up Journal");
    expect(html).toContain("Day 1");
    expect(html).toContain("Day 2");
  });

  it("buildCompletePrintableHtml wraps body in complete standalone HTML page", () => {
    const pageHtml = buildCompletePrintableHtml("Test Title", "<p>Hello Print</p>");
    expect(pageHtml).toContain("<!DOCTYPE html>");
    expect(pageHtml).toContain("<title>Test Title</title>");
    expect(pageHtml).toContain("@page {");
    expect(pageHtml).toContain("<p>Hello Print</p>");
  });
});
